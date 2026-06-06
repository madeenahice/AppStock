const UNITS = ["CPR Box", "ยารถ Emer", "รถ EMER adult", "รถ EMER ped"];
const UNIT_EXPIRY_WINDOWS = {
  "CPR Box": 180,
  "ยารถ Emer": 180,
};
const STORAGE_KEY = "cute-med-stock-v3";
const SETTINGS_KEY = "cute-med-stock-settings-v1";
const CHECK_LOG_KEY = "cute-med-stock-check-log-v1";
const SIDEBAR_KEY = "cute-med-stock-sidebar-collapsed-v1";
const DEFAULT_GOOGLE_SHEET_URL =
  "https://script.google.com/macros/s/AKfycbzvois7VRC7USt8J4gHVuH9ggtScoN1gR5YPkL93kU80zwheqeAxyGVmvV7wF6JIEsSeg/exec";
const LEGACY_GOOGLE_SHEET_URLS = [
  "https://script.googleusercontent.com/macros/echo",
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
  "ยารถ Emer": [
    createSeed("Atropine 0.6 mg/ml", 6, 6, daysFromNow(20), "ระบบ"),
    createSeed("Dextrose 50%", 4, 3, daysFromNow(120), "ระบบ"),
  ],
  "รถ EMER adult": [
    createSeed("Normal Saline 1000 ml", 6, 6, daysFromNow(200), "ระบบ"),
    createSeed("IV catheter No.18", 10, 10, null, "ระบบ"),
  ],
  "รถ EMER ped": [
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
  stockSection: document.querySelector("#stockSection"),
  unitTitle: document.querySelector("#unitTitle"),
  lastChecked: document.querySelector("#lastChecked"),
  lastCheckedTop: document.querySelector("#lastCheckedTop"),
  totalItems: document.querySelector("#totalItems"),
  expiringItems: document.querySelector("#expiringItems"),
  expiredItems: document.querySelector("#expiredItems"),
  shortItems: document.querySelector("#shortItems"),
  addItemButton: document.querySelector("#addItemButton"),
  exportButton: document.querySelector("#exportButton"),
  exportExcelButton: document.querySelector("#exportExcelButton"),
  recoverItemsButton: document.querySelector("#recoverItemsButton"),
  resetSeedButton: document.querySelector("#resetSeedButton"),
  importFile: document.querySelector("#importFile"),
  searchInput: document.querySelector("#searchInput"),
  sortSelect: document.querySelector("#sortSelect"),
  statusFilter: document.querySelector("#statusFilter"),
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
  toast: document.querySelector("#toast"),
};

init();

function init() {
  syncSidebar();
  renderTabs();
  bindEvents();
  render();
  loadCloudState();
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
      id: createId(),
      name: item.name,
      requiredQty: Number(item.requiredQty) || 0,
      countedQty: Number(item.countedQty) || 0,
      expiryDate: item.expiryDate || null,
      inspector: item.inspector || "",
      checkedAt: item.checkedAt || "",
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
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return cloneData(defaultData);

  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed["กล่องยา EMER"]) && !Array.isArray(parsed["ยารถ Emer"])) {
      parsed["ยารถ Emer"] = parsed["กล่องยา EMER"];
      delete parsed["กล่องยา EMER"];
    }
    UNITS.forEach((unit) => {
      if (!Array.isArray(parsed[unit])) parsed[unit] = [];
    });
    return parsed;
  } catch {
    return cloneData(defaultData);
  }
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
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
  const stored = localStorage.getItem(CHECK_LOG_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  queueCloudStateSave();
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function saveCheckLogs() {
  localStorage.setItem(CHECK_LOG_KEY, JSON.stringify(checkLogs));
  queueCloudStateSave();
}

function bindEvents() {
  els.addItemButton.addEventListener("click", () => openItemDialog());
  els.exportButton.addEventListener("click", exportData);
  els.exportExcelButton.addEventListener("click", exportExcel);
  els.recoverItemsButton.addEventListener("click", recoverMissingItems);
  els.resetSeedButton.addEventListener("click", resetFromExcelSeed);
  els.importFile.addEventListener("change", importData);
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
    button.textContent = unit;
    button.title = unit;
    button.dataset.short = getUnitShortLabel(unit);
    button.dataset.icon = getUnitIcon(unit);
    button.addEventListener("click", () => {
      activeUnit = unit;
      activeView = "unit";
      render();
    });
    els.unitTabs.append(button);
  });
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

  activeUnit = value;
  activeView = "unit";
  render();
}

function getUnitShortLabel(unit) {
  const labels = {
    "CPR Box": "CPR",
    "ยารถ Emer": "ยา",
    "รถ EMER adult": "Adult",
    "รถ EMER ped": "Ped",
  };
  return labels[unit] || unit.slice(0, 3);
}

