const crypto = require("node:crypto");

class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function requestId(req) {
  return String(req.headers?.["x-request-id"] || crypto.randomUUID()).slice(0, 120);
}

function setHeaders(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Request-Id", requestId(req));
  const origin = process.env.KASTEDS_AGENT_ORIGIN;
  if (origin && req.headers?.origin === origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Idempotency-Key");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
}

function json(req, res, status, payload) {
  setHeaders(req, res);
  res.status(status).json(payload);
}

function ok(req, res, data, status = 200, meta) {
  json(req, res, status, meta ? { data, meta } : { data });
}

function fail(req, res, error) {
  const known = error instanceof HttpError || error?.name === "ValidationError";
  const status = known ? error.status : 500;
  const payload = {
    error: {
      code: known ? error.code : "internal_error",
      message: known ? error.message : "Terjadi kesalahan di server.",
      ...(known && error.details ? { details: error.details } : {})
    }
  };
  if (!known) console.error("KasTEDS API error", error);
  json(req, res, status, payload);
}

function methodNotAllowed(req, res, methods) {
  res.setHeader("Allow", methods.join(", "));
  fail(req, res, new HttpError(405, "method_not_allowed", "Metode HTTP tidak didukung."));
}

function handleOptions(req, res) {
  if (req.method !== "OPTIONS") return false;
  setHeaders(req, res);
  res.status(204).end();
  return true;
}

function bearerToken(req) {
  const value = req.headers?.authorization || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function requireAgentAuth(req) {
  const expected = process.env.KASTEDS_AGENT_API_KEY;
  if (!expected) throw new HttpError(503, "agent_api_not_configured", "API agent belum dikonfigurasi di Vercel.");
  const received = bearerToken(req);
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  if (!received || expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw new HttpError(401, "unauthorized", "API key tidak valid.");
  }
}

function readRawBody(req, maxBytes = 1_000_000) {
  if (req.rawBody) return Promise.resolve(Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(req.rawBody));
  if (req.body !== undefined && !req.readable) return Promise.resolve(Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body)));
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new HttpError(413, "payload_too_large", "Payload terlalu besar."));
        req.destroy?.();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function parseJson(req) {
  if (req.body !== undefined && typeof req.body === "object" && req.body !== null) return req.body;
  const raw = await readRawBody(req);
  if (!raw.length) return {};
  try {
    return JSON.parse(raw.toString("utf8"));
  } catch {
    throw new HttpError(400, "invalid_json", "Body JSON tidak valid.");
  }
}

function queryValue(req, name) {
  const value = req.query?.[name];
  return Array.isArray(value) ? value[0] : value;
}

module.exports = { HttpError, json, ok, fail, methodNotAllowed, handleOptions, requireAgentAuth, readRawBody, parseJson, queryValue, setHeaders };
