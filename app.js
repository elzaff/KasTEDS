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
const formatSigned = (item) => `${item.type === "INCOME" ? "+" : "-"}${formatIDR(item.amount)}`;
const formatDate = (value) => { if (!value) return ""; const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }); };
const todayISO = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };
const escapeHTML = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[character]));
const byId = (id) => document.getElementById(id);
const monthFormatter = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
const isMonthKey = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const formatMonthLabel = (month) => monthFormatter.format(new Date(`${month}-01T00:00:00Z`));
const monthStart = (month) => `${month}-01`;
const shiftMonth = (month, delta) => {
  const [year, monthNumber] = (isMonthKey(month) ? month : initialMonth).split("-").map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
};
const activeTransactions = () => transactions.filter((item) => String(item.date || "").startsWith(`${activeMonth}-`));
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
  return `<div class="transaction-item" data-id="${escapeHTML(item.id)}"><span class="transaction-icon ${item.type === "INCOME" ? "income" : "expense"}"><i data-lucide="${escapeHTML(iconFor(item.icon))}"></i></span><div class="transaction-copy"><strong>${escapeHTML(item.title)}</strong><span>${escapeHTML(metadata)}</span></div><strong class="transaction-amount ${item.type === "INCOME" ? "income" : "expense"}">${escapeHTML(formatSigned(item))}</strong></div>`;
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
}

function renderBudget() {
  const values = Object.fromEntries(budgetItems.map((item) => [item.name, Number(item.amount) || 0]));
  const total = Object.values(values).reduce((sum, value) => sum + value, 0);
  byId("budget-total-amount").textContent = formatIDR(total, true);
  byId("budget-status").textContent = total ? (budgetMonthSupported ? "alokasi aktif" : "perlu migrasi") : "belum diatur";
  document.querySelectorAll("[data-budget-value]").forEach((element) => { element.textContent = formatIDR(values[element.dataset.budgetValue] || 0, true); });
  document.querySelectorAll("[data-budget-input]").forEach((input) => { input.value = values[input.dataset.budgetInput] || 0; });
  byId("contribution-total").value = total;
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
  if (event.target.closest("#close-modal, #cancel-modal") || event.target.id === "transaction-modal") toggleModal(false);
  const typeButton = event.target.closest(".segmented button");
  if (typeButton) {
    setTransactionType(typeButton.dataset.type);
  }
});

byId("previous-month")?.addEventListener("click", () => setActiveMonth(shiftMonth(activeMonth, -1)));
byId("next-month")?.addEventListener("click", () => setActiveMonth(shiftMonth(activeMonth, 1)));

byId("transaction-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isAdmin()) return showLogin();
  const amount = Number(byId("transaction-amount").value);
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
document.querySelectorAll(".breakdown-value").forEach((input) => input.addEventListener("input", () => {
  const total = [...document.querySelectorAll(".breakdown-value")].reduce((sum, field) => sum + Number(field.value || 0), 0);
  byId("breakdown-total").textContent = formatIDR(total, true);
  byId("contribution-total").value = total;
}));

byId("save-settings").addEventListener("click", async () => {
  if (!isAdmin()) return showLogin();
  if (!budgetMonthSupported) return showToast("Jalankan supabase/schema.sql dulu untuk mengaktifkan budget per bulan.");
  const rows = [...document.querySelectorAll("[data-budget-input]")].map((input) => ({ name: input.dataset.budgetInput, month: monthStart(activeMonth), amount: Math.max(0, Number(input.value) || 0), active: true, updated_at: new Date().toISOString() }));
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
window.__KASTEDS_CHECK__ = () => { console.assert(formatIDR(370000) === "Rp370.000", "Currency formatting must use id-ID grouping"); console.assert(shiftMonth("2026-09", 1) === "2026-10", "Month navigation must roll forward safely"); console.assert(Array.isArray(transactions), "Transactions must stay an array"); };
window.__KASTEDS_CHECK__();
