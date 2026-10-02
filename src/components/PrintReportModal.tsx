import React, { useState, useEffect, useMemo } from 'react';
import { CalculationRecord, ConsumptionDetail } from '../types';
import {
  Printer,
  X,
  CheckCircle2,
  Factory,
  ArrowLeft,
  Home,
  FileText,
  Image as ImageIcon,
  Loader2,
  FileSpreadsheet,
  Upload,
  ChevronDown
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

interface PrintReportModalProps {
  calculation: CalculationRecord;
  onClose: () => void;
  onReturnHome?: () => void;
  onUpdateCalculation?: (calc: CalculationRecord) => void;
}

interface ReportPageConfig {
  pageNumber: number;
  totalPages: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  details: ConsumptionDetail[];
  detailStartIndex: number;
  showNotes: boolean;
  showSignatures: boolean;
}

// Partition data into distinct A4 sheets so zero data is ever cut off between pages
const buildReportPages = (calculation: CalculationRecord): ReportPageConfig[] => {
  const summaryCount = calculation.summary?.length || 0;
  const details = calculation.details || [];
  const totalDetails = details.length;

  // Single-page height budget in standard A4 (1040px usable):
  // Letterhead(85) + OrderInfo(105) + SummaryTable(55 + summaryCount*38) + DetailsThead(35) + Signatures(135) + Notes(45) + Footer(25)
  const singlePageBaseHeight =
    85 + 105 + 55 + summaryCount * 38 + 35 + 135 + (calculation.notes ? 45 : 0) + 25;
  const singlePageDetailsSpace = 1040 - singlePageBaseHeight;
  const singlePageMaxDetails = Math.max(0, Math.floor(singlePageDetailsSpace / 36));

  // If all details fit within a single page with comfortable margins
  if (totalDetails <= singlePageMaxDetails && totalDetails <= 8) {
    return [
      {
        pageNumber: 1,
        totalPages: 1,
        isFirstPage: true,
        isLastPage: true,
        details: details,
        detailStartIndex: 0,
        showNotes: true,
        showSignatures: true,
      },
    ];
  }

  // Multi-page layout
  // Page 1 budget: Letterhead(85) + OrderInfo(105) + SummaryTable(55 + summaryCount*38) + DetailsThead(35) + ContinuationNotice(35) + Footer(25)
  const page1BaseHeight = 85 + 105 + 55 + summaryCount * 38 + 35 + 35 + 25;
  const page1AvailableForDetails = 1040 - page1BaseHeight;
  // Limit Page 1 to between 5 and 10 rows to maintain clean aesthetics
  const page1MaxDetails = Math.min(
    10,
    Math.max(4, Math.floor(page1AvailableForDetails / 36))
  );

  // Subsequent pages budget:
  // Continuation page WITH signatures: 1040 - ContinuationHeader(65) - DetailsThead(35) - Signatures(135) - Notes(45) - Footer(25) = 735px => ~20 rows
  const pageWithSignaturesMaxDetails = Math.floor(730 / 36);
  // Continuation page WITHOUT signatures: 1040 - ContinuationHeader(65) - DetailsThead(35) - ContinuationNotice(35) - Footer(25) = 880px => ~24 rows
  const fullContinuationMaxDetails = Math.floor(880 / 36);

  const pages: ReportPageConfig[] = [];
  let remainingDetails = [...details];
  let currentDetailStartIndex = 0;
  let pageNumber = 1;

  // Page 1:
  const page1Details = remainingDetails.slice(0, page1MaxDetails);
  remainingDetails = remainingDetails.slice(page1MaxDetails);

  pages.push({
    pageNumber: 1,
    totalPages: 1,
    isFirstPage: true,
    isLastPage: remainingDetails.length === 0,
    details: page1Details,
    detailStartIndex: 0,
    showNotes: remainingDetails.length === 0,
    showSignatures: remainingDetails.length === 0,
  });
  currentDetailStartIndex += page1Details.length;
  pageNumber++;

  // Subsequent pages:
  while (remainingDetails.length > 0) {
    if (remainingDetails.length <= pageWithSignaturesMaxDetails) {
      pages.push({
        pageNumber: pageNumber,
        totalPages: 0,
        isFirstPage: false,
        isLastPage: true,
        details: remainingDetails,
        detailStartIndex: currentDetailStartIndex,
        showNotes: true,
        showSignatures: true,
      });
      break;
    } else {
      const chunk = remainingDetails.slice(0, fullContinuationMaxDetails);
      remainingDetails = remainingDetails.slice(fullContinuationMaxDetails);
      pages.push({
        pageNumber: pageNumber,
        totalPages: 0,
        isFirstPage: false,
        isLastPage: remainingDetails.length === 0,
        details: chunk,
        detailStartIndex: currentDetailStartIndex,
        showNotes: remainingDetails.length === 0,
        showSignatures: remainingDetails.length === 0,
      });
      currentDetailStartIndex += chunk.length;
      pageNumber++;
    }
  }

  // Update totalPages
  const total = pages.length;
  pages.forEach((p) => {
    p.totalPages = total;
  });

  return pages;
};

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  calculation,
  onClose,
  onReturnHome,
  onUpdateCalculation,
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingJpg, setIsExportingJpg] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [showJpgMenu, setShowJpgMenu] = useState(false);

  // Editable header fields directly in report
  const [modalCompanyLogo, setModalCompanyLogo] = useState<string>(calculation.companyLogo || '');
  const [modalCompanyName, setModalCompanyName] = useState<string>(
    calculation.companyName || 'CV. RAVINA'
  );
  const [modalBuyerName, setModalBuyerName] = useState<string>(calculation.buyerName || '');

  // Keep in sync if calculation prop changes
  useEffect(() => {
    if (calculation.companyLogo) setModalCompanyLogo(calculation.companyLogo);
    if (calculation.companyName) setModalCompanyName(calculation.companyName);
    if (calculation.buyerName) setModalBuyerName(calculation.buyerName);
  }, [calculation]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setExportNotice('Ukuran file maksimal 3MB');
      setTimeout(() => setExportNotice(null), 3000);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setModalCompanyLogo(dataUrl);
      setExportNotice('Logo berhasil diperbarui pada laporan!');
      setTimeout(() => setExportNotice(null), 3000);
      if (onUpdateCalculation) {
        onUpdateCalculation({
          ...calculation,
          companyLogo: dataUrl,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    setModalCompanyLogo('');
    setExportNotice('Logo dikembalikan ke badge inisial standar');
    setTimeout(() => setExportNotice(null), 3000);
    if (onUpdateCalculation) {
      onUpdateCalculation({
        ...calculation,
        companyLogo: '',
      });
    }
  };

  const companyInitials = (modalCompanyName || 'Garment Presisi')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'GP';

  const handleReturnHome = () => {
    if (onReturnHome) {
      onReturnHome();
    } else {
      onClose();
    }
  };

  // Listen to Escape key to easily return
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleReturnHome();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePrint = () => {
    document.body.classList.add('report-modal-open');
    window.print();
  };

  // Helper to trigger browser download
  const triggerDownload = (dataUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compute pages dynamically so no rows or text are ever cut off
  const reportPages = useMemo(() => {
    return buildReportPages(calculation);
  }, [calculation]);

  // Capture a specific A4 page element with standardized desktop dimensions
  const capturePageCanvas = async (pageNumber: number): Promise<HTMLCanvasElement> => {
    const pageEl = document.getElementById(`printable-report-page-${pageNumber}`);
    if (!pageEl) {
      throw new Error(`Elemen dokumen halaman ${pageNumber} tidak ditemukan`);
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
        const clonedScroll = clonedDoc.getElementById('print-report-scroll-area');
        if (clonedScroll) {
          clonedScroll.style.overflow = 'visible';
          clonedScroll.style.maxHeight = 'none';
          clonedScroll.style.height = 'auto';
        }
        const clonedDialog = clonedDoc.getElementById('print-report-modal-dialog');
        if (clonedDialog) {
          clonedDialog.style.overflow = 'visible';
          clonedDialog.style.maxHeight = 'none';
          clonedDialog.style.height = 'auto';
        }
        const clonedPage = clonedDoc.getElementById(`printable-report-page-${pageNumber}`);
        if (clonedPage) {
          clonedPage.style.width = '794px';
          clonedPage.style.maxWidth = '794px';
          clonedPage.style.minWidth = '794px';
          clonedPage.style.margin = '0 auto';
          clonedPage.style.borderRadius = '0';
          clonedPage.style.boxShadow = 'none';
          clonedPage.style.border = 'none';
          clonedPage.style.padding = '32px 36px';
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

  // Export as multi-page A4 PDF without any data truncation between pages
  const handleDownloadPdfA4 = async () => {
    setIsExportingPdf(true);
    setExportNotice('Menyiapkan file PDF format A4 (bebas terpotong)...');
    try {
      const scrollArea = document.getElementById('print-report-scroll-area');
      const prevScrollTop = scrollArea ? scrollArea.scrollTop : 0;
      if (scrollArea) scrollArea.scrollTop = 0;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      for (let i = 0; i < reportPages.length; i++) {
        const pageNum = reportPages[i].pageNumber;
        const canvas = await capturePageCanvas(pageNum);

        if (i > 0) {
          pdf.addPage();
        }

        // Standard A4: 210 x 297 mm
        // 794px x 1123px at 96 DPI has the exact 210/297 aspect ratio
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }

      if (scrollArea) scrollArea.scrollTop = prevScrollTop;

      const safeNumber = calculation.calculationNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
      const safeProduct = calculation.productName.replace(/[^a-zA-Z0-9-_]/g, '_');
      const fileName = `Laporan_BOM_${safeNumber}_${safeProduct}.pdf`;
      pdf.save(fileName);
      setExportNotice(`Berhasil mengunduh PDF A4 (${reportPages.length} Halaman): ${fileName}`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error('Gagal generate PDF A4:', err);
      setExportNotice('Gagal membuat PDF. Coba kembali beberapa saat.');
      setTimeout(() => setExportNotice(null), 4000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export as high-resolution JPG (Identical to PDF layout and formatting)
  const handleDownloadJpg = async (mode: 'a4_pages' | 'full' = 'a4_pages') => {
    setIsExportingJpg(true);
    setShowJpgMenu(false);
    setExportNotice('Menyiapkan file JPG kualitas tinggi (sama persis dengan PDF)...');
    try {
      const scrollArea = document.getElementById('print-report-scroll-area');
      const prevScrollTop = scrollArea ? scrollArea.scrollTop : 0;
      if (scrollArea) scrollArea.scrollTop = 0;

      const canvases: HTMLCanvasElement[] = [];

      for (let i = 0; i < reportPages.length; i++) {
        const pageNum = reportPages[i].pageNumber;
        const canvas = await capturePageCanvas(pageNum);
        canvases.push(canvas);
      }

      if (scrollArea) scrollArea.scrollTop = prevScrollTop;

      const safeNumber = calculation.calculationNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
      const safeProduct = calculation.productName.replace(/[^a-zA-Z0-9-_]/g, '_');

      if (mode === 'full' && canvases.length > 1) {
        // Stack all pages into one continuous high-res JPG
        const totalHeight = canvases.reduce((acc, c) => acc + c.height, 0);
        const fullCanvas = document.createElement('canvas');
        fullCanvas.width = canvases[0].width;
        fullCanvas.height = totalHeight;
        const ctx = fullCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, fullCanvas.width, fullCanvas.height);
          let currentY = 0;
          canvases.forEach((c) => {
            ctx.drawImage(c, 0, currentY);
            currentY += c.height;
          });
        }
        const dataUrl = fullCanvas.toDataURL('image/jpeg', 0.95);
        triggerDownload(dataUrl, `Laporan_BOM_${safeNumber}_${safeProduct}_FULL.jpg`);
        setExportNotice(`Berhasil mengunduh JPG Full: Laporan_BOM_${safeNumber}_FULL.jpg`);
      } else {
        // Download each A4 page matching PDF 1:1
        canvases.forEach((c, idx) => {
          const dataUrl = c.toDataURL('image/jpeg', 0.95);
          const fileName =
            canvases.length === 1
              ? `Laporan_BOM_${safeNumber}_${safeProduct}.jpg`
              : `Laporan_BOM_${safeNumber}_${safeProduct}_Hal_${idx + 1}.jpg`;
          setTimeout(() => {
            triggerDownload(dataUrl, fileName);
          }, idx * 400);
        });
        setExportNotice(
          canvases.length === 1
            ? `Berhasil mengunduh JPG format A4`
            : `Berhasil mengunduh ${canvases.length} lembar JPG format A4 (sama persis dengan PDF)!`
        );
      }
      setTimeout(() => setExportNotice(null), 4500);
    } catch (err) {
      console.error('Gagal generate JPG:', err);
      setExportNotice('Gagal mengunduh gambar JPG.');
      setTimeout(() => setExportNotice(null), 4000);
    } finally {
      setIsExportingJpg(false);
    }
  };

  // Export as high-resolution PNG
  const handleDownloadPng = async () => {
    setIsExportingPng(true);
    setExportNotice('Menyiapkan gambar PNG dokumen...');
    try {
      for (let i = 0; i < reportPages.length; i++) {
        const pageNum = reportPages[i].pageNumber;
        const canvas = await capturePageCanvas(pageNum);
        const dataUrl = canvas.toDataURL('image/png');
        const safeNumber = calculation.calculationNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
        const safeProduct = calculation.productName.replace(/[^a-zA-Z0-9-_]/g, '_');
        const fileName =
          reportPages.length === 1
            ? `Laporan_BOM_${safeNumber}_${safeProduct}.png`
            : `Laporan_BOM_${safeNumber}_${safeProduct}_Hal_${i + 1}.png`;

        setTimeout(() => {
          triggerDownload(dataUrl, fileName);
        }, i * 400);
      }
      setExportNotice(`Berhasil mengunduh berkas PNG`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error('Gagal generate PNG:', err);
      setExportNotice('Gagal mengunduh gambar PNG.');
      setTimeout(() => setExportNotice(null), 4000);
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleDownloadCsv = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `LAPORAN KEBUTUHAN KONSUMSI BAHAN BAKU\n`;
    csvContent += `Nama Perusahaan,${modalCompanyName || 'CV. RAVINA'}\n`;
    csvContent += `Divisi,DIVISI KOPELRIEM\n`;
    csvContent += `Judul Perhitungan,${calculation.title || calculation.productName}\n`;
    csvContent += `No Dokumen,${calculation.calculationNumber}\n`;
    csvContent += `Nama Produk,${calculation.productName}\n`;
    csvContent += `Nama Buyer / Pemesan,${modalBuyerName || calculation.buyerName || '-'}\n`;
    csvContent += `Jumlah Pesanan,${calculation.orderQuantity} Pcs\n`;
    csvContent += `Ref PO / SPK,${calculation.customerOrPoRef || '-'}\n`;
    csvContent += `Tanggal,${calculation.calculationDate}\n\n`;

    csvContent += `RINGKASAN PEMAKAIAN BAHAN BAKU\n`;
    csvContent += `Nama Bahan Baku,Spesifikasi,Satuan,Kebutuhan Desimal,Kebutuhan Dibulatkan\n`;
    calculation.summary.forEach((s) => {
      csvContent += `"${s.rawMaterialName}","${s.specification}","${s.unit}",${s.totalRequired},${s.roundedRequired}\n`;
    });

    csvContent += `\nDETAIL ACCESSORIES & YIELD PEMAKAIAN\n`;
    csvContent += `Nama Accessories,Kebutuhan/Pcs,Total Accessories (Buah),Bahan Baku,Yield (Buah/Lembar),Kebutuhan Bahan Baku\n`;
    calculation.details.forEach((d) => {
      csvContent += `"${d.accessoryName}",${d.qtyPerProduct},${d.totalAccessoryNeeded},"${d.rawMaterialName}",${d.yieldPerUnit},${d.rawMaterialWithAllowance} ${d.rawMaterialUnit}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Konsumsi_Bahan_${calculation.calculationNumber}_${calculation.productName}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      id="print-report-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:static print:inset-auto print:z-auto print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:w-full"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleReturnHome();
        }
      }}
    >
      <div
        id="print-report-modal-dialog"
        className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl my-2 sm:my-4 border border-slate-200 flex flex-col max-h-[96vh] overflow-hidden print:static print:max-w-none print:w-full print:rounded-none print:shadow-none print:border-none print:m-0 print:p-0 print:overflow-visible print:max-h-none print:block"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Top Toolbar */}
        <div className="print:hidden shrink-0 border-b border-slate-200 bg-slate-900 text-white px-4 sm:px-6 py-3 rounded-t-2xl shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: Return to Home button */}
            <div className="flex items-center gap-2">
              <button
                id="btn-return-home-top"
                onClick={handleReturnHome}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-bold text-white transition shadow-sm"
                title="Kembali ke Beranda / Kalkulator Konsumsi Bahan"
              >
                <ArrowLeft className="w-4 h-4" />
                <Home className="w-3.5 h-3.5" />
                <span>Kembali ke Home</span>
              </button>

              <div className="hidden md:flex items-center gap-2 ml-2 pl-3 border-l border-slate-700">
                <Factory className="w-4 h-4 text-blue-400" />
                <div className="text-xs">
                  <div className="font-bold text-slate-100">{calculation.calculationNumber}</div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                    {calculation.productName} ({calculation.orderQuantity.toLocaleString('id-ID')} Pcs)
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Download Actions & Close */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* Ganti Logo Button */}
              <label
                id="btn-change-report-logo"
                htmlFor="input-change-report-logo-toolbar"
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 border border-slate-700 transition shadow-xs cursor-pointer"
                title="Ganti logo pada dokumen laporan ini"
              >
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Ganti Logo</span>
                <input
                  id="input-change-report-logo-toolbar"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>

              {modalCompanyLogo && (
                <button
                  type="button"
                  id="btn-reset-report-logo"
                  onClick={handleResetLogo}
                  className="rounded-xl bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 px-2.5 py-2 text-xs font-medium text-slate-300 border border-slate-700 transition"
                  title="Kembalikan ke inisial standar"
                >
                  Reset Logo
                </button>
              )}

              {/* Download PDF (A4) */}
              <button
                id="btn-download-pdf-a4"
                onClick={handleDownloadPdfA4}
                disabled={isExportingPdf}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3 py-2 text-xs font-bold text-white transition shadow-xs disabled:opacity-50"
                title="Unduh langsung berkas PDF format A4 (bebas terpotong & rapi per halaman)"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
                <span>Download PDF (A4)</span>
              </button>

              {/* Download JPG with Dropdown Options */}
              <div className="relative">
                <div className="inline-flex rounded-xl shadow-xs">
                  <button
                    id="btn-download-jpg-a4"
                    onClick={() => handleDownloadJpg('a4_pages')}
                    disabled={isExportingJpg}
                    className="inline-flex items-center gap-1.5 rounded-l-xl bg-amber-600 hover:bg-amber-500 px-3 py-2 text-xs font-bold text-white transition disabled:opacity-50"
                    title="Unduh gambar JPG format A4 (sama persis dengan PDF)"
                  >
                    {isExportingJpg ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5" />
                    )}
                    <span>Download JPG</span>
                  </button>
                  <button
                    id="btn-toggle-jpg-options"
                    onClick={() => setShowJpgMenu(!showJpgMenu)}
                    disabled={isExportingJpg}
                    className="inline-flex items-center rounded-r-xl bg-amber-700 hover:bg-amber-600 px-1.5 py-2 text-xs font-bold text-white border-l border-amber-500/40 transition disabled:opacity-50"
                    title="Pilihan Format JPG"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {showJpgMenu && (
                  <div
                    className="absolute right-0 mt-1.5 w-64 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 z-50 text-left text-xs text-slate-200 animate-in fade-in"
                    onClick={() => setShowJpgMenu(false)}
                  >
                    <button
                      onClick={() => handleDownloadJpg('a4_pages')}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-800 transition flex flex-col"
                    >
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                        JPG Format A4 (Sesuai PDF)
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Diunduh per lembar A4, sama persis dan konsisten dengan tampilan PDF
                      </span>
                    </button>
                    <button
                      onClick={() => handleDownloadJpg('full')}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-800 transition flex flex-col mt-1 border-t border-slate-800 pt-2"
                    >
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                        JPG 1 Gambar Utuh (Full BOM)
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Seluruh laporan dalam 1 berkas gambar memanjang tanpa terpotong
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Download PNG */}
              <button
                id="btn-download-png"
                onClick={handleDownloadPng}
                disabled={isExportingPng}
                className="hidden md:inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-2.5 py-2 text-xs font-semibold text-slate-200 border border-slate-700 transition shadow-xs disabled:opacity-50"
                title="Unduh berkas gambar PNG resolusi tinggi"
              >
                {isExportingPng ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                )}
                <span>PNG</span>
              </button>

              {/* Download CSV */}
              <button
                id="btn-download-csv-top"
                onClick={handleDownloadCsv}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-2.5 py-2 text-xs font-semibold text-slate-200 border border-slate-700 transition shadow-xs"
                title="Unduh data Excel / CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>CSV</span>
              </button>

              {/* Print Dialog */}
              <button
                id="btn-print-dialog"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 border border-slate-700 transition shadow-xs"
                title="Cetak via Printer Fisik"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cetak</span>
              </button>

              {/* Close (X) */}
              <button
                id="btn-close-modal"
                onClick={handleReturnHome}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                title="Tutup & Kembali ke Beranda (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Export notification banner */}
          {exportNotice && (
            <div className="mt-2 text-[11px] bg-blue-800/80 border border-blue-600 text-white px-3 py-1.5 rounded-lg flex items-center justify-between animate-in fade-in">
              <span>{exportNotice}</span>
              <button
                onClick={() => setExportNotice(null)}
                className="text-blue-200 hover:text-white text-xs font-bold"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Document Body (Renders distinct A4 sheets) */}
        <div
          id="print-report-scroll-area"
          className="flex-1 overflow-y-auto bg-slate-200/70 p-3 sm:p-6 lg:p-8 flex flex-col items-center print:overflow-visible print:p-0 print:m-0 print:bg-white print:block print:w-full"
        >
          {reportPages.map((page) => (
            <div
              key={page.pageNumber}
              id={`printable-report-page-${page.pageNumber}`}
              className="a4-page-sheet w-full max-w-[820px] bg-white rounded-xl shadow-lg border border-slate-300/80 p-8 sm:p-10 text-slate-900 min-h-[1050px] relative flex flex-col justify-between mb-8 print:mb-0 print:min-h-0 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full print:rounded-none"
              style={{ boxSizing: 'border-box' }}
            >
              <div>
                {/* 1. Header (Full Letterhead on Page 1, Continuation Header on Page 2+) */}
                {page.isFirstPage ? (
                  <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
                    <div className="flex items-center gap-3.5">
                      <div className="shrink-0">
                        {modalCompanyLogo ? (
                          <img
                            src={modalCompanyLogo}
                            alt="Logo Perusahaan"
                            className="h-14 w-auto max-h-16 max-w-[130px] object-contain rounded-lg border border-slate-200 p-0.5"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-900 text-white font-black text-xl">
                            {companyInitials}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-base sm:text-lg font-black tracking-wide text-blue-950 uppercase">
                          {modalCompanyName || 'CV. RAVINA'}
                        </div>
                        <h1 className="text-xs sm:text-sm font-bold tracking-tight text-slate-700 uppercase">
                          DIVISI KOPELRIEM
                        </h1>
                        <p className="text-[11px] text-slate-500">
                          Sistem Informasi Kebutuhan Konsumsi Bahan Baku (Bill of Materials)
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-xs text-slate-600 shrink-0">
                      <div className="inline-block rounded-md bg-slate-100 px-2.5 py-1 font-mono font-bold text-slate-800 border border-slate-200">
                        {calculation.calculationNumber}
                      </div>
                      <div className="mt-1 text-slate-600 font-medium">
                        Tanggal: {calculation.calculationDate}
                      </div>
                      <div className="text-slate-600">
                        Ref PO/SPK: <strong>{calculation.customerOrPoRef || '-'}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Continuation Header on Page 2+ */
                  <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-4">
                    <div className="flex items-center gap-3">
                      {modalCompanyLogo ? (
                        <img
                          src={modalCompanyLogo}
                          alt="Logo Perusahaan"
                          className="h-10 w-auto max-h-12 max-w-[100px] object-contain rounded border border-slate-200 p-0.5"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-900 text-white font-black text-sm">
                          {companyInitials}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-black tracking-wide text-blue-950 uppercase">
                          {modalCompanyName || 'CV. RAVINA'}
                        </div>
                        <div className="text-[11px] font-bold text-slate-700 uppercase">
                          DIVISI KOPELRIEM • LEMBAR {page.pageNumber} DARI {page.totalPages}
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-slate-600">
                      <div className="font-mono font-bold text-slate-800">
                        No: {calculation.calculationNumber}
                      </div>
                      <div className="text-slate-600 font-medium">
                        Produk: <strong>{calculation.productName}</strong> ({calculation.orderQuantity.toLocaleString('id-ID')} Pcs)
                      </div>
                      <div className="text-slate-500">
                        Buyer: {modalBuyerName || calculation.buyerName || '-'}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Section: Judul Perhitungan & Sub-Judul Ringkasan Pesanan (Page 1 Only) */}
                {page.isFirstPage && (
                  <div className="my-5 rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-3">
                    <div className="border-b border-slate-200/80 pb-2.5">
                      <div className="text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                        Judul Perhitungan / Uraian Pekerjaan
                      </div>
                      <div className="mt-0.5 text-base sm:text-lg font-black text-slate-900">
                        {calculation.title || calculation.productName}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <div className="text-slate-500 uppercase font-semibold text-[10px]">
                          Nama Produk Jadi
                        </div>
                        <div className="mt-1 text-sm sm:text-base font-bold text-slate-900">
                          {calculation.productName}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 uppercase font-semibold text-[10px]">
                          Nama Buyer / Pemesan
                        </div>
                        <div className="mt-1 text-sm sm:text-base font-bold text-blue-950">
                          {modalBuyerName || calculation.buyerName || '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 uppercase font-semibold text-[10px]">
                          Jumlah Pesanan (Qty)
                        </div>
                        <div className="mt-1 text-sm sm:text-base font-bold text-blue-900">
                          {calculation.orderQuantity.toLocaleString('id-ID')} Pcs
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 uppercase font-semibold text-[10px]">
                          Status Dokumen
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 font-bold text-emerald-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Kalkulasi Siap Produksi</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Section 1: Ringkasan Pemakaian Bahan Baku (Page 1 Only) */}
                {page.isFirstPage && (
                  <div className="mb-6">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 pb-2 border-b border-slate-300 flex items-center justify-between">
                      <span>1. Rekapitulasi Pemakaian Bahan Baku (Ringkasan Pengambilan Gudang)</span>
                    </h3>
                    <table className="w-full mt-3 text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-300 bg-slate-100">
                          <th className="py-2.5 px-3 font-bold text-slate-800 w-[6%]">No</th>
                          <th className="py-2.5 px-3 font-bold text-slate-800 w-[42%]">
                            Jenis & Spesifikasi Bahan Baku
                          </th>
                          <th className="py-2.5 px-3 font-bold text-slate-800 text-right w-[20%]">
                            Kebutuhan Riil (Desimal)
                          </th>
                          <th className="py-2.5 px-3 font-bold text-slate-800 text-right bg-blue-50/60 w-[20%]">
                            Ambil Gudang (Dibulatkan)
                          </th>
                          <th className="py-2.5 px-3 font-bold text-slate-800 w-[12%]">Satuan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {calculation.summary.map((sum, index) => (
                          <tr key={sum.rawMaterialId} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3 text-slate-500 font-mono">{index + 1}</td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{sum.rawMaterialName}</div>
                              {sum.specification && (
                                <div className="text-[11px] text-slate-600 mt-0.5 font-normal">
                                  {sum.specification}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 text-sm">
                              {sum.totalRequired.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-blue-950 text-base bg-blue-50/40">
                              {sum.roundedRequired}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-700">{sum.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 4. Section 2: Detail Rumus Pemakaian & Accessories for this Page */}
                <div className="mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 pb-2 border-b border-slate-300">
                    {page.isFirstPage
                      ? '2. Rincian Kebutuhan Accessories & Rumus Yield Pemakaian'
                      : `2. Rincian Kebutuhan Accessories & Rumus Yield Pemakaian (Lanjutan Lembar ${page.pageNumber})`}
                  </h3>
                  <table className="w-full mt-3 text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-300 bg-slate-100">
                        <th className="py-2 px-2.5 font-bold text-slate-800 w-[5%]">No</th>
                        <th className="py-2 px-2.5 font-bold text-slate-800 w-[24%]">Accessories</th>
                        <th className="py-2 px-2.5 font-bold text-slate-800 text-center w-[11%]">Isi/Pcs</th>
                        <th className="py-2 px-2.5 font-bold text-slate-800 text-right w-[13%]">Total Buah</th>
                        <th className="py-2 px-2.5 font-bold text-slate-800 w-[20%]">Bahan Baku Asal</th>
                        <th className="py-2 px-2.5 font-bold text-slate-800 text-right w-[13%]">
                          Yield (Hasil/Lembar)
                        </th>
                        <th className="py-2 px-2.5 font-bold text-slate-800 text-right w-[14%]">
                          Kebutuhan Bahan
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {page.details.map((d, idx) => {
                        const itemNumber = page.detailStartIndex + idx + 1;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-2 px-2.5 text-slate-500 font-mono">{itemNumber}</td>
                            <td className="py-2 px-2.5 font-semibold text-slate-900 break-words">
                              {d.accessoryName}
                            </td>
                            <td className="py-2 px-2.5 text-center font-mono text-slate-700">
                              {d.qtyPerProduct} buah
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-800">
                              {d.totalAccessoryNeeded.toLocaleString('id-ID')}
                            </td>
                            <td className="py-2 px-2.5 text-slate-700 text-[11px] break-words">
                              {d.rawMaterialName}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono text-slate-700">
                              {d.yieldPerUnit} buah
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">
                              {d.rawMaterialWithAllowance.toFixed(2)} {d.rawMaterialUnit}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 5. Continuation message if report continues to next page */}
                {!page.isLastPage && (
                  <div className="my-4 py-2 px-3 bg-blue-50 border border-blue-200 rounded-lg text-center text-xs text-blue-800 font-semibold flex items-center justify-center gap-1.5 print:hidden">
                    <span>▼ Rincian kebutuhan accessories berlanjut ke Halaman {page.pageNumber + 1}</span>
                  </div>
                )}

                {/* 6. Catatan Khusus Produksi (Last Page Only) */}
                {page.showNotes && calculation.notes && (
                  <div className="mb-6 rounded-lg bg-amber-50/70 p-3 text-xs text-amber-900 border border-amber-200/60">
                    <span className="font-bold">Catatan Khusus Produksi:</span> {calculation.notes}
                  </div>
                )}

                {/* 7. Section Tanda Tangan (Last Page Only) */}
                {page.showSignatures && (
                  <div className="mt-8 pt-5 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-xs">
                    <div>
                      <div className="text-slate-500">Dibuat Oleh (PPIC):</div>
                      <div className="h-16"></div>
                      <div className="font-bold text-slate-900 border-t border-dashed border-slate-400 pt-1 inline-block min-w-[140px]">
                        ( Staff Perencanaan )
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Diperiksa (Kepala Produksi):</div>
                      <div className="h-16"></div>
                      <div className="font-bold text-slate-900 border-t border-dashed border-slate-400 pt-1 inline-block min-w-[140px]">
                        ( Ka. Bagian Cutting/Press )
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Diserahkan Ke (Gudang Bahan):</div>
                      <div className="h-16"></div>
                      <div className="font-bold text-slate-900 border-t border-dashed border-slate-400 pt-1 inline-block min-w-[140px]">
                        ( Petugas Logistik/Gudang )
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Page Footer (Always at bottom of each A4 page) */}
              <div className="mt-8 pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                <span>
                  Dicetak secara otomatis dari Sistem GarmentPro • {new Date().toLocaleString('id-ID')}
                </span>
                <span className="font-bold text-slate-600">
                  Halaman {page.pageNumber} dari {page.totalPages}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Sticky Bottom Bar with explicit "Kembali ke Home" and Quick Downloads */}
        <div className="print:hidden shrink-0 border-t border-slate-200 bg-white px-4 sm:px-6 py-3 rounded-b-2xl shadow-sm flex flex-wrap items-center justify-between gap-3">
          <button
            id="btn-return-home-bottom"
            onClick={handleReturnHome}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-xs font-bold text-white transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <Home className="w-3.5 h-3.5" />
            <span>Kembali ke Beranda (Home)</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-download-pdf-a4-bottom"
              onClick={handleDownloadPdfA4}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-2.5 text-xs font-bold text-white transition shadow-xs disabled:opacity-50"
              title="Unduh berkas PDF format A4 multi-halaman rapi"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              <span>Download PDF (A4)</span>
            </button>

            <button
              id="btn-download-jpg-a4-bottom"
              onClick={() => handleDownloadJpg('a4_pages')}
              disabled={isExportingJpg}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 px-3.5 py-2.5 text-xs font-bold text-white transition shadow-xs disabled:opacity-50"
              title="Unduh gambar JPG per lembar A4 sama persis dengan PDF"
            >
              {isExportingJpg ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5" />
              )}
              <span>Download JPG (A4 Sesuai PDF)</span>
            </button>

            <button
              id="btn-download-jpg-full-bottom"
              onClick={() => handleDownloadJpg('full')}
              disabled={isExportingJpg}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2.5 text-xs font-bold text-slate-200 border border-slate-700 transition shadow-xs disabled:opacity-50"
              title="Unduh 1 file gambar utuh memanjang tanpa terpotong"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>JPG Full Utuh</span>
            </button>

            <button
              id="btn-download-png-bottom"
              onClick={handleDownloadPng}
              disabled={isExportingPng}
              className="hidden md:inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2.5 text-xs font-bold text-slate-200 border border-slate-700 transition shadow-xs disabled:opacity-50"
            >
              {isExportingPng ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
              )}
              <span>PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
