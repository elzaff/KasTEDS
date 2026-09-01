const { HttpError } = require("./http");

class SupabaseError extends Error {
  constructor(status, message, table) {
    super(message);
    this.name = "SupabaseError";
    this.status = status;
    this.table = table;
  }
}

function getConfig() {
  const url = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new HttpError(503, "supabase_not_configured", "Supabase server belum dikonfigurasi di Vercel.");
  return { url, key };
}

async function request(table, { method = "GET", query = {}, body, prefer } = {}) {
  const { url, key } = getConfig();
  const endpoint = new URL(`${url}/rest/v1/${table}`);
  Object.entries(query).forEach(([name, value]) => {
    if (Array.isArray(value)) value.forEach((item) => endpoint.searchParams.append(name, String(item)));
    else if (value !== undefined && value !== null) endpoint.searchParams.set(name, String(value));
  });
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json"
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (prefer) headers.Prefer = prefer;
  let response;
  try {
    response = await fetch(endpoint, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch (error) {
    console.error("KasTEDS Supabase network error", { table, message: error.message });
    throw new SupabaseError(502, "Supabase tidak dapat dihubungi.", table);
  }
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) {
    const upstreamMessage = String(data?.message || data?.hint || data?.error || "");
    console.error("KasTEDS Supabase request failed", { table, status: response.status, message: upstreamMessage.slice(0, 240) });
    throw new SupabaseError(response.status, upstreamMessage || "Supabase request failed.", table);
  }
  return data;
}

module.exports = { SupabaseError, getConfig, request };
