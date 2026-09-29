import React, { useState, useEffect } from 'react';
import { CalculationRecord } from '../types';
import {
  Printer,
  Download,
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
  Building2,
  User,
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

  // Editable / customizable header fields directly in report
  const [modalCompanyLogo, setModalCompanyLogo] = useState<string>(calculation.companyLogo || '');
  const [modalCompanyName, setModalCompanyName] = useState<string>(
    calculation.companyName || 'PT. GARMENT PRESISI NUSANTARA'
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

  // Helper to calculate distance from top of report container to any nested element
  const getOffsetRelativeToReport = (el: HTMLElement, reportRoot: HTMLElement): number => {
    let offset = 0;
    let curr: HTMLElement | null = el;
    while (curr && curr !== reportRoot) {
      offset += curr.offsetTop;
      curr = curr.offsetParent as HTMLElement | null;
    }
    return offset;
  };

  // High-precision report canvas capture with standardized desktop A4 dimensions
  const captureReportCanvas = async () => {
    const element = document.getElementById('printable-report');
    if (!element) {
      throw new Error('Element dokumen laporan tidak ditemukan');
    }

    const scrollArea = document.getElementById('print-report-scroll-area');
    const prevScrollTop = scrollArea ? scrollArea.scrollTop : 0;
    if (scrollArea) {
      scrollArea.scrollTop = 0;
    }

    try {
      // Collect natural break positions from DOM (between table rows, sections, notes, signatures)
      const breakNodes = element.querySelectorAll<HTMLElement>(
        '.report-row, .report-section, .print-avoid-break'
      );
      const relativeBreakOffsets: number[] = [];
      breakNodes.forEach((node) => {
        const topOffset = getOffsetRelativeToReport(node, element);
        if (topOffset > 0 && !relativeBreakOffsets.includes(topOffset)) {
          relativeBreakOffsets.push(topOffset);
        }
      });
      relativeBreakOffsets.sort((a, b) => a - b);

      // Render canvas at scale 2 for razor-sharp vector-like text & borders
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          // Reset all parent containers so content is completely visible and never clipped
          const clonedScroll = clonedDoc.getElementById('print-report-scroll-area');
          if (clonedScroll) {
            clonedScroll.style.overflow = 'visible';
            clonedScroll.style.maxHeight = 'none';
            clonedScroll.style.height = 'auto';
            clonedScroll.style.padding = '0';
            clonedScroll.style.background = '#ffffff';
          }

          const clonedDialog = clonedDoc.getElementById('print-report-modal-dialog');
          if (clonedDialog) {
            clonedDialog.style.overflow = 'visible';
            clonedDialog.style.maxHeight = 'none';
            clonedDialog.style.height = 'auto';
            clonedDialog.style.border = 'none';
            clonedDialog.style.boxShadow = 'none';
          }

          const clonedBackdrop = clonedDoc.getElementById('print-report-modal-backdrop');
          if (clonedBackdrop) {
            clonedBackdrop.style.overflow = 'visible';
            clonedBackdrop.style.position = 'static';
          }

          // Lock report paper to exact standard A4 width in 96 DPI (794px)
          const clonedReport = clonedDoc.getElementById('printable-report');
          if (clonedReport) {
            clonedReport.style.width = '794px';
            clonedReport.style.maxWidth = '794px';
            clonedReport.style.minWidth = '794px';
            clonedReport.style.margin = '0 auto';
            clonedReport.style.borderRadius = '0';
            clonedReport.style.boxShadow = 'none';
            clonedReport.style.border = 'none';
            clonedReport.style.padding = '36px 40px';
            clonedReport.style.backgroundColor = '#ffffff';
            clonedReport.style.boxSizing = 'border-box';
          }

          // Remove toolbar buttons & interactive items from capture
          const nonPrintable = clonedDoc.querySelectorAll(
            '[data-html2canvas-ignore], .print\\:hidden, #btn-return-home-top, #btn-return-home-bottom'
          );
          nonPrintable.forEach((el) => el.remove());

          // Ensure images are crossOrigin
          const imgs = clonedDoc.querySelectorAll('img');
          imgs.forEach((img) => {
            if (!img.crossOrigin) {
              img.crossOrigin = 'anonymous';
            }
          });
        },
      });

      // Convert DOM break offsets to canvas pixel coordinates
      const canvasScale = canvas.height / element.scrollHeight;
      const canvasBreakPoints = relativeBreakOffsets.map((offset) =>
        Math.round(offset * canvasScale)
      );

      return { canvas, canvasBreakPoints };
    } finally {
      if (scrollArea) {
        scrollArea.scrollTop = prevScrollTop;
      }
    }
  };

  // Helper to slice a sub-canvas for a specific A4 page with pure white background
  const slicePageCanvas = (
    fullCanvas: HTMLCanvasElement,
    startY: number,
    sliceHeight: number
  ): HTMLCanvasElement => {
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = fullCanvas.width;
    pageCanvas.height = sliceHeight;
    const ctx = pageCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        fullCanvas,
        0,
        startY,
        fullCanvas.width,
        sliceHeight,
        0,
        0,
        fullCanvas.width,
        sliceHeight
      );
    }
    return pageCanvas;
  };

  // Helper to compute smart page boundaries avoiding cutting across table rows
  const computePages = (
    canvasHeight: number,
    maxPageCanvasHeight: number,
    canvasBreakPoints: number[]
  ) => {
    const pages: { startY: number; endY: number; height: number }[] = [];
    let currentY = 0;

    while (currentY < canvasHeight) {
      const remainingHeight = canvasHeight - currentY;
      if (remainingHeight <= maxPageCanvasHeight) {
        pages.push({
          startY: currentY,
          endY: canvasHeight,
          height: remainingHeight,
        });
        break;
      }

      const maxCutY = currentY + maxPageCanvasHeight;
      // Do not cut earlier than 60% of the page height unless necessary
      const minCutY = currentY + Math.floor(maxPageCanvasHeight * 0.60);

      let chosenCutY = maxCutY;
      let bestCandidate = -1;

      for (const bp of canvasBreakPoints) {
        if (bp <= maxCutY && bp >= minCutY) {
          if (bp > bestCandidate) {
            bestCandidate = bp;
          }
        }
      }

      if (bestCandidate > 0) {
        chosenCutY = bestCandidate;
      }

      pages.push({
        startY: currentY,
        endY: chosenCutY,
        height: chosenCutY - currentY,
      });

      currentY = chosenCutY;
    }

    return pages;
  };

  // Export as multi-page A4 PDF without truncation or splitting rows
  const handleDownloadPdfA4 = async () => {
    setIsExportingPdf(true);
    setExportNotice('Menyiapkan file PDF ukuran A4 (bebas terpotong)...');
    try {
      const { canvas, canvasBreakPoints } = await captureReportCanvas();

      // Standard A4 dimensions in mm: 210mm x 297mm
      // Margins: 10mm left/right, 12mm top/bottom
      const contentWidthMm = 190;
      const marginX = 10;
      const marginY = 12;
      const pxPerMm = canvas.width / contentWidthMm;
      // Usable height = 297 - 24 = 273mm
      const maxPageCanvasHeight = Math.floor(273 * pxPerMm);

      const pages = computePages(canvas.height, maxPageCanvasHeight, canvasBreakPoints);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      pages.forEach((page, index) => {
        if (index > 0) {
          pdf.addPage();
        }

        const pageCanvas = slicePageCanvas(canvas, page.startY, page.height);
        const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.98);
        const pageHeightMm = (page.height / canvas.width) * contentWidthMm;

        pdf.addImage(pageImgData, 'JPEG', marginX, marginY, contentWidthMm, pageHeightMm);

        // Professional page numbering in footer
        if (pages.length > 1) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(130, 130, 130);
          pdf.text(
            `Halaman ${index + 1} dari ${pages.length}  •  ${calculation.calculationNumber} - ${calculation.productName}`,
            105,
            290,
            { align: 'center' }
          );
        }
      });

      const safeNumber = calculation.calculationNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
      const safeProduct = calculation.productName.replace(/[^a-zA-Z0-9-_]/g, '_');
      const fileName = `Laporan_BOM_${safeNumber}_${safeProduct}.pdf`;

      pdf.save(fileName);
      setExportNotice(
        `Berhasil mengunduh PDF A4 (${pages.length} Halaman): ${fileName}`
      );
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error('Gagal generate PDF A4:', err);
      setExportNotice('Gagal membuat PDF. Anda juga dapat menggunakan tombol Cetak Printer.');
      setTimeout(() => setExportNotice(null), 4000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export as high-resolution JPG (Identical to PDF layout and formatting)
  const handleDownloadJpg = async (mode: 'a4_pages' | 'full' = 'a4_pages') => {
    setIsExportingJpg(true);
    setShowJpgMenu(false);
    setExportNotice('Menyiapkan gambar JPG kualitas tinggi (persis seperti PDF)...');
    try {
      const { canvas, canvasBreakPoints } = await captureReportCanvas();
      const contentWidthMm = 190;
      const pxPerMm = canvas.width / contentWidthMm;
      const maxPageCanvasHeight = Math.floor(273 * pxPerMm);
      const pages = computePages(canvas.height, maxPageCanvasHeight, canvasBreakPoints);

      const safeNumber = calculation.calculationNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
      const safeProduct = calculation.productName.replace(/[^a-zA-Z0-9-_]/g, '_');

      if (mode === 'full' || pages.length === 1) {
        // Single continuous high-resolution JPG image with pure white background
        const fullJpgCanvas = document.createElement('canvas');
        fullJpgCanvas.width = canvas.width;
        fullJpgCanvas.height = canvas.height;
        const ctx = fullJpgCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, fullJpgCanvas.width, fullJpgCanvas.height);
          ctx.drawImage(canvas, 0, 0);
        }
        const dataUrl = fullJpgCanvas.toDataURL('image/jpeg', 0.95);
        const fileName =
          pages.length === 1
            ? `Laporan_BOM_${safeNumber}_${safeProduct}.jpg`
            : `Laporan_BOM_${safeNumber}_${safeProduct}_FULL.jpg`;
        triggerDownload(dataUrl, fileName);
        setExportNotice(`Berhasil mengunduh JPG: ${fileName}`);
      } else {
        // Multi-page: download each A4 page matching PDF pages 1:1!
        pages.forEach((page, index) => {
          const pageCanvas = slicePageCanvas(canvas, page.startY, page.height);
          const dataUrl = pageCanvas.toDataURL('image/jpeg', 0.95);
          const fileName = `Laporan_BOM_${safeNumber}_${safeProduct}_Hal_${index + 1}.jpg`;
          setTimeout(() => {
            triggerDownload(dataUrl, fileName);
          }, index * 400);
        });
        setExportNotice(
          `Berhasil mengunduh ${pages.length} lembar JPG format A4 (sama persis dengan PDF)!`
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
      const { canvas } = await captureReportCanvas();
      const pngCanvas = document.createElement('canvas');
      pngCanvas.width = canvas.width;
      pngCanvas.height = canvas.height;
      const ctx = pngCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pngCanvas.width, pngCanvas.height);
        ctx.drawImage(canvas, 0, 0);
      }
      const dataUrl = pngCanvas.toDataURL('image/png');
      const safeNumber = calculation.calculationNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
      const safeProduct = calculation.productName.replace(/[^a-zA-Z0-9-_]/g, '_');
      const fileName = `Laporan_BOM_${safeNumber}_${safeProduct}.png`;

      triggerDownload(dataUrl, fileName);
      setExportNotice(`Berhasil mengunduh PNG: ${fileName}`);
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
    csvContent += `Nama Perusahaan,${modalCompanyName || 'PT. GARMENT PRESISI NUSANTARA'}\n`;
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

        {/* Scrollable Document Body */}
        <div
          id="print-report-scroll-area"
          className="flex-1 overflow-y-auto bg-slate-200/70 p-3 sm:p-6 lg:p-8 flex justify-center print:overflow-visible print:p-0 print:m-0 print:bg-white print:block print:w-full"
        >
          {/* Printable Document Paper (Simulates A4 Sheet) */}
          <div
            id="printable-report"
            className="w-full max-w-[820px] bg-white rounded-xl shadow-lg border border-slate-300/80 p-8 sm:p-12 text-slate-900 min-h-[1050px] print:min-h-0 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full print:rounded-none"
          >
            {/* Header Surat */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5 report-section print-avoid-break">
              <div className="flex items-center gap-3.5">
                {/* Logo Perusahaan */}
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
                  {/* 1. Nama Perusahaan Diatas DIVISI KOPELRIEM */}
                  <div className="text-base sm:text-lg font-black tracking-wide text-blue-950 uppercase">
                    {modalCompanyName || 'PT. GARMENT PRESISI NUSANTARA'}
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

            {/* Section: Judul Perhitungan & Sub-Judul Ringkasan Pesanan */}
            <div className="my-5 rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-3 report-section print-avoid-break">
              {/* Judul Perhitungan (Requirement 4) */}
              <div className="border-b border-slate-200/80 pb-2.5">
                <div className="text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                  Judul Perhitungan / Uraian Pekerjaan
                </div>
                <div className="mt-0.5 text-base sm:text-lg font-black text-slate-900">
                  {calculation.title || calculation.productName}
                </div>
              </div>

              {/* Sub-Judul: Nama Produk Jadi, Nama Buyer, Qty Pesanan, Status */}
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

            {/* Section 1: Ringkasan Pemakaian Bahan Baku */}
            <div className="mb-6 report-section print-avoid-break">
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
                    <tr key={sum.rawMaterialId} className="hover:bg-slate-50/60 report-row print-avoid-break">
                      <td className="py-3 px-3 text-slate-500 font-mono">{index + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{sum.rawMaterialName}</div>
                        {sum.specification && (
                          <div className="text-[11px] text-slate-600 mt-0.5 font-normal">
                            {sum.specification}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 text-sm">
                        {sum.totalRequired.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-blue-950 text-base bg-blue-50/40">
                        {sum.roundedRequired}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700">{sum.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 2: Detail Rumus Pemakaian & Accessories */}
            <div className="mb-6 report-section">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 pb-2 border-b border-slate-300">
                2. Rincian Kebutuhan Accessories & Rumus Yield Pemakaian
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
                  {calculation.details.map((d, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 report-row print-avoid-break">
                      <td className="py-2.5 px-2.5 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-2.5 font-semibold text-slate-900 break-words">
                        {d.accessoryName}
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-mono text-slate-700">
                        {d.qtyPerProduct} buah
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-800">
                        {d.totalAccessoryNeeded.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-2.5 text-slate-700 text-[11px] break-words">
                        {d.rawMaterialName}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-slate-700">
                        {d.yieldPerUnit} buah
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-900">
                        {d.rawMaterialWithAllowance.toFixed(2)} {d.rawMaterialUnit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Catatan / Keterangan */}
            {calculation.notes && (
              <div className="mb-6 rounded-lg bg-amber-50/70 p-3 text-xs text-amber-900 border border-amber-200/60 report-row print-avoid-break">
                <span className="font-bold">Catatan Khusus Produksi:</span> {calculation.notes}
              </div>
            )}

            {/* Section Tanda Tangan */}
            <div className="mt-10 pt-6 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-xs report-row print-avoid-break">
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

            <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3 report-row print-avoid-break">
              Dicetak secara otomatis dari Sistem GarmentPro • Tanggal cetak:{' '}
              {new Date().toLocaleString('id-ID')}
            </div>
          </div>
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

