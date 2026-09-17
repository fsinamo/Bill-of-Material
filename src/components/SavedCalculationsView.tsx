import React, { useState } from 'react';
import { CalculationRecord, GoogleSheetsConfig } from '../types';
import { sheetsSyncService } from '../services/sheetsSyncService';
import { storageService } from '../services/storageService';
import {
  FileText,
  Search,
  Printer,
  Copy,
  Trash2,
  ExternalLink,
  Download,
  CheckCircle2,
  Clock,
  CloudUpload,
  RotateCcw,
  Eye
} from 'lucide-react';

interface SavedCalculationsViewProps {
  calculations: CalculationRecord[];
  sheetsConfig: GoogleSheetsConfig;
  onLoadCalculation: (calc: CalculationRecord) => void;
  onDuplicateCalculation: (calc: CalculationRecord) => void;
  onPrintCalculation: (calc: CalculationRecord) => void;
  onDeleteCalculation: (id: string) => void;
  onDataUpdated: () => void;
}

export const SavedCalculationsView: React.FC<SavedCalculationsViewProps> = ({
  calculations,
  sheetsConfig,
  onLoadCalculation,
  onDuplicateCalculation,
  onPrintCalculation,
  onDeleteCalculation,
  onDataUpdated,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const filtered = calculations.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.calculationNumber.toLowerCase().includes(q) ||
      c.productName.toLowerCase().includes(q) ||
      (c.customerOrPoRef && c.customerOrPoRef.toLowerCase().includes(q)) ||
      (c.title && c.title.toLowerCase().includes(q))
    );
  });

  const handleSyncSingle = async (calc: CalculationRecord) => {
    setSyncingId(calc.id);
    setSyncMessage(null);
    const res = await sheetsSyncService.pushSingleCalculation(sheetsConfig.webAppUrl, calc);
    setSyncingId(null);
    if (res.success) {
      const updated = {
        ...calc,
        syncStatus: 'synced' as const,
        syncedAt: new Date().toISOString(),
      };
      storageService.saveSingleCalculation(updated);
      onDataUpdated();
      setSyncMessage(`Perhitungan ${calc.calculationNumber} berhasil disinkronkan ke Google Sheets!`);
    } else {
      setSyncMessage(`Gagal sinkron: ${res.message}`);
    }
  };

  const handleDownloadSingleJson = (calc: CalculationRecord) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(calc, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `Perhitungan_${calc.calculationNumber}.json`);
    dlAnchorElem.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Riwayat Perhitungan Tersimpan</h2>
            <p className="text-xs text-slate-500">
              Muat kembali, edit, simpan sebagai salinan baru, cetak PDF, atau unduh laporan kalkulasi
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari no. SPK, produk..."
            className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs text-slate-800 focus:border-blue-600 outline-hidden"
          />
        </div>
      </div>

      {syncMessage && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 flex items-center justify-between">
          <span>{syncMessage}</span>
          <button onClick={() => setSyncMessage(null)} className="text-blue-500 hover:text-blue-700">
            ×
          </button>
        </div>
      )}

      {/* Calculations List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">Belum ada perhitungan tersimpan</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Gunakan tab <strong>Konsumsi Bahan</strong> untuk menghitung kebutuhan bahan produk dan menyimpannya.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((calc) => (
            <div
              key={calc.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-blue-300 transition space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-blue-100/70 px-2 py-0.5 font-mono text-xs font-bold text-blue-950">
                      {calc.calculationNumber}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{calc.title || calc.productName}</h3>
                    {calc.syncStatus === 'synced' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Tersinkron ke Sheets</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        <Clock className="w-3 h-3" />
                        <span>Tersimpan Lokal</span>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>Produk: <strong className="text-slate-800">{calc.productName}</strong></span>
                    <span>•</span>
                    <span>Buyer: <strong className="text-blue-900 font-semibold">{calc.buyerName || '-'}</strong></span>
                    <span>•</span>
                    <span>Pesanan: <strong className="text-blue-900">{calc.orderQuantity.toLocaleString('id-ID')} Pcs</strong></span>
                    {calc.customerOrPoRef && (
                      <>
                        <span>•</span>
                        <span>Ref PO: <strong className="text-slate-700">{calc.customerOrPoRef}</strong></span>
                      </>
                    )}
                    <span>•</span>
                    <span>Perusahaan: <strong className="text-slate-700">{calc.companyName || 'PT. Garment Presisi'}</strong></span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-1.5 self-start lg:self-center">
                  <button
                    onClick={() => onLoadCalculation(calc)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-900 transition shadow-xs"
                    title="Muat dan edit kembali perhitungan ini di kalkulator"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Load & Edit</span>
                  </button>

                  <button
                    onClick={() => onPrintCalculation(calc)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                    title="Cetak format PDF resmi"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>Cetak PDF</span>
                  </button>

                  <button
                    onClick={() => onDuplicateCalculation(calc)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                    title="Duplikasi perhitungan dengan nama lain (Copy)"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                    <span>Copy</span>
                  </button>

                  <button
                    onClick={() => handleDownloadSingleJson(calc)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                    title="Download JSON data"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {sheetsConfig.webAppUrl && (
                    <button
                      onClick={() => handleSyncSingle(calc)}
                      disabled={syncingId === calc.id}
                      className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition"
                      title="Kirim ke Google Sheets"
                    >
                      <CloudUpload className={`w-3.5 h-3.5 ${syncingId === calc.id ? 'animate-bounce' : ''}`} />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (confirm(`Hapus data perhitungan ${calc.calculationNumber}?`)) {
                        onDeleteCalculation(calc.id);
                      }
                    }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Summary Badges of Raw Materials Needed */}
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                <div className="text-[11px] font-bold text-slate-700 mb-2">
                  Rekapitulasi Kebutuhan Bahan Baku:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {calc.summary.map((sum) => (
                    <div
                      key={sum.rawMaterialId}
                      className="rounded-lg bg-white p-2.5 border border-slate-200/80 shadow-2xs text-xs"
                    >
                      <div className="font-semibold text-slate-800 truncate" title={sum.rawMaterialName}>
                        {sum.rawMaterialName}
                      </div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="text-slate-500 text-[11px]">Kebutuhan:</span>
                        <div className="font-mono font-bold text-blue-900 text-sm">
                          {sum.totalRequired} {sum.unit}
                          <span className="text-slate-400 font-normal text-[11px] ml-1">
                            (ambil: {sum.roundedRequired})
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