function getUnitIcon(unit) {
  const icons = {
    "CPR Box": "❤",
    "ยารถ Emer": "𓊔",
    "รถ EMER adult": "⚕",
    "รถ EMER ped": "⚕",
  };
  return icons[unit] || "•";
}

function render() {
  els.homeButton.classList.toggle("active", activeView === "home");
  els.mobileUnitSelect.value = activeView === "home" ? "home" : activeUnit;
  document.querySelectorAll(".unit-tab").forEach((button) => {
    button.classList.toggle("active", activeView === "unit" && button.textContent === activeUnit);
  });

  renderPageHeader();
  els.infoGrid.hidden = activeView === "unit";
  els.stockSection.hidden = activeView === "home";
  els.unitTitle.textContent = activeUnit;
  renderDashboard();
  renderAlerts();
  renderCheckLog();
  if (activeView === "unit") renderStockList();
}

function renderPageHeader() {
  if (activeView === "home") {
    els.pageTitle.textContent = "ระบบจัดการสต๊อกยาและเวชภัณฑ์";
    els.pageSubtitle.textContent = "เช็คง่าย แก้เลขไว แจ้งเตือนของใกล้หมดอายุ";
    return;
  }

  els.pageTitle.textContent = activeUnit;
  els.pageSubtitle.textContent = `รายการสต๊อกและการแจ้งเตือนเฉพาะ ${activeUnit}`;
}

function getAllItems() {
  return UNITS.flatMap((unit) => data[unit].map((item) => ({ ...item, unit })));
}

