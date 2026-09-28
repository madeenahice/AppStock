const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function frontend(stored = {}) {
  const context = vm.createContext({ window: { crypto: { randomUUID: () => Math.random().toString() } }, document: { querySelector: () => ({}) }, localStorage: { getItem: key => stored[key] || null, setItem: (key, value) => { stored[key] = value; }, removeItem: key => { delete stored[key]; } }, Intl, Date, setTimeout, clearTimeout });
  vm.runInContext(fs.readFileSync('seed-data.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('app.js', 'utf8').replace('\ninit();', ''), context);
  return context;
}
test('all seven stock pages follow the local catalog counts', () => {
  const c = frontend();
  assert.equal(vm.runInContext('UNITS.length', c), 7);
  assert.equal(vm.runInContext('getAllItems().length', c), 179);
  const catalog = JSON.parse(fs.readFileSync('catalog-data.json','utf8'));
  for (const unit of Object.keys(catalog.units)) {
    const expected = catalog.units[unit].map(item => [item.name, item.requiredQty ?? null]);
    const actual = JSON.parse(vm.runInContext(`JSON.stringify(data[${JSON.stringify(unit)}].map(item => [item.name,item.requiredQty]))`, c));
    assert.deepEqual(actual,expected);
  }
});
test('stock state ignores browser storage and starts from the local catalog', () => {
  const old = {'CPR Box':[{id:'existing',name:'Adrenaline Injection 1 mg/ml (1:1000)',requiredQty:99,countedQty:4,expiryDate:'2027-01-01',shortageReason:'รอเบิก'}]};
  const stored = {'cute-med-stock-v3':JSON.stringify(old)};
  const c=frontend(stored);
  assert.equal(vm.runInContext('data["Emer medicine"][0].countedQty',c),10);
  assert.equal(vm.runInContext('data["Emer medicine"][0].requiredQty',c),10);
  assert.equal(vm.runInContext('data["Emer medicine"][0].shortageReason',c),'');
  assert.equal(stored['cute-med-stock-v3'], undefined);
  assert.equal(vm.runInContext('data["Equipment"].length',c),8);
});
test('unknown required quantities remain unknown', () => {
  const c=frontend();
  assert.equal(vm.runInContext('getItemStatus({requiredQty:null,countedQty:0}).key',c),'unknown');
});
test('shortage notes apply only to incomplete quantities and known reasons', () => {
  const c = frontend();
  for (const reason of ['รอเบิก', 'ตามไม่ได้']) {
    c.item = { requiredQty: 5, countedQty: 3, shortageReason: reason };
    assert.equal(vm.runInContext('shortageReason(item)', c), reason);
    c.item.countedQty = 5;
    assert.equal(vm.runInContext('shortageReason(item)', c), '');
  }
  c.item = { requiredQty: 5, countedQty: 1, shortageReason: 'unknown' };
  assert.equal(vm.runInContext('shortageReason(item)', c), '');
});
test('Equipment allows borrowed or repair and other units retain their reasons', () => {
  const c = frontend();
  assert.equal(vm.runInContext('JSON.stringify(shortageReasons("Equipment"))', c), JSON.stringify(['ถูกยืม','ส่งซ่อม']));
  c.item = { unit:'Equipment', requiredQty:2, countedQty:1, shortageReason:'ถูกยืม' };
  assert.equal(vm.runInContext('shortageReason(item)',c),'ถูกยืม');
  assert.match(vm.runInContext('alertText(item)',c), /ถูกยืม/);
  c.item.shortageReason='ตามไม่ได้';
  assert.equal(vm.runInContext('shortageReason(item)',c),'');
  c.item.unit='Med Stock';
  assert.equal(vm.runInContext('shortageReason(item)',c),'ตามไม่ได้');
  c.item.shortageReason='ถูกยืม';
  assert.equal(vm.runInContext('shortageReason(item)',c),'');
  for (const unit of ['Med Stock','IV Fluid','CPR Box','Emer medicine','Emer cart Adult','Emer cart PED']) {
    c.unit = unit;
    assert.equal(vm.runInContext('JSON.stringify(shortageReasons(unit))',c),JSON.stringify(['รอเบิก','ตามไม่ได้']));
  }
});
test('Equipment includes the refrigerator temperature item with default ready status and normal range', () => {
  const c = frontend();
  const fridge = vm.runInContext('data["Equipment"].find(item => item.name === "อุณหภูมิตู้เย็น")', c);
  assert.ok(fridge);
  assert.equal(fridge.equipmentStatus, 'พร้อมใช้');
  assert.equal(fridge.temperature, 4);
  assert.equal(JSON.stringify(fridge.temperatureRange), JSON.stringify({ min: 0, max: 5, unit: 'องศาเซลเซียส' }));
  assert.equal(vm.runInContext('getItemStatus(data["Equipment"].find(item => item.name === "อุณหภูมิตู้เย็น"), "Equipment").label', c), 'พร้อมใช้');
  assert.equal(vm.runInContext('getTemperatureRangeText(data["Equipment"].find(item => item.name === "อุณหภูมิตู้เย็น"))', c), '0.00-5.00 °C');
});
test('fridge temperature check requires 0.00-5.00 when ready and allows repair status', () => {
  const c = frontend();
  c.alert = () => {};
  assert.equal(vm.runInContext('validateTemperatureChecks("Equipment")', c), true);
  vm.runInContext('data["Equipment"].find(item => item.name === "อุณหภูมิตู้เย็น").temperature = 5.5', c);
  assert.equal(vm.runInContext('validateTemperatureChecks("Equipment")', c), false);
  vm.runInContext('data["Equipment"].find(item => item.name === "อุณหภูมิตู้เย็น").equipmentStatus = "ส่งซ่อม"', c);
  assert.equal(vm.runInContext('validateTemperatureChecks("Equipment")', c), true);
});
test('equipment inspection logs keep fridge temperature for dashboard chart', () => {
  const c = frontend();
  vm.runInContext('renderCheckLog = () => {}', c);
  vm.runInContext('addCheckLog("Equipment", "ผู้ตรวจ ก", "2026-09-28T01:00:00.000Z", "2026-09-28", "เวรเช้า")', c);
  assert.equal(vm.runInContext('checkLogs[0].items.find(item => item.name === "อุณหภูมิตู้เย็น").temperature', c), 4);
  assert.equal(vm.runInContext('temperatureHistory().at(-1).value', c), 4);
});
test('dashboard history filters by selected month or fiscal year', () => {
  const c = frontend();
  vm.runInContext(`
    checkLogs = [
      { unit: 'Equipment', inspectionDate: '2026-09-28', inspector: 'ก', items: [{ name: 'อุณหภูมิตู้เย็น', temperature: 4 }] },
      { unit: 'Equipment', inspectionDate: '2026-10-01', inspector: 'ข', items: [{ name: 'อุณหภูมิตู้เย็น', temperature: 3.5 }] },
      { unit: 'Med Stock', inspectionDate: '2027-01-01', inspector: 'ค', items: [] },
    ];
    dashboardFilterMode = 'month';
    dashboardFilterMonth = '2026-09';
  `, c);
  assert.equal(vm.runInContext('dashboardLogs().length', c), 1);
  assert.equal(vm.runInContext('temperatureHistory().at(-1).value', c), 4);
  vm.runInContext("dashboardFilterMode = 'fiscal'; dashboardFilterMonth = '2026-10'", c);
  assert.equal(vm.runInContext('dashboardFilterRange().fiscalYear', c), 2570);
  assert.equal(vm.runInContext('dashboardLogs().length', c), 2);
  assert.equal(vm.runInContext('temperatureHistory().map(point => point.value).join(",")', c), '3.5');
});
test('expiry date picker clears when no expiry is selected', () => {
  const c = frontend();
  vm.runInContext(`
    els.expiryDate = { value: '2028-02-29', required: false, disabled: false };
    els.noExpiry = { checked: true };
    els.expiryWrap = { hidden: false };
    syncExpiryField();
  `, c);
  assert.equal(vm.runInContext('els.expiryDate.value', c), '');
  assert.equal(vm.runInContext('els.expiryDate.disabled', c), true);
});
test('imported or cloud state missing the fridge check is repaired from the local catalog', () => {
  const c = frontend();
  vm.runInContext('legacy = JSON.parse(JSON.stringify(data)); legacy["Equipment"] = legacy["Equipment"].filter(item => item.name !== "อุณหภูมิตู้เย็น")', c);
  assert.equal(vm.runInContext('legacy["Equipment"].some(item => item.name === "อุณหภูมิตู้เย็น")', c), false);
  assert.equal(vm.runInContext('normalizeImportedData(legacy)["Equipment"].some(item => item.name === "อุณหภูมิตู้เย็น")', c), true);
});
test('retired catalog equipment is pruned from imported or cloud state', () => {
  const c = frontend();
  c.legacy = {
    Equipment: [
      { id: 'old-body-guard', sourceId: 'rn-source-12-4', name: 'Body guard', requiredQty: 10, countedQty: 10 },
      { id: 'custom-equipment', name: 'Custom monitor', requiredQty: 1, countedQty: 1 },
    ],
  };
  assert.equal(vm.runInContext('normalizeImportedData(legacy)["Equipment"].some(item => item.name === "Body guard")', c), false);
  assert.equal(vm.runInContext('normalizeImportedData(legacy)["Equipment"].some(item => item.name === "Custom monitor")', c), true);
});
test('old local data and logs are not used as stock source', () => {
  const c = frontend({ 'med-stock-source-version':'rn-source-20260908-2', 'cute-med-stock-v3': JSON.stringify({ 'ยารถ Emer': [{ id: 'a', name: 'A', countedQty: 2 }], 'รถ EMER adult': [{ id: 'b', name: 'B' }] }), 'cute-med-stock-check-log-v1': JSON.stringify([{ unit: 'รถ EMER ped', inspector: 'ผู้ตรวจ ก' }]) });
  assert.equal(vm.runInContext('data["Emer medicine"][0].countedQty', c), 10);
  assert.equal(vm.runInContext('data["Emer cart Adult"].length', c), 48);
  assert.equal(vm.runInContext('checkLogs.length', c), 0);
  assert.equal(vm.runInContext('inspectorNames().length', c), 0);
});
test('legacy catalog merges are disabled', async () => {
  const c = frontend();
  vm.runInContext(`
    settings.googleSheetUrl = 'https://example.com/script';
    jsonpRequest = async () => ({
      ok: true,
      state: {
        data: {
          'Emer medicine': [{ id: 'legacy-1', name: 'Adrenaline 1 mg/ml', countedQty: 2, expiryDate: '2028-01-01' }],
          'Equipment': []
        },
        checkLogs: [],
        catalogVersion: 'legacy-version'
      }
    });
  `, c);
  await vm.runInContext('loadCloudState()', c);
  assert.equal(vm.runInContext('data["Emer medicine"][0].countedQty', c), 10);
  assert.equal(vm.runInContext('data["Emer medicine"][0].name', c), 'Adrenaline Injection 1 mg/ml (1:1000)');
});
test('fiscal years agree on both sides of October boundary', () => {
  const front = frontend();
  const back = vm.createContext({});
  vm.runInContext(fs.readFileSync('google-sheets-web-app.gs','utf8'), back);
  for (const [date, year] of [['2026-09-30',2569], ['2026-10-01',2570], ['2027-01-01',2570], ['2027-09-30',2570]]) {
    for (const c of [front, back]) assert.equal(vm.runInContext(`fiscalYear('${date}')`, c), year);
  }
  assert.throws(() => vm.runInContext("fiscalYear('2026-02-30')", back));
});
test('inspection archive separates units and fiscal years and deduplicates retries', () => {
  const sheets = new Map();
  const book = { getSheetByName: name => sheets.get(name), insertSheet: name => {
    const rows = [];
    const sheet = { rows, getLastRow: () => rows.length, appendRow: row => rows.push(row), setFrozenRows: () => {}, getRange: (start, col, count) => ({ setValues: values => values.forEach((row,i) => rows[start-1+i] = row), createTextFinder: id => { const finder = { matchEntireCell: () => finder, useRegularExpression: () => finder, findNext: () => rows.slice(start-1,start-1+count).find(row => row[0] === id) }; return finder; } }) };
    sheets.set(name, sheet); return sheet;
  } };
  const c = vm.createContext({ SpreadsheetApp: { openById: id => { assert.equal(id,'13b74zWOyP5WgnAF1HdrCE2IY6pFXifhcm5N27iq-pgY'); return book; }, flush: () => {} } });
  vm.runInContext(fs.readFileSync('google-sheets-web-app.gs','utf8'), c);
  const log = { id: 'log-1', unit: 'Emer medicine', inspector: 'ผู้ตรวจ ก', checkedAt: '2026-10-01T01:00:00.000Z', inspectionDate: '2026-10-01', shift: 'เวรดึก', items: [{ name: 'ยา', countedQty: 2, expiryDate: '2027-01-01' }], totalItems: 1 };
  for (let i=0;i<2;i++) { c.payload = {log}; vm.runInContext('saveInspection(payload)',c); }
  assert.equal(sheets.get('Emer medicine 2570').rows.length, 2);
  assert.equal(sheets.get('Inspection Logs 2570').rows.length, 2);
  assert.equal(JSON.stringify(sheets.get('Emer medicine 2570').rows[0]), JSON.stringify(['ยา จำนวน', 'ยา วันหมดอายุ', 'วันที่ตรวจเช็ค', 'ช่วงเวลา', 'ปีงบประมาณ', 'ชื่อผู้ตรวจ', 'หน่วย', 'Log ID', 'เวลาบันทึก']));
  assert.equal(JSON.stringify(sheets.get('Emer medicine 2570').rows[1]), JSON.stringify([2, '2027-01-01', '2026-10-01', 'เวรดึก', 2570, 'ผู้ตรวจ ก', 'Emer medicine', 'log-1', '2026-10-01T01:00:00.000Z']));
  c.payload = {log: {...log, id:'log-2', inspectionDate:'2026-09-30'}};
  vm.runInContext('saveInspection(payload)',c);
  assert.equal(sheets.get('Emer medicine 2569').rows.length, 2);
});
