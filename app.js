let transactions = [];
let budgetItems = [];
let categories = [];
let currentSession = null;
let currentUser = null;
let currentProfile = null;
const initialMonth = "2026-09";
let activeMonth = initialMonth;
let budgetMonthSupported = true;
const openingBalance = 0;
const fallbackCategories = [
  { name: "Iuran Bulanan", icon: "coins" }, { name: "Listrik", icon: "zap" }, { name: "WiFi", icon: "wifi" },
  { name: "Air PDAM", icon: "droplets" }, { name: "Kebersihan", icon: "sparkles" }, { name: "Perbaikan", icon: "wrench" },
  { name: "Perlengkapan Rumah", icon: "shopping-basket" }, { name: "Kas", icon: "wallet" }, { name: "Lainnya", icon: "shapes" }
];
const transactionCategoryGroups = {
  INCOME: ["Iuran Bulanan", "Kas", "Lainnya"],
  EXPENSE: ["Listrik", "WiFi", "Air PDAM", "Tagihan", "Kebersihan", "Perbaikan", "Perlengkapan Rumah", "Kas", "Lainnya"]
};
const transactionCopy = {
  INCOME: { title: "Tambah pemasukan", context: "Catat sumber dana yang masuk ke kas komunal.", titleLabel: "Sumber pemasukan", titlePlaceholder: "Contoh: Iuran kas bulanan", categoryLabel: "Kategori pemasukan", descriptionPlaceholder: "Tambahkan detail sumber dana...", submit: "Simpan pemasukan" },
  EXPENSE: { title: "Tambah pengeluaran", context: "Catat kebutuhan yang dibayar dari kas komunal.", titleLabel: "Keperluan pengeluaran", titlePlaceholder: "Contoh: Bayar listrik rumah", categoryLabel: "Kategori pengeluaran", descriptionPlaceholder: "Tambahkan detail penggunaan dana...", submit: "Simpan pengeluaran" }
};

const supabaseConfig = window.KASTEDS_SUPABASE || {};
const supabaseClient = window.supabase?.createClient && supabaseConfig.url && supabaseConfig.publishableKey
  ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.publishableKey)
  : null;
