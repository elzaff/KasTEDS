const { HttpError, ok, fail, methodNotAllowed, handleOptions, requireAgentAuth, parseJson, queryValue } = require("./_lib/http");
const { SupabaseError, request: supabaseRequest } = require("./_lib/supabase");
const { ValidationError, normalizeMonth, monthStart, nextMonthStart, currentDate, normalizeDate, normalizeText, normalizeAmount } = require("./_lib/validation");

const TRANSACTION_SELECT = "id,type,amount,title,description,transaction_date,created_at,created_by,external_id,categories(name,icon)";
const TRANSACTION_SELECT_LEGACY = TRANSACTION_SELECT.replace(",external_id", "");
const monthSchemaMessage = "Jalankan supabase/schema.sql untuk mengaktifkan integrasi agent.";
let externalIdSupported;

function isMissingColumn(error, column) {
  return error instanceof SupabaseError && new RegExp(`(?:column|schema cache).*${column}|${column}.*(?:column|schema cache)`, "i").test(error.message);
}

function mapTransaction(row) {
  const relation = Array.isArray(row.categories) ? row.categories[0] : row.categories;
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    title: row.title,
    description: row.description || "",
    category: relation?.name || "Lainnya",
    icon: relation?.icon || "circle-dot",
    date: row.transaction_date,
    created_at: row.created_at,
    created_by: row.created_by || null,
    external_id: row.external_id || null
  };
}

function budgetPayload(rows, month) {
  return rows.map((item) => {
    const name = normalizeText(item?.name, "name", { max: 80 });
    const amount = Number(item?.amount);
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000_000) throw new ValidationError("Nominal budget harus 0 atau lebih.");
    return { name, month: monthStart(month), amount: Math.round(amount * 100) / 100, active: true, updated_at: new Date().toISOString() };
  });
}

async function fetchTransactions(month) {
  const query = {
    select: TRANSACTION_SELECT,
    transaction_date: [`gte.${monthStart(month)}`, `lt.${nextMonthStart(month)}`],
    order: "transaction_date.desc,created_at.desc",
    limit: 1000
  };
  let rows;
  try {
    rows = await supabaseRequest("transactions", { query });
  } catch (error) {
    if (!isMissingColumn(error, "external_id")) throw error;
    externalIdSupported = false;
    rows = await supabaseRequest("transactions", { query: { ...query, select: TRANSACTION_SELECT_LEGACY } });
  }
  return (rows || []).map(mapTransaction);
}

async function fetchBudget(month, required = false) {
  try {
    const rows = await supabaseRequest("budget_items", {
      query: { select: "id,name,amount,active,month", active: "eq.true", month: `eq.${monthStart(month)}`, order: "name" }
    });
    const items = rows || [];
    return { available: true, items, total: items.reduce((sum, item) => sum + Number(item.amount || 0), 0) };
  } catch (error) {
    if (isMissingColumn(error, "month")) {
      if (required) throw new HttpError(503, "schema_migration_required", monthSchemaMessage);
      return { available: false, items: [], total: 0 };
    }
    throw error;
  }
}

async function resolveCategory(categoryValue) {
  const name = normalizeText(categoryValue || "Lainnya", "category", { max: 80 });
  const rows = await supabaseRequest("categories", { query: { select: "id,name,icon", name: `eq.${name}`, active: "eq.true", limit: 1 } });
  if (!rows?.length) throw new HttpError(422, "unknown_category", `Kategori ${name} tidak ditemukan.`);
  return rows[0];
}

async function findExistingExternalId(externalId) {
  if (!externalId || externalIdSupported === false) return null;
  try {
    const rows = await supabaseRequest("transactions", { query: { select: TRANSACTION_SELECT, external_id: `eq.${externalId}`, limit: 1 } });
    externalIdSupported = true;
    return rows?.[0] ? mapTransaction(rows[0]) : null;
  } catch (error) {
    if (isMissingColumn(error, "external_id")) {
      externalIdSupported = false;
      return null;
    }
    throw error;
  }
}

function actorId() {
  const value = String(process.env.KASTEDS_AGENT_ACTOR_ID || "").trim();
  return /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value) ? value : null;
}

async function addTransaction(body, req) {
  const rawDate = String(body.date || "").trim();
  const month = normalizeMonth(body.month || (rawDate.match(/^\d{4}-\d{2}-\d{2}$/) ? rawDate.slice(0, 7) : undefined));
  const defaultDate = currentDate();
  const date = normalizeDate(rawDate || (defaultDate.startsWith(`${month}-`) ? defaultDate : monthStart(month)), month);
  const type = String(body.type || "").trim().toUpperCase();
  if (!["INCOME", "EXPENSE"].includes(type)) throw new ValidationError("type harus INCOME atau EXPENSE.");
  const title = normalizeText(body.title, "title", { max: 160 });
  const amount = normalizeAmount(body.amount);
  const description = normalizeText(body.description, "description", { required: false, max: 500 });
  const category = await resolveCategory(body.category);
  const externalId = normalizeText(body.idempotency_key || body.external_id || req.headers?.["idempotency-key"], "idempotency_key", { required: false, max: 120 });
  const existing = await findExistingExternalId(externalId);
  if (existing) return { data: existing, deduplicated: true };

  const payload = { type, amount, title, category_id: category.id, transaction_date: date, description };
  const creator = actorId();
  if (creator) payload.created_by = creator;
  if (externalId && externalIdSupported !== false) payload.external_id = externalId;
  let rows;
  try {
    rows = await supabaseRequest("transactions", { method: "POST", query: { select: TRANSACTION_SELECT }, body: payload, prefer: "return=representation" });
  } catch (error) {
    if (isMissingColumn(error, "external_id")) {
      externalIdSupported = false;
      delete payload.external_id;
      rows = await supabaseRequest("transactions", { method: "POST", query: { select: TRANSACTION_SELECT_LEGACY }, body: payload, prefer: "return=representation" });
    } else if (externalId && error instanceof SupabaseError && error.status === 409) {
      const duplicate = await findExistingExternalId(externalId);
      if (duplicate) return { data: duplicate, deduplicated: true };
      throw error;
    } else {
      throw error;
    }
  }
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row) throw new HttpError(502, "upstream_error", "Supabase tidak mengembalikan transaksi baru.");
  return { data: mapTransaction(row), deduplicated: false };
}

