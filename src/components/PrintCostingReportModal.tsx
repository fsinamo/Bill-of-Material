import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Download,
  FileText,
  ImageIcon,
  Building2,
  Upload,
  RotateCcw,
  CheckCircle2,
  Coins,
  ShieldCheck,
  ChevronRight,
  Loader2,
  Percent,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { ProductCostingRecord, ProductCostingItem } from '../types';
import { CompanyProfile } from '../services/storageService';

interface PrintCostingReportModalProps {
  costing: ProductCostingRecord;
  companyProfile: CompanyProfile;
  onClose: () => void;
  onUpdateCompanyProfile?: (profile: CompanyProfile) => void;
}

interface CostingPageConfig {
  pageNumber: number;
  totalPages: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  accessoryItems: ProductCostingItem[];
  serviceItems: ProductCostingItem[];
  showOrderMeta: boolean;
  showSummaryBox: boolean;
  showSignatures: boolean;
}

// Partition costing items into distinct proportional A4 sheets
function buildCostingReportPages(
  costing: ProductCostingRecord
): CostingPageConfig[] {
  const allAccItems = costing.items.filter((i) => i.accessoryCategory !== 'service');
  const allServiceItems = costing.items.filter((i) => i.accessoryCategory === 'service');

  // Single page fits comfortably if:
  // accessories <= 3 AND services <= 2
  // Total rows <= 5
  const totalRows = allAccItems.length + allServiceItems.length;
  if (totalRows <= 5 && allAccItems.length <= 4) {
    return [
      {
        pageNumber: 1,
        totalPages: 1,
        isFirstPage: true,
        isLastPage: true,
        accessoryItems: allAccItems,
        serviceItems: allServiceItems,
        showOrderMeta: true,
        showSummaryBox: true,
        showSignatures: true,
      },
    ];
  }

  // Multi-page layout (2 or more pages so no stretching occurs):
  // Page 1: Letterhead + Meta Info + Accessories Table + Subtotal Accessories
  // Page 2: Continuation Header + Services Table + Rekapitulasi Summary Box + Signatures + Footer
  const pages: CostingPageConfig[] = [];

  // If accessories alone exceed 7 items, chunk accessories
  const maxAccPage1 = 6;
  const page1Acc = allAccItems.slice(0, maxAccPage1);
  const remainingAcc = allAccItems.slice(maxAccPage1);

  pages.push({
    pageNumber: 1,
    totalPages: 2,
    isFirstPage: true,
    isLastPage: false,
    accessoryItems: page1Acc,
    serviceItems: remainingAcc.length === 0 && allServiceItems.length <= 2 ? allServiceItems : [],
    showOrderMeta: true,
    showSummaryBox: false,
    showSignatures: false,
  });

  // Page 2: Remaining accessories (if any) + Services + Summary Box + Signatures
  pages.push({
    pageNumber: 2,
    totalPages: 2,
    isFirstPage: false,
    isLastPage: true,
    accessoryItems: remainingAcc,
    serviceItems: remainingAcc.length === 0 && allServiceItems.length <= 2 ? [] : allServiceItems,
    showOrderMeta: false,
    showSummaryBox: true,
    showSignatures: true,
  });

  const total = pages.length;
  pages.forEach((p) => {
    p.totalPages = total;
  });

  return pages;
}