const iconFor = (name) => ({ zap: "zap", wifi: "wifi", coins: "coins", wrench: "wrench", sparkles: "sparkles", droplets: "droplets", "shopping-basket": "shopping-basket", wallet: "wallet-cards", shapes: "shapes" }[name] || "circle-dot");
const formatIDR = (value, spaced = false) => `${spaced ? "Rp " : "Rp"}${Math.round(Number(value) || 0).toLocaleString("id-ID")}`;
const amountDigits = (value) => String(value ?? "").replace(/\D/g, "");
const parseAmountInput = (value) => Number(amountDigits(value)) || 0;
const formatInputAmount = (value) => { const digits = amountDigits(value); return digits ? Number(digits).toLocaleString("id-ID") : ""; };
function formatAmountInput(input) {
  const raw = input.value;
  const caret = input.selectionStart;
  const digitsBeforeCaret = raw.slice(0, caret ?? raw.length).replace(/\D/g, "").length;
  input.value = formatInputAmount(raw);
  if (document.activeElement !== input || caret === null) return;
  let nextCaret = 0;
  let seenDigits = 0;
  while (nextCaret < input.value.length && seenDigits < digitsBeforeCaret) {
    if (/\d/.test(input.value[nextCaret])) seenDigits += 1;
    nextCaret += 1;
  }
  input.setSelectionRange(nextCaret, nextCaret);
}
const formatSigned = (item) => `${item.type === "INCOME" ? "+" : "-"}${formatIDR(item.amount)}`;
const formatDate = (value) => { if (!value) return ""; const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }); };
const todayISO = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };
const escapeHTML = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[character]));
const byId = (id) => document.getElementById(id);
const monthFormatter = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
const shortMonthFormatter = new Intl.DateTimeFormat("id-ID", { month: "short", year: "2-digit", timeZone: "UTC" });
const isMonthKey = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const formatMonthLabel = (month) => monthFormatter.format(new Date(`${month}-01T00:00:00Z`));
const formatShortMonthLabel = (month) => shortMonthFormatter.format(new Date(`${month}-01T00:00:00Z`));
const formatCompactIDR = (value) => {
  const amount = Math.round(Number(value) || 0);
  if (amount >= 1_000_000_000) return `Rp${(amount / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (amount >= 1_000_000) return `Rp${(amount / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (amount >= 1_000) return `Rp${(amount / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} rb`;
  return formatIDR(amount, true);
};
const monthStart = (month) => `${month}-01`;
const shiftMonth = (month, delta) => {
  const [year, monthNumber] = (isMonthKey(month) ? month : initialMonth).split("-").map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
};
const activeTransactions = () => transactions.filter((item) => String(item.date || "").startsWith(`${activeMonth}-`));
const emptyStateMarkup = (icon, title, message) => `<div class="empty-state"><i data-lucide="${escapeHTML(icon)}"></i><strong>${escapeHTML(title)}</strong><span>${escapeHTML(message)}</span></div>`;
const chartColors = ["#ff8f8f", "#83d6ff", "#ffdc4f", "#75e1bd", "#bf9cff", "#f3a15c"];
function updateMonthUI() {
  const label = formatMonthLabel(activeMonth);
  document.querySelectorAll("[data-month-label]").forEach((element) => { element.textContent = label; });
  if (byId("month-label")) byId("month-label").setAttribute("aria-label", `Bulan aktif ${label}`);
}
function setActiveMonth(month) {
  if (!isMonthKey(month)) return;
  activeMonth = month;
  updateMonthUI();
  budgetItems = [];
  renderTransactions();
  renderSummary();
  renderBudget();
  if (supabaseClient) loadSupabaseData(true).catch((error) => { console.error("KasTEDS month load failed", error); });
}
const isAdmin = () => Boolean(currentSession && currentProfile?.role === "ADMIN");

function showLogin() {
  byId("login-screen").classList.add("is-open");
  byId("login-error").textContent = supabaseClient ? "" : "Supabase belum terhubung.";
  setTimeout(() => byId("login-email").focus(), 80);
}

function updateProfileUI() {
  const label = currentProfile?.display_name || currentUser?.email?.split("@")[0] || "Masuk admin";
  const initials = label.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "AK";
  [byId("profile-name"), byId("profile-name-sidebar")].forEach((element) => { if (element) element.textContent = label; });
  [byId("profile-avatar"), byId("profile-avatar-sidebar")].forEach((element) => { if (element) element.textContent = initials; });
  if (byId("profile-action")) byId("profile-action").textContent = isAdmin() ? "Keluar" : "Masuk";
}

function unlockApp(session, profile) {
  currentSession = session;
  currentUser = session?.user || null;
  currentProfile = profile;
  sessionStorage.setItem("kasteds_admin", "1");
  document.body.classList.add("admin-session");
  updateProfileUI();
  byId("login-screen").classList.remove("is-open");
}

function lockApp() {
  currentSession = null;
  currentUser = null;
  currentProfile = null;
  sessionStorage.removeItem("kasteds_admin");
  document.body.classList.remove("admin-session");
  updateProfileUI();
}

async function loadProfile(user) {
  const { data, error } = await supabaseClient.from("profiles").select("display_name, role").eq("id", user.id).maybeSingle();
  if (error) throw new Error("Profil admin belum tersedia. Jalankan schema Supabase lalu tambahkan role ADMIN.");
  return data;
}

byId("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.target.querySelector("button[type=submit]");
  button.disabled = true;
  button.textContent = "Memeriksa...";
  byId("login-error").textContent = "";
  try {
    if (!supabaseClient) throw new Error("Supabase belum terhubung.");
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email: byId("login-email").value.trim().toLowerCase(), password: byId("login-password").value });
    if (error) throw new Error("Akun Supabase belum dibuat atau password salah. Cek Authentication → Users.");
    const profile = await loadProfile(data.user);
    if (profile?.role !== "ADMIN") {
      await supabaseClient.auth.signOut();
      throw new Error("Akun ini belum memiliki akses admin.");
    }
    unlockApp(data.session, profile);
    await loadSupabaseData(true);
    showToast("Berhasil masuk sebagai admin.");
  } catch (error) {
    byId("login-error").textContent = error.message || "Login gagal.";
  } finally {
    button.disabled = false;
    button.innerHTML = 'Masuk sebagai admin <i data-lucide="arrow-right"></i>';
    byId("login-password").value = "";
    window.lucide?.createIcons();
  }
});

