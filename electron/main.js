const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("path");
require("dotenv").config();

const isDev = !!process.env.NEXT_DEV_SERVER_URL;

let win;
function createWindow() {
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
      webSecurity: false, // ← ADD THIS LINE
      allowRunningInsecureContent: true // ← AND THIS LINE
    }
  });
  
  // FIX: Load the correct file path for production
  if (isDev) {
    win.loadURL(process.env.NEXT_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    // For production, load from the app.asar file system
    const indexPath = path.join(__dirname, '../../.next/index.html'); // Adjust path as needed
    
    // OR if you're using static export, use the out folder
    // const indexPath = path.join(__dirname, '../../out/index.html');
    
    win.loadFile(indexPath).catch(err => {
      console.error('Failed to load index.html:', err);
      // Fallback to loading a basic HTML page
      win.loadURL(`data:text/html;charset=utf-8,
        <html>
          <body>
            <h1>Mythic Zulip</h1>
            <p>If you see this, there's an issue with the build.</p>
            <p>Error: ${err.message}</p>
          </body>
        </html>
      `);
    });
  }

  win.show();
  win.focus();
  
  // Add webRequest handler for production
  if (!isDev) {
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
  }
}

// ... rest of your main.js code remains the same

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
