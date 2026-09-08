const UNITS = ["Med Stock", "IV Fluid", "Equipment", "CPR Box", "Emer medicine", "Emer cart Adult", "Emer cart PED"];
const UNIT_EXPIRY_WINDOWS = {
  "CPR Box": 180,
  "Emer medicine": 180,
};
const UNIT_ALIASES = { "ยารถ Emer": "Emer medicine", "กล่องยา EMER": "Emer medicine", "รถ EMER adult": "Emer cart Adult", "รถ EMER ped": "Emer cart PED" };
const INSPECTORS_KEY = "med-stock-inspectors-v1";
const SHORTAGE_REASONS = ["รอเบิก", "ตามไม่ได้"];
const EQUIPMENT_SHORTAGE_REASONS = ["ถูกยืม", "ส่งซ่อม"];
const SHIFTS = ["เวรดึก", "เวรเช้า", "เวรบ่าย"];
const STORAGE_KEY = "cute-med-stock-v3";
const SOURCE_VERSION_KEY = "med-stock-source-version";
const SOURCE_VERSION = window.SEED_SOURCE_VERSION || "";
const SETTINGS_KEY = "cute-med-stock-settings-v1";
const CHECK_LOG_KEY = "cute-med-stock-check-log-v1";
const SIDEBAR_KEY = "cute-med-stock-sidebar-collapsed-v1";
const DEFAULT_GOOGLE_SHEET_URL =
  "https://script.google.com/macros/s/AKfycbyHQUM1t-0XtfBQ6TyORkf3aT5vJdJfI4OUBU5LtK3WjH0hpPvcrrTz9KB0_1FY3D9S/exec";
const LEGACY_GOOGLE_SHEET_URLS = [
  "https://script.googleusercontent.com/macros/echo",
  "https://script.google.com/macros/s/AKfycbzvois7VRC7USt8J4gHVuH9ggtScoN1gR5YPkL93kU80zwheqeAxyGVmvV7wF6JIEsSeg/exec",
  "https://script.google.com/macros/s/AKfycbxsQjhgao4VfDHGKIWCl8koztnm5PYdUlfIuIPbWQrFhXYPiAa_h8PjN2R9sZW0bZiJsw/exec",
  "https://script.google.com/macros/s/AKfycbw6WrIkrFREWyRHoIpI7SPGyYMlkXLN957nXHBg-27P68SSgsRAinP3_uZMn01EFQTwyw/exec",
  "https://script.google.com/macros/s/AKfycbxiS2S8WqT-Abxs-wsy7fZH7SC8eX6JtJ8y-nOv9rJ22gChSQvhdQ-zP1Q_dB3wPnKyVA/exec",
  "https://script.google.com/macros/s/AKfycbx_MG1sNDU2EIYqSsUtvlcN4WR5M0ksEEvWx2gofczvp6xpefOVYGTUwkPU03fjcjRDQQ/exec",
];

const sampleData = {
  "CPR Box": [
    createSeed("Adrenaline 1 mg/ml", 10, 10, daysFromNow(45), "ระบบ"),
    createSeed("Syringe 10 ml", 20, 18, null, "ระบบ"),
  ],
  "Emer medicine": [
    createSeed("Atropine 0.6 mg/ml", 6, 6, daysFromNow(20), "ระบบ"),
    createSeed("Dextrose 50%", 4, 3, daysFromNow(120), "ระบบ"),
  ],
  "Emer cart Adult": [
    createSeed("Normal Saline 1000 ml", 6, 6, daysFromNow(200), "ระบบ"),
    createSeed("IV catheter No.18", 10, 10, null, "ระบบ"),
  ],
  "Emer cart PED": [
    createSeed("Dopamine inj.", 3, 3, daysFromNow(14), "ระบบ"),
    createSeed("Pediatric ambu bag", 1, 1, null, "ระบบ"),
  ],
};

const defaultData = hydrateSeed(window.SEED_STOCK_DATA || sampleData);
let data = loadData();
let settings = loadSettings();
let checkLogs = loadCheckLogs();
let activeUnit = UNITS[0];
let activeView = "home";
let searchTerm = "";
let sortMode = "default";
let statusFilter = "all";
let cloudSyncPaused = false;
let cloudSaveTimer = null;

const els = {
  unitTabs: document.querySelector("#unitTabs"),
  homeButton: document.querySelector("#homeButton"),
  mobileUnitSelect: document.querySelector("#mobileUnitSelect"),
  stockList: document.querySelector("#stockList"),
  alertList: document.querySelector("#alertList"),
  checkLogList: document.querySelector("#checkLogList"),
  checkLogCount: document.querySelector("#checkLogCount"),
  pageTitle: document.querySelector("#pageTitle"),
  pageSubtitle: document.querySelector("#pageSubtitle"),
  infoGrid: document.querySelector("#infoGrid"),
  shortageOverview: document.querySelector("#shortageOverview"),
  stockSection: document.querySelector("#stockSection"),
  unitTitle: document.querySelector("#unitTitle"),
  lastChecked: document.querySelector("#lastChecked"),
  lastCheckedTop: document.querySelector("#lastCheckedTop"),
  totalItems: document.querySelector("#totalItems"),
  expiringItems: document.querySelector("#expiringItems"),
  expiredItems: document.querySelector("#expiredItems"),
  shortItems: document.querySelector("#shortItems"),
  monthlyReminder: document.querySelector("#monthlyReminder"),
  dashboardInsights: document.querySelector("#dashboardInsights"),
  dashboardCharts: document.querySelector("#dashboardCharts"),
  inspectorHeatmap: document.querySelector("#inspectorHeatmap"),
  searchInput: document.querySelector("#searchInput"),
  sortSelect: document.querySelector("#sortSelect"),
  statusFilter: document.querySelector("#statusFilter"),
  inspectionDate: document.querySelector("#inspectionDate"),
  inspectionShift: document.querySelector("#inspectionShift"),
  inspectorOptions: document.querySelector("#inspectorOptions"),
  inspectionInspector: document.querySelector("#inspectionInspector"),
  saveInspectionButton: document.querySelector("#saveInspectionButton"),
  sendTelegramButton: document.querySelector("#sendTelegramButton"),
  itemDialog: document.querySelector("#itemDialog"),
  itemForm: document.querySelector("#itemForm"),
  dialogTitle: document.querySelector("#dialogTitle"),
  editingId: document.querySelector("#editingId"),
  itemName: document.querySelector("#itemName"),
  requiredQty: document.querySelector("#requiredQty"),
  countedQty: document.querySelector("#countedQty"),
  noExpiry: document.querySelector("#noExpiry"),
  expiryWrap: document.querySelector("#expiryWrap"),
  expiryDate: document.querySelector("#expiryDate"),
  deleteItemButton: document.querySelector("#deleteItemButton"),
  settingsButton: document.querySelector("#settingsButton"),
  sidebarToggle: document.querySelector("#sidebarToggle"),
  settingsDialog: document.querySelector("#settingsDialog"),
  settingsForm: document.querySelector("#settingsForm"),
  telegramToken: document.querySelector("#telegramToken"),
  telegramChatId: document.querySelector("#telegramChatId"),
  expiryWindow: document.querySelector("#expiryWindow"),
  googleSheetUrl: document.querySelector("#googleSheetUrl"),
  clearSavedStateButton: document.querySelector("#clearSavedStateButton"),
  toast: document.querySelector("#toast"),
};