async function logoutAdmin() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  lockApp();
  setView("dashboard");
  showToast("Anda sudah keluar dari mode admin.");
}

byId("logout-button").addEventListener("click", () => isAdmin() ? logoutAdmin() : showLogin());
byId("profile-button").addEventListener("click", () => isAdmin() ? logoutAdmin() : showLogin());
byId("cancel-login").addEventListener("click", () => byId("login-screen").classList.remove("is-open"));

function mapTransaction(row) {
  const relation = Array.isArray(row.categories) ? row.categories[0] : row.categories;
  return { id: row.id, type: row.type, amount: Number(row.amount), title: row.title, category: relation?.name || "Lainnya", icon: relation?.icon || "circle-dot", date: row.transaction_date, description: row.description || "" };
}

function transactionMarkup(item) {
  const metadata = [item.category, formatDate(item.date)].filter(Boolean).join(" · ");
  const typeLabel = item.type === "INCOME" ? "Pemasukan" : "Pengeluaran";
  return `<button type="button" class="transaction-item" data-detail-id="${escapeHTML(item.id)}" aria-label="Lihat detail ${escapeHTML(typeLabel.toLowerCase())} ${escapeHTML(item.title)} ${escapeHTML(formatIDR(item.amount, true))}"><span class="transaction-icon ${item.type === "INCOME" ? "income" : "expense"}" aria-hidden="true"><i data-lucide="${escapeHTML(iconFor(item.icon))}"></i></span><span class="transaction-copy"><strong>${escapeHTML(item.title)}</strong><span>${escapeHTML(metadata)}</span></span><strong class="transaction-amount ${item.type === "INCOME" ? "income" : "expense"}" aria-hidden="true">${escapeHTML(formatSigned(item))}</strong></button>`;
}

function renderTransactions() {
  const visibleTransactions = activeTransactions();
  const query = (byId("transaction-search")?.value || "").toLowerCase();
  const type = byId("type-filter")?.value || "ALL";
  const category = byId("category-filter")?.value || "ALL";
  const filtered = visibleTransactions.filter((item) => {
    const matchesQuery = !query || `${item.title} ${item.category}`.toLowerCase().includes(query);
    const matchesType = type === "ALL" || item.type === type;
    const matchesCategory = category === "ALL" || item.category.toLowerCase() === category.toLowerCase();
    return matchesQuery && matchesType && matchesCategory;
  });
  const empty = `<div class="empty-state"><i data-lucide="inbox"></i><strong>Belum ada transaksi</strong><span>Catat pemasukan atau pengeluaran pertama.</span></div>`;
  byId("recent-transactions").innerHTML = visibleTransactions.length ? visibleTransactions.slice(0, 4).map(transactionMarkup).join("") : empty;
  byId("all-transactions").innerHTML = filtered.length ? filtered.map(transactionMarkup).join("") : `<div class="empty-state"><i data-lucide="search-x"></i><strong>${visibleTransactions.length ? "Transaksi tidak ditemukan" : "Belum ada transaksi"}</strong><span>${visibleTransactions.length ? "Coba ubah kata kunci atau filter." : "Catat pemasukan atau pengeluaran pertama."}</span></div>`;
  byId("result-count").textContent = `${filtered.length} transaksi`;
  byId("transaction-count").textContent = visibleTransactions.length;
  window.lucide?.createIcons();
}

function totalsForMonth(month) {
  return transactions.reduce((totals, item) => {
    if (!String(item.date || "").startsWith(`${month}-`)) return totals;
    if (item.type === "INCOME") totals.income += Number(item.amount) || 0;
    if (item.type === "EXPENSE") totals.expense += Number(item.amount) || 0;
    return totals;
  }, { income: 0, expense: 0 });
}

