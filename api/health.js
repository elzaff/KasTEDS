const { handleOptions, json, methodNotAllowed } = require("./_lib/http");

module.exports = function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "GET") return methodNotAllowed(req, res, ["GET", "OPTIONS"]);
  const configured = Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY) && process.env.KASTEDS_AGENT_API_KEY);
  json(req, res, configured ? 200 : 503, { data: { status: configured ? "ok" : "not_configured", service: "kasteds-agent" } });
};