init();

function init() {
  els.inspectionDate.value = localDate();
  renderInspectors();
  syncSidebar();
  renderTabs();
  bindEvents();
  render();
  loadCloudState();
}

function localDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function fiscalYear(date) {
  const [year, month] = date.split("-").map(Number);
  return year + (month >= 10 ? 1 : 0) + 543;
}

function inspectorNames() {
  return [...new Set([...checkLogs.map(log => log.inspector), ...getAllItems().map(item => item.inspector)].filter(name => typeof name === "string" && name.trim()).map(name => name.trim()))].sort((a,b) => a.localeCompare(b, "th"));
}

function renderInspectors(selected = els.inspectionInspector.value) {
  const names = inspectorNames();
  els.inspectorOptions.innerHTML = names.map(name => '<option value="' + escapeHtml(name) + '"></option>').join('');
  els.inspectionInspector.value = selected || "";
}

function createSeed(name, requiredQty, countedQty, expiryDate, inspector) {
  return {
    id: createId(),
    name,
    requiredQty,
    countedQty,
    expiryDate,
    inspector,
    checkedAt: new Date().toISOString(),
  };
}

function hydrateSeed(seed) {
  const hydrated = {};
  UNITS.forEach((unit) => {
    hydrated[unit] = (seed[unit] || []).map((item) => ({
      id: item.sourceId || createId(),
      sourceId: item.sourceId || "",
      name: item.name,
      requiredQty: item.requiredQty == null ? null : Number(item.requiredQty),
      countedQty: Number(item.countedQty) || 0,
      shortageReason: item.shortageReason || "",
      expiryDate: item.expiryDate || null,
      inspector: item.inspector || "",
      checkedAt: item.checkedAt || "",
      inspectionDate: item.inspectionDate || "",
      shift: item.shift || "",
    }));
  });
  return hydrated;
}

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function loadData() {
  localStorage.removeItem?.(STORAGE_KEY);
  localStorage.removeItem?.(SOURCE_VERSION_KEY);
  return cloneData(defaultData);
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function backupBeforeSourceImport(previous, origin) {
  void previous;
  void origin;
}

function applySourceCatalog(previous) {
  const result = {};
  const used = new Set();
  UNITS.forEach(unit => {
    // Match operational values to the same named item. The original CPR and
    // medicine seed lists were reversed relative to the source sheet headings.
    const alternate = unit === "CPR Box" ? "Emer medicine" : unit === "Emer medicine" ? "CPR Box" : null;
    const candidates = [...(previous[unit] || []), ...(alternate ? previous[alternate] || [] : [])];
    result[unit] = defaultData[unit].map(seed => {
      const old = candidates.find(item => !used.has(item) && (item.sourceId === seed.sourceId || normalizeName(item.name) === normalizeName(seed.name)));
      if (!old) return cloneData(seed);
      used.add(old);
      return { ...old, id: old.id || seed.id, sourceId: seed.sourceId, name: seed.name, requiredQty: seed.requiredQty };
    });
  });
  return result;
}

function loadSettings() {
  const defaults = { token: "", chatId: "", expiryWindow: 30, googleSheetUrl: DEFAULT_GOOGLE_SHEET_URL };
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (!stored) return defaults;

  try {
    const parsed = JSON.parse(stored);
    if (LEGACY_GOOGLE_SHEET_URLS.some((url) => String(parsed.googleSheetUrl || "").startsWith(url))) {
      parsed.googleSheetUrl = DEFAULT_GOOGLE_SHEET_URL;
    }
    return { ...defaults, ...parsed, googleSheetUrl: parsed.googleSheetUrl || defaults.googleSheetUrl };
  } catch {
    return defaults;
  }
}

function loadCheckLogs() {
  localStorage.removeItem?.(CHECK_LOG_KEY);
  return [];
}

function saveData() {
  queueCloudStateSave();
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function saveCheckLogs() {
  queueCloudStateSave();
}

function bindEvents() {
  els.searchInput.addEventListener("input", () => {
    searchTerm = els.searchInput.value.trim().toLowerCase();
    renderStockList();
  });
  els.sortSelect.addEventListener("change", () => {
    sortMode = els.sortSelect.value;
    renderStockList();
  });
  els.statusFilter.addEventListener("change", () => {
    statusFilter = els.statusFilter.value;
    renderStockList();
  });
  els.homeButton.addEventListener("click", goHome);
  els.mobileUnitSelect.addEventListener("change", changeMobileUnit);
  els.noExpiry.addEventListener("change", syncExpiryField);
  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", closeParentDialog);
  });
  els.itemForm.addEventListener("submit", saveItem);
  els.deleteItemButton.addEventListener("click", deleteCurrentItem);
  els.saveInspectionButton.addEventListener("click", saveInspection);
  els.settingsButton.addEventListener("click", openSettings);
  els.sidebarToggle.addEventListener("click", toggleSidebar);
  els.settingsForm.addEventListener("submit", saveSettingsForm);
  els.sendTelegramButton.addEventListener("click", sendTelegramAlert);
  els.clearSavedStateButton.addEventListener("click", clearSavedState);
}

function closeParentDialog(event) {
  event.preventDefault();
  event.currentTarget.closest("dialog")?.close();
}

function syncSidebar() {
  const collapsed = localStorage.getItem(SIDEBAR_KEY) === "true";
  document.body.classList.toggle("sidebar-collapsed", collapsed);
  els.sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
  els.sidebarToggle.setAttribute("aria-label", collapsed ? "ขยายเมนู" : "หุบเมนู");
  els.sidebarToggle.title = collapsed ? "ขยายเมนู" : "หุบเมนู";
  els.sidebarToggle.textContent = collapsed ? "›" : "‹";
}

function toggleSidebar() {
  const collapsed = !document.body.classList.contains("sidebar-collapsed");
  localStorage.setItem(SIDEBAR_KEY, String(collapsed));
  syncSidebar();
}

function renderTabs() {
  els.unitTabs.innerHTML = "";
  UNITS.forEach((unit) => {
    const button = document.createElement("button");
    button.className = "unit-tab";
    button.type = "button";
    button.innerHTML = `${getUnitIcon(unit)}<span class="unit-label">${escapeHtml(unit)}</span>`;
    button.setAttribute("aria-label", unit);
    button.title = unit;
    button.dataset.short = getUnitShortLabel(unit);
    button.addEventListener("click", () => {
      activeUnit = unit;
      activeView = "unit";
      render();
    });
    els.unitTabs.append(button);
  });
  const dashboardButton = document.createElement("button");
  dashboardButton.className = "unit-tab";
  dashboardButton.type = "button";
  dashboardButton.innerHTML = `${getUnitIcon("Dashboard")}<span class="unit-label">Dashboard</span>`;
  dashboardButton.setAttribute("aria-label", "Dashboard");
  dashboardButton.title = "Dashboard";
  dashboardButton.dataset.view = "dashboard";
  dashboardButton.addEventListener("click", () => {
    activeView = "dashboard";
    render();
  });
  els.unitTabs.append(dashboardButton);
}

