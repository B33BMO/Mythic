// lib/zulip.ts
// Thin, typed helpers for Zulip's REST API via the Electron preload bridge.

import { zget, zpost } from "./ipc";

/* =======================
 * Types
 * ======================= */

export type Narrow =
  | { operator: "is"; operand: "private" | "starred" | "mentioned" | "alerted" }
  | { operator: "stream"; operand: string }
  | { operator: "topic"; operand: string }
  | { operator: "sender"; operand: string } // email or user_id string
  | { operator: "pm-with"; operand: string } // "email" or "email1,email2"
  | { operator: "search"; operand: string };

export type Stream = { stream_id: number; name: string; description?: string };
export type Topic = { name: string; max_id: number };

export type Message = {
  id: number;
  type: "stream" | "private";
  sender_id: number;
  sender_full_name: string;
  sender_email: string;
  timestamp: number;
  stream_id?: number;
  subject?: string; // Zulip's "topic" is also present as "subject" in some payloads
  topic?: string;   // when apply_markdown=true, Zulip also includes topic
  content?: string; // raw markdown
  rendered_content?: string; // HTML if apply_markdown=true
};

export type User = {
  user_id: number;
  full_name: string;
  email: string;
  is_bot: boolean;
  avatar_url?: string | null;
};

export type RealmPresence = {
  server_timestamp: number;
  presences: Record<
    string,
    {
      aggregated?: { status: "active" | "idle" | "offline"; timestamp: number };
      client?: string;
    }
  >;
};

// Add this function to get credentials from localStorage
function getStoredCredentials() {
  try {
    const stored = localStorage.getItem('zulipCredentials');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to parse stored credentials:', error);
  }
  return null;
}

// Update the authHeader function to use stored credentials
function authHeader() {
  const stored = getStoredCredentials();
  const email = stored?.email || process.env.ZULIP_EMAIL;
  const key = stored?.apiKey || process.env.ZULIP_API_KEY;
  
  if (!email || !key) {
    throw new Error('No Zulip credentials found. Please login.');
  }
  
  const token = btoa(`${email}:${key}`);
  return { Authorization: `Basic ${token}` };
}

// Update the BASE URL to use stored server URL
function getBaseUrl() {
  const stored = getStoredCredentials();
  return (stored?.serverUrl || process.env.ZULIP_REALM_URL || "").replace(/\/+$/, "");
}

/* =======================
 * Streams & Topics
 * ======================= */

export async function listStreams(): Promise<Stream[]> {
  // Returns all streams visible to the user (subscribed + public, subject to org settings)
  const data = await zget("/streams");
  return (data.streams || []) as Stream[];
}

export async function listTopics(stream_id: number): Promise<Topic[]> {
  // Topics (aka "subjects") for a given stream
  const data = await zget(`/users/me/${stream_id}/topics`);
  return (data.topics || []) as Topic[];
}

/* =======================
 * Users & Presence
 * ======================= */

export async function listUsers(): Promise<User[]> {
  const data = await zget("/users");
  return (data.members || []) as User[];
}

export async function realmPresence(): Promise<RealmPresence> {
  const data = await zget("/realm/presence");
  return data as RealmPresence;
}

export async function getSelf(): Promise<User & { user_id: number }> {
  const me = await zget("/users/me");
  return me;
}

/* =======================
 * Messages
 * ======================= */

type FetchOpts = {
  anchor?: number | "newest";
  before?: number; // num_before
  after?: number;  // num_after
  apply_markdown?: boolean;
};

export async function fetchMessages(
  narrow: Narrow[],
  opts: FetchOpts = {}
): Promise<{ messages: Message[] }> {
  const anchor = opts.anchor ?? "newest";
  const num_before = String(opts.before ?? 50);
  const num_after = String(opts.after ?? 0);

  const qs = new URLSearchParams({
    anchor: anchor === "newest" ? "newest" : String(anchor),
    num_before,
    num_after,
    narrow: JSON.stringify(narrow),
    client_gravatar: "true",
    apply_markdown: String(opts.apply_markdown ?? true),
  });

  const data = await zget(`/messages?${qs.toString()}`);
  return { messages: (data.messages || []) as Message[] };
}

