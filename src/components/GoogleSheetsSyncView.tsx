import React, { useState } from 'react';
import { GoogleSheetsConfig, SyncLog, CalculationRecord, Product, RawMaterial, Accessory } from '../types';
import { sheetsSyncService, APPS_SCRIPT_TEMPLATE } from '../services/sheetsSyncService';
import { storageService } from '../services/storageService';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
  Info,
  Clock,
  Settings2,
  RotateCcw
} from 'lucide-react';

interface GoogleSheetsSyncViewProps {
  config: GoogleSheetsConfig;
  onUpdateConfig: (config: GoogleSheetsConfig) => void;
  calculations: CalculationRecord[];
  products: Product[];
  rawMaterials: RawMaterial[];
  accessories: Accessory[];
  onDataRefreshed: () => void;
}

export const GoogleSheetsSyncView: React.FC<GoogleSheetsSyncViewProps> = ({
  config,
  onUpdateConfig,
  calculations,
  products,
  rawMaterials,
  accessories,
  onDataRefreshed,
}) => {
  const [url, setUrl] = useState(config.webAppUrl);
  const [autoSync, setAutoSync] = useState(config.autoSyncOnSave);
  const [isTesting, setIsTesting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'code' | 'logs'>('config');
  const [logs, setLogs] = useState<SyncLog[]>(storageService.getSyncLogs());

  const handleSaveConfig = () => {
    const updated: GoogleSheetsConfig = {
      ...config,
      webAppUrl: url.trim(),
      autoSyncOnSave: autoSync,
    };
    onUpdateConfig(updated);
    storageService.saveSheetsConfig(updated);
    setTestResult({ success: true, message: 'Pengaturan Google Sheets berhasil disimpan!' });
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const result = await sheetsSyncService.testConnection(url);
    setIsTesting(false);
    setTestResult(result);
    setLogs(storageService.getSyncLogs());
  };

  const handlePushAll = async () => {
    setIsPushing(true);
    const result = await sheetsSyncService.pushAllToSheets(url, {
      calculations,
      products,
      rawMaterials,
      accessories,
    });
    setIsPushing(false);
    setTestResult(result);
    setLogs(storageService.getSyncLogs());
    onDataRefreshed();
  };

  const handlePullAll = async () => {
    setIsPulling(true);
    const result = await sheetsSyncService.pullAllFromSheets(url);
    setIsPulling(false);
    if (result.success && result.data) {
      if (result.data.calculations && result.data.calculations.length > 0) {
        storageService.saveCalculations(result.data.calculations);
      }
      if (result.data.products && result.data.products.length > 0) {
        storageService.saveProducts(result.data.products);
      }
      if (result.data.rawMaterials && result.data.rawMaterials.length > 0) {
        storageService.saveRawMaterials(result.data.rawMaterials);
      }
      if (result.data.accessories && result.data.accessories.length > 0) {
        storageService.saveAccessories(result.data.accessories);
      }
      onDataRefreshed();
    }
    setTestResult({ success: result.success, message: result.message });
    setLogs(storageService.getSyncLogs());
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleResetData = () => {
    if (confirm('Apakah Anda yakin ingin mereset seluruh data kembali ke contoh bawaan Kopelriem CN1?')) {
      storageService.resetAllToDefault();
      onDataRefreshed();
      setTestResult({ success: true, message: 'Data berhasil direset ke contoh default Kopelriem CN1.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-xs text-white">
              <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Sinkronisasi Google Sheets & Apps Script</h2>
              <p className="text-xs text-emerald-100">
                Penyimpanan ganda: data offline instan di peramban dan otomatis sinkron ke Google Spreadsheet tim
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                url ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30' : 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${url ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {url ? 'URL Terhubung' : 'Penyimpanan Lokal Aktif'}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 border-t border-white/10 pt-4 text-xs font-semibold">
          <button
            id="tab-sync-config"
            onClick={() => setActiveTab('config')}
            className={`px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'config' ? 'bg-white text-emerald-950 shadow-xs' : 'text-white/80 hover:bg-white/10'
            }`}
          >
            Pengaturan & Eksekusi Sinkron
          </button>
          <button
            id="tab-sync-code"
            onClick={() => setActiveTab('code')}
            className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'code' ? 'bg-white text-emerald-950 shadow-xs' : 'text-white/80 hover:bg-white/10'
            }`}
          >
            <span>Kode Apps Script (Code.gs)</span>
            <span className="rounded bg-emerald-700/80 px-1.5 py-0.5 text-[10px] text-emerald-100">1-Klik Copy</span>
          </button>
          <button
            id="tab-sync-logs"
            onClick={() => setActiveTab('logs')}
            className={`px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'logs' ? 'bg-white text-emerald-950 shadow-xs' : 'text-white/80 hover:bg-white/10'
            }`}
          >
            Riwayat Log ({logs.length})
          </button>
        </div>
      </div>

      {testResult && (
        <div
          className={`flex items-start gap-3 rounded-xl p-4 text-xs border ${
            testResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-semibold">{testResult.message}</p>
          </div>
          <button onClick={() => setTestResult(null)} className="text-slate-400 hover:text-slate-600">
            ×
          </button>
        </div>
      )}

      {/* Tab: Config */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <Settings2 className="w-5 h-5 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">Konfigurasi Google Apps Script Web App</h3>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Google Apps Script Web App URL <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-sheets-webapp-url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-xs text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
                  />
                  <p className="mt-1.5 text-slate-500">
                    Didapat dari menu Google Sheets: <em>Extensions &gt; Apps Script &gt; Deploy &gt; New deployment &gt; Web app</em> (akses: Anyone).
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3.5 border border-slate-200">
                  <div>
                    <div className="font-semibold text-slate-800">Auto-Sinkronisasi Saat Simpan</div>
                    <div className="text-slate-500 text-[11px]">
                      Otomatis kirim data kalkulasi ke Google Sheets setiap kali tombol Simpan diklik
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSync}
                      onChange={(e) => setAutoSync(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    id="btn-save-sheets-config"
                    onClick={handleSaveConfig}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition shadow-xs"
                  >
                    Simpan Pengaturan
                  </button>
                  <button
                    id="btn-test-sheets-connection"
                    onClick={handleTestConnection}
                    disabled={isTesting || !url}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Menguji...' : 'Uji Koneksi'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Manual Sync Actions */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-2">Aksi Sinkronisasi Manual</h3>
              <p className="text-xs text-slate-500 mb-4">
                Pilih arah sinkronisasi untuk menyelaraskan data lokal browser dengan lembar kerja Google Sheets.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                    <ArrowUpRight className="w-4 h-4 text-emerald-700" />
                    <span>Kirim ke Google Sheets (Push)</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Menyalin seluruh {calculations.length} perhitungan, {products.length} produk, dan master bahan dari penyimpanan lokal ke tab Google Sheets.
                  </p>
                  <button
                    id="btn-push-all-sheets"
                    onClick={handlePushAll}
                    disabled={isPushing || !url}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 transition shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isPushing ? 'animate-spin' : ''}`} />
                    <span>{isPushing ? 'Mengunggah...' : 'Push Seluruh Data'}</span>
                  </button>
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                    <ArrowDownLeft className="w-4 h-4 text-blue-700" />
                    <span>Tarik dari Google Sheets (Pull)</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Memperbarui data lokal dari Google Sheets jika ada rekan kerja lain yang mengedit spreadsheet langsung.
                  </p>
                  <button
                    id="btn-pull-all-sheets"
                    onClick={handlePullAll}
                    disabled={isPulling || !url}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-800 py-2 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-50 transition shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isPulling ? 'animate-spin' : ''}`} />
                    <span>{isPulling ? 'Mengambil...' : 'Pull Data Terbaru'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Guide & Reset */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3 text-slate-900 font-bold text-xs uppercase tracking-wider">
                <Info className="w-4 h-4 text-blue-600" />
                <span>Panduan Cepat 3 Langkah</span>
              </div>
              <ol className="space-y-3 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    1
                  </span>
                  <div>
                    Buka tab <strong>Kode Apps Script</strong> di atas, lalu klik <strong>Salin Seluruh Kode</strong>.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    2
                  </span>
                  <div>
                    Buka Spreadsheet Anda, buka <strong>Extensions &gt; Apps Script</strong>, tempel kode tersebut lalu klik <strong>Deploy as Web App (Anyone)</strong>.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    3
                  </span>
                  <div>
                    Tempelkan URL hasil deployment ke form di samping dan klik <strong>Simpan Pengaturan</strong>.
                  </div>
                </li>
              </ol>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h4 className="font-bold text-xs text-slate-900 mb-2">Reset Data Bawaan</h4>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                Kembalikan master data dan riwayat ke contoh pesanan <strong>Kopelriem CN1 (1091 pcs)</strong>.
              </p>
              <button
                id="btn-reset-data-default"
                onClick={handleResetData}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset ke Contoh Default</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Code */}
      {activeTab === 'code' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Kode Google Apps Script (Code.gs)</h3>
              <p className="text-xs text-slate-500">
                Skrip ini otomatis membuat lembar Konsumsi_Bahan, Master_Produk, Master_BahanBaku, dan Master_Accessories di Spreadsheet Anda.
              </p>
            </div>
            <button
              id="btn-copy-apps-script-code"
              onClick={handleCopyCode}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition shadow-xs ${
                copiedCode
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-800 text-white hover:bg-blue-900'
              }`}
            >
              {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? 'Tersalin ke Clipboard!' : 'Salin Seluruh Kode (.gs)'}</span>
            </button>
          </div>

          <div className="relative">
            <pre className="max-h-[500px] overflow-y-auto rounded-xl bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-emerald-400 border border-slate-800">
              <code>{APPS_SCRIPT_TEMPLATE}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Tab: Logs */}
      {activeTab === 'logs' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Riwayat Log Sinkronisasi</h3>
            <span className="text-xs text-slate-500">{logs.length} catatan aktivitas</span>
          </div>

          {logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Belum ada log aktivitas sinkronisasi.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {logs.map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-2.5">
                    {log.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-semibold text-slate-800">{log.action}</div>
                      <div className="text-slate-500 text-[11px]">{log.message}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(log.timestamp).toLocaleTimeString('id-ID')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