function renderMonthlyCashflow() {
  const host = byId("monthly-cashflow-chart");
  if (!host) return;
  const months = Array.from({ length: 6 }, (_, index) => shiftMonth(activeMonth, index - 5));
  const totals = months.map((month) => ({ month, ...totalsForMonth(month) }));
  const hasData = totals.some((item) => item.income || item.expense);
  const windowLabel = byId("cashflow-window");
  if (windowLabel) windowLabel.textContent = `${months.length} bulan terakhir`;
  if (!hasData) {
    host.innerHTML = emptyStateMarkup("bar-chart-3", "Belum ada data", `Catat transaksi untuk melihat arus kas ${formatMonthLabel(activeMonth)}.`);
    window.lucide?.createIcons();
    return;
  }
  const maxValue = Math.max(1, ...totals.map((item) => Math.max(item.income, item.expense)));
  const latest = totals[totals.length - 1];
  const bars = totals.map((item) => {
    const incomeHeight = item.income ? Math.max(4, (item.income / maxValue) * 100) : 0;
    const expenseHeight = item.expense ? Math.max(4, (item.expense / maxValue) * 100) : 0;
    const currentClass = item.month === activeMonth ? " current" : "";
    const label = `${formatMonthLabel(item.month)}: pemasukan ${formatIDR(item.income, true)}, pengeluaran ${formatIDR(item.expense, true)}`;
    return `<div class="bar-group" role="group" aria-label="${escapeHTML(label)}"><div class="bar-pair${currentClass}" aria-hidden="true"><span class="bar income-bar" style="height:${incomeHeight}%" title="Pemasukan ${escapeHTML(formatIDR(item.income, true))}"></span><span class="bar expense-bar" style="height:${expenseHeight}%" title="Pengeluaran ${escapeHTML(formatIDR(item.expense, true))}"></span></div><small aria-hidden="true">${escapeHTML(formatShortMonthLabel(item.month))}</small></div>`;
  }).join("");
  host.innerHTML = `<div class="chart-legend" aria-hidden="true"><span><i class="income-swatch"></i>Pemasukan</span><span><i class="expense-swatch"></i>Pengeluaran</span></div><div class="bar-chart" role="img" aria-label="Perbandingan pemasukan dan pengeluaran selama enam bulan"><div class="bar-y" aria-hidden="true"><span>${escapeHTML(formatCompactIDR(maxValue))}</span><span>${escapeHTML(formatCompactIDR(maxValue / 2))}</span><span>Rp 0</span></div><div class="bars">${bars}</div></div><p class="chart-summary">${escapeHTML(formatMonthLabel(activeMonth))}: pemasukan <strong>${escapeHTML(formatIDR(latest.income, true))}</strong>, pengeluaran <strong>${escapeHTML(formatIDR(latest.expense, true))}</strong>.</p>`;
}

function renderExpenseBreakdown() {
  const host = byId("expense-breakdown-chart");
  if (!host) return;
  const grouped = new Map();
  activeTransactions().filter((item) => item.type === "EXPENSE").forEach((item) => {
    grouped.set(item.category || "Lainnya", (grouped.get(item.category || "Lainnya") || 0) + (Number(item.amount) || 0));
  });
  const breakdown = [...grouped.entries()].map(([category, amount], index) => ({ category, amount, color: chartColors[index % chartColors.length] })).sort((a, b) => b.amount - a.amount);
  const total = breakdown.reduce((sum, item) => sum + item.amount, 0);
  if (!total) {
    host.innerHTML = emptyStateMarkup("pie-chart", "Belum ada data", `Breakdown biaya ${formatMonthLabel(activeMonth)} akan muncul setelah pengeluaran dicatat.`);
    window.lucide?.createIcons();
    return;
  }
  let cursor = 0;
  const gradient = breakdown.map((item) => {
    const start = cursor;
    cursor += (item.amount / total) * 100;
    return `${item.color} ${start}% ${cursor}%`;
  }).join(", ");
  const legend = breakdown.map((item) => `<div><i class="legend-swatch" style="background:${item.color}" aria-hidden="true"></i><span>${escapeHTML(item.category)}</span><strong>${escapeHTML(formatIDR(item.amount, true))}</strong></div>`).join("");
  const summary = breakdown.slice(0, 3).map((item) => `${item.category} ${formatIDR(item.amount, true)}`).join(", ");
  host.innerHTML = `<div class="report-donut-wrap"><div class="donut large" style="background:conic-gradient(${gradient})" role="img" aria-label="Komposisi pengeluaran ${formatMonthLabel(activeMonth)}: ${escapeHTML(summary)}"><span>${escapeHTML(formatCompactIDR(total))}<small>Total</small></span></div><div class="legend large-legend">${legend}</div></div><p class="chart-summary">Total pengeluaran ${escapeHTML(formatIDR(total, true))}. Terbesar: ${escapeHTML(summary)}.</p>`;
}

