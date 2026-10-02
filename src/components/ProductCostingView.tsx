import React, { useState, useEffect, useMemo } from 'react';
import { Product, Accessory, RawMaterial, ProductCostingItem, ProductCostingRecord } from '../types';
import { storageService } from '../services/storageService';
import {
  Coins,
  Package,
  Layers,
  Calculator,
  Plus,
  Trash2,
  Save,
  FileSpreadsheet,
  Printer,
  Download,
  FileText,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  Percent,
  Sparkles,
  ArrowRight,
  Boxes,
  HelpCircle,
  Copy,
  FolderOpen,
  Scissors,
  X,
  RotateCw,
  PlusCircle
} from 'lucide-react';
import jsPDF from 'jspdf';

interface ProductCostingViewProps {
  products: Product[];
  accessories: Accessory[];
  rawMaterials: RawMaterial[];
  initialProductId?: string;
  onNavigateToConsumption?: () => void;
}

export const ProductCostingView: React.FC<ProductCostingViewProps> = ({
  products,
  accessories,
  rawMaterials,
  initialProductId,
  onNavigateToConsumption,
}) => {
  const companyProfile = storageService.getCompanyProfile();

  // Active view: 'calculator' | 'saved'
  const [costingSubTab, setCostingSubTab] = useState<'calculator' | 'saved'>('calculator');

  // Saved Costings
  const [savedCostings, setSavedCostings] = useState<ProductCostingRecord[]>(() =>
    storageService.getProductCostings()
  );

  // Active Costing ID if loaded or previously saved
  const [activeCostingId, setActiveCostingId] = useState<string | null>(null);

  // Modal Pilihan Penyimpanan (Menimpa vs Nama Baru)
  const [isSaveChoiceModalOpen, setIsSaveChoiceModalOpen] = useState<boolean>(false);
  const [newSaveCostingNumber, setNewSaveCostingNumber] = useState<string>('');
  const [newSaveCostingTitle, setNewSaveCostingTitle] = useState<string>('');

  // Form states
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProductId && products.some((p) => p.id === initialProductId)
      ? initialProductId
      : products[0]?.id || ''
  );

  useEffect(() => {
    if (initialProductId && products.some((p) => p.id === initialProductId)) {
      setSelectedProductId(initialProductId);
    }
  }, [initialProductId, products]);
  const [orderQuantity, setOrderQuantity] = useState<number>(1000);
  const [costingNumber, setCostingNumber] = useState<string>(
    `CST-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`
  );
  const [title, setTitle] = useState<string>('Analisis HPP & Biaya Accessories');
  const [buyerName, setBuyerName] = useState<string>(
    companyProfile.defaultBuyerName || 'MABES TNI / KEMHAN RI'
  );
  const [calculationDate, setCalculationDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>(
    'Estimasi biaya komponen accessories berdasarkan harga beli langsung dan yield bahan baku.'
  );

  // Markup & Profit Margin Simulator
  const [targetMarkupPercent, setTargetMarkupPercent] = useState<number>(25);

  // Costing Items currently in table
  const [costingItems, setCostingItems] = useState<ProductCostingItem[]>([]);

  // Modal / Feedback notification
  const [notice, setNotice] = useState<string | null>(null);

  // Helper to compute accessory price from Master Accessories & Raw Materials
  const getAccessoryPriceInfo = (acc: Accessory) => {
    if (acc.category === 'ready_made') {
      const price = acc.purchasePrice || 0;
      return {
        unitPrice: price,
        sourceLabel: 'Beli Jadi (Langsung)',
        detailText: `Rp ${price.toLocaleString('id-ID')} / ${acc.unit}`,
        rawMaterialName: '-',
        rawMaterialUnitPrice: 0,
        yieldPerUnit: 1,
      };
    }

    // raw_material_based
    const mat = rawMaterials.find((m) => m.id === acc.defaultRawMaterialId);
    const matPrice = mat?.unitPrice || 0;
    const yieldVal = acc.defaultYieldPerUnit || 1;
    const price = yieldVal > 0 ? matPrice / yieldVal : 0;

    return {
      unitPrice: price,
      sourceLabel: `Olah ${mat?.name || 'Bahan'}`,
      detailText: `Rp ${matPrice.toLocaleString('id-ID')} ÷ ${yieldVal} yield`,
      rawMaterialName: mat?.name,
      rawMaterialUnitPrice: matPrice,
      yieldPerUnit: yieldVal,
    };
  };

  // Selected product object
  const currentProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || products[0];
  }, [products, selectedProductId]);

  // Load product accessories into costing table when selected product changes
  useEffect(() => {
    if (!currentProduct) return;

    setTitle(`Costing HPP ${currentProduct.name} (Batch ${orderQuantity.toLocaleString('id-ID')} Pcs)`);

    const items: ProductCostingItem[] = currentProduct.accessories.map((rel) => {
      const acc = accessories.find((a) => a.id === rel.accessoryId) || {
        id: rel.accessoryId,
        code: 'ACC-UNK',
        name: 'Accessories',
        unit: 'buah',
        category: 'raw_material_based' as const,
        createdAt: '',
        updatedAt: '',
      };

      const priceInfo = getAccessoryPriceInfo(acc);
      const usageQtyPerProduct = rel.qtyPerProduct;
      const totalUsageQty = usageQtyPerProduct * orderQuantity;
      const totalCostPerProduct = usageQtyPerProduct * priceInfo.unitPrice;
      const totalCostBatch = totalUsageQty * priceInfo.unitPrice;

      return {
        accessoryId: acc.id,
        accessoryName: acc.name,
        accessoryCategory: acc.category,
        rawMaterialName: priceInfo.rawMaterialName,
        rawMaterialUnitPrice: priceInfo.rawMaterialUnitPrice,
        yieldPerUnit: priceInfo.yieldPerUnit,
        unitPrice: priceInfo.unitPrice,
        usageQtyPerProduct,
        totalUsageQty,
        totalCostPerProduct,
        totalCostBatch,
        notes: priceInfo.detailText,
      };
    });

    setCostingItems(items);
  }, [selectedProductId, currentProduct, accessories, rawMaterials]);

  // Recalculate batch costs when orderQuantity or costing items change
  const updatedItems = useMemo(() => {
    return costingItems.map((item) => {
      const totalUsageQty = item.usageQtyPerProduct * orderQuantity;
      const totalCostPerProduct = item.usageQtyPerProduct * item.unitPrice;
      const totalCostBatch = totalUsageQty * item.unitPrice;
      return {
        ...item,
        totalUsageQty,
        totalCostPerProduct,
        totalCostBatch,
      };
    });
  }, [costingItems, orderQuantity]);

  // Financial Summaries
  const totalCostPerUnit = useMemo(() => {
    return updatedItems.reduce((acc, item) => acc + item.totalCostPerProduct, 0);
  }, [updatedItems]);

  const totalBatchCost = useMemo(() => {
    return totalCostPerUnit * orderQuantity;
  }, [totalCostPerUnit, orderQuantity]);

  // Breakdown by category
  const readyMadeCostPerUnit = useMemo(() => {
    return updatedItems
      .filter((i) => i.accessoryCategory === 'ready_made')
      .reduce((acc, item) => acc + item.totalCostPerProduct, 0);
  }, [updatedItems]);

  const rawMaterialBasedCostPerUnit = useMemo(() => {
    return updatedItems
      .filter((i) => i.accessoryCategory === 'raw_material_based')
      .reduce((acc, item) => acc + item.totalCostPerProduct, 0);
  }, [updatedItems]);

  // Profit Margin & Recommended Selling Price calculation
  const recommendedSellingPricePerUnit = useMemo(() => {
    if (targetMarkupPercent <= 0) return totalCostPerUnit;
    return totalCostPerUnit * (1 + targetMarkupPercent / 100);
  }, [totalCostPerUnit, targetMarkupPercent]);

  const estimatedProfitPerUnit = recommendedSellingPricePerUnit - totalCostPerUnit;
  const estimatedTotalProfitBatch = estimatedProfitPerUnit * orderQuantity;

  // Handlers for modifying table rows
  const handleUpdateItemQty = (accessoryId: string, qty: number) => {
    setCostingItems((prev) =>
      prev.map((item) =>
        item.accessoryId === accessoryId
          ? {
              ...item,
              usageQtyPerProduct: Math.max(0, qty),
            }
          : item
      )
    );
  };

  const handleUpdateItemPrice = (accessoryId: string, newPrice: number) => {
    setCostingItems((prev) =>
      prev.map((item) =>
        item.accessoryId === accessoryId
          ? {
              ...item,
              unitPrice: Math.max(0, newPrice),
            }
          : item
      )
    );
  };

  const handleDeleteItem = (accessoryId: string) => {
    setCostingItems((prev) => prev.filter((item) => item.accessoryId !== accessoryId));
  };

  // Add accessory from master dropdown
  const [selectedAccToAdd, setSelectedAccToAdd] = useState<string>('');

  const handleAddAccessory = () => {
    if (!selectedAccToAdd) return;
    const acc = accessories.find((a) => a.id === selectedAccToAdd);
    if (!acc) return;

    if (costingItems.some((i) => i.accessoryId === acc.id)) {
      setNotice(`Aksesoris "${acc.name}" sudah ada di dalam tabel costing.`);
      setTimeout(() => setNotice(null), 3000);
      return;
    }

    const priceInfo = getAccessoryPriceInfo(acc);
    const usageQtyPerProduct = 1;
    const totalUsageQty = usageQtyPerProduct * orderQuantity;
    const totalCostPerProduct = usageQtyPerProduct * priceInfo.unitPrice;
    const totalCostBatch = totalUsageQty * priceInfo.unitPrice;

    const newItem: ProductCostingItem = {
      accessoryId: acc.id,
      accessoryName: acc.name,
      accessoryCategory: acc.category,
      rawMaterialName: priceInfo.rawMaterialName,
      rawMaterialUnitPrice: priceInfo.rawMaterialUnitPrice,
      yieldPerUnit: priceInfo.yieldPerUnit,
      unitPrice: priceInfo.unitPrice,
      usageQtyPerProduct,
      totalUsageQty,
      totalCostPerProduct,
      totalCostBatch,
      notes: priceInfo.detailText,
    };

    setCostingItems((prev) => [...prev, newItem]);
    setSelectedAccToAdd('');
    setNotice(`Aksesoris "${acc.name}" berhasil ditambahkan ke costing!`);
    setTimeout(() => setNotice(null), 3000);
  };

  // Buka modal pilihan penyimpanan (Menimpa data yang ada vs Membuat nama baru)
  const handleOpenSaveCostingModal = () => {
    const currentBase = costingNumber.replace(/-REV\d+|-COPY|-BARU/g, '');
    const suggestedNum = `${currentBase}-REV${Date.now().toString().slice(-3)}`;
    setNewSaveCostingNumber(suggestedNum);
    setNewSaveCostingTitle(title ? `${title} (Baru)` : `Costing ${currentProduct?.name || 'Produk'}`);
    setIsSaveChoiceModalOpen(true);
  };

  // 1. Pilihan Menimpa Data yang Ada
  const handleConfirmOverwriteCosting = () => {
    if (!currentProduct) return;
    setIsSaveChoiceModalOpen(false);

    const existingRec = activeCostingId
      ? savedCostings.find((c) => c.id === activeCostingId)
      : savedCostings.find((c) => c.costingNumber === costingNumber);
    const targetId = existingRec ? existingRec.id : (activeCostingId || `costing-${Date.now()}`);

    const record: ProductCostingRecord = {
      id: targetId,
      costingNumber,
      title: title.trim() || `Costing ${currentProduct.name}`,
      productId: currentProduct.id,
      productName: currentProduct.name,
      productCode: currentProduct.code,
      productCategory: currentProduct.category,
      orderQuantity,
      items: updatedItems,
      totalCostPerUnit,
      totalBatchCost,
      targetMarkupPercent,
      targetSellingPricePerUnit: recommendedSellingPricePerUnit,
      calculationDate,
      notes,
      createdAt: existingRec ? existingRec.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setActiveCostingId(targetId);
    const updated = storageService.saveSingleProductCosting(record);
    setSavedCostings(updated);
    setNotice(`Kalkulasi Costing "${record.costingNumber}" berhasil diperbarui (menimpa data yang ada)!`);
    setTimeout(() => setNotice(null), 4000);
  };

  // 2. Pilihan Membuat Dokumen / Nama Baru
  const handleConfirmSaveAsNewCosting = () => {
    if (!currentProduct) return;
    setIsSaveChoiceModalOpen(false);

    const finalNum = newSaveCostingNumber.trim() || `CST-${new Date().getFullYear()}-${Math.floor(Math.random() * 900) + 100}`;
    const finalTitle = newSaveCostingTitle.trim() || `${title} (Baru)`;
    const newId = `costing-${Date.now()}`;

    setCostingNumber(finalNum);
    setTitle(finalTitle);
    setActiveCostingId(newId);

    const record: ProductCostingRecord = {
      id: newId,
      costingNumber: finalNum,
      title: finalTitle,
      productId: currentProduct.id,
      productName: currentProduct.name,
      productCode: currentProduct.code,
      productCategory: currentProduct.category,
      orderQuantity,
      items: updatedItems,
      totalCostPerUnit,
      totalBatchCost,
      targetMarkupPercent,
      targetSellingPricePerUnit: recommendedSellingPricePerUnit,
      calculationDate,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = storageService.saveSingleProductCosting(record);
    setSavedCostings(updated);
    setNotice(`Dokumen baru Costing "${finalNum}" berhasil dibuat & disimpan!`);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleDeleteSavedCosting = (id: string) => {
    if (confirm('Hapus arsip perhitungan costing ini?')) {
      const updated = storageService.deleteProductCosting(id);
      setSavedCostings(updated);
      if (activeCostingId === id) {
        setActiveCostingId(null);
      }
      setNotice('Arsip costing berhasil dihapus.');
      setTimeout(() => setNotice(null), 3000);
    }
  };

  const handleLoadSavedCosting = (rec: ProductCostingRecord) => {
    setActiveCostingId(rec.id);
    setSelectedProductId(rec.productId);
    setOrderQuantity(rec.orderQuantity);
    setCostingNumber(rec.costingNumber);
    setTitle(rec.title);
    setCalculationDate(rec.calculationDate);
    setNotes(rec.notes || '');
    if (rec.targetMarkupPercent !== undefined) setTargetMarkupPercent(rec.targetMarkupPercent);
    setCostingItems(rec.items);
    setCostingSubTab('calculator');
    setNotice(`Memuat arsip costing: ${rec.costingNumber}`);
    setTimeout(() => setNotice(null), 3000);
  };

  // Export to CSV
  const handleExportCsv = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += `LAPORAN PRODUCT COSTING & HPP ACCESSORIES\n`;
    csv += `Perusahaan,${companyProfile.companyName || 'PT. GARMENT PRESISI NUSANTARA'}\n`;
    csv += `No Dokumen Costing,${costingNumber}\n`;
    csv += `Nama Produk,${currentProduct?.name}\n`;
    csv += `Kode Produk,${currentProduct?.code}\n`;
    csv += `Jumlah Pesanan,${orderQuantity} Pcs\n`;
    csv += `Tanggal,${calculationDate}\n\n`;

    csv += `No,Nama Accessories,Kategori,Sumber / Yield,Harga Satuan (Rp),Pemakaian / Pcs,Total Pemakaian (Pcs),Total Biaya / Pcs (Rp),Total Biaya Batch (Rp)\n`;
    updatedItems.forEach((item, idx) => {
      csv += `${idx + 1},"${item.accessoryName}","${item.accessoryCategory === 'ready_made' ? 'Accessories Jadi' : 'Olah Bahan Baku'}","${item.notes || '-'}",${item.unitPrice.toFixed(2)},${item.usageQtyPerProduct},${item.totalUsageQty},${item.totalCostPerProduct.toFixed(2)},${item.totalCostBatch.toFixed(2)}\n`;
    });

    csv += `\nRINGKASAN BIAYA\n`;
    csv += `Total Cost Accessories / Pcs,Rp ${totalCostPerUnit.toFixed(2)}\n`;
    csv += `Total Biaya Batch (${orderQuantity} Pcs),Rp ${totalBatchCost.toFixed(2)}\n`;
    csv += `Target Markup,${targetMarkupPercent}%\n`;
    csv += `Rekomendasi Harga Jual / Pcs,Rp ${recommendedSellingPricePerUnit.toFixed(2)}\n`;
    csv += `Estimasi Laba Kotor Batch,Rp ${estimatedTotalProfitBatch.toFixed(2)}\n`;

    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.href = encodedUri;
    link.download = `Costing_${costingNumber}_${currentProduct?.name.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF (A4 format)
  const handleExportPdf = () => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const margin = 15;
    let y = 18;

    // Header Letterhead
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(20, 30, 60);
    pdf.text(companyProfile.companyName || 'PT. GARMENT PRESISI NUSANTARA', margin, y);
    y += 5;

    pdf.setFontSize(10);
    pdf.setTextColor(80, 80, 80);
    pdf.text('DIVISI KOPELRIEM • LEMBAR PRODUCT COSTING & HPP ACCESSORIES', margin, y);
    y += 4;
    pdf.setDrawColor(20, 30, 60);
    pdf.setLineWidth(0.6);
    pdf.line(margin, y, 210 - margin, y);
    y += 8;

    // Document Meta
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);
    pdf.text(`No Dokumen : ${costingNumber}`, margin, y);
    pdf.text(`Tanggal : ${calculationDate}`, 130, y);
    y += 5;
    pdf.text(`Produk : ${currentProduct?.name} (${currentProduct?.code})`, margin, y);
    pdf.text(`Jumlah Pesanan : ${orderQuantity.toLocaleString('id-ID')} Pcs`, 130, y);
    y += 5;
    pdf.text(`Buyer / Pemesan : ${buyerName}`, margin, y);
    y += 8;

    // Table Header
    pdf.setFillColor(240, 245, 250);
    pdf.rect(margin, y, 180, 7, 'F');
    pdf.setDrawColor(180, 190, 205);
    pdf.rect(margin, y, 180, 7);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(30, 40, 70);
    pdf.text('No', margin + 2, y + 5);
    pdf.text('Nama Accessories', margin + 10, y + 5);
    pdf.text('Kategori', margin + 65, y + 5);
    pdf.text('Harga Satuan', margin + 98, y + 5);
    pdf.text('Qty/Pcs', margin + 128, y + 5);
    pdf.text('Cost / Pcs', margin + 152, y + 5);
    y += 7;

    // Table Rows
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(30, 30, 30);

    updatedItems.forEach((item, idx) => {
      if (y > 260) {
        pdf.addPage();
        y = 20;
      }

      pdf.setDrawColor(230, 235, 240);
      pdf.line(margin, y + 6, margin + 180, y + 6);

      pdf.text(String(idx + 1), margin + 2, y + 4.5);
      pdf.text(item.accessoryName.slice(0, 30), margin + 10, y + 4.5);
      pdf.text(item.accessoryCategory === 'ready_made' ? 'Beli Jadi' : 'Olah Bahan', margin + 65, y + 4.5);
      pdf.text(`Rp ${item.unitPrice.toLocaleString('id-ID', { maximumFractionDigits: 1 })}`, margin + 98, y + 4.5);
      pdf.text(`${item.usageQtyPerProduct} buah`, margin + 128, y + 4.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Rp ${item.totalCostPerProduct.toLocaleString('id-ID', { maximumFractionDigits: 1 })}`, margin + 152, y + 4.5);
      pdf.setFont('helvetica', 'normal');

      y += 7;
    });

    y += 5;
    if (y > 240) {
      pdf.addPage();
      y = 20;
    }

    // Summary Box
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, y, 180, 28, 'F');
    pdf.setDrawColor(200, 210, 220);
    pdf.rect(margin, y, 180, 28);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(20, 30, 70);
    pdf.text('RINGKASAN BIAYA PRODUKSI (HPP ACCESSORIES):', margin + 4, y + 6);

    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total Biaya Accessories / Pcs Produk:`, margin + 4, y + 13);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Rp ${totalCostPerUnit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / Pcs`, margin + 115, y + 13);

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total Biaya Batch (${orderQuantity.toLocaleString('id-ID')} Pcs):`, margin + 4, y + 19);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 80, 40);
    pdf.text(`Rp ${totalBatchCost.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, margin + 115, y + 19);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);
    pdf.text(`Rekomendasi Harga Jual (Markup ${targetMarkupPercent}%):`, margin + 4, y + 25);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(180, 70, 10);
    pdf.text(`Rp ${recommendedSellingPricePerUnit.toLocaleString('id-ID', { maximumFractionDigits: 0 })} / Pcs`, margin + 115, y + 25);

    y += 35;

    // Signatures
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(80, 80, 80);
    pdf.text('Dibuat Oleh (Cost Estimator):', margin + 10, y);
    pdf.text('Diperiksa (Bag. Keuangan):', margin + 70, y);
    pdf.text('Disetujui (Pimpinan):', margin + 130, y);

    y += 18;
    pdf.setDrawColor(160, 160, 160);
    pdf.line(margin + 5, y, margin + 50, y);
    pdf.line(margin + 65, y, margin + 110, y);
    pdf.line(margin + 125, y, margin + 170, y);

    pdf.text('( Staff Estimasi Biaya )', margin + 12, y + 4);
    pdf.text('( Manager Keuangan )', margin + 73, y + 4);
    pdf.text('( Direktur Operasional )', margin + 134, y + 4);

    const safeNumber = costingNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
    pdf.save(`Product_Costing_${safeNumber}.pdf`);
    setNotice(`Berhasil mengunduh PDF: Product_Costing_${safeNumber}.pdf`);
    setTimeout(() => setNotice(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Modul Product Costing</h2>
              <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[10px] font-black uppercase">
                HPP & Biaya Produk
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Kalkulasi biaya komponen accessories dari Modul Consumption untuk menentukan Harga Pokok Produksi (HPP) & rekomendasi harga jual
            </p>
          </div>
        </div>

        {/* View Switcher: Calculator vs Saved Costings & Back to Consumption */}
        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToConsumption && (
            <button
              onClick={onNavigateToConsumption}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 text-xs font-bold transition shadow-2xs"
              title="Kembali ke Modul Konsumsi Bahan Baku"
            >
              <Scissors className="w-3.5 h-3.5 text-blue-700" />
              <span>Buka Modul Consumption</span>
            </button>
          )}

          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold shrink-0">
            <button
              onClick={() => setCostingSubTab('calculator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                costingSubTab === 'calculator'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-amber-600" />
              <span>Kalkulator Costing</span>
            </button>
            <button
              onClick={() => setCostingSubTab('saved')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                costingSubTab === 'saved'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>Riwayat Costing ({savedCostings.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notification Strip */}
      {notice && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-blue-500 hover:text-blue-700 font-bold">
            ×
          </button>
        </div>
      )}

      {costingSubTab === 'saved' ? (
        /* Saved Costings History View */
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-slate-700" />
              <h3 className="text-xs font-bold text-slate-900 uppercase">Daftar Arsip Perhitungan Costing Produk</h3>
            </div>
            <span className="text-xs text-slate-500">Total: {savedCostings.length} Dokumen</span>
          </div>

          {savedCostings.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <Coins className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">Belum ada arsip costing tersimpan</p>
              <p className="mt-1">Lakukan kalkulasi di tab Kalkulator Costing dan klik tombol "Simpan Costing"</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                    <th className="py-3 px-4 font-bold">No Dokumen</th>
                    <th className="py-3 px-4 font-bold">Nama Produk & Judul</th>
                    <th className="py-3 px-4 font-bold text-center">Batch Qty</th>
                    <th className="py-3 px-4 font-bold text-right">Cost / Pcs</th>
                    <th className="py-3 px-4 font-bold text-right">Total Biaya Batch</th>
                    <th className="py-3 px-4 font-bold">Tanggal</th>
                    <th className="py-3 px-4 font-bold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {savedCostings.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono font-bold text-blue-900">{rec.costingNumber}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{rec.productName}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[220px]">{rec.title}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                        {rec.orderQuantity.toLocaleString('id-ID')} Pcs
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        Rp {rec.totalCostPerUnit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-amber-900">
                        Rp {rec.totalBatchCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{rec.calculationDate}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleLoadSavedCosting(rec)}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 px-2 py-1 text-[11px] font-semibold transition"
                            title="Buka & edit costing ini"
                          >
                            <span>Buka</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSavedCosting(rec.id)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                            title="Hapus arsip costing"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Calculator View */
        <div className="space-y-6">
          {/* Product Selector & Order Information Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-700" />
                <h3 className="text-xs font-bold text-slate-900 uppercase">
                  1. Pilih Produk & Parameter Pesanan (Dari Master Produk Consumption)
                </h3>
              </div>
              <div className="text-xs text-slate-500">
                Data produk otomatis terhubung dengan master bill of materials
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
              {/* Dropdown Produk */}
              <div className="md:col-span-4 space-y-1">
                <label className="block font-semibold text-slate-700">
                  Nama Produk <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 font-bold outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 text-xs"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code}) — {p.accessories?.length || 0} Aksesoris
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400">
                  Kategori: <strong>{currentProduct?.category || '-'}</strong>
                </p>
              </div>

              {/* Order Quantity */}
              <div className="md:col-span-3 space-y-1">
                <label className="block font-semibold text-slate-700">
                  Jumlah Pesanan (Batch Qty) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 font-bold font-mono outline-hidden focus:border-amber-600 text-xs"
                  />
                  <span className="absolute right-3 top-2 text-[11px] text-slate-400 font-medium">Pcs</span>
                </div>
                <div className="flex gap-1.5 pt-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setOrderQuantity(1)}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium"
                  >
                    1 Pcs
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderQuantity(500)}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium"
                  >
                    500 Pcs
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderQuantity(1000)}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium"
                  >
                    1.000 Pcs
                  </button>
                </div>
              </div>

              {/* No Dokumen Costing */}
              <div className="md:col-span-3 space-y-1">
                <label className="block font-semibold text-slate-700">No Dokumen Costing</label>
                <input
                  type="text"
                  value={costingNumber}
                  onChange={(e) => setCostingNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 font-mono outline-hidden focus:border-amber-600 text-xs"
                />
              </div>

              {/* Tanggal */}
              <div className="md:col-span-2 space-y-1">
                <label className="block font-semibold text-slate-700">Tanggal</label>
                <input
                  type="date"
                  value={calculationDate}
                  onChange={(e) => setCalculationDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-amber-600 text-xs"
                />
              </div>

              {/* Judul & Buyer */}
              <div className="md:col-span-7 space-y-1">
                <label className="block font-semibold text-slate-700">Judul / Keterangan Analisis Biaya</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-amber-600 text-xs"
                />
              </div>

              <div className="md:col-span-5 space-y-1">
                <label className="block font-semibold text-slate-700">Nama Buyer / Pemesan</label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-amber-600 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Core Table: Rincian Nama Accessories, Harga, Jumlah Pemakaian, Total Cost */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden space-y-0">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-600" />
                  <span>2. Rincian Pemakaian Accessories & Kalkulasi Total Harga (Cost)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Harga accessories diambil otomatis dari Master Accessories (Beli Jadi atau Harga Bahan Baku ÷ Yield)
                </p>
              </div>

              {/* Tambah Accessories Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedAccToAdd}
                  onChange={(e) => setSelectedAccToAdd(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-hidden focus:border-amber-600 max-w-[200px]"
                >
                  <option value="">+ Pilih Aksesoris Tambahan...</option>
                  {accessories.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.category === 'ready_made' ? 'Beli Jadi' : 'Olah Bahan'})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddAccessory}
                  disabled={!selectedAccToAdd}
                  className="inline-flex items-center gap-1 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 px-3 py-1.5 text-xs font-bold text-white transition shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-700">
                    <th className="py-3 px-3 font-bold w-[4%] text-center">No</th>
                    <th className="py-3 px-3 font-bold w-[22%]">Nama Accessories</th>
                    <th className="py-3 px-3 font-bold w-[14%]">Tipe & Sumber</th>
                    <th className="py-3 px-3 font-bold text-right w-[16%]">
                      Harga Accessories (Rp)
                    </th>
                    <th className="py-3 px-3 font-bold text-center w-[12%]">
                      Jumlah Pemakaian / Pcs
                    </th>
                    <th className="py-3 px-3 font-bold text-right w-[15%]">
                      Total Pemakaian ({orderQuantity} Pcs)
                    </th>
                    <th className="py-3 px-3 font-bold text-right w-[17%] bg-amber-50/60">
                      Total Harga (Cost / Pcs)
                    </th>
                    <th className="py-3 px-2 font-bold text-center w-[4%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {updatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Tidak ada accessories yang ditugaskan pada produk ini. Silakan klik "+ Tambah" diatas.
                      </td>
                    </tr>
                  ) : (
                    updatedItems.map((item, idx) => {
                      const isReady = item.accessoryCategory === 'ready_made';

                      return (
                        <tr key={item.accessoryId} className="hover:bg-slate-50/70">
                          {/* 1. No */}
                          <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>

                          {/* 2. Nama Accessories (Ambil dari Nama Accessories Consumption) */}
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{item.accessoryName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{item.notes || '-'}</div>
                          </td>

                          {/* 3. Tipe Kategori */}
                          <td className="py-3 px-3">
                            {isReady ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-800 border border-emerald-200 font-semibold text-[10px]">
                                <Package className="w-3 h-3 text-emerald-600" />
                                <span>Beli Jadi</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-purple-800 border border-purple-200 font-semibold text-[10px]">
                                <Layers className="w-3 h-3 text-purple-600" />
                                <span>Olah Bahan</span>
                              </span>
                            )}
                          </td>

                          {/* 4. Harga Accessories (Ambil dari Master Accessories) */}
                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center gap-1 justify-end">
                              <span className="text-[11px] text-slate-400">Rp</span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.unitPrice}
                                onChange={(e) => handleUpdateItemPrice(item.accessoryId, parseFloat(e.target.value) || 0)}
                                className="w-24 text-right rounded-lg border border-slate-300 px-2 py-1 font-mono font-bold text-slate-900 text-xs focus:border-amber-600"
                                title="Klik untuk mengubah harga manual khusus kalkulasi ini"
                              />
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {isReady ? 'Harga Langsung' : 'Bahan Baku ÷ Yield'}
                            </div>
                          </td>

                          {/* 5. Jumlah Pemakaian (Per 1 Pcs Produk) */}
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0.1"
                                step="any"
                                value={item.usageQtyPerProduct}
                                onChange={(e) => handleUpdateItemQty(item.accessoryId, parseFloat(e.target.value) || 0)}
                                className="w-16 text-center rounded-lg border border-slate-300 px-1.5 py-1 font-mono font-bold text-slate-900 text-xs focus:border-amber-600"
                              />
                              <span className="text-[11px] text-slate-500">buah</span>
                            </div>
                          </td>

                          {/* 6. Total Pemakaian Batch */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                            <div>{item.totalUsageQty.toLocaleString('id-ID')} buah</div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              {item.usageQtyPerProduct} × {orderQuantity.toLocaleString('id-ID')}
                            </div>
                          </td>

                          {/* 7. Total Harga (Cost) */}
                          <td className="py-3 px-3 text-right bg-amber-50/30">
                            <div className="font-mono font-black text-amber-950 text-sm">
                              Rp {item.totalCostPerProduct.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] text-amber-800 font-mono">
                              Total Batch: Rp {item.totalCostBatch.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-2 text-center">
                            <button
                              onClick={() => handleDeleteItem(item.accessoryId)}
                              className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Hapus baris ini dari kalkulasi costing"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {/* Table Footer with Summary */}
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900">
                    <td colSpan={6} className="py-3 px-4 text-right uppercase text-xs">
                      Total Harga (Cost) Accessories per 1 Pcs Produk:
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-amber-950 text-base bg-amber-100/60">
                      Rp {totalCostPerUnit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Financial KPI Cards & Margin Simulator */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: HPP Accessories per Unit */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total HPP Aksesoris / Pcs Produk
                </span>
                <div className="mt-1 font-mono font-black text-2xl text-slate-900">
                  Rp {totalCostPerUnit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Akumulasi seluruh komponen aksesoris untuk membuat 1 {currentProduct?.unit || 'Pcs'} {currentProduct?.name}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Komponen Beli Jadi:</span>
                <span className="font-mono font-bold text-emerald-700">
                  Rp {readyMadeCostPerUnit.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pt-1 flex items-center justify-between text-xs">
                <span className="text-slate-500">Komponen Olah Bahan:</span>
                <span className="font-mono font-bold text-purple-700">
                  Rp {rawMaterialBasedCostPerUnit.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Card 2: Total Biaya Batch Pesanan */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total Biaya Batch Pesanan ({orderQuantity.toLocaleString('id-ID')} Pcs)
                </span>
                <div className="mt-1 font-mono font-black text-2xl text-blue-950">
                  Rp {totalBatchCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Kebutuhan anggaran pembelian dan pemotongan bahan baku untuk volume pesanan {orderQuantity.toLocaleString('id-ID')} Pcs
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Total Komponen Accessories:</span>
                <span className="font-mono font-bold text-slate-800">
                  {updatedItems.reduce((acc, i) => acc + i.totalUsageQty, 0).toLocaleString('id-ID')} buah
                </span>
              </div>
              <div className="pt-1 flex items-center justify-between text-xs">
                <span className="text-slate-500">Jumlah Jenis Aksesoris:</span>
                <span className="font-mono font-bold text-slate-800">{updatedItems.length} jenis</span>
              </div>
            </div>

            {/* Card 3: Simulator Margin & Harga Jual Rekomendasi */}
            <div className="rounded-2xl border border-amber-300 bg-amber-50/50 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Simulator Margin & Harga Jual
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-amber-900">Markup:</span>
                    <input
                      type="number"
                      min="0"
                      max="200"
                      value={targetMarkupPercent}
                      onChange={(e) => setTargetMarkupPercent(parseFloat(e.target.value) || 0)}
                      className="w-14 rounded-lg border border-amber-400 bg-white px-1.5 py-0.5 text-center font-mono font-bold text-xs text-amber-950 outline-hidden"
                    />
                    <span className="text-xs font-bold text-amber-900">%</span>
                  </div>
                </div>

                <div className="mt-2 font-mono font-black text-2xl text-amber-950">
                  Rp {recommendedSellingPricePerUnit.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                  <span className="text-xs font-normal text-amber-800"> / Pcs</span>
                </div>
                <p className="text-[10px] text-amber-800 mt-0.5">
                  Estimasi harga jual per produk dengan target keuntungan {targetMarkupPercent}% di atas HPP Aksesoris
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-amber-200/80 flex items-center justify-between text-xs">
                <span className="text-amber-900">Estimasi Laba per Pcs:</span>
                <span className="font-mono font-bold text-emerald-700">
                  + Rp {estimatedProfitPerUnit.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="pt-1 flex items-center justify-between text-xs">
                <span className="text-amber-900">Estimasi Total Laba Batch:</span>
                <span className="font-mono font-black text-emerald-800">
                  + Rp {estimatedTotalProfitBatch.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>

          {/* Action Toolbar Bottom */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                id="btn-save-product-costing"
                onClick={handleOpenSaveCostingModal}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-800 hover:bg-blue-900 px-4 py-2.5 text-xs font-bold text-white transition shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Kalkulasi Costing</span>
              </button>

              <button
                onClick={() => setCostingSubTab('saved')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition"
              >
                <FolderOpen className="w-4 h-4 text-slate-600" />
                <span>Lihat Arsip ({savedCostings.length})</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-export-costing-pdf"
                onClick={handleExportPdf}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-2.5 text-xs font-bold text-white transition shadow-xs"
                title="Unduh laporan lembar costing format PDF A4"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Download PDF (A4)</span>
              </button>

              <button
                id="btn-export-costing-csv"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-2.5 text-xs font-semibold text-slate-200 border border-slate-700 transition shadow-xs"
                title="Unduh lembar costing dalam format CSV / Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog Pilihan Penyimpanan: Menimpa Data yang Ada vs Membuat Nama Baru */}
      {isSaveChoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
                  <Coins className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Pilihan Penyimpanan Product Costing
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tentukan apakah ingin menimpa dokumen costing saat ini atau menyimpan sebagai arsip baru
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveChoiceModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Pilihan 1: Menimpa Data yang Ada */}
              <div className="rounded-xl border-2 border-slate-200 hover:border-amber-600 bg-slate-50/70 p-4 transition space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <RotateCw className="w-4 h-4 text-amber-700" />
                    <span>1. Menimpa Data yang Ada (Update)</span>
                  </span>
                  <span className="rounded-md bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">
                    Update Costing
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Memperbarui dokumen costing yang sedang dibuka (<strong className="font-mono text-slate-900">{costingNumber}</strong> - {title}) dengan angka & rincian saat ini.
                </p>
                <button
                  type="button"
                  onClick={handleConfirmOverwriteCosting}
                  className="w-full mt-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 py-2.5 px-3 text-xs font-bold text-white transition shadow-xs"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Timpa Dokumen Ini ({costingNumber})</span>
                </button>
              </div>

              {/* Pilihan 2: Membuat Nama Baru */}
              <div className="rounded-xl border-2 border-slate-200 hover:border-emerald-600 bg-emerald-50/40 p-4 transition space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4 text-emerald-700" />
                    <span>2. Membuat Dokumen / Nama Baru (Save As New)</span>
                  </span>
                  <span className="rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                    Arsip Baru
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Menyimpan sebagai arsip costing terpisah dengan nomor dan nama dokumen baru tanpa mengubah arsip sebelumnya.
                </p>

                <div className="space-y-2.5 pt-1 border-t border-emerald-200/60 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nomor Dokumen Costing Baru <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newSaveCostingNumber}
                      onChange={(e) => setNewSaveCostingNumber(e.target.value)}
                      placeholder="Contoh: CST-2026-891-REV1"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 font-mono outline-hidden focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Judul Costing Baru <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newSaveCostingTitle}
                      onChange={(e) => setNewSaveCostingTitle(e.target.value)}
                      placeholder="Contoh: Costing Kopelriem CN1 (Vendor Alternatif)"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-hidden focus:border-emerald-600"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmSaveAsNewCosting}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 py-2.5 px-3 text-xs font-bold text-white transition shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Simpan Sebagai Costing Baru</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSaveChoiceModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
