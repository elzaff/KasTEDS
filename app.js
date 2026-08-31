let transactions = [];
let budgetItems = [];
let categories = [];
let currentSession = null;
let currentUser = null;
let currentProfile = null;
const openingBalance = 0;
const fallbackCategories = [
  { name: "Iuran Bulanan", icon: "coins" }, { name: "Listrik", icon: "zap" }, { name: "WiFi", icon: "wifi" },
  { name: "Air PDAM", icon: "droplets" }, { name: "Kebersihan", icon: "sparkles" }, { name: "Perbaikan", icon: "wrench" },
  { name: "Perlengkapan Rumah", icon: "shopping-basket" }, { name: "Kas", icon: "wallet" }, { name: "Lainnya", icon: "shapes" }
];

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
    if (error) throw new Error("Email atau password admin salah.");
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
  const query = (byId("transaction-search")?.value || "").toLowerCase();
  const type = byId("type-filter")?.value || "ALL";
  const category = byId("category-filter")?.value || "ALL";
  const filtered = transactions.filter((item) => {
    const matchesQuery = !query || `${item.title} ${item.category}`.toLowerCase().includes(query);
    const matchesType = type === "ALL" || item.type === type;
    const matchesCategory = category === "ALL" || item.category.toLowerCase() === category.toLowerCase();
    return matchesQuery && matchesType && matchesCategory;
  });
  const empty = `<div class="empty-state"><i data-lucide="inbox"></i><strong>Belum ada transaksi</strong><span>Catat pemasukan atau pengeluaran pertama.</span></div>`;
  byId("recent-transactions").innerHTML = transactions.length ? transactions.slice(0, 4).map(transactionMarkup).join("") : empty;
  byId("all-transactions").innerHTML = filtered.length ? filtered.map(transactionMarkup).join("") : `<div class="empty-state"><i data-lucide="search-x"></i><strong>${transactions.length ? "Transaksi tidak ditemukan" : "Belum ada transaksi"}</strong><span>${transactions.length ? "Coba ubah kata kunci atau filter." : "Catat pemasukan atau pengeluaran pertama."}</span></div>`;
  byId("result-count").textContent = `${filtered.length} transaksi`;
  byId("transaction-count").textContent = transactions.length;
  window.lucide?.createIcons();
}

function renderSummary() {
  const income = transactions.filter((item) => item.type === "INCOME").reduce((sum, item) => sum + item.amount, 0);
  const expense = transactions.filter((item) => item.type === "EXPENSE").reduce((sum, item) => sum + item.amount, 0);
  const net = income - expense;
  byId("balance-value").textContent = formatIDR(openingBalance + net, true);
  document.querySelectorAll(".income-text").forEach((element) => { element.textContent = `+${formatIDR(income)}`; });
  document.querySelectorAll(".expense-text").forEach((element) => { element.textContent = `-${formatIDR(expense)}`; });
  byId("income-total").textContent = formatIDR(income, true);
  byId("expense-total").textContent = formatIDR(expense, true);
  byId("net-value").textContent = formatIDR(net, true);
  byId("transaction-status").textContent = transactions.length ? `${transactions.length} transaksi tercatat` : "Belum ada transaksi";
}

function renderBudget() {
  const values = Object.fromEntries(budgetItems.map((item) => [item.name, Number(item.amount) || 0]));
  const total = Object.values(values).reduce((sum, value) => sum + value, 0);
  byId("budget-total-amount").textContent = formatIDR(total, true);
  byId("budget-status").textContent = total ? "alokasi aktif" : "belum diatur";
  document.querySelectorAll("[data-budget-value]").forEach((element) => { element.textContent = formatIDR(values[element.dataset.budgetValue] || 0, true); });
  document.querySelectorAll("[data-budget-input]").forEach((input) => { input.value = values[input.dataset.budgetInput] || 0; });
  byId("contribution-total").value = total;
  byId("breakdown-total").textContent = formatIDR(total, true);
}