function goHome() {
  activeView = "home";
  activeUnit = UNITS[0];
  searchTerm = "";
  sortMode = "default";
  statusFilter = "all";
  els.searchInput.value = "";
  els.sortSelect.value = "default";
  els.statusFilter.value = "all";
  render();
  document.querySelector(".content-shell")?.scrollTo({ top: 0, behavior: "smooth" });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function changeMobileUnit() {
  const value = els.mobileUnitSelect.value;
  if (value === "home") {
    goHome();
    return;
  }
  if (value === "dashboard") {
    activeView = "dashboard";
    render();
    return;
  }

  activeUnit = value;
  activeView = "unit";
  render();
}

function getUnitShortLabel(unit) {
  const labels = {
    "CPR Box": "CPR",
    "Emer medicine": "ยา",
    "Emer cart Adult": "Adult",
    "Emer cart PED": "Ped",
  };
  return labels[unit] || unit.slice(0, 3);
}

function getUnitIcon(unit) {
  const icons = {
    "Med Stock": '<path d="m9 4-5 5a6.4 6.4 0 0 0 9 9l5-5a6.4 6.4 0 0 0-9-9Z"/><path d="m7 7 10 10"/>',
    "IV Fluid": '<path d="M9 5V3h6v2M8 5h8a2 2 0 0 1 2 2v10H6V7a2 2 0 0 1 2-2ZM6 17h12M12 17v5"/><path d="M12 8s-2 2.2-2 3.5a2 2 0 0 0 4 0C14 10.2 12 8 12 8Z"/>',
    "Equipment": '<rect x="2" y="4" width="20" height="15" rx="2"/><path d="M4 12h4l2-5 4 10 2-5h4M8 22h8M12 19v3"/>',
    "CPR Box": '<path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    "Emer medicine": '<path d="m14 3 7 7M17.5 6.5l-3 3M11 7l6 6M12 8l-8 8v4h4l8-8M6 18l-4 4M8 12l2 2M11 9l2 2"/>',
    "Emer cart Adult": '<path d="M5 11V8a7 7 0 0 1 14 0v3M5 10c4 0 6-2 7-4 1 2 4 4 7 4v4a7 7 0 0 1-14 0Z"/><path d="M9 13h.01M15 13h.01M9 17q3 2 6 0"/>',
    "Emer cart PED": '<path d="M5 10a7 7 0 0 1 14 0c4 0 4 6 0 6a7 7 0 0 1-14 0c-4 0-4-6 0-6Z"/><path d="M12 3c-3-3-5 1-2 3 2 1 4-1 3-2M9 12h.01M15 12h.01M9 16q3 3 6 0"/>',
    "Dashboard": '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 16v-4M12 16V7M17 16v-7"/>',
  };
  return `<svg class="unit-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[unit] || icons.Dashboard}</svg>`;
}

function render() {
  document.body.classList.toggle("home-view", activeView === "home");
  document.body.classList.toggle("dashboard-view", activeView === "dashboard");
  els.homeButton.classList.toggle("active", activeView === "home");
  els.mobileUnitSelect.value = activeView === "unit" ? activeUnit : activeView;
  document.querySelectorAll(".unit-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === "dashboard"
      ? activeView === "dashboard"
      : activeView === "unit" && button.textContent === activeUnit);
  });

  renderPageHeader();
  els.infoGrid.hidden = activeView === "unit";
  els.shortageOverview.hidden = activeView !== "home";
  els.monthlyReminder.hidden = activeView !== "home";
  els.dashboardInsights.hidden = activeView !== "dashboard";
  renderShortageOverview();
  renderMonthlyReminder();
  els.stockSection.hidden = activeView !== "unit";
  els.unitTitle.textContent = activeUnit;
  renderDashboard();
  renderAlerts();
  renderCheckLog();
  if (activeView === "unit") renderStockList();
}

function renderPageHeader() {
  if (activeView !== "unit") {
    els.pageTitle.textContent = activeView === "home" ? "Home" : "Dashboard";
    els.pageSubtitle.textContent = "เช็คง่าย แก้เลขไว แจ้งเตือนของใกล้หมดอายุ";
    return;
  }

  els.pageTitle.textContent = activeUnit;
  els.pageSubtitle.textContent = `รายการสต๊อกและการแจ้งเตือนเฉพาะ ${activeUnit}`;
}

function getAllItems() {
  return UNITS.flatMap((unit) => data[unit].map((item) => ({ ...item, unit })));
}

function shortageReasons(unit) {
  return unit === "Equipment" ? EQUIPMENT_SHORTAGE_REASONS : SHORTAGE_REASONS;
}

function shortageReason(item, unit = item.unit || activeUnit) {
  return Number(item.countedQty) < Number(item.requiredQty) && shortageReasons(unit).includes(item.shortageReason) ? item.shortageReason : "";
}

