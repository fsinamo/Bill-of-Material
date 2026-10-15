import { CalculationRecord, Product, RawMaterial, Accessory, ProductCostingRecord } from '../types';
import { storageService } from './storageService';

export const APPS_SCRIPT_TEMPLATE = `/**
 * GOOGLE APPS SCRIPT UNTUK SINKRONISASI GARMENTPRO (KONSUMSI BAHAN & PRODUCT COSTING)
 * ================================================================================
 * Langkah Penggunaan yang Benar:
 * 1. Buka Google Spreadsheet Anda (atau buat baru di drive.google.com)
 * 2. Klik menu 'Extensions' (Ekstensi) > 'Apps Script'
 * 3. Hapus seluruh kode bawaan di Code.gs, lalu paste SELURUH kode di bawah ini
 * 4. Klik tombol 'Save' (ikon Disket)
 * 5. Klik tombol biru 'Deploy' (Terapkan) di kanan atas > pilih 'New deployment' (Penerapan baru)
 * 6. Klik ikon Gear (roda gigi) di kiri atas pop-up, pastikan pilih 'Web app' (Aplikasi web)
 * 7. Konfigurasi PENTING:
 *    - Description: GarmentPro Sync API (Konsumsi & Costing)
 *    - Execute as: 'Me' (Saya - email Anda)
 *    - Who has access: 'Anyone' (Siapa saja)  <-- CRITICAL: Wajib pilih 'Anyone' agar browser bisa bertukar data tanpa terhalang login!
 * 8. Klik 'Deploy', lalu klik 'Authorize access' / 'Review permissions' dan pilih akun Google Anda.
 *    (Jika muncul 'Google hasn't verified this app', klik 'Advanced' > 'Go to Untitled project (unsafe)' > 'Allow')
 * 9. Salin 'Web app URL' (yang berakhiran /exec) dan tempelkan ke aplikasi GarmentPro.
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Spreadsheet aktif tidak ditemukan. Pastikan script ini dibuka dari menu Extensions > Apps Script di dalam file Google Spreadsheet.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'pull';
    
    if (action === 'ping') {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Koneksi ke Google Sheets berhasil!',
        timestamp: new Date().toISOString(),
        spreadsheetName: ss.getName()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Pull data
    var calculations = readSheetData(ss, 'Konsumsi_Bahan');
    var products = readSheetData(ss, 'Master_Produk');
    var rawMaterials = readSheetData(ss, 'Master_BahanBaku');
    var accessories = readSheetData(ss, 'Master_Accessories');
    var costings = readSheetData(ss, 'Product_Costing');

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      timestamp: new Date().toISOString(),
      data: {
        calculations: calculations,
        products: products,
        rawMaterials: rawMaterials,
        accessories: accessories,
        costings: costings
      }
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Spreadsheet aktif tidak ditemukan. Pastikan script ini dibuka dari menu Extensions > Apps Script di dalam file Google Spreadsheet.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var postData = {};
    if (e && e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        postData = {};
      }
    }

    var action = postData.action || (e && e.parameter && e.parameter.action) || 'push';

    // Support ping via POST
    if (action === 'ping') {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Koneksi ke Google Sheets berhasil (via POST)!',
        timestamp: new Date().toISOString(),
        spreadsheetName: ss.getName()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Support pull via POST
    if (action === 'pull') {
      var calculations = readSheetData(ss, 'Konsumsi_Bahan');
      var products = readSheetData(ss, 'Master_Produk');
      var rawMaterials = readSheetData(ss, 'Master_BahanBaku');
      var accessories = readSheetData(ss, 'Master_Accessories');
      var costings = readSheetData(ss, 'Product_Costing');

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        timestamp: new Date().toISOString(),
        data: {
          calculations: calculations,
          products: products,
          rawMaterials: rawMaterials,
          accessories: accessories,
          costings: costings
        }
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'push_all' || action === 'push') {
      if (postData.calculations) writeCalculations(ss, postData.calculations);
      if (postData.products) writeGenericSheet(ss, 'Master_Produk', postData.products);
      if (postData.rawMaterials) writeGenericSheet(ss, 'Master_BahanBaku', postData.rawMaterials);
      if (postData.accessories) writeGenericSheet(ss, 'Master_Accessories', postData.accessories);
      if (postData.costings) writeCostings(ss, postData.costings);

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Semua data (Konsumsi Bahan, Master Data, & Product Costing) berhasil disimpan dan disinkronkan ke Google Sheets!',
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'save_calculation') {
      appendOrUpdateCalculation(ss, postData.calculation);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Kalkulasi ' + ((postData.calculation && postData.calculation.calculationNumber) || '') + ' berhasil disimpan di Google Sheets!',
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'save_costing' || action === 'costing') {
      var itemToSave = postData.costing || (postData.costings && postData.costings[0]);
      if (itemToSave) {
        appendOrUpdateCosting(ss, itemToSave);
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Costing ' + ((itemToSave && itemToSave.costingNumber) || '') + ' berhasil disimpan di Google Sheets (Tab Product_Costing)!',
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Aksi tidak dikenali: ' + action
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function writeCalculations(ss, calculations) {
  var sheet = getOrCreateSheet(ss, 'Konsumsi_Bahan');
  sheet.clear();
  
  var headers = [
    'ID', 'No Perhitungan', 'Judul / Ref PO', 'Nama Produk', 
    'Jumlah Pesanan', 'Tanggal Perhitungan', 'Total Bahan Baku (Ringkasan)', 
    'Rincian Detail (JSON)', 'Catatan', 'Terakhir Disinkron'
  ];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e2e8f0');

  for (var i = 0; i < calculations.length; i++) {
    var c = calculations[i];
    var summaryText = (c.summary || []).map(function(s) {
      return s.rawMaterialName + ': ' + s.totalRequired + ' ' + s.unit + ' (Dibulatkan: ' + s.roundedRequired + ' ' + s.unit + ')';
    }).join('; ');

    sheet.appendRow([
      c.id,
      c.calculationNumber || '',
      c.title || c.customerOrPoRef || '',
      c.productName || '',
      c.orderQuantity || 0,
      c.calculationDate || '',
      summaryText,
      JSON.stringify(c),
      c.notes || '',
      new Date().toISOString()
    ]);
  }
}

function appendOrUpdateCalculation(ss, calc) {
  if (!calc) return;
  var sheet = ss.getSheetByName('Konsumsi_Bahan');
  var isNew = false;
  if (!sheet) {
    sheet = ss.insertSheet('Konsumsi_Bahan');
    isNew = true;
  }

  var headers = [
    'ID', 'No Perhitungan', 'Judul / Ref PO', 'Nama Produk', 
    'Jumlah Pesanan', 'Tanggal Perhitungan', 'Total Bahan Baku (Ringkasan)', 
    'Rincian Detail (JSON)', 'Catatan', 'Terakhir Disinkron'
  ];

  var lastRow = sheet.getLastRow();
  if (isNew || lastRow === 0) {
    sheet.clear();
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e2e8f0');
    lastRow = 1;
  }

  var summaryText = (calc.summary || []).map(function(s) {
    return s.rawMaterialName + ': ' + s.totalRequired + ' ' + s.unit + ' (Dibulatkan: ' + s.roundedRequired + ' ' + s.unit + ')';
  }).join('; ');

  var rowValues = [
    calc.id,
    calc.calculationNumber || '',
    calc.title || calc.customerOrPoRef || '',
    calc.productName || '',
    calc.orderQuantity || 0,
    calc.calculationDate || '',
    summaryText,
    JSON.stringify(calc),
    calc.notes || '',
    new Date().toISOString()
  ];

  var foundRow = -1;
  if (lastRow > 1) {
    var checkRange = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (var i = 0; i < checkRange.length; i++) {
      if (checkRange[i][0] == calc.id || checkRange[i][1] == calc.calculationNumber) {
        foundRow = i + 2;
        break;
      }
    }
  }

  if (sheet.getMaxColumns() < rowValues.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), rowValues.length - sheet.getMaxColumns());
  }

  if (foundRow > 0) {
    sheet.getRange(foundRow, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}

function writeCostings(ss, costings) {
  var sheet = getOrCreateSheet(ss, 'Product_Costing');
  sheet.clear();
  
  var headers = [
    'ID', 'No Costing', 'Judul Costing', 'Nama Produk', 'Kode Produk', 
    'Jumlah Pesanan', 'Biaya Accessories / Pcs', 'Biaya Jasa / Pcs', 
    'Total HPP / Pcs', 'Total HPP Batch', 'Markup (%)', 
    'Harga Jual Target / Pcs', 'Tanggal', 'Rincian Item (JSON)', 
    'Catatan', 'Terakhir Disinkron'
  ];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#fef3c7');

  if (!costings || costings.length === 0) return;

  for (var i = 0; i < costings.length; i++) {
    var c = costings[i];
    sheet.appendRow([
      c.id,
      c.costingNumber || '',
      c.title || '',
      c.productName || '',
      c.productCode || '',
      c.orderQuantity || 0,
      c.totalAccessoriesCostPerUnit || 0,
      c.totalServicesCostPerUnit || 0,
      c.totalCostPerUnit || 0,
      c.totalBatchCost || 0,
      c.targetMarkupPercent || 0,
      c.targetSellingPricePerUnit || 0,
      c.calculationDate || '',
      JSON.stringify(c),
      c.notes || '',
      new Date().toISOString()
    ]);
  }
}

function appendOrUpdateCosting(ss, costing) {
  if (!costing) return;
  var sheet = ss.getSheetByName('Product_Costing');
  var isNew = false;
  if (!sheet) {
    sheet = ss.insertSheet('Product_Costing');
    isNew = true;
  }

  var headers = [
    'ID', 'No Costing', 'Judul Costing', 'Nama Produk', 'Kode Produk', 
    'Jumlah Pesanan', 'Biaya Accessories / Pcs', 'Biaya Jasa / Pcs', 
    'Total HPP / Pcs', 'Total HPP Batch', 'Markup (%)', 
    'Harga Jual Target / Pcs', 'Tanggal', 'Rincian Item (JSON)', 
    'Catatan', 'Terakhir Disinkron'
  ];

  var lastRow = sheet.getLastRow();
  if (isNew || lastRow === 0) {
    sheet.clear();
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#fef3c7');
    lastRow = 1;
  }

  var rowValues = [
    costing.id,
    costing.costingNumber || '',
    costing.title || '',
    costing.productName || '',
    costing.productCode || '',
    costing.orderQuantity || 0,
    costing.totalAccessoriesCostPerUnit || 0,
    costing.totalServicesCostPerUnit || 0,
    costing.totalCostPerUnit || 0,
    costing.totalBatchCost || 0,
    costing.targetMarkupPercent || 0,
    costing.targetSellingPricePerUnit || 0,
    costing.calculationDate || '',
    JSON.stringify(costing),
    costing.notes || '',
    new Date().toISOString()
  ];

  var foundRow = -1;
  if (lastRow > 1) {
    var checkRange = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (var i = 0; i < checkRange.length; i++) {
      if (checkRange[i][0] == costing.id || checkRange[i][1] == costing.costingNumber) {
        foundRow = i + 2;
        break;
      }
    }
  }

  if (sheet.getMaxColumns() < rowValues.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), rowValues.length - sheet.getMaxColumns());
  }

  if (foundRow > 0) {
    sheet.getRange(foundRow, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}

function writeGenericSheet(ss, sheetName, items) {
  var sheet = getOrCreateSheet(ss, sheetName);
  sheet.clear();
  if (!items || items.length === 0) return;

  var headers = Object.keys(items[0]);
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e2e8f0');

  for (var i = 0; i < items.length; i++) {
    var row = headers.map(function(h) {
      var val = items[i][h];
      return (typeof val === 'object') ? JSON.stringify(val) : val;
    });
    sheet.appendRow(row);
  }
}

function readSheetData(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  var headers = values[0];
  var results = [];

  // Khusus sheet Konsumsi_Bahan, kolom ke-8 (index 7) menyimpan JSON object lengkap
  if (sheetName === 'Konsumsi_Bahan') {
    for (var i = 1; i < values.length; i++) {
      try {
        var rawJson = values[i][7];
        if (rawJson && typeof rawJson === 'string' && rawJson.startsWith('{')) {
          results.push(JSON.parse(rawJson));
        }
      } catch(e) {}
    }
    if (results.length > 0) return results;
  }

  // Khusus sheet Product_Costing, kolom ke-14 (index 13) menyimpan JSON object lengkap
  if (sheetName === 'Product_Costing') {
    for (var i = 1; i < values.length; i++) {
      try {
        var rawJson = values[i][13];
        if (rawJson && typeof rawJson === 'string' && rawJson.startsWith('{')) {
          results.push(JSON.parse(rawJson));
        }
      } catch(e) {}
    }
    if (results.length > 0) return results;
  }

  for (var r = 1; r < values.length; r++) {
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var val = values[r][c];
      try {
        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
          val = JSON.parse(val);
        }
      } catch(e) {}
      obj[headers[c]] = val;
    }
    results.push(obj);
  }
  return results;
}
`;