function renderCategoryOptions() {
  if (!categories.length) return;
  const currentFilter = byId("category-filter").value;
  const currentTransaction = byId("transaction-category").value;
  const options = categories.map((item) => `<option value="${escapeHTML(item.name)}">${escapeHTML(item.name)}</option>`).join("");
  byId("category-filter").innerHTML = `<option value="ALL">Semua kategori</option>${options}`;
  byId("transaction-category").innerHTML = options;
  byId("category-filter").value = categories.some((item) => item.name === currentFilter) ? currentFilter : "ALL";
  byId("transaction-category").value = categories.some((item) => item.name === currentTransaction) ? currentTransaction : (categories[0]?.name || "");
}

async function loadSupabaseData(showError = false) {
  if (!supabaseClient) return;
  const [transactionResult, budgetResult, categoryResult] = await Promise.all([
    supabaseClient.from("transactions").select("id,type,amount,title,description,transaction_date,created_at,categories(name,icon)").order("transaction_date", { ascending: false }).order("created_at", { ascending: false }),
    supabaseClient.from("budget_items").select("id,name,amount,active").eq("active", true).order("name"),
    supabaseClient.from("categories").select("id,name,icon").eq("active", true).order("name")
  ]);
  const firstError = [transactionResult, budgetResult, categoryResult].find((result) => result.error)?.error;
  if (firstError) {
    console.error("Supabase data load failed", firstError);
    if (showError) showToast("Supabase belum siap. Jalankan schema.sql terlebih dulu.");
    return;
  }
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

function toggleModal(open) {
  const modal = byId("transaction-modal");
  modal.classList.toggle("is-open", open);
  modal.setAttribute("aria-hidden", String(!open));
  if (open) {
    byId("transaction-date").value = todayISO();
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
  if (event.target.closest("#open-add, #open-add-secondary")) return isAdmin() ? toggleModal(true) : showLogin();
  if (event.target.closest("#close-modal, #cancel-modal") || event.target.id === "transaction-modal") toggleModal(false);
  const typeButton = event.target.closest(".segmented button");
  if (typeButton) {
    document.querySelectorAll(".segmented button").forEach((button) => button.classList.remove("is-active"));
    typeButton.classList.add("is-active");
    byId("transaction-type").value = typeButton.dataset.type;
  }
});

byId("transaction-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isAdmin()) return showLogin();
  const amount = Number(byId("transaction-amount").value);
  const title = byId("transaction-title").value.trim();
  const date = byId("transaction-date").value;
  const categoryName = byId("transaction-category").value;
  if (!title || !amount || amount < 1 || !date) return showToast("Isi judul, tanggal, dan nominal yang valid.");
  if (!supabaseClient || !currentUser) return showToast("Sesi Supabase belum tersedia. Silakan login ulang.");
  const category = categories.find((item) => item.name === categoryName);
  const payload = { type: byId("transaction-type").value, amount, title, category_id: category?.id || null, transaction_date: date, description: byId("transaction-description").value.trim() || null, created_by: currentUser.id };
  const submitButton = event.target.querySelector("button[type=submit]");
  submitButton.disabled = true;
  submitButton.textContent = "Menyimpan...";
  const { data, error } = await supabaseClient.from("transactions").insert(payload).select("id,type,amount,title,description,transaction_date,created_at,categories(name,icon)").single();
  submitButton.disabled = false;
  submitButton.textContent = "Simpan transaksi";
  if (error) return showToast("Transaksi gagal disimpan. Pastikan role admin sudah benar.");
  transactions.unshift(mapTransaction(data));
  renderTransactions();
  renderSummary();
  toggleModal(false);
  event.target.reset();
  byId("transaction-type").value = "INCOME";
  document.querySelectorAll(".segmented button").forEach((button, index) => button.classList.toggle("is-active", index === 0));
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
  const rows = [...document.querySelectorAll("[data-budget-input]")].map((input) => ({ name: input.dataset.budgetInput, amount: Math.max(0, Number(input.value) || 0), active: true, updated_at: new Date().toISOString() }));
  const { data, error } = await supabaseClient.from("budget_items").upsert(rows, { onConflict: "name" }).select("id,name,amount,active");
  if (error) return showToast("Budget gagal disimpan. Pastikan role admin sudah benar.");
  budgetItems = data || rows;
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
window.__KASTEDS_CHECK__ = () => { console.assert(formatIDR(370000) === "Rp370.000", "Currency formatting must use id-ID grouping"); console.assert(Array.isArray(transactions), "Transactions must stay an array"); };
window.__KASTEDS_CHECK__();
