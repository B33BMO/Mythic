const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("path");

const isDev = !!process.env.NEXT_DEV_SERVER_URL;

let win;
function createWindow() {
  const preloadPath = path.join(__dirname, "preload.js");
  console.log("Preload path:", preloadPath);
  
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    x: 100,
    y: 100,
    backgroundColor: "#0b0e14",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  
  win.show();
  win.focus();
  
  // Set up webRequest to intercept image requests and add auth
  session.defaultSession.webRequest.onBeforeSendHeaders(
    {
      urls: ['https://zulip.cyburity.com/user_uploads/*']
    },
    (details, callback) => {
      const headers = details.requestHeaders;
      const auth = authHeader();
      Object.assign(headers, auth);
      callback({ cancel: false, requestHeaders: headers });
    }
  );

  ipcMain.handle("app:version", async () => app.getVersion());
  if (isDev) {
    win.loadURL(process.env.NEXT_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "..", "out", "index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 200;

// Global credentials cache
let cachedCredentials = null;

// IPC handler to get credentials from renderer
ipcMain.handle("get-zulip-credentials", async () => {
  if (cachedCredentials) {
    return cachedCredentials;
  }
  
  // Fall back to environment variables if no credentials from renderer
  const envCredentials = {
    email: process.env.ZULIP_EMAIL || '',
    apiKey: process.env.ZULIP_API_KEY || '',
    serverUrl: process.env.ZULIP_REALM_URL || ''
  };
  
  return envCredentials;
});

// IPC handler to set credentials from login
ipcMain.handle("set-zulip-credentials", async (_evt, credentials) => {
  cachedCredentials = credentials;
  console.log('Credentials updated in main process');
  return { success: true };
});

function authHeader(credentials = null) {
  const creds = credentials || cachedCredentials || {
    email: process.env.ZULIP_EMAIL || '',
    apiKey: process.env.ZULIP_API_KEY || ''
  };
  
  const { email, apiKey } = creds;
  const token = Buffer.from(`${email}:${apiKey}`).toString("base64");
  return { Authorization: `Basic ${token}` };
}

function getBaseUrl(credentials = null) {
  const creds = credentials || cachedCredentials || {
    serverUrl: process.env.ZULIP_REALM_URL || ''
  };
  
  return (creds.serverUrl || "").replace(/\/+$/, "");
}

// Main zulipFetch function
async function zulipFetch(path, method = "GET", body) {
  const credentials = cachedCredentials || {
    email: process.env.ZULIP_EMAIL || '',
    apiKey: process.env.ZULIP_API_KEY || '',
    serverUrl: process.env.ZULIP_REALM_URL || ''
  };
  
  const { email, apiKey, serverUrl } = credentials;
  
  if (!serverUrl || !email || !apiKey) {
    throw new Error("Zulip credentials not configured. Please login first.");
  }
  
  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
  
  const url = `${serverUrl}/api/v1${path.startsWith("/") ? "" : "/"}${path}`;
  const token = Buffer.from(`${email}:${apiKey}`).toString("base64");
  const headers = { Authorization: `Basic ${token}` };

  let options = { method, headers };
  if (method !== "GET" && body) {
    headers["Content-Type"] = "application/x-www-form-urlencoded;charset=UTF-8";
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) {
      params.append(k, typeof v === "string" ? v : JSON.stringify(v));
    }
    options.body = params.toString();
  }

  const res = await fetch(url, options);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.result === "error") {
    throw new Error(json.msg || `Zulip HTTP ${res.status}`);
  }
  return json;
}

// IPC handlers
ipcMain.handle("zulip:get", async (_evt, pathAndQuery) => {
  return zulipFetch(pathAndQuery, "GET");
});

ipcMain.handle("zulip:post", async (_evt, { path, body }) => {
  return zulipFetch(path, "POST", body);
});

ipcMain.handle("zulip:image", async (_evt, imageUrl) => {
  try {
    const credentials = cachedCredentials || {
      email: process.env.ZULIP_EMAIL || '',
      apiKey: process.env.ZULIP_API_KEY || '',
      serverUrl: process.env.ZULIP_REALM_URL || ''
    };
    
    const response = await fetch(imageUrl, {
      headers: authHeader(credentials)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    return {
      success: true,
      data: Buffer.from(buffer).toString('base64'),
      contentType: response.headers.get('content-type')
    };
  } catch (error) {
    console.error('Image proxy error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("zulip:uploadFile", async (_evt, { fileName, buffer }) => {
  try {
    const request = require('request');
    const credentials = cachedCredentials || {
      email: process.env.ZULIP_EMAIL || '',
      apiKey: process.env.ZULIP_API_KEY || '',
      serverUrl: process.env.ZULIP_REALM_URL || ''
    };
    
    const BASE = getBaseUrl(credentials);
    
    return new Promise((resolve, reject) => {
      const formData = {
        file: {
          value: Buffer.from(buffer),
          options: {
            filename: fileName,
            contentType: 'application/octet-stream'
          }
        }
      };
      
      const options = {
        url: `${BASE}/api/v1/user_uploads`,
        method: 'POST',
        headers: authHeader(credentials),
        formData: formData
      };
      
      request(options, (error, response, body) => {
        if (error) {
          reject(new Error(`Upload failed: ${error.message}`));
          return;
        }
        
        let result;
        try {
          result = JSON.parse(body);
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${body}`));
          return;
        }
        
        if (result.result !== 'success') {
          reject(new Error(result.msg || `Upload failed with status ${response.statusCode}`));
          return;
        }
        
        resolve(result);
      });
    });
    
  } catch (error) {
    console.error('File upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }
});
