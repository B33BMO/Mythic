const fetch = require("node-fetch");
require("dotenv").config();

const BASE = (process.env.ZULIP_REALM_URL || "").replace(/\/+$/, "");
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 200; // 200ms between requests to avoid rate limits

function authHeader() {
  const email = process.env.ZULIP_EMAIL;
  const key = process.env.ZULIP_API_KEY;
  const token = Buffer.from(`${email}:${key}`).toString("base64");
  return { Authorization: `Basic ${token}` };
}

async function zulipFetch(path, method = "GET", body) {
  if (!BASE) throw new Error("ZULIP_REALM_URL not set");
  
  // Rate limiting: wait if we've made a request recently
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
  
  const url = `${BASE}/api/v1${path.startsWith("/") ? "" : "/"}${path}`;
  const headers = { ...authHeader() };

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

module.exports = { zulipFetch, authHeader };