function renderExpenseHighlight() {
  const host = byId("expense-highlight");
  if (!host) return;
  const expenses = activeTransactions().filter((item) => item.type === "EXPENSE").sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
  if (!expenses.length) {
    host.innerHTML = emptyStateMarkup("receipt", "Belum ada pengeluaran", `Belum ada pengeluaran di ${formatMonthLabel(activeMonth)}.`);
    window.lucide?.createIcons();
    return;
  }
  const rows = expenses.slice(0, 3).map((item) => `<button type="button" class="highlight-item" data-detail-id="${escapeHTML(item.id)}" aria-label="Lihat detail pengeluaran ${escapeHTML(item.title)} ${escapeHTML(formatIDR(item.amount, true))}"><span class="highlight-copy"><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.category)} · ${escapeHTML(formatDate(item.date))}</small></span><strong class="transaction-amount expense">-${escapeHTML(formatIDR(item.amount))}</strong></button>`).join("");
  host.innerHTML = `<div class="expense-highlight-list">${rows}</div>${expenses.length > 3 ? `<p class="chart-summary">Menampilkan 3 pengeluaran terbesar dari ${expenses.length} transaksi.</p>` : ""}`;
}

function renderReports() {
  renderMonthlyCashflow();
  renderExpenseBreakdown();
}

function renderSummary() {
  const visibleTransactions = activeTransactions();
  const income = visibleTransactions.filter((item) => item.type === "INCOME").reduce((sum, item) => sum + item.amount, 0);
  const expense = visibleTransactions.filter((item) => item.type === "EXPENSE").reduce((sum, item) => sum + item.amount, 0);
  const net = income - expense;
  byId("balance-value").textContent = formatIDR(openingBalance + net, true);
  document.querySelectorAll(".income-text").forEach((element) => { element.textContent = `+${formatIDR(income)}`; });
  document.querySelectorAll(".expense-text").forEach((element) => { element.textContent = `-${formatIDR(expense)}`; });
  byId("income-total").textContent = formatIDR(income, true);
  byId("expense-total").textContent = formatIDR(expense, true);
  byId("net-value").textContent = formatIDR(net, true);
  byId("transaction-status").textContent = visibleTransactions.length ? `${visibleTransactions.length} transaksi tercatat` : "Belum ada transaksi";
  const previousNet = totalsForMonth(shiftMonth(activeMonth, -1));
  const netContext = byId("net-context");
  if (netContext) {
    const previousValue = previousNet.income - previousNet.expense;
    netContext.textContent = !visibleTransactions.length && !previousValue ? "Belum ada data pembanding" : previousValue ? `${net >= previousValue ? "Naik" : "Turun"} ${formatIDR(Math.abs(net - previousValue), true)} dari bulan lalu` : "Bulan sebelumnya belum ada transaksi";
  }
  renderReports();
  renderExpenseHighlight();
  window.lucide?.createIcons();
}

function renderBudget() {
  const values = Object.fromEntries(budgetItems.map((item) => [item.name, Number(item.amount) || 0]));
  const total = Object.values(values).reduce((sum, value) => sum + value, 0);
  byId("budget-total-amount").textContent = formatIDR(total, true);
  byId("budget-status").textContent = total ? (budgetMonthSupported ? "alokasi aktif" : "perlu migrasi") : "belum diatur";
  document.querySelectorAll("[data-budget-value]").forEach((element) => { element.textContent = formatIDR(values[element.dataset.budgetValue] || 0, true); });
  document.querySelectorAll("[data-budget-row]").forEach((row) => { const name = row.dataset.budgetRow; const label = row.querySelector(".bill-name")?.textContent?.trim() || name; row.setAttribute("aria-label", `${label}: ${formatIDR(values[name] || 0, true)}`); });
  document.querySelectorAll("[data-budget-input]").forEach((input) => { input.value = formatInputAmount(values[input.dataset.budgetInput] || 0); });
  byId("contribution-total").value = formatInputAmount(total);
  byId("breakdown-total").textContent = formatIDR(total, true);
}

