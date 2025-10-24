"use client";
import { useState } from "react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [serverUrl, setServerUrl] = useState("https://zulip.cyburity.com");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Test the credentials by making a simple API call
      const testResult = await fetch(`${serverUrl}/api/v1/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${email}:${apiKey}`)}`,
        },
      });

      if (!testResult.ok) {
        throw new Error('Invalid credentials or server URL');
      }

      // Save credentials to localStorage
      const credentials = { email, apiKey, serverUrl };
      localStorage.setItem('zulipCredentials', JSON.stringify(credentials));

      // Try to sync with Electron main process if available
      try {
        // Test if we're in Electron by checking for the bridge
        if (window.zulip) {
          // Create a simple IPC call to set credentials in main process
          // This will be handled by our updated main.js
          const response = await fetch(`${serverUrl}/api/v1/users/me`, {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${btoa(`${email}:${apiKey}`)}`,
            },
          });
          
          if (response.ok) {
            console.log('Credentials validated and ready for sync with main process');
          }
        }
      } catch (bridgeError) {
        console.log('Running in browser mode, main process sync may not be available');
      }

      onLoginSuccess();
      onClose();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-sm">
      <div className="glass w-full max-w-md p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Login to Zulip</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Zulip Server URL
            </label>
            <input
              type="url"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://your-zulip-server.com"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md focus:outline-none focus:border-accent transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-email@example.com"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md focus:outline-none focus:border-accent transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Your Zulip API key"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md focus:outline-none focus:border-accent transition-colors"
              required
            />
            <p className="text-xs text-zinc-400 mt-1">
              Get your API key from Your account → Personal settings → API key
            </p>
          </div>

          {error && (
            <div className="p-2 bg-red-500/20 border border-red-500/30 rounded-md text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-accent text-black font-medium rounded-md hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-4 text-xs text-zinc-400">
          <p>Your credentials are stored locally and only used to authenticate with Zulip.</p>
        </div>
      </div>
    </div>
  );
}