/**
 * Validates and sanitizes the user-provided Google Apps Script URL.
 */
function validateAndSanitizeUrl(rawUrl: string): { valid: boolean; url: string; error?: string } {
  let cleanUrl = (rawUrl || '').trim();

  if (!cleanUrl || !cleanUrl.startsWith('http')) {
    return {
      valid: false,
      url: cleanUrl,
      error: 'URL Google Apps Script belum diisi atau tidak valid (wajib diawali https://script.google.com/macros/s/...)',
    };
  }

  // Common user mistake: pasting Google Spreadsheet link
  if (cleanUrl.includes('docs.google.com/spreadsheets')) {
    return {
      valid: false,
      url: cleanUrl,
      error: 'URL yang Anda masukkan adalah tautan file Google Spreadsheet, BUKAN Web App URL Apps Script! Buka file Spreadsheet Anda > menu "Ekstensi" > "Apps Script" > klik tombol biru "Deploy" > "New deployment" > pilih "Web app" (Who has access: Anyone) > lalu salin Web App URL yang berakhiran /exec.',
    };
  }

  // Common user mistake: pasting Apps Script editor or project link
  if (cleanUrl.includes('script.google.com/home') || cleanUrl.endsWith('/edit') || cleanUrl.includes('/edit#')) {
    return {
      valid: false,
      url: cleanUrl,
      error: 'URL yang Anda masukkan adalah halaman editor kode Apps Script. Silakan klik tombol biru "Deploy" di kanan atas > "New deployment" > jenis: "Web app" > "Who has access: Anyone", lalu salin URL yang berakhiran /exec.',
    };
  }

  // Auto-correct /dev to /exec if user copied test deployment
  if (cleanUrl.endsWith('/dev')) {
    cleanUrl = cleanUrl.replace(/\/dev$/, '/exec');
  }
  if (cleanUrl.endsWith('/dev/')) {
    cleanUrl = cleanUrl.replace(/\/dev\/$/, '/exec');
  }
  if (cleanUrl.endsWith('/exec/')) {
    cleanUrl = cleanUrl.replace(/\/exec\/$/, '/exec');
  }
  if (cleanUrl.includes('/exec?')) {
    cleanUrl = cleanUrl.split('?')[0];
  }

  return { valid: true, url: cleanUrl };
}