function getItemStatus(item, unit = item.unit || activeUnit) {
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
    activeView === "home"
      ? getAllItems()
      : data[activeUnit].map((item) => ({ ...item, unit: activeUnit }));
  els.totalItems.textContent = items.length;
  els.expiringItems.textContent = items.filter((item) => getItemStatus(item, item.unit).key === "expiring").length;
  els.expiredItems.textContent = items.filter((item) => getItemStatus(item, item.unit).key === "expired").length;
  els.shortItems.textContent = items.filter((item) => getItemStatus(item, item.unit).key === "short").length;
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
        <span>${escapeHtml(log.inspector || "-")} · ${formatDateTime(log.checkedAt)} · ${log.totalItems} รายการ</span>
        <small>ต่ำกว่าเกณฑ์ ${log.shortCount} · ใกล้หมดอายุ ${log.expiringCount} · หมดอายุแล้ว ${log.expiredCount}</small>
      </div>
      <span class="check-log-status ${log.shortCount || log.expiringCount || log.expiredCount ? "warning" : ""}">บันทึกแล้ว</span>
    `;
    els.checkLogList.append(row);
  });
}

function addCheckLog(unit, inspector, checkedAt) {
  const items = data[unit].map((item) => ({ ...item, unit }));
  const shortCount = items.filter((item) => Number(item.countedQty) < Number(item.requiredQty)).length;
  const expiringCount = items.filter((item) => getItemStatus(item, unit).key === "expiring").length;
  const expiredCount = items.filter((item) => getItemStatus(item, unit).key === "expired").length;

  checkLogs.unshift({
    id: createId(),
    checkedAt,
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
  if (status.key === "short") return `มี ${item.countedQty}/${item.requiredQty}`;
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
    ? `ตรวจล่าสุด ${formatDateTime(latestItem.checkedAt)} โดย ${latestItem.inspector || "-"}`
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
      </td>
      <td class="number-cell">${escapeHtml(item.requiredQty)}</td>
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
  saveData();
  render();
}

async function saveInspection() {
  const inspector = els.inspectionInspector.value.trim();
  if (!inspector) {
    els.inspectionInspector.focus();
    alert("กรุณากรอกชื่อผู้ตรวจสอบก่อนบันทึก");
    return;
  }

  const checkedAt = new Date().toISOString();
  data[activeUnit].forEach((item) => {
    item.inspector = inspector;
    item.checkedAt = checkedAt;
  });
  const checkLog = addCheckLog(activeUnit, inspector, checkedAt);
  saveData();
  render();
  showToast("บันทึกสำเร็จ");

  const googleSheetSent = settings.googleSheetUrl ? await sendInspectionToGoogleSheet(checkLog) : null;
  const telegramSent = canSendTelegram() ? await notifyInspection(activeUnit, inspector, checkedAt) : null;
  const results = [`บันทึกการตรวจ ${activeUnit} เรียบร้อยแล้ว`];

  if (googleSheetSent === true) results.push("ส่ง Google Sheet แล้ว");
  else if (googleSheetSent === false) results.push("ส่ง Google Sheet ไม่สำเร็จ");
  else results.push("ยังไม่ได้ตั้งค่า Google Sheet");

  if (telegramSent === true) results.push("ส่ง Telegram แล้ว");
  else if (telegramSent === false) results.push("ส่ง Telegram ไม่สำเร็จ");
  else results.push("ยังไม่ได้ตั้งค่า Telegram");

  console.info(results.join("\n"));
}

function openItemDialog(item = null) {
  const editing = Boolean(item);
  els.dialogTitle.textContent = editing ? "แก้ไขรายการ" : "เพิ่มรายการ";
  els.editingId.value = item?.id || "";
  els.itemName.value = item?.name || "";
  els.requiredQty.value = item?.requiredQty ?? 1;
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
  };

  const index = data[activeUnit].findIndex((item) => item.id === id);
  if (index >= 0) data[activeUnit][index] = nextItem;
  else data[activeUnit].push(nextItem);

  saveData();
  els.itemDialog.close();
  render();
  showToast("บันทึกสำเร็จ");
}

function resetFromExcelSeed() {
  if (!confirm("โหลดรายการและจำนวนที่ต้องมีจาก Excel ใหม่? ข้อมูลที่แก้ไว้ในหน้านี้จะถูกแทนที่")) return;
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
    const existingNames = new Set(data[unit].map((item) => normalizeName(item.name)));
    defaultData[unit].forEach((seedItem) => {
      if (existingNames.has(normalizeName(seedItem.name))) return;
      data[unit].push({ ...cloneData(seedItem), id: createId(), countedQty: seedItem.requiredQty });
      existingNames.add(normalizeName(seedItem.name));
      recoveredCount++;
    });
  });

  saveData();
  searchTerm = "";
  statusFilter = "all";
  els.searchInput.value = "";
  els.statusFilter.value = "all";
  render();
  alert(recoveredCount ? `กู้รายการกลับมาแล้ว ${recoveredCount} รายการ` : "ไม่พบรายการที่หายไปจาก Excel");
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
    return response.ok;
  } catch {
    try {
      await fetch(url, {
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
    source: "med-stock",
    updatedAt: new Date().toISOString(),
    data,
    checkLogs,
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

async function loadCloudState() {
  if (!settings.googleSheetUrl) return;

  try {
    const response = await jsonpRequest(settings.googleSheetUrl, { action: "loadState" });
    if (!response?.ok || !response.state?.data) return;

    const nextData = normalizeImportedData(response.state.data);
    const nextCheckLogs = Array.isArray(response.state.checkLogs) ? response.state.checkLogs : [];
    cloudSyncPaused = true;
    data = nextData;
    checkLogs = nextCheckLogs;
    saveData();
    saveCheckLogs();
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
    normalized[unit] = Array.isArray(importedData?.[unit]) ? importedData[unit] : [];
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
    ["หน่วย", "ชื่อยา/เวชภัณฑ์", "จำนวนที่ต้องมี", "จำนวนที่นับได้", "วันหมดอายุ", "ผู้ตรวจสอบ", "วันที่ตรวจเช็ค", "สถานะ"],
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
      item.checkedAt ? formatDateTime(item.checkedAt) : "",
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
<tr><td>ประวัติการเช็คสต๊อก</td><td>เวลา</td><td>หน่วย</td><td>ผู้ตรวจสอบ</td><td>รายการทั้งหมด</td><td>ต่ำกว่าเกณฑ์</td><td>ใกล้หมดอายุ</td><td>หมดอายุแล้ว</td></tr>
${checkLogs
  .map(
    (log) =>
      `<tr><td>${escapeHtml(log.id)}</td><td>${escapeHtml(formatDateTime(log.checkedAt))}</td><td>${escapeHtml(log.unit)}</td><td>${escapeHtml(log.inspector)}</td><td>${escapeHtml(log.totalItems)}</td><td>${escapeHtml(log.shortCount)}</td><td>${escapeHtml(log.expiringCount)}</td><td>${escapeHtml(log.expiredCount)}</td></tr>`
  )
  .join("")}
</table>
<br>
<table border="1">
<tr><td>รายละเอียดประวัติการเช็ค</td><td>เวลา</td><td>หน่วย</td><td>ผู้ตรวจสอบ</td><td>ชื่อรายการ</td><td>จำนวนที่ต้องมี</td><td>จำนวนที่นับได้</td><td>วันหมดอายุ</td><td>สถานะ</td></tr>
${checkLogs
  .flatMap((log) =>
    (log.items || []).map(
      (item) =>
        `<tr><td>${escapeHtml(log.id)}</td><td>${escapeHtml(formatDateTime(log.checkedAt))}</td><td>${escapeHtml(log.unit)}</td><td>${escapeHtml(log.inspector)}</td><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.requiredQty)}</td><td>${escapeHtml(item.countedQty)}</td><td>${escapeHtml(item.expiryDate || "ไม่มีวันหมดอายุ")}</td><td>${escapeHtml(item.status)}</td></tr>`
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
  const blob = new Blob([JSON.stringify({ data, checkLogs, settings: { expiryWindow: settings.expiryWindow } }, null, 2)], {
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
        checkLogs = parsed.checkLogs;
        saveCheckLogs();
      }
      saveData();
      render();
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
