declare global {
  interface Window {
    zulip?: {
      get: (pathAndQuery: string) => Promise<any>;
      post: (path: string, body: Record<string, any>) => Promise<any>;
      getCredentials: () => Promise<{ email: string; apiKey: string; serverUrl: string }>;
    };
    appInfo?: { getVersion: () => Promise<string> };
  }
}

function assertBridge() {
  if (!window.zulip) throw new Error("Preload bridge not available (window.zulip is undefined)");
  return window.zulip;
}

export const zget = (pathAndQuery: string) => assertBridge().get(pathAndQuery);
export const zpost = (path: string, body: Record<string, any>) => assertBridge().post(path, body);
export const zgetCredentials = () => assertBridge().getCredentials();
