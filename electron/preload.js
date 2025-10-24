const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("zulip", {
  get: (pathAndQuery) => ipcRenderer.invoke("zulip:get", pathAndQuery),
  post: (path, body) => ipcRenderer.invoke("zulip:post", { path, body }),
  image: (url) => ipcRenderer.invoke("zulip:image", url),
  uploadFile: (fileName, buffer) => ipcRenderer.invoke("zulip:uploadFile", { fileName, buffer }),
  // Add credential sync methods
  setCredentials: (credentials) => ipcRenderer.invoke("set-zulip-credentials", credentials),
  getCredentials: () => ipcRenderer.invoke("get-zulip-credentials")
});

contextBridge.exposeInMainWorld("appInfo", {
  getVersion: () => ipcRenderer.invoke("app:version")
});