function renderShortageOverview() {
  const items = getAllItems();
  const groups = [
    { reason: "รอเบิก", tone: "amber", icon: '<path d="M5 7h14v13H5zM9 7V4h6v3M9 12h6M12 9v6"/>' },
    { reason: "ตามไม่ได้", tone: "rose", icon: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5M8.5 8.5l4 4m0-4-4 4"/>' },
    { reason: "ถูกยืม", tone: "blue", icon: '<path d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4"/>' },
    { reason: "ส่งซ่อม", tone: "violet", icon: '<path d="M14 4a6 6 0 0 0-7 8L3 16a3 3 0 0 0 5 5l4-4a6 6 0 0 0 8-7l-4 3-4-4z"/>' },
  ];
  els.shortageOverview.innerHTML = groups.map(({ reason, tone, icon }) => {
    const matches = items.filter(item => shortageReason(item) === reason);
    return `<section class="shortage-group shortage-${tone}" aria-label="${reason}">
      <div class="shortage-card-head"><span class="shortage-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></span><h2>${reason}</h2></div>
      <div class="shortage-count"><strong>${matches.length}</strong><span>รายการ</span></div>
      <div class="shortage-card-body">${matches.length
      ? matches.map(item => `<article class="shortage-entry"><strong>${escapeHtml(item.name)}</strong><div class="shortage-entry-meta"><span>${escapeHtml(item.unit)} · มี ${escapeHtml(item.countedQty)}/${escapeHtml(item.requiredQty)}</span><span class="shortage-deficit">ขาด ${Number(item.requiredQty) - Number(item.countedQty)}</span></div></article>`).join("")
      : '<div class="shortage-empty"><span aria-hidden="true">—</span>ไม่มีรายการ</div>'}</div></section>`;
  }).join("");
}

function getItemStatus(item, unit = item.unit || activeUnit) {
  if (item.requiredQty == null) return { key: "unknown", label: "ยังไม่ระบุจำนวนที่ต้องมี" };
  if (Number(item.countedQty) < Number(item.requiredQty)) return { key: "short", label: "ต้องเติม" };
  if (!item.expiryDate) return { key: "ok", label: "พร้อมใช้" };

  const days = daysUntil(item.expiryDate);
  if (days < 0) return { key: "expired", label: "หมดอายุ" };
  if (days <= getExpiryWindow(unit)) return { key: "expiring", label: "ใกล้หมดอายุ" };
  return { key: "ok", label: "พร้อมใช้" };
}

function getExpiryWindow(unit) {
  return UNIT_EXPIRY_WINDOWS[unit] || Number(settings.expiryWindow);
}

function daysUntil(dateValue) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateValue}T00:00:00`);
  return Math.ceil((target - today) / 86400000);
}

function renderDashboard() {
  const items =
    activeView !== "unit"
      ? getAllItems()
      : data[activeUnit].map((item) => ({ ...item, unit: activeUnit }));
  els.totalItems.textContent = items.length;
  els.expiringItems.textContent = items.filter((item) => getItemStatus(item, item.unit).key === "expiring").length;
  els.expiredItems.textContent = items.filter((item) => getItemStatus(item, item.unit).key === "expired").length;
  els.shortItems.textContent = items.filter((item) => getItemStatus(item, item.unit).key === "short").length;
  renderDashboardInsights();
}

function itemDashboardBucket(item, unit) {
  if (item.requiredQty == null) return "missing";
  if (Number(item.countedQty) >= Number(item.requiredQty)) return "complete";
  if (shortageReason(item, unit) === "รอเบิก") return "waiting";
  return "missing";
}

function dashboardPieStyle(counts) {
  const total = Math.max(1, counts.complete + counts.waiting + counts.missing);
  const complete = (counts.complete / total) * 360;
  const waiting = complete + (counts.waiting / total) * 360;
  return `conic-gradient(var(--mint) 0 ${complete}deg, var(--yellow) ${complete}deg ${waiting}deg, var(--magenta) ${waiting}deg 360deg)`;
}

function renderDashboardInsights() {
  if (activeView !== "dashboard") return;
  els.dashboardCharts.innerHTML = UNITS.map((unit) => {
    const counts = data[unit].reduce((total, item) => {
      total[itemDashboardBucket(item, unit)] += 1;
      return total;
    }, { complete: 0, waiting: 0, missing: 0 });
    const total = counts.complete + counts.waiting + counts.missing;
    return `<article class="pie-card">
      <div class="pie-chart" style="background:${dashboardPieStyle(counts)}"><span>${total}</span></div>
      <div class="pie-card-main">
        <h3>${escapeHtml(unit)}</h3>
        <div class="pie-legend">
          <span><i class="legend-complete"></i>ครบ ${counts.complete}</span>
          <span><i class="legend-waiting"></i>รอเบิก ${counts.waiting}</span>
          <span><i class="legend-missing"></i>หาไม่พบ ${counts.missing}</span>
        </div>
      </div>
    </article>`;
  }).join("");

  const counts = new Map();
  checkLogs.forEach((log) => {
    const name = String(log.inspector || "").trim();
    if (name) counts.set(name, (counts.get(name) || 0) + 1);
  });
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "th")).slice(0, 18);
  const max = Math.max(1, ...rows.map((row) => row[1]));
  els.inspectorHeatmap.innerHTML = rows.length
    ? rows.map(([name, count]) => {
      const level = Math.max(1, Math.ceil((count / max) * 5));
      return `<article class="heatmap-cell heat-${level}"><strong>${escapeHtml(name)}</strong><span>${count} ครั้ง</span></article>`;
    }).join("")
    : '<div class="empty-state">ยังไม่มีประวัติผู้ตรวจเช็ค</div>';
}

function renderMonthlyReminder() {
  if (activeView !== "home") return;
  const today = localDate();
  if (today.slice(-2) !== "01") {
    els.monthlyReminder.innerHTML = "";
    els.monthlyReminder.hidden = true;
    return;
  }
  const emergencyUnits = ["Emer cart Adult", "Emer cart PED", "CPR Box", "Emer medicine"];
  const items = emergencyUnits.flatMap((unit) => data[unit].map((item) => ({ ...item, unit })));
  const expiring = items.filter((item) => ["expiring", "expired"].includes(getItemStatus(item, item.unit).key));
  els.monthlyReminder.hidden = false;
  els.monthlyReminder.innerHTML = `<div class="monthly-reminder-card">
    <strong>อย่าลืมเช็ควันหมดอายุ</strong>
    <span>วันนี้วันที่ 1 ของเดือน ตรวจวันหมดอายุ Emer cart Adult, Emer cart PED, CPR Box และ Emer medicine</span>
    <small>${expiring.length ? `พบรายการใกล้หมดอายุ/หมดอายุ ${expiring.length} รายการ` : "ยังไม่พบรายการใกล้หมดอายุในรอบนี้"}</small>
  </div>`;
}

function renderAlerts() {
  const alerts = getAlerts();
  els.alertList.innerHTML = "";

  if (!alerts.length) {
    els.alertList.innerHTML = '<div class="empty-state">ไม่มีรายการที่ต้องแจ้งเตือนตอนนี้</div>';
    return;
  }

  alerts.forEach((item) => {
    const status = getItemStatus(item);
    const row = document.createElement("div");
    row.className = `alert-item ${status.key === "expired" ? "expired" : ""} ${status.key === "short" ? "short" : ""}`;
    row.innerHTML = `<strong>${item.name}</strong><span>${item.unit} · ${alertText(item)}</span>`;
    els.alertList.append(row);
  });
}

function renderCheckLog() {
  els.checkLogCount.textContent = checkLogs.length ? `${checkLogs.length} ครั้ง` : "ยังไม่มีประวัติ";
  els.checkLogList.innerHTML = "";

  if (!checkLogs.length) {
    els.checkLogList.innerHTML = '<div class="empty-state">ยังไม่มีประวัติการเช็คสต๊อก</div>';
    return;
  }

  checkLogs.slice(0, 8).forEach((log) => {
    const row = document.createElement("div");
    row.className = "check-log-item";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(log.unit)}</strong>
        <span>${escapeHtml(log.inspector || "-")} · ${log.inspectionDate ? formatDate(log.inspectionDate) : formatDateTime(log.checkedAt)} · ${escapeHtml(log.shift || "ไม่ระบุเวร")} · ${log.totalItems} รายการ</span>
        <small>ต่ำกว่าเกณฑ์ ${log.shortCount} · ใกล้หมดอายุ ${log.expiringCount} · หมดอายุแล้ว ${log.expiredCount}</small>
      </div>
      <span class="check-log-status ${log.shortCount || log.expiringCount || log.expiredCount ? "warning" : ""}">บันทึกแล้ว</span>
    `;
    els.checkLogList.append(row);
  });
}