function renderTransactionCategoryOptions(type, selectedValue = byId("transaction-category")?.value) {
  const names = transactionCategoryGroups[type] || transactionCategoryGroups.INCOME;
  const source = categories.length ? categories : fallbackCategories;
  const byName = new Map(source.map((item) => [item.name, item]));
  const options = names.map((name) => byName.get(name)).filter(Boolean).map((item) => `<option value="${escapeHTML(item.name)}">${escapeHTML(item.name)}</option>`).join("");
  const select = byId("transaction-category");
  if (!select) return;
  select.innerHTML = options;
  select.value = names.includes(selectedValue) && byName.has(selectedValue) ? selectedValue : (names.find((name) => byName.has(name)) || "");
}

function setTransactionType(type) {
  const normalized = type === "EXPENSE" ? "EXPENSE" : "INCOME";
  const copy = transactionCopy[normalized];
  byId("transaction-type").value = normalized;
  document.querySelectorAll(".segmented button").forEach((button) => button.classList.toggle("is-active", button.dataset.type === normalized));
  byId("modal-title").textContent = copy.title;
  byId("modal-context").textContent = copy.context;
  byId("transaction-title-label").textContent = copy.titleLabel;
  byId("transaction-title").placeholder = copy.titlePlaceholder;
  byId("transaction-category-label").textContent = copy.categoryLabel;
  byId("transaction-description").placeholder = copy.descriptionPlaceholder;
  byId("submit-transaction").textContent = copy.submit;
  renderTransactionCategoryOptions(normalized);
}

function renderCategoryOptions() {
  if (!categories.length) return;
  const currentFilter = byId("category-filter").value;
  const options = categories.map((item) => `<option value="${escapeHTML(item.name)}">${escapeHTML(item.name)}</option>`).join("");
  byId("category-filter").innerHTML = `<option value="ALL">Semua kategori</option>${options}`;
  byId("category-filter").value = categories.some((item) => item.name === currentFilter) ? currentFilter : "ALL";
  renderTransactionCategoryOptions(byId("transaction-type")?.value || "INCOME");
}

async function loadBudgetItems() {
  const result = await supabaseClient.from("budget_items").select("*").eq("active", true).order("name");
  if (result.error) return result;
  const data = result.data || [];
  if (data.length) budgetMonthSupported = Object.prototype.hasOwnProperty.call(data[0], "month");
  if (budgetMonthSupported) result.data = data.filter((item) => item.month === monthStart(activeMonth));
  return result;
}

async function loadSupabaseData(showError = false) {
  if (!supabaseClient) return;
  const requestedMonth = activeMonth;
  const [transactionResult, budgetResult, categoryResult] = await Promise.all([
    supabaseClient.from("transactions").select("id,type,amount,title,description,transaction_date,created_at,categories(name,icon)").order("transaction_date", { ascending: false }).order("created_at", { ascending: false }),
    loadBudgetItems(),
    supabaseClient.from("categories").select("id,name,icon").eq("active", true).order("name")
  ]);
  const firstError = [transactionResult, budgetResult, categoryResult].find((result) => result.error)?.error;
  if (firstError) {
    console.error("Supabase data load failed", firstError);
    if (showError) showToast("Supabase belum siap. Jalankan schema.sql terlebih dulu.");
    return;
  }
  if (requestedMonth !== activeMonth) return;
  transactions = (transactionResult.data || []).map(mapTransaction);
  budgetItems = budgetResult.data || [];
  categories = categoryResult.data?.length ? categoryResult.data : fallbackCategories;
  renderCategoryOptions();
  renderTransactions();
  renderSummary();
  renderBudget();
}

function setView(view) {
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
  document.querySelectorAll(".page-view").forEach((page) => page.classList.toggle("is-visible", page.dataset.page === view));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message) {
  byId("toast-message").textContent = message;
  byId("toast").classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => byId("toast").classList.remove("is-visible"), 2800);
}

let lastDetailTrigger = null;

function toggleDetailModal(open) {
  const modal = byId("transaction-detail-modal");
  if (!modal) return;
  modal.classList.toggle("is-open", open);
  modal.setAttribute("aria-hidden", String(!open));
  if (open) setTimeout(() => byId("close-detail-modal")?.focus(), 80);
  else lastDetailTrigger?.focus();
}

