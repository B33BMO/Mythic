export async function syncCredentialsWithMainProcess() {
  try {
    const stored = localStorage.getItem('zulipCredentials');
    if (!stored) return;
    
    const credentials = JSON.parse(stored);
    
    // Try to send credentials to main process via IPC
    if (window.zulip && typeof (window.zulip as any).setCredentials === 'function') {
      await (window.zulip as any).setCredentials(credentials);
    }
  } catch (error) {
    console.error('Failed to sync credentials with main process:', error);
  }
}

export async function getCredentialsFromMainProcess() {
  try {
    if (window.zulip && typeof (window.zulip as any).getCredentials === 'function') {
      return await (window.zulip as any).getCredentials();
    }
  } catch (error) {
    console.error('Failed to get credentials from main process:', error);
  }
  return null;
}