function addCheckLog(unit, inspector, checkedAt, inspectionDate, shift) {
  const items = data[unit].map((item) => ({ ...item, unit }));
  const shortCount = items.filter((item) => Number(item.countedQty) < Number(item.requiredQty)).length;
  const expiringCount = items.filter((item) => getItemStatus(item, unit).key === "expiring").length;
  const expiredCount = items.filter((item) => getItemStatus(item, unit).key === "expired").length;

  checkLogs.unshift({
    id: createId(),
    checkedAt,
    inspectionDate,
    shift,
    fiscalYear: fiscalYear(inspectionDate),
    unit,
    inspector,
    totalItems: items.length,
    shortCount,
    expiringCount,
    expiredCount,
    items: items.map((item) => ({
      name: item.name,
      requiredQty: item.requiredQty,
      countedQty: item.countedQty,
      expiryDate: item.expiryDate,
      status: getItemStatus(item, unit).label,
      shortageReason: shortageReason(item),
    })),
  });
  checkLogs = checkLogs.slice(0, 200);
  saveCheckLogs();
  renderCheckLog();
  return checkLogs[0];
}

function getAlerts() {
  return getAllItems().filter((item) => getItemStatus(item).key !== "ok");
}

function alertText(item) {
  const status = getItemStatus(item);
  if (status.key === "unknown") return "ยังไม่ระบุจำนวนที่ต้องมีในชีทต้นฉบับ";
  if (status.key === "short") return `มี ${item.countedQty}/${item.requiredQty}${shortageReason(item) ? " · " + shortageReason(item) : ""}`;
  if (status.key === "expired") return `หมดอายุ ${formatDate(item.expiryDate)}`;
  return `เหลือ ${daysUntil(item.expiryDate)} วัน`;
}