function showTransactionDetail(id, trigger = null) {
  const item = transactions.find((transaction) => String(transaction.id) === String(id));
  if (!item) return;
  lastDetailTrigger = trigger;
  const typeLabel = item.type === "INCOME" ? "Pemasukan" : "Pengeluaran";
  const detailBody = byId("transaction-detail-body");
  if (!detailBody) return;
  detailBody.innerHTML = `<div class="detail-heading"><span class="detail-type ${item.type === "INCOME" ? "income" : "expense"}">${typeLabel}</span><strong class="detail-amount ${item.type === "INCOME" ? "income" : "expense"}">${escapeHTML(formatSigned(item))}</strong></div><dl class="detail-list"><div><dt>Judul</dt><dd>${escapeHTML(item.title)}</dd></div><div><dt>Kategori</dt><dd>${escapeHTML(item.category || "Lainnya")}</dd></div><div><dt>Tanggal</dt><dd>${escapeHTML(formatDate(item.date))}</dd></div><div><dt>Catatan</dt><dd>${escapeHTML(item.description || "Tidak ada catatan")}</dd></div></dl>`;
  toggleDetailModal(true);
}

const csvCell = (value) => `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
function exportReport() {
  const items = activeTransactions();
  if (!items.length) return showToast(`Belum ada transaksi ${formatMonthLabel(activeMonth)} untuk diekspor.`);
  const rows = [
    ["Tanggal", "Tipe", "Kategori", "Judul", "Nominal", "Catatan"],
    ...items.map((item) => [item.date, item.type === "INCOME" ? "Pemasukan" : "Pengeluaran", item.category, item.title, item.amount, item.description])
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `kasteds-${activeMonth}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  showToast(`Laporan ${formatMonthLabel(activeMonth)} berhasil diunduh.`);
}

function toggleModal(open, type = "INCOME") {
  const modal = byId("transaction-modal");
  modal.classList.toggle("is-open", open);
  modal.setAttribute("aria-hidden", String(!open));
  if (open) {
    setTransactionType(type);
    const today = todayISO();
    byId("transaction-date").value = today.startsWith(`${activeMonth}-`) ? today : monthStart(activeMonth);
    setTimeout(() => byId("transaction-title").focus(), 80);
  }
}

document.addEventListener("click", async (event) => {
  const nav = event.target.closest("[data-view]");
  if (nav) {
    event.preventDefault();
    if (nav.dataset.view === "settings" && !isAdmin()) return showLogin();
    setView(nav.dataset.view);
    return;
  }
  const addButton = event.target.closest("[data-open-add]");
  if (addButton) return isAdmin() ? toggleModal(true, addButton.dataset.openAdd) : showLogin();
  const detailButton = event.target.closest("[data-detail-id]");
  if (detailButton) return showTransactionDetail(detailButton.dataset.detailId, detailButton);
  if (event.target.closest("#close-detail-modal, #detail-cancel") || event.target.id === "transaction-detail-modal") return toggleDetailModal(false);
  if (event.target.closest("#close-modal, #cancel-modal") || event.target.id === "transaction-modal") toggleModal(false);
  const typeButton = event.target.closest(".segmented button");
  if (typeButton) {
    setTransactionType(typeButton.dataset.type);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (byId("transaction-detail-modal")?.classList.contains("is-open")) toggleDetailModal(false);
  else if (byId("transaction-modal")?.classList.contains("is-open")) toggleModal(false);
});

byId("previous-month")?.addEventListener("click", () => setActiveMonth(shiftMonth(activeMonth, -1)));
byId("next-month")?.addEventListener("click", () => setActiveMonth(shiftMonth(activeMonth, 1)));
byId("export-report")?.addEventListener("click", exportReport);

byId("transaction-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isAdmin()) return showLogin();
  const amount = parseAmountInput(byId("transaction-amount").value);
  const title = byId("transaction-title").value.trim();
  const date = byId("transaction-date").value;
  const categoryName = byId("transaction-category").value;
  if (!title || !amount || amount < 1 || !date) return showToast("Isi judul, tanggal, dan nominal yang valid.");
  if (!date.startsWith(`${activeMonth}-`)) return showToast(`Tanggal harus di ${formatMonthLabel(activeMonth)}.`);
  if (!supabaseClient || !currentUser) return showToast("Sesi Supabase belum tersedia. Silakan login ulang.");
  const category = categories.find((item) => item.name === categoryName);
  const payload = { type: byId("transaction-type").value, amount, title, category_id: category?.id || null, transaction_date: date, description: byId("transaction-description").value.trim() || null, created_by: currentUser.id };
  const submitButton = event.target.querySelector("button[type=submit]");
  submitButton.disabled = true;
  submitButton.textContent = "Menyimpan...";
  const { data, error } = await supabaseClient.from("transactions").insert(payload).select("id,type,amount,title,description,transaction_date,created_at,categories(name,icon)").single();
  submitButton.disabled = false;
  submitButton.textContent = transactionCopy[byId("transaction-type").value]?.submit || "Simpan transaksi";
  if (error) return showToast("Transaksi gagal disimpan. Pastikan role admin sudah benar.");
  transactions.unshift(mapTransaction(data));
  renderTransactions();
  renderSummary();
  toggleModal(false);
  event.target.reset();
  setTransactionType("INCOME");
  showToast("Transaksi berhasil disimpan.");
});