// Backwards-compat alias used earlier
export async function getMessages(narrow: Narrow[], anchor: "newest" | number = "newest") {
  return fetchMessages(narrow, { anchor, before: 50, after: 0, apply_markdown: true }).then(
    (r) => r.messages
  );
}

/* =======================
 * Sending & Reactions
 * ======================= */

export async function sendMessage(params: {
  type: "stream" | "private";
  to?: string; // For private messages: email or JSON array of emails
  stream?: string;
  topic?: string;
  content: string;
}) {
  const body: any = {
    type: params.type,
    content: params.content
  };

  if (params.type === "private") {
    // For private messages, 'to' should be a JSON array string like '["email1@example.com", "email2@example.com"]'
    if (params.to) {
      body.to = params.to;
    } else {
      throw new Error("Missing recipient for private message");
    }
  } else {
    // For stream messages
    if (params.stream) {
      body.stream = params.stream;
      body.topic = params.topic || "(no topic)";
    } else {
      throw new Error("Missing stream name for stream message");
    }
  }

  return await zpost("/messages", body);
}

/* =======================
 * “Recent DMs” helper
 * ======================= */

export async function recentDMs(): Promise<Message[]> {
  // Quick heuristic: pull latest private messages and group by sender.
  // For richer “DM conversations”, Zulip also has /users/me/pm_conversations (server-dependent).
  const { messages } = await fetchMessages([{ operator: "is", operand: "private" }], {
    anchor: "newest",
    before: 50,
    after: 0,
    apply_markdown: true,
  });

  const bySender = new Map<number, Message>();
  for (const m of messages) {
    if (!bySender.has(m.sender_id)) bySender.set(m.sender_id, m);
  }
  return Array.from(bySender.values());
}

/* =======================
 * Search (server-side narrow)
 * ======================= */

export async function searchMessages(query: string, opts: FetchOpts = {}) {
  const { messages } = await fetchMessages([{ operator: "search", operand: query }], {
    anchor: opts.anchor ?? "newest",
    before: opts.before ?? 50,
    after: opts.after ?? 0,
    apply_markdown: opts.apply_markdown ?? true,
  });
  return messages;
}

/* =======================
 * Uploads
 * ======================= */

export async function uploadFile(file: File): Promise<{ uri: string; url: string; filename: string }> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // @ts-ignore - window.zulip should exist in Electron
    const result = await window.zulip.uploadFile(file.name, arrayBuffer);
    
    if (!result.uri && !result.url) {
      throw new Error('Upload failed: no URI returned');
    }
    
    return {
      uri: result.uri || result.url,
      url: result.url || result.uri,
      filename: result.filename || file.name
    };
  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to upload file: ${errorMessage}`);
  }
}

/* =======================
 * Unread Counts
 * ======================= */

export async function getUnreadCounts(): Promise<{
  streams: Map<number, number>;
  dms: Map<string, number>;
}> {
  try {
    // @ts-ignore
    const result = await window.zulip.get('/messages?num_before=0&num_after=0&anchor=newest');
    
    const streams = new Map<number, number>();
    const dms = new Map<string, number>();
    
    // Parse unread counts from the response
    // This is a simplified version - you might need to adjust based on Zulip's actual API response
    if (result.messages) {
      result.messages.forEach((msg: any) => {
        if (msg.type === 'stream') {
          const current = streams.get(msg.stream_id) || 0;
          streams.set(msg.stream_id, current + 1);
        } else if (msg.type === 'private') {
          // For DMs, use the sender's email
          const current = dms.get(msg.sender_email) || 0;
          dms.set(msg.sender_email, current + 1);
        }
      });
    }
    
    return { streams, dms };
  } catch (error) {
    console.error('Failed to get unread counts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { streams: new Map(), dms: new Map() };
  }
}

/* =======================
 * User lookup
 * ======================= */

export async function getUser(user_id: number): Promise<User> {
  const data = await zget(`/users/${user_id}`);
  return data.user as User;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const users = await listUsers();
    return users.find(u => u.email === email) || null;
  } catch {
    return null;
  }
}