function renderStockList() {
  const items = sortItems(
    data[activeUnit].filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm);
      const matchesStatus = statusFilter === "all" || getItemStatus(item).key === statusFilter;
      return matchesSearch && matchesStatus;
    })
  );
  const latestItem = data[activeUnit]
    .filter((item) => item.checkedAt)
    .sort((a, b) => String(a.checkedAt).localeCompare(String(b.checkedAt)))
    .at(-1);
  const lastCheckedText = latestItem
    ? `ตรวจล่าสุด ${latestItem.inspectionDate ? formatDate(latestItem.inspectionDate) : formatDateTime(latestItem.checkedAt)} ${latestItem.shift || ""} โดย ${latestItem.inspector || "-"}`
    : "ยังไม่มีบันทึกการตรวจ";
  els.lastChecked.textContent = lastCheckedText;
  els.lastCheckedTop.textContent = lastCheckedText;
  els.stockList.innerHTML = "";

  if (!items.length) {
    els.stockList.innerHTML = searchTerm || statusFilter !== "all"
      ? '<div class="empty-state">ไม่พบรายการที่ตรงกับตัวกรอง</div>'
      : '<div class="empty-state">ยังไม่มีรายการในหน่วยนี้ กดเพิ่มรายการได้เลย</div>';
    return;
  }

  const tableWrap = document.createElement("div");
  tableWrap.className = "stock-table-wrap";
  tableWrap.innerHTML = `
    <table class="stock-table">
      <thead>
        <tr>
          <th>รายการ</th>
          <th>จำนวนที่ต้องมี</th>
          <th>จำนวนที่นับได้</th>
          <th>วันหมดอายุ</th>
          <th>สถานะ</th>
          <th>ตรวจล่าสุด</th>
          <th class="action-col">จัดการ</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `;

  const body = tableWrap.querySelector("tbody");
  items.forEach((item) => {
    const status = getItemStatus(item);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(activeUnit)}</span>
        ${Number(item.countedQty) < Number(item.requiredQty) ? `<label class="shortage-label">หมายเหตุ<select class="shortage-select" aria-label="หมายเหตุ ${escapeHtml(item.name)}"><option value="">เลือกหมายเหตุ</option>${shortageReasons(activeUnit).map(reason => `<option${shortageReason(item) === reason ? " selected" : ""}>${reason}</option>`).join("")}</select></label>` : ""}
      </td>
      <td class="number-cell">${item.requiredQty == null ? "ยังไม่ระบุ" : escapeHtml(item.requiredQty)}</td>
      <td>
        <div class="qty-editor table-qty-editor" aria-label="แก้ไขจำนวน">
          <button class="qty-button decrease" type="button">−</button>
          <input class="qty-input" type="number" min="0" step="1" />
          <button class="qty-button increase" type="button">+</button>
        </div>
      </td>
      <td>${item.expiryDate ? escapeHtml(formatDate(item.expiryDate)) : '<span class="muted-cell">ไม่มีวันหมดอายุ</span>'}</td>
      <td><span class="${statusBadgeClass(status.key)}">${escapeHtml(status.label)}</span></td>
      <td>${item.checkedAt ? escapeHtml(formatDateTime(item.checkedAt)) : '<span class="muted-cell">ยังไม่ตรวจ</span>'}</td>
      <td class="action-col"><button class="text-button edit-button" type="button">แก้ไข</button></td>
    `;

    const input = row.querySelector(".qty-input");
    input.value = item.countedQty;
    input.addEventListener("change", () => updateQty(item.id, Number(input.value)));
    row.querySelector(".decrease").addEventListener("click", () => updateQty(item.id, Math.max(0, Number(item.countedQty) - 1)));
    row.querySelector(".increase").addEventListener("click", () => updateQty(item.id, Number(item.countedQty) + 1));
    row.querySelector(".edit-button").addEventListener("click", () => openItemDialog(item));
    row.querySelector(".shortage-select")?.addEventListener("change", event => {
      item.shortageReason = event.target.value;
      saveData();
      render();
    });

    body.append(row);
  });

  els.stockList.append(tableWrap);
}

function statusBadgeClass(statusKey) {
  const classMap = {
    ok: "status-pill",
    expiring: "status-pill warning",
    expired: "status-pill danger",
    short: "status-pill danger",
  };
  return classMap[statusKey] || "status-pill";
}

function sortItems(items) {
  const sorted = [...items];
  if (sortMode === "az") {
    sorted.sort((a, b) => a.name.localeCompare(b.name, "th", { sensitivity: "base" }));
  } else if (sortMode === "za") {
    sorted.sort((a, b) => b.name.localeCompare(a.name, "th", { sensitivity: "base" }));
  } else if (sortMode === "expiryAsc") {
    sorted.sort((a, b) => expirySortValue(a) - expirySortValue(b) || a.name.localeCompare(b.name, "th", { sensitivity: "base" }));
  }
  return sorted;
}

function expirySortValue(item) {
  if (!item.expiryDate) return Number.POSITIVE_INFINITY;
  return new Date(`${item.expiryDate}T00:00:00`).getTime();
}

function buildMeta(item) {
  const expiry = item.expiryDate ? `หมดอายุ ${formatDate(item.expiryDate)}` : "ไม่มีวันหมดอายุ";
  return `ต้องมี ${item.requiredQty} · ${expiry}`;
}

function updateQty(id, nextQty) {
  const item = data[activeUnit].find((entry) => entry.id === id);
  if (!item) return;
  item.countedQty = Math.max(0, Number(nextQty) || 0);
  if (item.countedQty >= Number(item.requiredQty)) item.shortageReason = "";
  saveData();
  render();
}

async function saveInspection() {
  const inspector = els.inspectionInspector.value.trim();
  const inspectionDate = els.inspectionDate.value;
  const shift = els.inspectionShift.value;
  if (!inspector || !inspectionDate || !SHIFTS.includes(shift) || !els.inspectionDate.checkValidity()) {
    alert("กรุณาระบุวันที่ตรวจเช็ค เวร และชื่อผู้ตรวจเช็คให้ครบ");
    return;
  }
  const unit = activeUnit;
  const checkedAt = new Date().toISOString();
  data[unit].forEach(item => Object.assign(item, { inspector, checkedAt, inspectionDate, shift }));
  const checkLog = addCheckLog(unit, inspector, checkedAt, inspectionDate, shift);
  const telegramMessage = buildInspectionMessage(unit, inspector, checkedAt) + "\nวันที่ตรวจ: " + formatDate(inspectionDate) + " · " + shift + " · ปีงบประมาณ " + fiscalYear(inspectionDate);
  saveData();
  renderInspectors(inspector);
  els.inspectionInspector.value = "";
  render();
  showToast("บันทึกในเครื่องสำเร็จ กำลังส่ง Google Sheet");
  els.saveInspectionButton.disabled = true;
  try {
    const sent = await sendInspectionToGoogleSheet(checkLog);
    if (canSendTelegram()) await sendTelegramMessage(telegramMessage);
    showToast(sent ? "บันทึก Google Sheet สำเร็จ · ปีงบประมาณ " + checkLog.fiscalYear : "บันทึกในเครื่องแล้ว แต่ยังยืนยัน Google Sheet ไม่ได้");
  } finally {
    els.saveInspectionButton.disabled = false;
  }
}

function openItemDialog(item = null) {
  const editing = Boolean(item);
  els.dialogTitle.textContent = editing ? "แก้ไขรายการ" : "เพิ่มรายการ";
  els.editingId.value = item?.id || "";
  els.itemName.value = item?.name || "";
  els.requiredQty.value = item ? item.requiredQty ?? "" : 1;
  els.countedQty.value = item?.countedQty ?? 0;
  els.noExpiry.checked = !item?.expiryDate;
  els.expiryDate.value = item?.expiryDate || "";
  els.deleteItemButton.hidden = !editing;
  syncExpiryField();
  els.itemDialog.showModal();
}

function syncExpiryField() {
  els.expiryWrap.hidden = els.noExpiry.checked;
  els.expiryDate.required = !els.noExpiry.checked;
  if (els.noExpiry.checked) els.expiryDate.value = "";
}

function saveItem(event) {
  event.preventDefault();
  const id = els.editingId.value || createId();
  const existingItem = data[activeUnit].find((item) => item.id === id);
  const nextItem = {
    id,
    name: els.itemName.value.trim(),
    requiredQty: Number(els.requiredQty.value) || 0,
    countedQty: Number(els.countedQty.value) || 0,
    expiryDate: els.noExpiry.checked ? null : els.expiryDate.value,
    inspector: existingItem?.inspector || "",
    checkedAt: existingItem?.checkedAt || "",
    inspectionDate: existingItem?.inspectionDate || "",
    shift: existingItem?.shift || "",
    shortageReason: existingItem?.shortageReason || "",
    sourceId: existingItem?.sourceId || "",
  };
  if (nextItem.countedQty >= nextItem.requiredQty) nextItem.shortageReason = "";

  const index = data[activeUnit].findIndex((item) => item.id === id);
  if (index >= 0) data[activeUnit][index] = nextItem;
  else data[activeUnit].push(nextItem);

  saveData();
  els.itemDialog.close();
  render();
  showToast("บันทึกสำเร็จ");
}

function resetFromExcelSeed() {
  if (!confirm("โหลดรายการและจำนวนที่ต้องมีจากชีทต้นฉบับใหม่ทุกหน้า? จำนวนที่นับ วันหมดอายุ และข้อมูลการตรวจปัจจุบันจะถูกแทนที่")) return;
  backupBeforeSourceImport(data, `reset-${Date.now()}`);
  data = cloneData(defaultData);
  saveData();
  searchTerm = "";
  statusFilter = "all";
  els.searchInput.value = "";
  els.statusFilter.value = "all";
  render();
}

function recoverMissingItems() {
  let recoveredCount = 0;
  UNITS.forEach((unit) => {
    const existingNames = new Set(data[unit].map((item) => item.sourceId || normalizeName(item.name)));
    defaultData[unit].forEach((seedItem) => {
      const key = seedItem.sourceId || normalizeName(seedItem.name);
      if (existingNames.has(key)) return;
      data[unit].push({ ...cloneData(seedItem), id: createId() });
      existingNames.add(key);
      recoveredCount++;
    });
  });

  saveData();
  searchTerm = "";
  statusFilter = "all";
  els.searchInput.value = "";
  els.statusFilter.value = "all";
  render();
  alert(recoveredCount ? `กู้รายการกลับมาแล้ว ${recoveredCount} รายการ` : "ไม่พบรายการที่หายไปจากชีทต้นฉบับ");
}

function normalizeName(name) {
  return String(name || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function deleteCurrentItem() {
  const id = els.editingId.value;
  const item = data[activeUnit].find((entry) => entry.id === id);
  if (!item) return;
  if (!confirm(`ยืนยันลบรายการ "${item.name}" ?`)) return;
  data[activeUnit] = data[activeUnit].filter((item) => item.id !== id);
  saveData();
  els.itemDialog.close();
  render();
}

function openSettings() {
  els.telegramToken.value = settings.token;
  els.telegramChatId.value = settings.chatId;
  els.expiryWindow.value = String(settings.expiryWindow);
  els.googleSheetUrl.value = settings.googleSheetUrl || "";
  els.settingsDialog.showModal();
}

function saveSettingsForm(event) {
  event.preventDefault();
  settings = {
    token: els.telegramToken.value.trim(),
    chatId: els.telegramChatId.value.trim(),
    expiryWindow: Number(els.expiryWindow.value),
    googleSheetUrl: els.googleSheetUrl.value.trim(),
  };
  saveSettings();
  els.settingsDialog.close();
  render();
  showToast("บันทึกสำเร็จ");
}

function showToast(message) {
  if (!els.toast) return;
  clearTimeout(showToast.timer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  showToast.timer = setTimeout(() => {
    els.toast.classList.remove("show");
  }, 2200);
}

async function sendTelegramAlert() {
  const message = buildTelegramMessage();
  if (!canSendTelegram()) {
    await navigator.clipboard.writeText(message);
    alert("ยังไม่ได้ตั้งค่า Telegram จึงคัดลอกข้อความแจ้งเตือนไว้ให้แล้ว");
    return;
  }

  const sent = await sendTelegramMessage(message);
  if (sent) {
    alert("ส่ง Telegram เรียบร้อยแล้ว");
  } else {
    await navigator.clipboard.writeText(message);
    alert("ส่ง Telegram ไม่สำเร็จ แต่คัดลอกข้อความแจ้งเตือนไว้ให้แล้ว");
  }
}

async function notifyInspection(unit, inspector, checkedAt) {
  if (!canSendTelegram()) return false;

  const message = buildInspectionMessage(unit, inspector, checkedAt);
  return sendTelegramMessage(message);
}

function canSendTelegram() {
  return Boolean(settings.googleSheetUrl || (settings.token && settings.chatId));
}

async function sendInspectionToGoogleSheet(checkLog) {
  const url = settings.googleSheetUrl;
  if (!url || !checkLog) return false;

  const payload = {
    source: "med-stock",
    sentAt: new Date().toISOString(),
    log: checkLog,
    unit: checkLog.unit,
    inspector: checkLog.inspector,
    checkedAt: checkLog.checkedAt,
    totals: {
      totalItems: checkLog.totalItems,
      shortCount: checkLog.shortCount,
      expiringCount: checkLog.expiringCount,
      expiredCount: checkLog.expiredCount,
    },
    items: checkLog.items || [],
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result.ok === true;
  } catch {
    try {
      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      const receipt = await jsonpRequest(url, { action: "inspectionReceipt", id: checkLog.id, fiscalYear: checkLog.fiscalYear });
      return receipt?.ok === true && receipt.saved === true;
    } catch {
      return false;
    }
  }
}

function queueCloudStateSave() {
  if (cloudSyncPaused || !settings.googleSheetUrl) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(saveCloudState, 800);
}

async function saveCloudState() {
  if (!settings.googleSheetUrl) return false;

  const payload = {
    action: "saveState",
    sourceVersion: SOURCE_VERSION,
    source: "med-stock",
    updatedAt: new Date().toISOString(),
    data,
    checkLogs,
    inspectors: inspectorNames(),
  };

  try {
    await fetch(settings.googleSheetUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    return true;
  } catch {
    return false;
  }
}

async function clearCloudState() {
  if (!settings.googleSheetUrl) return false;

  try {
    await fetch(settings.googleSheetUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "clearState", source: "med-stock", clearedAt: new Date().toISOString() }),
    });
    return true;
  } catch {
    return false;
  }
}

async function clearSavedState() {
  if (!confirm("ล้างข้อมูลที่เว็บจำไว้ทั้งหมด แล้วโหลดรายการตั้งต้นใหม่?")) return;

  cloudSyncPaused = true;
  clearTimeout(cloudSaveTimer);
  els.clearSavedStateButton.disabled = true;
  showToast("กำลังล้างข้อมูลที่เว็บจำไว้");
  await clearCloudState();
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CHECK_LOG_KEY);
  localStorage.removeItem(INSPECTORS_KEY);
  localStorage.removeItem(SOURCE_VERSION_KEY);
  data = cloneData(defaultData);
  checkLogs = [];
  activeView = "home";
  activeUnit = UNITS[0];
  searchTerm = "";
  sortMode = "default";
  statusFilter = "all";
  els.searchInput.value = "";
  els.sortSelect.value = "default";
  els.statusFilter.value = "all";
  renderInspectors("");
  cloudSyncPaused = false;
  els.clearSavedStateButton.disabled = false;
  els.settingsDialog.close();
  render();
  showToast("ล้างข้อมูลที่เว็บจำไว้แล้ว");
}

async function loadCloudState() {
  if (!settings.googleSheetUrl) return;

  try {
    const response = await jsonpRequest(settings.googleSheetUrl, { action: "loadState" });
    if (!response?.ok || !response.state?.data) return;

    let nextData = normalizeImportedData(response.state.data);
    if (SOURCE_VERSION && response.state.sourceVersion !== SOURCE_VERSION) {
      backupBeforeSourceImport(nextData, "cloud");
      nextData = applySourceCatalog(nextData);
    }
    const nextCheckLogs = Array.isArray(response.state.checkLogs) ? response.state.checkLogs : [];
    cloudSyncPaused = true;
    data = nextData;
    checkLogs = nextCheckLogs.map(log => ({ ...log, unit: UNIT_ALIASES[log.unit] || log.unit }));
    renderInspectors();
    cloudSyncPaused = false;
    render();
  } catch {
    cloudSyncPaused = false;
  }
}

function jsonpRequest(url, params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = `medStockJsonp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const script = document.createElement("script");
    const requestUrl = new URL(url);

    Object.entries(params).forEach(([key, value]) => requestUrl.searchParams.set(key, value));
    requestUrl.searchParams.set("callback", callbackName);

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Cloud sync timed out"));
    }, 10000);

    function cleanup() {
      clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (value) => {
      cleanup();
      resolve(value);
    };

    script.src = requestUrl.toString();
    script.onerror = () => {
      cleanup();
      reject(new Error("Cloud sync failed"));
    };
    document.body.append(script);
  });
}

