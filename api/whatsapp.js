const crypto = require("node:crypto");
const { HttpError, json, fail, methodNotAllowed, handleOptions, readRawBody } = require("./_lib/http");

function header(req, name) {
  return String(req.headers?.[name.toLowerCase()] || "");
}

function sameSecret(received, expected) {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function verifyMetaSignature(req, rawBody) {
  const secret = String(process.env.META_APP_SECRET || "");
  if (!secret) throw new HttpError(503, "whatsapp_not_configured", "META_APP_SECRET belum dikonfigurasi.");
  const received = header(req, "x-hub-signature-256");
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  if (!sameSecret(received, expected)) throw new HttpError(401, "invalid_signature", "Signature webhook tidak valid.");
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function isAllowedPhone(phone) {
  const configured = String(process.env.WHATSAPP_ALLOWED_NUMBERS || "").split(",").map(normalizePhone).filter(Boolean);
  return !configured.length || configured.includes(normalizePhone(phone));
}

function extractMessages(payload) {
  const messages = [];
  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      for (const message of change?.value?.messages || []) {
        if (message.type !== "text" || !message.text?.body || !message.from) continue;
        messages.push({
          provider: "whatsapp_cloud_api",
          from: normalizePhone(message.from),
          message_id: String(message.id || ""),
          text: String(message.text.body).trim().slice(0, 4000),
          received_at: new Date().toISOString()
        });
      }
    }
  }
  return messages;
}

async function callAgent(event) {
  const url = String(process.env.KASTEDS_AGENT_WEBHOOK_URL || "");
  if (!url) return null;
  const headers = { "Content-Type": "application/json" };
  if (process.env.KASTEDS_AGENT_WEBHOOK_SECRET) headers.Authorization = `Bearer ${process.env.KASTEDS_AGENT_WEBHOOK_SECRET}`;
  let response;
  try {
    response = await fetch(url, { method: "POST", headers, body: JSON.stringify(event) });
  } catch (error) {
    console.error("KasTEDS agent webhook network error", { message: error.message });
    throw new HttpError(502, "agent_webhook_failed", "Agent webhook tidak dapat dihubungi.");
  }
  const text = await response.text();
  if (!response.ok) {
    console.error("KasTEDS agent webhook failed", { status: response.status, message: text.slice(0, 200) });
    throw new HttpError(502, "agent_webhook_failed", "Agent webhook menolak pesan.");
  }
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  const reply = typeof data === "string" ? data : data?.reply || data?.text || data?.message;
  return typeof reply === "string" && reply.trim() ? reply.trim().slice(0, 4096) : null;
}

async function sendWhatsAppText(to, text) {
  const accessToken = String(process.env.WHATSAPP_ACCESS_TOKEN || "");
  const phoneNumberId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || "");
  if (!accessToken || !phoneNumberId) return false;
  const graphVersion = String(process.env.WHATSAPP_GRAPH_VERSION || "v20.0");
  let response;
  try {
    response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } })
    });
  } catch (error) {
    console.error("KasTEDS WhatsApp send network error", { message: error.message });
    throw new HttpError(502, "whatsapp_send_failed", "Balasan WhatsApp gagal dikirim.");
  }
  if (!response.ok) {
    const detail = await response.text();
    console.error("KasTEDS WhatsApp send failed", { status: response.status, message: detail.slice(0, 200) });
    throw new HttpError(502, "whatsapp_send_failed", "Balasan WhatsApp gagal dikirim.");
  }
  return true;
}

async function verifyRequest(req) {
  const rawBody = await readRawBody(req);
  verifyMetaSignature(req, rawBody);
  let payload;
  try { payload = JSON.parse(rawBody.toString("utf8")); } catch { throw new HttpError(400, "invalid_json", "Body webhook JSON tidak valid."); }
  return payload;
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  try {
    if (req.method === "GET") {
      const mode = String(req.query?.["hub.mode"] || "");
      const token = String(req.query?.["hub.verify_token"] || "");
      const challenge = String(req.query?.["hub.challenge"] || "");
      if (!process.env.WHATSAPP_VERIFY_TOKEN) throw new HttpError(503, "whatsapp_not_configured", "Webhook WhatsApp belum dikonfigurasi.");
      if (mode !== "subscribe" || !sameSecret(token, String(process.env.WHATSAPP_VERIFY_TOKEN))) throw new HttpError(403, "forbidden", "Verifikasi webhook ditolak.");
      res.status(200).send(challenge);
      return;
    }
    if (req.method !== "POST") return methodNotAllowed(req, res, ["GET", "POST", "OPTIONS"]);
    const payload = await verifyRequest(req);
    const messages = extractMessages(payload);
    if (messages.length && !String(process.env.WHATSAPP_ALLOWED_NUMBERS || "").trim()) throw new HttpError(503, "whatsapp_not_configured", "WHATSAPP_ALLOWED_NUMBERS belum dikonfigurasi.");
    let processed = 0;
    let sent = 0;
    for (const event of messages) {
      if (!isAllowedPhone(event.from)) continue;
      try {
        const reply = await callAgent({ ...event, idempotency_key: event.message_id || undefined });
        processed += 1;
        if (reply && await sendWhatsAppText(event.from, reply)) sent += 1;
      } catch (error) {
        console.error("KasTEDS WhatsApp event failed", { message_id: event.message_id, error: error.message });
      }
    }
    json(req, res, 200, { data: { received: true, messages: messages.length, processed, sent } });
  } catch (error) {
    fail(req, res, error);
  }
};

module.exports.config = { api: { bodyParser: false } };
