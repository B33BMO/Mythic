const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("path");
const fs = require("fs");

const isDev = !!process.env.NEXT_DEV_SERVER_URL;

let win;
async function createWindow() {
  const preloadPath = path.join(__dirname, "preload.js");
  
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
      sandbox: false,
      webSecurity: false,
      allowRunningInsecureContent: true
    }
  });
  
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
    await win.loadURL(process.env.NEXT_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    // For production - try to find the built Next.js app
    const appPath = app.getAppPath();
    console.log('App path:', appPath);
    
    // Try different possible locations where the build might be
// In the createWindow() function, replace the possiblePaths array with:

const possiblePaths = [
  path.join(appPath, '.next', 'index.html'),
  path.join(appPath, '.next', 'app', 'index.html'),
  path.join(process.resourcesPath, 'app', '.next', 'index.html'),
  path.join(process.resourcesPath, 'app', '.next', 'app', 'index.html'),
  path.join(__dirname, '..', '.next', 'index.html'),
  path.join(__dirname, '..', '.next', 'app', 'index.html'),
  // Also keep the out paths as fallback
  path.join(appPath, 'out', 'index.html'),
  path.join(appPath, 'out', 'app', 'index.html'),
  path.join(process.resourcesPath, 'app', 'out', 'index.html'),
  path.join(process.resourcesPath, 'app', 'out', 'app', 'index.html'),
  path.join(__dirname, '..', 'out', 'index.html'),
  path.join(__dirname, '..', 'out', 'app', 'index.html')
];

    
    let loaded = false;
    
    for (const indexPath of possiblePaths) {
      try {
        if (fs.existsSync(indexPath)) {
          console.log('✅ Found index.html at:', indexPath);
          // Use file:// URL for loading
          const fileUrl = `file://${indexPath.replace(/\\/g, '/')}`;
          console.log('📁 Loading URL:', fileUrl);
          await win.loadURL(fileUrl);
          loaded = true;
          break;
        } else {
          console.log('❌ Path not found:', indexPath);
        }
      } catch (error) {
        console.log(`⚠️ Failed to load from ${indexPath}:`, error.message);
      }
    }
    
    if (!loaded) {
      console.error('🚨 Could not find index.html in any expected location');
      
      // Debug: List what's actually in the app directory
      try {
        console.log('🔍 App directory contents:');
        const appFiles = fs.readdirSync(appPath);
        console.log(appFiles);
        
        if (fs.existsSync(path.join(appPath, 'out'))) {
          console.log('📂 Out directory contents:');
          const outFiles = fs.readdirSync(path.join(appPath, 'out'));
          console.log(outFiles);
        }
      } catch (err) {
        console.log('❌ Error listing files:', err.message);
      }
      
      // Fallback to a helpful error page
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Mythic Zulip - Build Issue</title>
            <style>
              body { 
                background: #0b0e14; 
                color: #00ffae; 
                font-family: 'Inter', system-ui; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                height: 100vh; 
                margin: 0;
                padding: 20px;
                line-height: 1.6;
              }
              .content { 
                text-align: center; 
                max-width: 600px;
                background: rgba(255,255,255,0.05);
                padding: 2rem;
                border-radius: 1rem;
                border: 1px solid rgba(255,255,255,0.1);
              }
              h1 { margin-bottom: 1rem; }
              ul { text-align: left; margin: 1rem 0; }
              button { 
                background: #00ffae; 
                color: #0b0e14; 
                border: none; 
                padding: 10px 20px; 
                border-radius: 8px; 
                cursor: pointer;
                margin: 10px;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <div class="content">
              <h1>🚀 Mythic Zulip</h1>
              <p><strong>Build files not found.</strong> This usually means:</p>
              <ul>
                <li>Next.js static export didn't complete properly</li>
                <li>The build output wasn't included in the installer</li>
                <li>Files are in a different location than expected</li>
              </ul>
              <p>Check the developer console (F12) for detailed file paths.</p>
              <div>
                <button onclick="location.reload()">🔄 Retry Loading</button>
                <button onclick="alert('Please check the console for debugging info')">🐛 Debug Info</button>
              </div>
            </div>
            <script>
              console.log('Mythic Zulip Debug Info:');
              console.log('User Agent:', navigator.userAgent);
            </script>
          </body>
        </html>
      `)}`);
    }
    
    // Open dev tools for debugging (remove this line after it works)
    win.webContents.openDevTools();
  }

  win.show();
  win.focus();
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
