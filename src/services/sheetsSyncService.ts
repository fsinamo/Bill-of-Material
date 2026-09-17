import { CalculationRecord, Product, RawMaterial, Accessory } from '../types';
import { storageService } from './storageService';

export const APPS_SCRIPT_TEMPLATE = `/**
 * GOOGLE APPS SCRIPT UNTUK SINKRONISASI GARMENTPRO (KONSUMSI BAHAN)
 * ================================================================
 * Langkah Penggunaan:
 * 1. Buat Google Spreadsheet baru di Google Drive (atau beri nama: Data Produksi Garment)
 * 2. Klik menu 'Extensions' (Ekstensi) > 'Apps Script'
 * 3. Hapus kode bawaan di Code.gs, lalu paste SELURUH kode di bawah ini
 * 4. Klik tombol 'Save' (Simpan)
 * 5. Klik tombol 'Deploy' (Terapkan) > 'New deployment' (Penerapan baru)
 * 6. Pilih type: 'Web app' (Aplikasi web)
 * 7. Konfigurasi:
 *    - Description: GarmentPro Web App API
 *    - Execute as: 'Me' (Saya)
 *    - Who has access: 'Anyone' (Siapa saja)  <-- PENTING agar web app bisa kirim/tarik data!
 * 8. Klik 'Deploy', beri otorisasi akun Google Anda jika diminta
 * 9. Salin 'Web app URL' (akhiran /exec) dan tempelkan ke aplikasi GarmentPro di tab 'Sinkronisasi Sheets'
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
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
    var postData = {};
    if (e && e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    }

    var action = postData.action || 'push';

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
        message: 'Kalkulasi ' + (postData.calculation.calculationNumber || '') + ' berhasil disimpan di Google Sheets!',
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

export const sheetsSyncService = {
  async testConnection(url: string): Promise<{ success: boolean; message: string; data?: unknown }> {
    if (!url || !url.trim().startsWith('http')) {
      return { success: false, message: 'URL Apps Script belum diisi atau tidak valid (harus diawali https://script.google.com/)' };
    }

    try {
      const pingUrl = `${url.trim()}${url.includes('?') ? '&' : '?'}action=ping`;
      const response = await fetch(pingUrl, {
        method: 'GET',
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`Server status HTTP ${response.status}`);
      }

      const result = await response.json();
      return {
        success: result.status === 'success',
        message: result.message || 'Koneksi ke Google Sheets berhasil!',
        data: result,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Gagal tersambung: ${errorMsg}. Pastikan Apps Script di-deploy dengan akses 'Anyone'.`,
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
    if (!url || !url.trim().startsWith('http')) {
      // Local fallback simulation with success indicator
      storageService.addSyncLog({
        action: 'Push Sinkronisasi ke Google Sheets',
        status: 'error',
        message: 'URL Google Apps Script belum dikonfigurasi.',
      });
      return { success: false, message: 'URL Google Apps Script belum dikonfigurasi. Data tetap aman di penyimpanan lokal.' };
    }

    try {
      const response = await fetch(url.trim(), {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // Google Apps Script handles text/plain without CORS preflight issues
        },
        body: JSON.stringify({
          action: 'push_all',
          ...data,
        }),
      });

      const result = await response.json();
      if (result.status === 'success') {
        // Mark all calculations as synced
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
    if (!url || !url.trim().startsWith('http')) {
      return { success: false, message: 'URL Google Apps Script belum diisi.' };
    }

    try {
      const response = await fetch(url.trim(), {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'save_calculation',
          calculation: calc,
        }),
      });

      const result = await response.json();
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
    if (!url || !url.trim().startsWith('http')) {
      return { success: false, message: 'URL Google Apps Script belum dikonfigurasi.' };
    }

    try {
      const pullUrl = `${url.trim()}${url.includes('?') ? '&' : '?'}action=pull`;
      const response = await fetch(pullUrl, {
        method: 'GET',
        mode: 'cors',
      });

      const result = await response.json();
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
