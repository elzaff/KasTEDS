class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "ValidationError";
    this.status = 422;
    this.code = "validation_error";
    this.details = details;
  }
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function normalizeMonth(value, fallback = currentMonth()) {
  const raw = String(value || fallback).trim();
  const month = raw.match(MONTH_PATTERN) ? raw : raw.match(/^(\d{4})-(0[1-9]|1[0-2])-01$/)?.[0].slice(0, 7);
  if (!month || !MONTH_PATTERN.test(month)) throw new ValidationError("Bulan harus berformat YYYY-MM.");
  return month;
}

function monthStart(month) {
  return `${month}-01`;
}

function nextMonthStart(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, monthNumber, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function currentMonth(timeZone = process.env.KASTEDS_TIMEZONE || "Asia/Jakarta") {
  const parts = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}`;
}

function currentDate(timeZone = process.env.KASTEDS_TIMEZONE || "Asia/Jakarta") {
  const parts = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function normalizeDate(value, month) {
  const date = String(value || currentDate()).trim();
  const match = date.match(DATE_PATTERN);
  if (!match) throw new ValidationError("Tanggal harus berformat YYYY-MM-DD.");
  const [, year, monthNumber, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(monthNumber) - 1, Number(day)));
  if (parsed.getUTCFullYear() !== Number(year) || parsed.getUTCMonth() + 1 !== Number(monthNumber) || parsed.getUTCDate() !== Number(day)) {
    throw new ValidationError("Tanggal tidak valid.");
  }
  if (!date.startsWith(`${month}-`)) throw new ValidationError(`Tanggal harus berada di bulan ${month}.`);
  return date;
}

function normalizeText(value, field, { required = true, max = 160 } = {}) {
  const text = String(value ?? "").trim();
  if (required && !text) throw new ValidationError(`${field} wajib diisi.`);
  if (text.length > max) throw new ValidationError(`${field} terlalu panjang.`, [{ field, max }]);
  return text || null;
}

function normalizeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000_000) throw new ValidationError("Nominal harus lebih besar dari 0 dan masuk akal.");
  return Math.round(amount * 100) / 100;
}

module.exports = { ValidationError, normalizeMonth, monthStart, nextMonthStart, currentMonth, currentDate, normalizeDate, normalizeText, normalizeAmount };

if (require.main === module) {
  console.assert(normalizeMonth("2026-09") === "2026-09");
  console.assert(nextMonthStart("2026-12") === "2027-01-01");
  console.assert(normalizeDate("2026-09-01", "2026-09") === "2026-09-01");
  console.assert(normalizeAmount("370000") === 370000);
  console.log("validation smoke check passed");
}