function normalizeImportedData(importedData) {
  const normalized = {};
  UNITS.forEach((unit) => {
    const keys = [unit, ...Object.keys(UNIT_ALIASES).filter(key => UNIT_ALIASES[key] === unit)];
    const seen = new Set();
    normalized[unit] = keys.flatMap(key => Array.isArray(importedData?.[key]) ? importedData[key] : []).filter(item => {
      const identity = item.id || item.name;
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    });
  });
  return normalized;
}

async function sendTelegramMessage(message) {
  if (settings.googleSheetUrl) {
    const sentByScript = await sendTelegramByGoogleScript(message);
    if (sentByScript) return true;
  }

  if (!settings.token || !settings.chatId) return false;

  const chunks = splitTelegramMessage(message);
  let sentAll = true;

  for (const chunk of chunks) {
    const sent = await sendTelegramChunk(chunk);
    sentAll = sentAll && sent;
  }

  return sentAll;
}

async function sendTelegramByGoogleScript(message) {
  if (!settings.googleSheetUrl) return false;

  try {
    await fetch(settings.googleSheetUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "sendTelegram",
        token: settings.token,
        chatId: settings.chatId,
        message,
      }),
    });
    return true;
  } catch {
    return false;
  }
}

async function sendTelegramChunk(message) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${settings.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: settings.chatId,
        text: message,
      }),
    });

    return response.ok;
  } catch {
    return sendTelegramByFrame(message);
  }
}

