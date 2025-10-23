declare global {
  interface Window {
    appInfo?: { getVersion: () => Promise<string> };
  }
}

export async function getAppVersion(): Promise<string> {
  if (!window.appInfo) return "0.0.0-dev";
  try {
    return await window.appInfo.getVersion();
  } catch {
    return "0.0.0-dev";
  }
}