/**
 * Parses response text from Google Apps Script and handles HTML login redirects or syntax errors gracefully.
 */
function parseAppsScriptResponse(rawText: string, targetUrl: string): any {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Tidak ada respons yang diterima dari server Google Apps Script.');
  }

  const trimmed = rawText.trim();

  // If Google returned HTML instead of JSON:
  if (
    trimmed.startsWith('<') ||
    trimmed.toLowerCase().includes('<!doctype') ||
    trimmed.toLowerCase().includes('<html') ||
    trimmed.toLowerCase().includes('<head')
  ) {
    if (targetUrl.includes('docs.google.com/spreadsheets')) {
      throw new Error(
        'URL yang dimasukkan adalah file Google Spreadsheet, bukan Web App URL. Silakan ikuti petunjuk di tab "Kode Apps Script" untuk membuat Web App dan menyalin URL yang berakhiran /exec.'
      );
    }

    if (
      trimmed.includes('ServiceLogin') ||
      trimmed.includes('accounts.google.com') ||
      trimmed.includes('Sign in - Google Accounts') ||
      trimmed.includes('google-signin')
    ) {
      throw new Error(
        'Google memblokir akses otomatis (mengalihkan ke halaman login). Solusi: Di editor Apps Script Anda, buka menu "Deploy" > "Manage deployments" > klik ikon Pensil (Edit) > pastikan "Who has access" (Siapa yang memiliki akses) dipilih "Anyone" (Siapa saja) lalu klik "Deploy".'
      );
    }

    if (trimmed.includes('Script function not found') || trimmed.includes('doGet') || trimmed.includes('doPost')) {
      throw new Error(
        'Fungsi doGet() atau doPost() tidak ditemukan di Apps Script. Pastikan Anda telah menempelkan seluruh kode dari tab "Kode Apps Script" ke Code.gs dan menyimpannya.'
      );
    }

    throw new Error(
      'Server Google mengembalikan halaman HTML (bukan JSON). Hal ini terjadi jika Web App belum diberi izin publik "Anyone", atau script belum di-Authorize di Google Account Anda. Ikuti langkah di tab "Kode Apps Script".'
    );
  }

  try {
    return JSON.parse(trimmed);
  } catch (err: unknown) {
    const parseErr = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Format data dari Google Sheets tidak valid: ${parseErr} (Cuplikan respons: "${trimmed.slice(0, 120)}...")`
    );
  }
}

/**
 * Executes a request to Google Apps Script via the local Express server proxy first.
 * The server proxy runs Node 22 native fetch, eliminating browser CORS issues and
 * reliably handling Google Apps Script 302 redirects.
 * Falls back to direct browser fetch if the proxy is unavailable.
 */
async function executeViaProxyOrDirect(
  url: string,
  action: string,
  payload?: any,
  method: 'POST' | 'GET' = 'POST'
): Promise<any> {
  const cleanUrl = url.trim();

  // 1. Try local server proxy first
  try {
    if (method === 'POST') {
      const proxyRes = await fetch('/api/sheets-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl, action, payload }),
      });
      if (proxyRes.ok) {
        const json = await proxyRes.json();
        if (json && typeof json === 'object') {
          return json;
        }
      }
    } else {
      const sep = cleanUrl.includes('?') ? '&' : '?';
      const proxyRes = await fetch(
        `/api/sheets-proxy?url=${encodeURIComponent(cleanUrl)}&action=${encodeURIComponent(action)}`
      );
      if (proxyRes.ok) {
        const json = await proxyRes.json();
        if (json && typeof json === 'object') {
          return json;
        }
      }
    }
  } catch (err) {
    console.warn('[GarmentPro] Server proxy fetch error, attempting direct browser fetch fallback:', err);
  }

  // 2. Direct browser fetch fallback
  if (method === 'POST') {
    const postRes = await fetch(cleanUrl, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...(payload || {}) }),
    });
    const text = await postRes.text();
    return parseAppsScriptResponse(text, cleanUrl);
  } else {
    const sep = cleanUrl.includes('?') ? '&' : '?';
    const getRes = await fetch(`${cleanUrl}${sep}action=${encodeURIComponent(action)}&_t=${Date.now()}`, {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow',
    });
    const text = await getRes.text();
    return parseAppsScriptResponse(text, cleanUrl);
  }
}

export const sheetsSyncService = {
  async testConnection(url: string): Promise<{ success: boolean; message: string; data?: unknown }> {
    const check = validateAndSanitizeUrl(url);
    if (!check.valid) {
      return { success: false, message: check.error! };
    }

    const cleanUrl = check.url;

    try {
      const result = await executeViaProxyOrDirect(cleanUrl, 'ping', { action: 'ping' }, 'POST');
      if (result && result.status === 'success') {
        return {
          success: true,
          message: result.message || `Koneksi ke Google Sheets berhasil! ${result.spreadsheetName ? `(Spreadsheet: ${result.spreadsheetName})` : ''}`,
          data: result,
        };
      } else {
        return {
          success: false,
          message: result?.message || 'Apps Script merespons status error.',
        };
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Gagal tersambung ke Google Sheets: ${errorMsg}. Pastikan Web App disetel "Who has access: Anyone".`,
      };
    }
  },

  async pushAllToSheets(
    url: string,
    data: {
      calculations: CalculationRecord[];
      products: Product[];
      rawMaterials: RawMaterial[];
      accessories: Accessory[];
      costings?: ProductCostingRecord[];
    }
  ): Promise<{ success: boolean; message: string }> {
    const check = validateAndSanitizeUrl(url);
    if (!check.valid) {
      storageService.addSyncLog({
        action: 'Push Sinkronisasi ke Google Sheets',
        status: 'error',
        message: check.error!,
      });
      return { success: false, message: check.error! };
    }

    const cleanUrl = check.url;
    const costingsToPush = data.costings || storageService.getProductCostings();

    try {
      const result = await executeViaProxyOrDirect(cleanUrl, 'push_all', {
        action: 'push_all',
        ...data,
        costings: costingsToPush,
      });

      if (result && result.status === 'success') {
        const updatedCalcs = data.calculations.map((c) => ({
          ...c,
          syncStatus: 'synced' as const,
          syncedAt: new Date().toISOString(),
        }));
        storageService.saveCalculations(updatedCalcs);

        storageService.addSyncLog({
          action: 'Push Sinkronisasi Semua Data',
          status: 'success',
          message: `${data.calculations.length} Perhitungan Konsumsi, ${costingsToPush.length} Costing HPP, & Master Data berhasil disinkronkan ke Google Sheets`,
        });

        return { success: true, message: result.message || 'Sinkronisasi berhasil!' };
      } else {
        throw new Error(result?.message || 'Gagal push ke Google Sheets');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      storageService.addSyncLog({
        action: 'Push Sinkronisasi Semua Data',
        status: 'error',
        message: msg,
      });
      return { success: false, message: `Gagal sinkron: ${msg}` };
    }
  },

  async pushSingleCalculation(url: string, calc: CalculationRecord): Promise<{ success: boolean; message: string }> {
    const check = validateAndSanitizeUrl(url);
    if (!check.valid) {
      return { success: false, message: check.error! };
    }

    const cleanUrl = check.url;

    try {
      const result = await executeViaProxyOrDirect(cleanUrl, 'save_calculation', {
        action: 'save_calculation',
        calculation: calc,
      });

      if (result && result.status === 'success') {
        storageService.addSyncLog({
          action: `Sync Kalkulasi ${calc.calculationNumber}`,
          status: 'success',
          message: `Kalkulasi ${calc.calculationNumber} (${calc.productName}) tersimpan di Google Sheets`,
        });
        return { success: true, message: result.message || 'Tersinkron ke Google Sheets!' };
      } else {
        throw new Error(result?.message || 'Gagal menyimpan ke Google Sheets');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      storageService.addSyncLog({
        action: `Sync Kalkulasi ${calc.calculationNumber}`,
        status: 'error',
        message: msg,
      });
      return { success: false, message: msg };
    }
  },

  async pushSingleCosting(url: string, costing: ProductCostingRecord): Promise<{ success: boolean; message: string }> {
    const check = validateAndSanitizeUrl(url);
    if (!check.valid) {
      return { success: false, message: check.error! };
    }

    const cleanUrl = check.url;

    try {
      // 1. Try dedicated action: save_costing
      let result = await executeViaProxyOrDirect(cleanUrl, 'save_costing', {
        action: 'save_costing',
        costing: costing,
        costings: [costing],
      });

      // 2. Compatibility fallback for older scripts: if save_costing is unrecognized, push all costings
      if (
        result &&
        result.status !== 'success' &&
        (result.message?.includes('tidak dikenali') || result.message?.includes('save_costing'))
      ) {
        console.warn('save_costing not recognized, retrying via push_all fallback with costing list...');
        const allCostings = storageService.getProductCostings();
        const existingIdx = allCostings.findIndex((c) => c.id === costing.id);
        if (existingIdx >= 0) {
          allCostings[existingIdx] = costing;
        } else {
          allCostings.unshift(costing);
        }
        result = await executeViaProxyOrDirect(cleanUrl, 'push_all', {
          action: 'push_all',
          costings: allCostings,
          costing: costing,
          calculations: storageService.getCalculations(),
          products: storageService.getProducts(),
          rawMaterials: storageService.getRawMaterials(),
          accessories: storageService.getAccessories(),
        });
      }

      if (result && result.status === 'success') {
        storageService.addSyncLog({
          action: `Sync Costing ${costing.costingNumber}`,
          status: 'success',
          message: `Costing HPP ${costing.costingNumber} (${costing.productName}) tersimpan di Google Sheets (Tab Product_Costing)`,
        });
        return { success: true, message: result.message || 'Costing HPP tersinkron ke Google Sheets!' };
      } else {
        throw new Error(result?.message || 'Gagal menyimpan costing ke Google Sheets');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      storageService.addSyncLog({
        action: `Sync Costing ${costing.costingNumber}`,
        status: 'error',
        message: msg,
      });
      return { success: false, message: msg };
    }
  },

  async pullAllFromSheets(
    url: string
  ): Promise<{
    success: boolean;
    message: string;
    data?: {
      calculations?: CalculationRecord[];
      products?: Product[];
      rawMaterials?: RawMaterial[];
      accessories?: Accessory[];
      costings?: ProductCostingRecord[];
    };
  }> {
    const check = validateAndSanitizeUrl(url);
    if (!check.valid) {
      return { success: false, message: check.error! };
    }

    const cleanUrl = check.url;

    try {
      const result = await executeViaProxyOrDirect(cleanUrl, 'pull', { action: 'pull' }, 'GET');

      if (result && result.status === 'success' && result.data) {
        if (Array.isArray(result.data.costings)) {
          result.data.costings = result.data.costings.map((c: any) => {
            if ((!c.items || !Array.isArray(c.items) || c.items.length === 0) && c['Rincian Item (JSON)']) {
              try {
                const parsed = typeof c['Rincian Item (JSON)'] === 'string' ? JSON.parse(c['Rincian Item (JSON)']) : c['Rincian Item (JSON)'];
                if (parsed && Array.isArray(parsed.items)) {
                  return { ...c, ...parsed };
                }
              } catch {}
            }
            return c;
          });
        }

        storageService.addSyncLog({
          action: 'Tarik Data dari Google Sheets',
          status: 'success',
          message: 'Data berhasil ditarik dan diperbarui dari Google Sheets',
        });
        return {
          success: true,
          message: 'Data berhasil ditarik dari Google Sheets!',
          data: result.data,
        };
      } else {
        throw new Error(result?.message || 'Format data Google Sheets tidak sesuai');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      storageService.addSyncLog({
        action: 'Tarik Data dari Google Sheets',
        status: 'error',
        message: msg,
      });
      return { success: false, message: `Gagal menarik data: ${msg}` };
    }
  },

  getAppsScriptTemplate(): string {
    return APPS_SCRIPT_TEMPLATE;
  },
};