function splitTelegramMessage(message) {
  const limit = 3500;
  const chunks = [];
  let remaining = String(message);

  while (remaining.length > limit) {
    let splitAt = remaining.lastIndexOf("\n", limit);
    if (splitAt < 1) splitAt = limit;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

function sendTelegramByFrame(message) {
  return new Promise((resolve) => {
    const frame = document.createElement("iframe");
    const params = new URLSearchParams({
      chat_id: settings.chatId,
      text: message,
    });

    frame.hidden = true;
    frame.src = `https://api.telegram.org/bot${settings.token}/sendMessage?${params.toString()}`;
    frame.addEventListener(
      "load",
      () => {
        setTimeout(() => frame.remove(), 300);
        resolve(true);
      },
      { once: true }
    );
    frame.addEventListener(
      "error",
      () => {
        frame.remove();
        resolve(false);
      },
      { once: true }
    );

    document.body.append(frame);
    setTimeout(() => {
      if (document.body.contains(frame)) frame.remove();
      resolve(true);
    }, 3500);
  });
}

function buildInspectionMessage(unit, inspector, checkedAt) {
  const items = data[unit];
  const shortItems = items.filter((item) => Number(item.countedQty) < Number(item.requiredQty));
  const expiringItems = items.filter((item) => getItemStatus({ ...item, unit }, unit).key === "expiring");
  const expiredItems = items.filter((item) => getItemStatus({ ...item, unit }, unit).key === "expired");
  const lines = [
    `บันทึกการตรวจสต๊อก`,
    `หน่วย: ${unit}`,
    `ผู้ตรวจสอบ: ${inspector}`,
    `เวลา: ${formatDateTime(checkedAt)}`,
    `รายการทั้งหมด: ${items.length}`,
    `สต๊อกต่ำกว่าเกณฑ์: ${shortItems.length}`,
    `ใกล้หมดอายุ: ${expiringItems.length}`,
    `หมดอายุแล้ว: ${expiredItems.length}`,
  ];

  const issues = [...shortItems, ...expiredItems, ...expiringItems]
    .filter((item, index, self) => self.findIndex((entry) => entry.id === item.id) === index)
    .slice(0, 12);

  if (issues.length) {
    lines.push("", "รายการที่ต้องดู:");
    issues.forEach((item) => lines.push(`- ${item.name} (${alertText({ ...item, unit })})`));
  }

  lines.push("", `รายการที่ตรวจใน ${unit}:`);
  items.forEach((item) => lines.push(formatInspectionItemLine(item, unit)));

  return lines.join("\n");
}

function formatInspectionItemLine(item, unit) {
  const expiry = item.expiryDate ? `หมดอายุ ${formatDate(item.expiryDate)}` : "ไม่มีวันหมดอายุ";
  const status = alertText({ ...item, unit });
  return `- ${item.name}: ${item.countedQty}/${item.requiredQty} | ${expiry} | ${status}`;
}

function buildTelegramMessage() {
  const alerts = getAlerts();
  const header = `แจ้งเตือนสต๊อกยาและเวชภัณฑ์\nวันที่ ${formatDateTime(new Date().toISOString())}`;
  if (!alerts.length) return `${header}\nไม่มีรายการที่ต้องแจ้งเตือน`;

  const lines = alerts.map((item) => `- ${item.unit}: ${item.name} (${alertText(item)})`);
  return `${header}\n${lines.join("\n")}`;
}

function exportExcel() {
  const rows = [
    ["หน่วย", "ชื่อยา/เวชภัณฑ์", "จำนวนที่ต้องมี", "จำนวนที่นับได้", "วันหมดอายุ", "ผู้ตรวจสอบ", "วันที่ตรวจเช็ค", "เวร", "ปีงบประมาณ", "สถานะ"],
  ];

  getAllItems().forEach((item) => {
    const status = getItemStatus(item, item.unit);
    rows.push([
      item.unit,
      item.name,
      item.requiredQty,
      item.countedQty,
      item.expiryDate ? formatDate(item.expiryDate) : "ไม่มีวันหมดอายุ",
      item.inspector || "",
      item.inspectionDate || (item.checkedAt ? formatDateTime(item.checkedAt) : ""),
      item.shift || "",
      item.inspectionDate ? fiscalYear(item.inspectionDate) : "",
      status.label,
    ]);
  });

  const html = `<!doctype html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<table border="1">
${rows
  .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
  .join("")}
</table>
<br>
<table border="1">
<tr><td>ประวัติการเช็คสต๊อก</td><td>เวลาบันทึก</td><td>วันที่ตรวจเช็ค</td><td>เวร</td><td>ปีงบประมาณ</td><td>หน่วย</td><td>ผู้ตรวจสอบ</td><td>รายการทั้งหมด</td><td>ต่ำกว่าเกณฑ์</td><td>ใกล้หมดอายุ</td><td>หมดอายุแล้ว</td></tr>
${checkLogs
  .map(
    (log) =>
      `<tr><td>${escapeHtml(log.id)}</td><td>${escapeHtml(formatDateTime(log.checkedAt))}</td><td>${escapeHtml(log.inspectionDate || "")}</td><td>${escapeHtml(log.shift || "")}</td><td>${escapeHtml(log.fiscalYear || "")}</td><td>${escapeHtml(log.unit)}</td><td>${escapeHtml(log.inspector)}</td><td>${escapeHtml(log.totalItems)}</td><td>${escapeHtml(log.shortCount)}</td><td>${escapeHtml(log.expiringCount)}</td><td>${escapeHtml(log.expiredCount)}</td></tr>`
  )
  .join("")}
</table>
<br>
<table border="1">
<tr><td>รายละเอียดประวัติการเช็ค</td><td>เวลาบันทึก</td><td>วันที่ตรวจเช็ค</td><td>เวร</td><td>ปีงบประมาณ</td><td>หน่วย</td><td>ผู้ตรวจสอบ</td><td>ชื่อรายการ</td><td>จำนวนที่ต้องมี</td><td>จำนวนที่นับได้</td><td>วันหมดอายุ</td><td>สถานะ</td></tr>
${checkLogs
  .flatMap((log) =>
    (log.items || []).map(
      (item) =>
        `<tr><td>${escapeHtml(log.id)}</td><td>${escapeHtml(formatDateTime(log.checkedAt))}</td><td>${escapeHtml(log.inspectionDate || "")}</td><td>${escapeHtml(log.shift || "")}</td><td>${escapeHtml(log.fiscalYear || "")}</td><td>${escapeHtml(log.unit)}</td><td>${escapeHtml(log.inspector)}</td><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.requiredQty)}</td><td>${escapeHtml(item.countedQty)}</td><td>${escapeHtml(item.expiryDate || "ไม่มีวันหมดอายุ")}</td><td>${escapeHtml(item.status)}</td></tr>`
    )
  )
  .join("")}
</table>
</body>
</html>`;

  const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `med-stock-${new Date().toISOString().slice(0, 10)}.xls`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function exportData() {
  const blob = new Blob([JSON.stringify({ data, sourceVersion: SOURCE_VERSION, checkLogs, inspectors: inspectorNames(), settings: { expiryWindow: settings.expiryWindow } }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `med-stock-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const importedData = normalizeImportedData(parsed.data || parsed);
      data = importedData;
      if (Array.isArray(parsed.checkLogs)) {
        checkLogs = parsed.checkLogs.map(log => ({ ...log, unit: UNIT_ALIASES[log.unit] || log.unit }));
        saveCheckLogs();
      }
      saveData();
      render();
      renderInspectors();
      alert("นำเข้าข้อมูลเรียบร้อยแล้ว");
    } catch {
      alert("ไฟล์ไม่ถูกต้อง กรุณาเลือกไฟล์ที่ส่งออกจากระบบนี้");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function formatDate(dateValue) {
  if (!dateValue) return "-";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(`${dateValue}T00:00:00`));
}

function formatDateTime(dateValue) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateValue));
}
