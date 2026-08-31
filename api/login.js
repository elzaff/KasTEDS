const crypto = require("node:crypto");

module.exports = (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const adminEmail = String(process.env.ADMIN_EMAIL || "admin@kasteds.local").trim().toLowerCase();
  const adminPassword = String(process.env.ADMIN_PASSWORD || "");

  if (!adminPassword || email !== adminEmail || password !== adminPassword) return res.status(401).json({ error: "Invalid admin credentials" });

  const token = crypto.createHmac("sha256", adminPassword).update(`${email}:${Date.now()}`).digest("hex");
  res.setHeader("Set-Cookie", `kasteds_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`);
  return res.status(200).json({ ok: true });
};