export const PrintCostingReportModal: React.FC<PrintCostingReportModalProps> = ({
  costing,
  companyProfile,
  onClose,
  onUpdateCompanyProfile,
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingJpg, setIsExportingJpg] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Editable headers directly in the report
  const [companyName, setCompanyName] = useState<string>(
    costing.companyName || companyProfile.companyName || 'CV. RAVINA'
  );
  const [companyLogo, setCompanyLogo] = useState<string>(
    companyProfile.companyLogo || ''
  );

  const reportPages = useMemo(() => {
    return buildCostingReportPages(costing);
  }, [costing]);

  // Derived financial calculations
  const totalAccessoriesCostPerUnit = useMemo(() => {
    if (costing.totalAccessoriesCostPerUnit !== undefined) {
      return costing.totalAccessoriesCostPerUnit;
    }
    return costing.items
      .filter((i) => i.accessoryCategory !== 'service')
      .reduce((sum, item) => sum + item.totalCostPerProduct, 0);
  }, [costing]);

  const totalServicesCostPerUnit = useMemo(() => {
    if (costing.totalServicesCostPerUnit !== undefined) {
      return costing.totalServicesCostPerUnit;
    }
    return costing.items
      .filter((i) => i.accessoryCategory === 'service')
      .reduce((sum, item) => sum + item.totalCostPerProduct, 0);
  }, [costing]);

  const totalCostPerUnit = totalAccessoriesCostPerUnit + totalServicesCostPerUnit;
  const totalBatchCost = totalCostPerUnit * costing.orderQuantity;

  const targetMarkupPercent = costing.targetMarkupPercent ?? 25;
  const recommendedSellingPricePerUnit =
    costing.targetSellingPricePerUnit ??
    Math.round(totalCostPerUnit * (1 + targetMarkupPercent / 100));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setExportNotice('Ukuran logo maksimal 3MB');
      setTimeout(() => setExportNotice(null), 3000);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCompanyLogo(dataUrl);
      setExportNotice('Logo berhasil diperbarui pada lembar costing!');
      setTimeout(() => setExportNotice(null), 3000);
      if (onUpdateCompanyProfile) {
        onUpdateCompanyProfile({
          ...companyProfile,
          companyLogo: dataUrl,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    setCompanyLogo('');
    setExportNotice('Logo dikembalikan ke badge inisial standar');
    setTimeout(() => setExportNotice(null), 3000);
    if (onUpdateCompanyProfile) {
      onUpdateCompanyProfile({
        ...companyProfile,
        companyLogo: '',
      });
    }
  };

  const triggerDownload = (dataUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Capture specific page element
  const captureCostingPageCanvas = async (
    pageNumber: number
  ): Promise<HTMLCanvasElement> => {
    const pageEl = document.getElementById(
      `printable-costing-page-${pageNumber}`
    );
    if (!pageEl) {
      throw new Error(`Elemen lembar costing halaman ${pageNumber} tidak ditemukan`);
    }

    return await html2canvas(pageEl, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: 1200,
      onclone: (clonedDoc) => {
        const clonedPage = clonedDoc.getElementById(
          `printable-costing-page-${pageNumber}`
        );
        if (clonedPage) {
          clonedPage.style.width = '794px';
          clonedPage.style.maxWidth = '794px';
          clonedPage.style.minWidth = '794px';
          clonedPage.style.minHeight = '1123px';
          clonedPage.style.margin = '0 auto';
          clonedPage.style.borderRadius = '0';
          clonedPage.style.boxShadow = 'none';
          clonedPage.style.border = 'none';
          clonedPage.style.padding = '36px 40px';
          clonedPage.style.backgroundColor = '#ffffff';
          clonedPage.style.boxSizing = 'border-box';
        }
        const nonPrintable = clonedDoc.querySelectorAll(
          '[data-html2canvas-ignore], .print\\:hidden'
        );
        nonPrintable.forEach((el) => el.remove());
        const imgs = clonedDoc.querySelectorAll('img');
        imgs.forEach((img) => {
          if (!img.crossOrigin) img.crossOrigin = 'anonymous';
        });
      },
    });
  };

  // Export to multi-page strictly proportional PDF (A4 210 x 297 mm)
  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    setExportNotice('Menyiapkan berkas PDF A4 kualitas tinggi (proporsional & tanpa stretch)...');
    try {
      const scrollArea = document.getElementById('print-costing-scroll-area');
      const prevScrollTop = scrollArea ? scrollArea.scrollTop : 0;
      if (scrollArea) scrollArea.scrollTop = 0;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      for (let i = 0; i < reportPages.length; i++) {
        const pageNum = reportPages[i].pageNumber;
        const canvas = await captureCostingPageCanvas(pageNum);

        if (i > 0) {
          pdf.addPage();
        }

        const imgWidthMm = 210;
        const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;
        const targetHeightMm = Math.min(297, imgHeightMm);
        const imgData = canvas.toDataURL('image/jpeg', 0.98);

        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidthMm, targetHeightMm);
      }

      if (scrollArea) scrollArea.scrollTop = prevScrollTop;

      const safeNumber = costing.costingNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
      const safeProduct = costing.productName.replace(/[^a-zA-Z0-9-_]/g, '_');
      const fileName = `Product_Costing_${safeNumber}_${safeProduct}.pdf`;
      pdf.save(fileName);

      setExportNotice(
        `✓ Berhasil mengunduh PDF A4 (${reportPages.length} Halaman): ${fileName}`
      );
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error('Gagal generate PDF Costing:', err);
      setExportNotice('Gagal membuat berkas PDF. Silakan coba kembali.');
      setTimeout(() => setExportNotice(null), 4000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export JPEG
  const handleExportJpg = async () => {
    setIsExportingJpg(true);
    setExportNotice('Menyiapkan gambar JPEG resolusi tinggi...');
    try {
      for (let i = 0; i < reportPages.length; i++) {
        const pageNum = reportPages[i].pageNumber;
        const canvas = await captureCostingPageCanvas(pageNum);
        const imgData = canvas.toDataURL('image/jpeg', 0.96);
        const safeNumber = costing.costingNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
        const safeProduct = costing.productName.replace(/[^a-zA-Z0-9-_]/g, '_');
        const fileName =
          reportPages.length === 1
            ? `Product_Costing_${safeNumber}_${safeProduct}.jpg`
            : `Product_Costing_${safeNumber}_${safeProduct}_Hal_${i + 1}.jpg`;

        setTimeout(() => {
          triggerDownload(imgData, fileName);
        }, i * 350);
      }
      setExportNotice(
        reportPages.length === 1
          ? '✓ Berhasil mengunduh gambar JPEG'
          : `✓ Berhasil mengunduh ${reportPages.length} lembar JPEG proporsional`
      );
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error('Gagal generate JPEG:', err);
      setExportNotice('Gagal membuat gambar JPEG.');
      setTimeout(() => setExportNotice(null), 4000);
    } finally {
      setIsExportingJpg(false);
    }
  };

  // Export PNG
  const handleExportPng = async () => {
    setIsExportingPng(true);
    setExportNotice('Menyiapkan gambar PNG tanpa kompresi...');
    try {
      for (let i = 0; i < reportPages.length; i++) {
        const pageNum = reportPages[i].pageNumber;
        const canvas = await captureCostingPageCanvas(pageNum);
        const imgData = canvas.toDataURL('image/png');
        const safeNumber = costing.costingNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
        const safeProduct = costing.productName.replace(/[^a-zA-Z0-9-_]/g, '_');
        const fileName =
          reportPages.length === 1
            ? `Product_Costing_${safeNumber}_${safeProduct}.png`
            : `Product_Costing_${safeNumber}_${safeProduct}_Hal_${i + 1}.png`;

        setTimeout(() => {
          triggerDownload(imgData, fileName);
        }, i * 350);
      }
      setExportNotice('✓ Berhasil mengunduh gambar PNG');
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error('Gagal generate PNG:', err);
      setExportNotice('Gagal membuat gambar PNG.');
      setTimeout(() => setExportNotice(null), 4000);
    } finally {
      setIsExportingPng(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Top Action Bar */}
      <div className="bg-slate-900 border-b border-slate-700 px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 text-white shrink-0 print:hidden shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Preview & Cetak Dokumen Product Costing (HPP)
              </h2>
              <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono font-bold">
                {reportPages.length} Halaman A4
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {costing.costingNumber} • {costing.title} • {costing.orderQuantity.toLocaleString('id-ID')} Pcs
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Logo Upload Button */}
          <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-slate-750 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition">
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Ganti Logo</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </label>

          {companyLogo && (
            <button
              onClick={handleResetLogo}
              title="Reset Logo"
              className="rounded-xl border border-slate-750 bg-slate-800 hover:bg-slate-700 p-2 text-xs text-slate-300 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="h-5 w-px bg-slate-700 mx-1 hidden sm:block"></div>

          {/* Download PDF */}
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-2 text-xs font-bold text-white transition shadow-sm disabled:opacity-50"
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            <span>PDF (A4)</span>
          </button>

          {/* Download JPEG */}
          <button
            onClick={handleExportJpg}
            disabled={isExportingJpg}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 px-3 py-2 text-xs font-bold text-white transition shadow-sm disabled:opacity-50"
          >
            {isExportingJpg ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5" />
            )}
            <span>JPEG</span>
          </button>

          {/* Download PNG */}
          <button
            onClick={handleExportPng}
            disabled={isExportingPng}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3 py-2 text-xs font-bold text-white transition shadow-sm disabled:opacity-50"
          >
            {isExportingPng ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5 text-indigo-200" />
            )}
            <span>PNG</span>
          </button>

          {/* Direct Print */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white transition shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak (Print)</span>
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 p-2 text-slate-300 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Export Status Notification */}
      {exportNotice && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 shrink-0 animate-in fade-in duration-150">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Scrollable Document Body with Distinct A4 Sheets */}
      <div
        id="print-costing-scroll-area"
        className="flex-1 overflow-y-auto bg-slate-200/80 p-3 sm:p-6 lg:p-8 flex flex-col items-center print:overflow-visible print:p-0 print:m-0 print:bg-white print:block print:w-full"
      >
        {reportPages.map((page) => (
          <div
            key={page.pageNumber}
            id={`printable-costing-page-${page.pageNumber}`}
            className="a4-page-sheet w-full max-w-[820px] bg-white rounded-xl shadow-xl border border-slate-300 p-8 sm:p-10 text-slate-900 min-h-[1123px] relative flex flex-col justify-between mb-8 print:mb-0 print:min-h-0 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full print:rounded-none"
            style={{ boxSizing: 'border-box', fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            <div>
              {/* 1. Header (Full Letterhead on Page 1, Continuation Header on Page 2+) */}
              {page.isFirstPage ? (
                <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    {companyLogo ? (
                      <img
                        src={companyLogo}
                        alt="Logo Perusahaan"
                        className="h-14 w-auto max-h-16 max-w-[130px] object-contain rounded-lg border border-slate-200 p-0.5"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black text-xl">
                        {companyName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                        {companyName}
                      </h1>
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mt-0.5">
                        LAPORAN PRODUCT COSTING • HPP ACCESSORIES & BIAYA JASA
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {companyProfile.companyAddress || 'Kawasan Industri Tekstil, Jawa Barat'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block rounded-md bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 text-[11px] font-black uppercase">
                      Product Costing
                    </span>
                    <p className="text-[10px] font-mono text-slate-500 mt-1">
                      Tanggal: {costing.calculationDate || new Date().toISOString().split('T')[0]}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Hal <strong>{page.pageNumber}</strong> dari <strong>{page.totalPages}</strong>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-4">
                  <div className="flex items-center gap-3">
                    {companyLogo ? (
                      <img
                        src={companyLogo}
                        alt="Logo Perusahaan"
                        className="h-10 w-auto max-h-12 max-w-[100px] object-contain rounded border border-slate-200 p-0.5"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-black text-sm">
                        {companyName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-black text-slate-900 uppercase">
                        {companyName}
                      </div>
                      <div className="text-[11px] font-bold text-slate-600 uppercase">
                        LAPORAN PRODUCT COSTING • LEMBAR {page.pageNumber} DARI {page.totalPages}
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-600">
                    <div className="font-mono font-bold text-slate-900">
                      No: {costing.costingNumber}
                    </div>
                    <div>
                      Produk: <strong>{costing.productName}</strong> ({costing.orderQuantity.toLocaleString('id-ID')} Pcs)
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Meta Info Grid (Page 1 Only) */}
              {page.showOrderMeta && (
                <div className="my-4 rounded-xl bg-slate-50 p-4 border border-slate-200">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                        No Dokumen Costing
                      </span>
                      <strong className="font-mono text-slate-900 text-sm">
                        {costing.costingNumber}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                        Produk Jadi
                      </span>
                      <strong className="text-slate-900 text-sm">
                        {costing.productName} ({costing.productCode})
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                        Jumlah Pesanan (Batch)
                      </span>
                      <strong className="font-mono text-slate-900 text-sm">
                        {costing.orderQuantity.toLocaleString('id-ID')} Pcs
                      </strong>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                        Judul Costing / Uraian
                      </span>
                      <strong className="text-slate-800">
                        {costing.title}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                        Status Verifikasi
                      </span>
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 text-xs mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>HPP Terverifikasi</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Section: Rincian Komponen Accessories */}
              {page.accessoryItems.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-300">
                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      1. Rincian Biaya Komponen Accessories ({page.accessoryItems.length} Item)
                    </h2>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Olah Bahan Baku & Beli Jadi
                    </span>
                  </div>
                  <table className="w-full text-left border-collapse text-[11px] mt-2">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border-y border-slate-300">
                        <th className="py-2 px-2.5 font-bold w-7">No</th>
                        <th className="py-2 px-2.5 font-bold">Nama Komponen</th>
                        <th className="py-2 px-2.5 font-bold">Sumber & Acuan Perhitungan</th>
                        <th className="py-2 px-2.5 font-bold text-right">Harga Satuan</th>
                        <th className="py-2 px-2.5 font-bold text-center">Qty / Pcs</th>
                        <th className="py-2 px-2.5 font-bold text-right">Biaya / Pcs</th>
                        <th className="py-2 px-2.5 font-bold text-right">Total Batch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {page.accessoryItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="py-2 px-2.5 text-slate-500 font-mono">{idx + 1}</td>
                          <td className="py-2 px-2.5 font-bold text-slate-900">
                            <div>{item.accessoryName}</div>
                            {item.accessoryCategory === 'raw_material_based' && item.rawMaterialName && (
                              <span className="text-[9.5px] font-semibold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 mt-0.5 inline-block">
                                Bahan: {item.rawMaterialName}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-slate-600 text-[10.5px]">
                            <div>{item.notes || '-'}</div>
                            {item.accessoryCategory === 'raw_material_based' && item.yieldPerUnit && (
                              <div className="text-[9px] font-mono text-purple-900 bg-purple-50 px-1.5 py-0.5 rounded mt-0.5 inline-block border border-purple-200">
                                Yield: {item.yieldPerUnit} pcs/lembar • Pemakaian: 1÷{item.yieldPerUnit} = {(1 / item.yieldPerUnit).toLocaleString('id-ID', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}/pcs
                              </div>
                            )}
                            {(item.divisionFormula || item.differentSizeNotes) && (
                              <div className="mt-0.5 space-y-0.5 text-[9px]">
                                {item.divisionFormula && (
                                  <div className="text-purple-900 font-mono bg-purple-50 px-1 py-0.5 rounded border border-purple-200/60 inline-block">
                                    ➗ {item.divisionFormula}
                                  </div>
                                )}
                                {item.differentSizeNotes && (
                                  <div className="text-amber-900 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                                    💡 {item.differentSizeNotes}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2.5 font-mono text-right text-slate-800">
                            Rp {item.unitPrice.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-2.5 font-mono text-center text-slate-800">
                            {item.usageQtyPerProduct}
                          </td>
                          <td className="py-2 px-2.5 font-mono font-bold text-right text-slate-900">
                            Rp {item.totalCostPerProduct.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-2.5 font-mono text-right text-slate-700">
                            Rp {item.totalCostBatch.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      ))}
                      {/* Subtotal on Page 1 if only accessories */}
                      {page.isFirstPage && (
                        <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                          <td colSpan={5} className="py-2 px-2.5 text-slate-800 text-right">
                            Subtotal Biaya Accessories:
                          </td>
                          <td className="py-2 px-2.5 font-mono text-right text-slate-900 font-black">
                            Rp {totalAccessoriesCostPerUnit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-2.5 font-mono text-right text-amber-900 font-bold">
                            Rp {costing.totalAccessoriesBatchCost?.toLocaleString('id-ID', { maximumFractionDigits: 0 }) || (totalAccessoriesCostPerUnit * costing.orderQuantity).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Continuation note on Page 1 if multi-page */}
              {!page.isLastPage && (
                <div className="mt-5 py-2.5 px-3 bg-blue-50 border border-blue-200 rounded-xl text-center text-xs text-blue-800 font-semibold flex items-center justify-center gap-1.5">
                  <span>▼ Rincian ongkos jasa pengerjaan & rekapitulasi HPP berlanjut ke Halaman 2</span>
                </div>
              )}

              {/* 4. Section: Rincian Jasa Pengerjaan */}
              {page.serviceItems.length > 0 && (
                <div className="mt-5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-indigo-200">
                    <h2 className="text-xs font-black text-indigo-950 uppercase tracking-wide">
                      2. Rincian Ongkos Jasa & Perakitan ({page.serviceItems.length} Layanan)
                    </h2>
                    <span className="text-[10px] text-indigo-700 font-medium">
                      Jahit, Bordir, Cutting & Finishing
                    </span>
                  </div>
                  <table className="w-full text-left border-collapse text-[11px] mt-2">
                    <thead>
                      <tr className="bg-indigo-50/80 text-indigo-950 border-y border-indigo-200">
                        <th className="py-2 px-2.5 font-bold w-7">No</th>
                        <th className="py-2 px-2.5 font-bold">Nama Layanan / Pengerjaan</th>
                        <th className="py-2 px-2.5 font-bold">Keterangan Pekerjaan</th>
                        <th className="py-2 px-2.5 font-bold text-right">Tarif Satuan</th>
                        <th className="py-2 px-2.5 font-bold text-center">Jumlah / Pcs</th>
                        <th className="py-2 px-2.5 font-bold text-right">Biaya Jasa / Pcs</th>
                        <th className="py-2 px-2.5 font-bold text-right">Total Batch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-100">
                      {page.serviceItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-indigo-50/40">
                          <td className="py-2 px-2.5 text-slate-500 font-mono">{idx + 1}</td>
                          <td className="py-2 px-2.5 font-bold text-slate-900">{item.accessoryName}</td>
                          <td className="py-2 px-2.5 text-slate-600 text-[10.5px]">
                            {item.notes || 'Ongkos pengerjaan per pcs'}
                          </td>
                          <td className="py-2 px-2.5 font-mono text-right text-slate-800">
                            Rp {item.unitPrice.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                          </td>
                          <td className="py-2 px-2.5 font-mono text-center text-slate-800">
                            {item.usageQtyPerProduct}
                          </td>
                          <td className="py-2 px-2.5 font-mono font-bold text-right text-indigo-950">
                            Rp {item.totalCostPerProduct.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                          </td>
                          <td className="py-2 px-2.5 font-mono text-right text-slate-700">
                            Rp {item.totalCostBatch.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-indigo-50/90 font-bold border-t-2 border-indigo-200">
                        <td colSpan={5} className="py-2 px-2.5 text-indigo-950 text-right">
                          Subtotal Biaya Jasa Pengerjaan:
                        </td>
                        <td className="py-2 px-2.5 font-mono text-right text-indigo-950 font-black">
                          Rp {totalServicesCostPerUnit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-2.5 font-mono text-right text-indigo-900 font-bold">
                          Rp {(totalServicesCostPerUnit * costing.orderQuantity).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* 5. Rekapitulasi Summary Box (Last Page Only) */}
              {page.showSummaryBox && (
                <div className="mt-6 rounded-2xl bg-amber-50/90 border-2 border-amber-300 p-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-amber-200 pb-2.5 mb-3">
                    <h3 className="text-xs font-black uppercase text-amber-950 tracking-wider flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-amber-700" />
                      <span>Rekapitulasi HPP & Rekomendasi Harga Jual</span>
                    </h3>
                    <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-900">
                      Markup Margin {targetMarkupPercent}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-600 block text-[10.5px]">Subtotal Accessories / Pcs</span>
                      <strong className="font-mono text-slate-900 text-sm">
                        Rp {totalAccessoriesCostPerUnit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-600 block text-[10.5px]">Subtotal Ongkos Jasa / Pcs</span>
                      <strong className="font-mono text-indigo-950 text-sm">
                        Rp {totalServicesCostPerUnit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>

                    <div className="bg-white/80 p-2.5 rounded-xl border border-amber-300 sm:row-span-2">
                      <span className="text-amber-900 block text-[10.5px] font-bold">
                        Rekomendasi Harga Jual (+{targetMarkupPercent}%)
                      </span>
                      <strong className="font-mono text-amber-950 text-lg sm:text-xl font-black block mt-0.5">
                        Rp {recommendedSellingPricePerUnit.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                      </strong>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Estimasi Laba: Rp {(recommendedSellingPricePerUnit - totalCostPerUnit).toLocaleString('id-ID', { maximumFractionDigits: 0 })} / pcs
                      </span>
                    </div>

                    <div className="pt-2 border-t border-amber-200">
                      <span className="text-slate-700 block text-[11px] font-bold">
                        GRAND TOTAL HPP / Pcs
                      </span>
                      <strong className="font-mono text-emerald-950 text-base font-black">
                        Rp {totalCostPerUnit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>

                    <div className="pt-2 border-t border-amber-200">
                      <span className="text-slate-700 block text-[11px] font-bold">
                        Total Biaya Batch ({costing.orderQuantity} Pcs)
                      </span>
                      <strong className="font-mono text-emerald-950 text-base font-black">
                        Rp {totalBatchCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. Catatan Dokumen Costing (Last Page Only) */}
              {page.isLastPage && costing.notes && (
                <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 border border-slate-200">
                  <span className="font-bold text-slate-900">Catatan Khusus Costing:</span>{' '}
                  {costing.notes}
                </div>
              )}
            </div>

            {/* Bottom: Signatures and Footer (Last Page Only) */}
            {page.showSignatures && (
              <div className="mt-8">
                {/* 3 Kolom Tanda Tangan */}
                <div className="pt-4 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs">
                  <div>
                    <div className="text-slate-500">Dibuat Oleh:</div>
                    <div className="h-16"></div>
                    <div className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block min-w-[130px]">
                      ( Staff Estimasi Biaya )
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-500">Diperiksa:</div>
                    <div className="h-16"></div>
                    <div className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block min-w-[130px]">
                      ( Manager Keuangan )
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-500">Disetujui:</div>
                    <div className="h-16"></div>
                    <div className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block min-w-[130px]">
                      ( Direktur Operasional )
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Dokumen Resmi Sistem GarmentPro Modular • HPP Accessories & Jasa</span>
                  <span>Halaman {page.pageNumber} dari {page.totalPages}</span>
                  <span>Dicetak: {new Date().toLocaleString('id-ID')}</span>
                </div>
              </div>
            )}

            {!page.showSignatures && (
              <div className="mt-4 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                <span>Dokumen Resmi Sistem GarmentPro Modular</span>
                <span>Halaman {page.pageNumber} dari {page.totalPages}</span>
                <span>{costing.costingNumber}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
