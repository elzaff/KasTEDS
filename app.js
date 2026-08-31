const transactions = [];
const openingBalance = 0;

const iconFor = (name) => ({ zap: "zap", wifi: "wifi", coins: "coins", wrench: "wrench", sparkles: "sparkles" }[name] || "circle-dot");
const formatIDR = (value, spaced = false) => `${spaced ? "Rp " : "Rp"}${Math.round(value).toLocaleString("id-ID")}`;
const formatSigned = (item) => `${item.type === "INCOME" ? "+" : "-"}${formatIDR(item.amount)}`;
const byId = (id) => document.getElementById(id);
const ADMIN_EMAIL = "admin@kasteds.local";
const ADMIN_PASSWORD = "kasteds123";

function unlockApp() { sessionStorage.setItem("kasteds_admin", "1"); byId("login-screen").style.display = "none"; byId("app-shell").classList.add("is-unlocked"); }

if (sessionStorage.getItem("kasteds_admin") === "1") unlockApp();

byId("login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const valid = byId("login-email").value.trim().toLowerCase() === ADMIN_EMAIL && byId("login-password").value === ADMIN_PASSWORD;
  if (!valid) { byId("login-error").textContent = "Email atau password admin salah."; return; }
  byId("login-error").textContent = ""; unlockApp();
});

byId("logout-button").addEventListener("click", () => { sessionStorage.removeItem("kasteds_admin"); byId("app-shell").classList.remove("is-unlocked"); byId("login-screen").style.display = "grid"; byId("login-password").value = ""; byId("login-email").focus(); });

function transactionMarkup(item) {
  return `<div class="transaction-item" data-id="${item.id}">
    <span class="transaction-icon ${item.type === "INCOME" ? "income" : "expense"}"><i data-lucide="${iconFor(item.icon)}"></i></span>
    <div class="transaction-copy"><strong>${item.title}</strong><span>${item.category}</span></div>
    <strong class="transaction-amount ${item.type === "INCOME" ? "income" : "expense"}">${formatSigned(item)}</strong>
  </div>`;
}

function renderTransactions() {
  const query = (byId("transaction-search")?.value || "").toLowerCase();
  const type = byId("type-filter")?.value || "ALL";
  const category = byId("category-filter")?.value || "ALL";
  const filtered = transactions.filter((item) => {
    const matchesQuery = !query || `${item.title} ${item.category}`.toLowerCase().includes(query);
    const matchesType = type === "ALL" || item.type === type;
    const matchesCategory = category === "ALL" || item.category.toLowerCase().startsWith(category.toLowerCase());
    return matchesQuery && matchesType && matchesCategory;
  });
  const empty = `<div class="empty-state"><i data-lucide="inbox"></i><strong>Belum ada transaksi</strong><span>Catat pemasukan atau pengeluaran pertama.</span></div>`;
  byId("recent-transactions").innerHTML = transactions.length ? transactions.slice(0, 4).map(transactionMarkup).join("") : empty;
  byId("all-transactions").innerHTML = filtered.length ? filtered.map(transactionMarkup).join("") : `<div class="empty-state"><i data-lucide="search-x"></i><strong>Transaksi tidak ditemukan</strong><span>Coba ubah kata kunci atau filter.</span></div>`;
  byId("result-count").textContent = `${filtered.length} transaksi`;
  window.lucide?.createIcons();
}

function renderSummary() {
  const income = transactions.filter((item) => item.type === "INCOME").reduce((sum, item) => sum + item.amount, 0);
  const expense = transactions.filter((item) => item.type === "EXPENSE").reduce((sum, item) => sum + item.amount, 0);
  byId("balance-value").textContent = formatIDR(openingBalance + income - expense, true);
  byId("income-value").textContent = `+${formatIDR(income)}`;
  byId("expense-value").textContent = `-${formatIDR(expense)}`;
}

function setView(view) {
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
  document.querySelectorAll(".page-view").forEach((page) => page.classList.toggle("is-visible", page.dataset.page === view));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message) {
  byId("toast-message").textContent = message; byId("toast").classList.add("is-visible");
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => byId("toast").classList.remove("is-visible"), 2800);
}

function toggleModal(open) { const modal = byId("transaction-modal"); modal.classList.toggle("is-open", open); modal.setAttribute("aria-hidden", String(!open)); if (open) setTimeout(() => byId("transaction-title").focus(), 80); }

document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-view]"); if (nav) { event.preventDefault(); setView(nav.dataset.view); return; }
  if (event.target.closest("#open-add, #open-add-secondary")) toggleModal(true);
  if (event.target.closest("#close-modal, #cancel-modal") || event.target.id === "transaction-modal") toggleModal(false);
  const typeButton = event.target.closest(".segmented button"); if (typeButton) { document.querySelectorAll(".segmented button").forEach((button) => button.classList.remove("is-active")); typeButton.classList.add("is-active"); byId("transaction-type").value = typeButton.dataset.type; }
});

byId("transaction-form").addEventListener("submit", (event) => {
  event.preventDefault(); const amount = Number(byId("transaction-amount").value); const title = byId("transaction-title").value.trim();
  if (!title || !amount || amount < 1) return showToast("Isi judul dan nominal yang valid.");
  transactions.unshift({ id: Date.now(), title, category: `${byId("transaction-category").value} · 31 Agu 2026`, amount, type: byId("transaction-type").value, icon: byId("transaction-type").value === "INCOME" ? "coins" : "circle-dot" });
  renderTransactions(); renderSummary(); toggleModal(false); event.target.reset(); byId("transaction-date").value = "2026-08-31"; byId("transaction-type").value = "INCOME"; document.querySelectorAll(".segmented button").forEach((button, index) => button.classList.toggle("is-active", index === 0)); showToast("Transaksi berhasil disimpan.");
});

["transaction-search", "type-filter", "category-filter"].forEach((id) => byId(id).addEventListener("input", renderTransactions));
document.querySelectorAll(".breakdown-value").forEach((input) => input.addEventListener("input", () => { const total = [...document.querySelectorAll(".breakdown-value")].reduce((sum, field) => sum + Number(field.value || 0), 0); byId("breakdown-total").textContent = formatIDR(total); byId("contribution-total").value = total; }));
byId("save-settings").addEventListener("click", () => showToast("Pengaturan iuran berhasil disimpan."));
renderTransactions(); renderSummary(); window.lucide?.createIcons();

// ponytail: one small smoke check keeps the currency rule from silently regressing.
window.__KASTEDS_CHECK__ = () => { console.assert(formatIDR(370000) === "Rp370.000", "Currency formatting must use id-ID grouping"); console.assert(transactions.length === 0, "Dashboard starts with empty communal data"); };
window.__KASTEDS_CHECK__();