const filterInputs = ["transaction-search", "type-filter", "category-filter"].map(byId);
filterInputs.forEach((input) => { input.addEventListener("input", renderTransactions); input.addEventListener("change", renderTransactions); });
byId("transaction-amount").addEventListener("input", () => formatAmountInput(byId("transaction-amount")));
document.querySelectorAll(".breakdown-value").forEach((input) => input.addEventListener("input", () => {
  formatAmountInput(input);
  const total = [...document.querySelectorAll(".breakdown-value")].reduce((sum, field) => sum + parseAmountInput(field.value), 0);
  byId("breakdown-total").textContent = formatIDR(total, true);
  byId("contribution-total").value = formatInputAmount(total);
}));

byId("save-settings").addEventListener("click", async () => {
  if (!isAdmin()) return showLogin();
  if (!budgetMonthSupported) return showToast("Jalankan supabase/schema.sql dulu untuk mengaktifkan budget per bulan.");
  const rows = [...document.querySelectorAll("[data-budget-input]")].map((input) => ({ name: input.dataset.budgetInput, month: monthStart(activeMonth), amount: Math.max(0, parseAmountInput(input.value)), active: true, updated_at: new Date().toISOString() }));
  const { data, error } = await supabaseClient.from("budget_items").upsert(rows, { onConflict: "name,month" }).select("id,name,amount,active,month");
  if (error) {
    if (/month/i.test(error.message || "")) {
      budgetMonthSupported = false;
      renderBudget();
      return showToast("Jalankan supabase/schema.sql dulu untuk mengaktifkan budget per bulan.");
    }
    return showToast("Budget gagal disimpan. Pastikan role admin sudah benar.");
  }
  budgetItems = data || rows;
  budgetMonthSupported = true;
  renderBudget();
  showToast("Pengaturan budget berhasil disimpan.");
});

async function restoreSession() {
  if (supabaseClient) {
    const { data } = await supabaseClient.auth.getSession();
    if (data.session) {
      try {
        const profile = await loadProfile(data.session.user);
        if (profile?.role === "ADMIN") unlockApp(data.session, profile);
        else await supabaseClient.auth.signOut();
      } catch (error) {
        console.warn(error.message);
        await supabaseClient.auth.signOut();
      }
    }
  }
  await loadSupabaseData();
}

updateMonthUI();
renderTransactions();
renderSummary();
renderBudget();
updateProfileUI();
window.lucide?.createIcons();
restoreSession().catch((error) => {
  console.error("KasTEDS initialization failed", error);
  showToast("Koneksi Supabase gagal. Coba muat ulang halaman.");
});

// ponytail: one small smoke check keeps the currency rule from silently regressing.
window.__KASTEDS_CHECK__ = () => { console.assert(formatIDR(370000) === "Rp370.000", "Currency formatting must use id-ID grouping"); console.assert(formatInputAmount("370000") === "370.000", "Input currency formatting must use id-ID grouping"); console.assert(parseAmountInput("370.000") === 370000, "Formatted currency must parse back to a number"); console.assert(formatCompactIDR(1200000) === "Rp1,2 jt", "Chart axis must use compact IDR formatting"); console.assert(shiftMonth("2026-09", 1) === "2026-10", "Month navigation must roll forward safely"); console.assert(Array.isArray(transactions), "Transactions must stay an array"); };
window.__KASTEDS_CHECK__();