async function setBudget(body) {
  const month = normalizeMonth(body.month);
  const rawItems = Array.isArray(body.items)
    ? body.items
    : Object.entries(body.items || {}).map(([name, amount]) => ({ name, amount }));
  if (!rawItems.length || rawItems.length > 50) throw new ValidationError("items budget harus berisi 1 sampai 50 komponen.");
  const names = rawItems.map((item) => String(item?.name || "").trim().toLowerCase());
  if (new Set(names).size !== names.length) throw new ValidationError("Nama komponen budget tidak boleh duplikat.");
  const rows = budgetPayload(rawItems, month);
  try {
    const data = await supabaseRequest("budget_items", {
      method: "POST",
      query: { on_conflict: "name,month", select: "id,name,amount,active,month" },
      body: rows,
      prefer: "resolution=merge-duplicates,return=representation"
    });
    return { month, items: data || rows, total: (data || rows).reduce((sum, item) => sum + Number(item.amount || 0), 0) };
  } catch (error) {
    if (isMissingColumn(error, "month")) throw new HttpError(503, "schema_migration_required", monthSchemaMessage);
    throw error;
  }
}

function filterTransactions(items, req) {
  const type = String(queryValue(req, "type") || "ALL").toUpperCase();
  const search = String(queryValue(req, "q") || "").trim().toLowerCase();
  if (type !== "ALL" && !["INCOME", "EXPENSE"].includes(type)) throw new HttpError(400, "invalid_filter", "Filter type harus INCOME, EXPENSE, atau ALL.");
  const filtered = items.filter((item) => {
    const matchesType = type === "ALL" || item.type === type;
    const haystack = `${item.title} ${item.category} ${item.description}`.toLowerCase();
    return matchesType && (!search || haystack.includes(search));
  });
  const limit = Math.min(100, Math.max(1, Number(queryValue(req, "limit") || 50)));
  return filtered.slice(0, Number.isFinite(limit) ? limit : 50);
}

async function handleGet(req, res) {
  const month = normalizeMonth(queryValue(req, "month"));
  const view = String(queryValue(req, "view") || "summary").toLowerCase();
  if (view === "transactions") {
    const data = filterTransactions(await fetchTransactions(month), req);
    return ok(req, res, data, 200, { month, count: data.length });
  }
  if (view === "budget") return ok(req, res, { month, ...(await fetchBudget(month)) });
  if (view !== "summary") throw new HttpError(400, "invalid_view", "view harus summary, transactions, atau budget.");
  const transactions = await fetchTransactions(month);
  const income = transactions.filter((item) => item.type === "INCOME").reduce((sum, item) => sum + item.amount, 0);
  const expense = transactions.filter((item) => item.type === "EXPENSE").reduce((sum, item) => sum + item.amount, 0);
  return ok(req, res, {
    month,
    balance: income - expense,
    totals: { income, expense, net: income - expense },
    transaction_count: transactions.length,
    recent: transactions.slice(0, 10),
    budget: await fetchBudget(month)
  });
}

async function handlePost(req, res) {
  const body = await parseJson(req);
  const action = String(body.action || "").trim().toLowerCase();
  if (["add_transaction", "transaction", "create_transaction"].includes(action)) {
    const result = await addTransaction(body, req);
    return ok(req, res, result.data, result.deduplicated ? 200 : 201, result.deduplicated ? { deduplicated: true } : undefined);
  }
  if (["set_budget", "budget", "save_budget"].includes(action)) return ok(req, res, await setBudget(body));
  throw new HttpError(400, "invalid_action", "action harus add_transaction atau set_budget.");
}

function mapError(error) {
  if (error instanceof SupabaseError) {
    if (error.status === 409) return new HttpError(409, "conflict", "Data bentrok dengan catatan yang sudah ada.");
    return new HttpError(502, "upstream_error", "Supabase gagal memproses permintaan.");
  }
  return error;
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  try {
    requireAgentAuth(req);
    if (req.method === "GET") return await handleGet(req, res);
    if (req.method === "POST") return await handlePost(req, res);
    return methodNotAllowed(req, res, ["GET", "POST", "OPTIONS"]);
  } catch (error) {
    fail(req, res, mapError(error));
  }
};
