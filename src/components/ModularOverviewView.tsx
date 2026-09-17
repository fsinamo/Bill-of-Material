import React from 'react';
import {
  Boxes,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Layers,
  FileSpreadsheet,
  Scissors,
  Warehouse,
  ClipboardList,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface ModularOverviewViewProps {
  onNavigateTab: (tab: string) => void;
}

export const ModularOverviewView: React.FC<ModularOverviewViewProps> = ({ onNavigateTab }) => {
  const modules = [
    {
      id: 'konsumsi-bahan',
      name: 'Modul Konsumsi Bahan (BOM)',
      status: 'active',
      badge: 'Modul Utama (Aktif)',
      description: 'Menghitung kebutuhan lembaran bahan baku plat kuningan, plat stainless, kain, dan accessories berdasarkan jumlah pesanan.',
      targetTab: 'calculator',
      icon: Scissors,
      accent: 'blue',
      features: ['Kalkulasi otomatis Qty pesanan', 'Rumus yield hasil per lembar', 'Cetak format PDF & Download CSV', 'Simpan, Copy, dan Edit kembali'],
    },
    {
      id: 'master-data',
      name: 'Modul Master Data Terpadu',
      status: 'active',
      badge: 'Tersedia & Terhubung',
      description: 'Pusat data Master Produk (Kopelriem CN1 dll), Master Bahan Baku, dan Master Accessories dengan rumus yield.',
      targetTab: 'products',
      icon: Layers,
      accent: 'indigo',
      features: ['Relasi Produk - Accessories', 'Spesifikasi dimensi lembaran plat', 'Default yield per buah', 'Stok & harga estimasi'],
    },
    {
      id: 'sheets-sync',
      name: 'Modul Sinkronisasi Google Sheets',
      status: 'active',
      badge: 'Tersedia & Terhubung',
      description: 'Menyelaraskan data offline di aplikasi dengan Google Sheets melalui Google Apps Script Web App secara otomatis.',
      targetTab: 'sheets',
      icon: FileSpreadsheet,
      accent: 'emerald',
      features: ['Penyimpanan ganda (Lokal + Cloud)', 'Auto-sync saat simpan', 'Generator kode Apps Script siap pakai', 'Tarik & Kirim data 2 arah'],
    },
    {
      id: 'spk-planning',
      name: 'Modul SPK & Perencanaan Produksi',
      status: 'ready',
      badge: 'Siap Diintegrasikan',
      description: 'Menerbitkan Surat Perintah Kerja (SPK) bernomor seri resmi yang langsung mengambil data konsumsi bahan dari Modul BOM.',
      targetTab: null,
      icon: ClipboardList,
      accent: 'amber',
      features: ['Penjadwalan lini jahit & press', 'Alokasi operator & mesin', 'Tracking status produksi per batch'],
    },
    {
      id: 'warehouse-stock',
      name: 'Modul Gudang & Pengambilan Bahan',
      status: 'ready',
      badge: 'Siap Diintegrasikan',
      description: 'Memotong stok gudang plat kuningan & stainless secara otomatis sesuai angka pembulatan lembar pengambilan BOM.',
      targetTab: null,
      icon: Warehouse,
      accent: 'purple',
      features: ['Kartu stok fisik bahan baku', 'Notifikasi stok menipis (min stock)', 'Verifikasi serah terima bahan PPIC'],
    },
    {
      id: 'qc-garment',
      name: 'Modul Quality Control (QC)',
      status: 'ready',
      badge: 'Siap Diintegrasikan',
      description: 'Pemeriksaan dimensi presisi accessories dan toleransi ketebalan plat kuningan/stainless sebelum perakitan akhir.',
      targetTab: null,
      icon: ShieldCheck,
      accent: 'teal',
      features: ['Checklist cacat stamping', 'Laporan defect rate afval', 'Label approval garansi produk'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <Boxes className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-bold">Arsitektur Modular GarmentPro</h2>
        </div>
        <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
          Aplikasi dirancang dengan arsitektur modular yang independen dan terisolasi, namun saling terhubung melalui protokol data terpadu (Unified BOM Schema). Modul-modul baru dapat diaktifkan atau disambungkan kapan saja tanpa merusak modul yang sudah berjalan.
        </p>
      </div>

      {/* Data Flow Diagram */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>Alur Komunikasi Antar Modul Saat Ini</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Tahap 1: Data Dasar</span>
            <div className="font-bold text-slate-900">Master Data</div>
            <p className="text-[11px] text-slate-600">
              Menyediakan spesifikasi produk (Kopelriem CN1), accessories, dan yield bahan baku.
            </p>
          </div>

          <div className="rounded-xl bg-blue-50/70 p-3.5 border border-blue-200 space-y-1">
            <span className="text-[10px] font-bold text-blue-700 uppercase">Tahap 2: Inti Operasi (Aktif)</span>
            <div className="font-bold text-blue-950">Konsumsi Bahan (BOM)</div>
            <p className="text-[11px] text-blue-900">
              Mengolah jumlah pesanan menjadi kebutuhan riil & pembulatan lembar plat kuningan/stainless.
            </p>
          </div>

          <div className="rounded-xl bg-emerald-50/70 p-3.5 border border-emerald-200 space-y-1">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Tahap 3: Persistensi & Kolaborasi</span>
            <div className="font-bold text-emerald-950">Google Sheets & Arsip</div>
            <p className="text-[11px] text-emerald-900">
              Menyimpan hasil perhitungan untuk dapat di-load, diedit kembali, dan dicetak PDF.
            </p>
          </div>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <div
              key={mod.id}
              className={`rounded-2xl border bg-white p-5 shadow-xs transition space-y-4 flex flex-col justify-between ${
                mod.status === 'active'
                  ? 'border-slate-200 hover:border-blue-400'
                  : 'border-dashed border-slate-300 opacity-90'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      mod.status === 'active' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      mod.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {mod.badge}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900">{mod.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{mod.description}</p>
                </div>

                <div className="space-y-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-600">
                  {mod.features.map((feat, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                {mod.targetTab ? (
                  <button
                    onClick={() => onNavigateTab(mod.targetTab!)}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 py-2 text-xs font-bold text-blue-900 hover:bg-blue-100 transition"
                  >
                    <span>Buka Modul Ini</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="w-full text-center py-2 text-[11px] font-semibold text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                    Konektor API Siap Diaktifkan
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
