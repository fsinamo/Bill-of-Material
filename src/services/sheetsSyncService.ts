import { CalculationRecord, Product, RawMaterial, Accessory } from '../types';
import { storageService } from './storageService';

export const APPS_SCRIPT_TEMPLATE = `/**
 * GOOGLE APPS SCRIPT UNTUK SINKRONISASI GARMENTPRO (KONSUMSI BAHAN)
 * ================================================================
 * Langkah Penggunaan yang Benar:
 * 1. Buka Google Spreadsheet Anda (atau buat baru di drive.google.com)
 * 2. Klik menu 'Extensions' (Ekstensi) > 'Apps Script'
 * 3. Hapus seluruh kode bawaan di Code.gs, lalu paste SELURUH kode di bawah ini
 * 4. Klik tombol 'Save' (ikon Disket)
 * 5. Klik tombol biru 'Deploy' (Terapkan) di kanan atas > pilih 'New deployment' (Penerapan baru)
 * 6. Klik ikon Gear (roda gigi) di kiri atas pop-up, pastikan pilih 'Web app' (Aplikasi web)
 * 7. Konfigurasi PENTING:
 *    - Description: GarmentPro Sync API
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

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      timestamp: new Date().toISOString(),
      data: {
        calculations: calculations,
        products: products,
        rawMaterials: rawMaterials,
        accessories: accessories
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

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        timestamp: new Date().toISOString(),
        data: {
          calculations: calculations,
          products: products,
          rawMaterials: rawMaterials,
          accessories: accessories
        }
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'push_all' || action === 'push') {
      if (postData.calculations) writeCalculations(ss, postData.calculations);
      if (postData.products) writeGenericSheet(ss, 'Master_Produk', postData.products);
      if (postData.rawMaterials) writeGenericSheet(ss, 'Master_BahanBaku', postData.rawMaterials);
      if (postData.accessories) writeGenericSheet(ss, 'Master_Accessories', postData.accessories);

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Semua data berhasil disimpan dan disinkronkan ke Google Sheets!',
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
  var sheet = getOrCreateSheet(ss, 'Konsumsi_Bahan');
  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;

  if (data.length > 1) {
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == calc.id || data[i][1] == calc.calculationNumber) {
        rowIndex = i + 1;
        break;
      }
    }
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

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    if (data.length === 0 || (data.length === 1 && data[0][0] === '')) {
      var headers = [
        'ID', 'No Perhitungan', 'Judul / Ref PO', 'Nama Produk', 
        'Jumlah Pesanan', 'Tanggal Perhitungan', 'Total Bahan Baku (Ringkasan)', 
        'Rincian Detail (JSON)', 'Catatan', 'Terakhir Disinkron'
      ];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e2e8f0');
    }
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

export const sheetsSyncService = {
  async testConnection(url: string): Promise<{ success: boolean; message: string; data?: unknown }> {
    const check = validateAndSanitizeUrl(url);
    if (!check.valid) {
      return { success: false, message: check.error! };
    }

    const cleanUrl = check.url;
    let rawText = '';

    try {
      // 1. Try GET ping
      const pingUrl = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}action=ping&_t=${Date.now()}`;
      const response = await fetch(pingUrl, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow',
      });

      rawText = await response.text();
    } catch (err: unknown) {
      // 2. Try POST fallback if GET was blocked
      try {
        const postRes = await fetch(cleanUrl, {
          method: 'POST',
          mode: 'cors',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'ping' }),
        });
        rawText = await postRes.text();
      } catch {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          success: false,
          message: `Gagal tersambung ke server Google: ${errorMsg}. Pastikan perangkat terhubung internet dan URL diawali https://script.google.com/`,
        };
      }
    }

    try {
      const result = parseAppsScriptResponse(rawText, cleanUrl);
      if (result.status === 'success') {
        return {
          success: true,
          message: result.message || `Koneksi ke Google Sheets berhasil! ${result.spreadsheetName ? `(Spreadsheet: ${result.spreadsheetName})` : ''}`,
          data: result,
        };
      } else {
        return {
          success: false,
          message: result.message || 'Apps Script merespons status error.',
        };
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: errorMsg,
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

    try {
      const response = await fetch(cleanUrl, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'push_all',
          ...data,
        }),
      });

      const rawText = await response.text();
      const result = parseAppsScriptResponse(rawText, cleanUrl);

      if (result.status === 'success') {
        const updatedCalcs = data.calculations.map((c) => ({
          ...c,
          syncStatus: 'synced' as const,
          syncedAt: new Date().toISOString(),
        }));
        storageService.saveCalculations(updatedCalcs);

        storageService.addSyncLog({
          action: 'Push Sinkronisasi Semua Data',
          status: 'success',
          message: `${data.calculations.length} Perhitungan & Master Data berhasil disinkronkan ke Google Sheets`,
        });

        return { success: true, message: result.message || 'Sinkronisasi berhasil!' };
      } else {
        throw new Error(result.message || 'Gagal push ke Google Sheets');
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
      const response = await fetch(cleanUrl, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'save_calculation',
          calculation: calc,
        }),
      });

      const rawText = await response.text();
      const result = parseAppsScriptResponse(rawText, cleanUrl);

      if (result.status === 'success') {
        storageService.addSyncLog({
          action: `Sync Kalkulasi ${calc.calculationNumber}`,
          status: 'success',
          message: `Kalkulasi ${calc.calculationNumber} (${calc.productName}) tersimpan di Google Sheets`,
        });
        return { success: true, message: result.message || 'Tersinkron ke Google Sheets!' };
      } else {
        throw new Error(result.message || 'Gagal menyimpan ke Google Sheets');
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
    };
  }> {
    const check = validateAndSanitizeUrl(url);
    if (!check.valid) {
      return { success: false, message: check.error! };
    }

    const cleanUrl = check.url;
    let rawText = '';
    let lastError: Error | null = null;

    // 1. Try GET request first
    try {
      const pullUrl = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}action=pull&_t=${Date.now()}`;
      const response = await fetch(pullUrl, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow',
      });
      rawText = await response.text();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }

    // 2. If GET returned HTML or failed, try POST with action: 'pull' (which avoids some CORS issues)
    if (!rawText || rawText.trim().startsWith('<')) {
      try {
        const postResponse = await fetch(cleanUrl, {
          method: 'POST',
          mode: 'cors',
          redirect: 'follow',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({ action: 'pull' }),
        });
        const postText = await postResponse.text();
        if (postText && !postText.trim().startsWith('<')) {
          rawText = postText;
        }
      } catch (postErr) {
        if (!lastError) {
          lastError = postErr instanceof Error ? postErr : new Error(String(postErr));
        }
      }
    }

    try {
      const result = parseAppsScriptResponse(rawText, cleanUrl);

      if (result.status === 'success' && result.data) {
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
        throw new Error(result.message || 'Format data Google Sheets tidak sesuai');
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
};
