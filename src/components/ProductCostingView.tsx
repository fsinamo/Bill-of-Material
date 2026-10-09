import React, { useState, useMemo, useEffect } from 'react';
import {
  Product,
  Accessory,
  RawMaterial,
  ProductCostingItem,
  ProductCostingRecord,
  AccessoryCategory,
  GoogleSheetsConfig,
  CalculationRecord,
} from '../types';
import { storageService } from '../services/storageService';
import { sheetsSyncService } from '../services/sheetsSyncService';
import {
  companyProfile,
  INITIAL_RAW_MATERIALS,
  INITIAL_ACCESSORIES,
} from '../data/defaultData';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { PrintCostingReportModal } from './PrintCostingReportModal';
import {
  Coins,
  Package,
  Layers,
  Calculator,
  Plus,
  Trash2,
  Save,
  FileSpreadsheet,
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
  FolderOpen,
  PlusCircle,
  RotateCw,
  X,
  Scissors,
  Wrench,
  ImageIcon,
  Loader2,
  Building2,
} from 'lucide-react';

/**
 * Helper to dynamically scale down font size when currency value reaches billions (belasan milyar),
 * preventing overflow in cards or boxes.
 */
export const getAdaptiveCurrencyClass = (amount: number, isMain = false): string => {
  const digits = Math.round(Math.abs(amount)).toString().length;
  if (isMain) {
    if (digits >= 13) return 'text-base sm:text-lg lg:text-xl font-black break-words tracking-tight leading-snug';
    if (digits >= 11) return 'text-lg sm:text-xl lg:text-2xl font-black break-words tracking-tight leading-snug';
    if (digits >= 9) return 'text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-snug';
    return 'text-2xl sm:text-3xl font-black tracking-tight';
  }
  if (digits >= 13) return 'text-xs sm:text-sm lg:text-base font-black break-words tracking-tight leading-snug';
  if (digits >= 11) return 'text-sm sm:text-base lg:text-lg font-black break-words tracking-tight leading-snug';
  if (digits >= 9) return 'text-base sm:text-lg lg:text-xl font-black tracking-tight leading-snug';
  return 'text-xl sm:text-2xl font-black tracking-tight';
};

/**
 * Helper to display human-readable magnitude for large Indonesian currency values (Miliar, Juta, Triliun).
 */
export const formatShortIndonesianCurrency = (amount: number): string | null => {
  if (Math.abs(amount) >= 1_000_000_000_000) {
    return `≈ Rp ${(amount / 1_000_000_000_000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Triliun`;
  }
  if (Math.abs(amount) >= 1_000_000_000) {
    return `≈ Rp ${(amount / 1_000_000_000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Miliar`;
  }
  if (Math.abs(amount) >= 1_000_000) {
    return `≈ Rp ${(amount / 1_000_000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Juta`;
  }
  return null;
};

interface ProductCostingViewProps {
  products: Product[];
  accessories: Accessory[];
  rawMaterials: RawMaterial[];
  calculations?: CalculationRecord[];
  initialProductId?: string;
  initialCalculationId?: string;
  onNavigateToConsumption?: () => void;
  sheetsConfig?: GoogleSheetsConfig;
  onCostingsUpdated?: () => void;
}

export const ProductCostingView: React.FC<ProductCostingViewProps> = ({
  products,
  accessories,
  rawMaterials,
  calculations: propCalculations,
  initialProductId,
  initialCalculationId,
  onNavigateToConsumption,
  sheetsConfig: propSheetsConfig,
  onCostingsUpdated,
}) => {
  // Navigation sub-tab inside Product Costing: 'calculator' | 'saved'
  const [costingSubTab, setCostingSubTab] = useState<'calculator' | 'saved'>('calculator');
  const [savedCostings, setSavedCostings] = useState<ProductCostingRecord[]>(() =>
    storageService.getProductCostings()
  );
  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);

  // Effective Google Sheets Configuration (with fallback to storageService)
  const effectiveSheetsConfig = propSheetsConfig?.webAppUrl ? propSheetsConfig : storageService.getSheetsConfig();

  // Sync permanent costings from server, IndexedDB, and Google Sheets on load
  useEffect(() => {
    storageService.syncPermanentCostings().then(async (costings) => {
      if (costings && costings.length > 0) {
        setSavedCostings(costings);
      } else {
        const targetUrl = (effectiveSheetsConfig?.webAppUrl || '').trim();
        if (targetUrl) {
          setIsSyncingSheets(true);
          try {
            const pullRes = await sheetsSyncService.pullAllFromSheets(targetUrl);
            if (pullRes.success && pullRes.data?.costings && pullRes.data.costings.length > 0) {
              storageService.saveProductCostings(pullRes.data.costings);
              setSavedCostings(pullRes.data.costings);
              setNotice(`✓ Berhasil memulihkan ${pullRes.data.costings.length} arsip costing dari Google Sheets.`);
              setTimeout(() => setNotice(null), 4000);
            }
          } catch {
            // ignore
          } finally {
            setIsSyncingSheets(false);
          }
        }
      }
    });
  }, [propSheetsConfig]);

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
  const [companyName, setCompanyName] = useState<string>(
    companyProfile.companyName || 'PT. GARMENT PRESISI NUSANTARA'
  );
  const [costingNumber, setCostingNumber] = useState<string>(
    `CST-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`
  );
  const [title, setTitle] = useState<string>('Analisis HPP Accessories & Jasa');
  const [buyerName, setBuyerName] = useState<string>(
    companyProfile.defaultBuyerName || '-'
  );
  const [calculationDate, setCalculationDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>(
    'Estimasi biaya komponen accessories dan ongkos jasa pengerjaan untuk penentuan HPP.'
  );

  // Format selection modal & export loading states
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);
  const [isPrintCostingModalOpen, setIsPrintCostingModalOpen] = useState(false);
  const [printCostingAutoAction, setPrintCostingAutoAction] = useState<'pdf' | 'jpg' | 'png' | null>(null);
  const [isExportingJpg, setIsExportingJpg] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Markup & Profit Margin Simulator
  const [targetMarkupPercent, setTargetMarkupPercent] = useState<number>(25);

  // Costing Items currently in table (contains both accessories and services)
  const [costingItems, setCostingItems] = useState<ProductCostingItem[]>([]);

  // Modal / Feedback notification
  const [notice, setNotice] = useState<string | null>(null);

  // ID dari dokumen costing yang sedang aktif dimuat (jika ada)
  const [activeCostingId, setActiveCostingId] = useState<string | null>(null);

  // State untuk Modal Pilihan Penyimpanan (Overwrite vs Buat Baru)
  const [isSaveChoiceModalOpen, setIsSaveChoiceModalOpen] = useState(false);
  const [newSaveCostingNumber, setNewSaveCostingNumber] = useState('');
  const [newSaveCostingTitle, setNewSaveCostingTitle] = useState('');

  // State untuk Tambah Jasa Kustom Modal / Form
  const [isCustomServiceModalOpen, setIsCustomServiceModalOpen] = useState(false);
  const [customServiceName, setCustomServiceName] = useState('');
  const [customServicePrice, setCustomServicePrice] = useState<number>(10000);
  const [customServiceQty, setCustomServiceQty] = useState<number>(1);
  const [customServiceUnit, setCustomServiceUnit] = useState('pcs');

  // Integrasi Modul Consumption (BOM):
  // Menghubungkan kalkulasi konsumsi bahan baku dengan modul Product Costing
  const allCalculations = useMemo(() => {
    return propCalculations && propCalculations.length > 0
      ? propCalculations
      : storageService.getCalculations();
  }, [propCalculations]);

  const [selectedCalculationId, setSelectedCalculationId] = useState<string>(
    initialCalculationId || ''
  );

  // Selected product object
  const currentProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || products[0];
  }, [products, selectedProductId]);

  // Perhitungan yang cocok dengan produk aktif
  const matchingCalculations = useMemo(() => {
    return allCalculations.filter(
      (c) =>
        c.productId === selectedProductId ||
        c.productName.trim().toLowerCase() === currentProduct?.name.trim().toLowerCase()
    );
  }, [allCalculations, selectedProductId, currentProduct]);

  // Acuan perhitungan konsumsi aktif (BOM)
  const activeReferencedCalc = useMemo(() => {
    if (selectedCalculationId) {
      const match = allCalculations.find((c) => c.id === selectedCalculationId);
      if (match) return match;
    }
    // Jika ada perhitungan yang cocok untuk produk ini, otomatis pakai yang terbaru
    return matchingCalculations[0] || null;
  }, [allCalculations, selectedCalculationId, matchingCalculations]);

  // Update selectedCalculationId saat produk berubah jika belum dipilih manual
  useEffect(() => {
    if (initialCalculationId) {
      setSelectedCalculationId(initialCalculationId);
    } else if (matchingCalculations.length > 0) {
      setSelectedCalculationId(matchingCalculations[0].id);
    } else {
      setSelectedCalculationId('');
    }
  }, [selectedProductId, matchingCalculations, initialCalculationId]);

  // Helper to compute accessory or service price from Consumption Module (BOM) OR Master Accessories
  const getAccessoryPriceInfo = (acc: Accessory) => {
    // 1. Cek apakah ada rincian hasil perhitungan dari Modul Consumption (BOM)
    const calcDetail = activeReferencedCalc?.details?.find(
      (d) =>
        d.accessoryId === acc.id ||
        d.accessoryName.trim().toLowerCase() === acc.name.trim().toLowerCase()
    );

    if (calcDetail) {
      const mat =
        rawMaterials.find((m) => m.id === calcDetail.rawMaterialId) ||
        rawMaterials.find(
          (m) =>
            m.name.trim().toLowerCase() ===
            calcDetail.rawMaterialName.trim().toLowerCase()
        ) ||
        rawMaterials.find((m) => m.id === acc.defaultRawMaterialId);

      const fallbackMat =
        INITIAL_RAW_MATERIALS.find((m) => m.id === calcDetail.rawMaterialId) ||
        INITIAL_RAW_MATERIALS.find(
          (m) =>
            m.name.trim().toLowerCase() ===
            calcDetail.rawMaterialName.trim().toLowerCase()
        ) ||
        INITIAL_RAW_MATERIALS.find((m) => m.id === acc.defaultRawMaterialId);

      const matPrice = mat?.unitPrice || fallbackMat?.unitPrice || 0;
      const yieldVal = calcDetail.yieldPerUnit || acc.defaultYieldPerUnit || 1;
      const allowance = calcDetail.allowancePercent || 0;
      const basePrice = yieldVal > 0 && matPrice > 0 ? matPrice / yieldVal : 0;
      const priceWithAllowance =
        basePrice > 0
          ? Number((basePrice * (1 + allowance / 100)).toFixed(2))
          : (acc.purchasePrice || 0);

      const materialName = calcDetail.rawMaterialName || mat?.name || fallbackMat?.name || 'Bahan Baku';

      return {
        unitPrice: priceWithAllowance,
        sourceLabel: `BOM: ${materialName}`,
        detailText:
          matPrice > 0
            ? `${materialName}: Rp ${matPrice.toLocaleString('id-ID')} ÷ ${yieldVal} yield${allowance > 0 ? ` (+${allowance}% susut)` : ''} (Modul Konsumsi ${activeReferencedCalc.calculationNumber})`
            : `Hasil BOM ${activeReferencedCalc.calculationNumber} (Yield: ${yieldVal} pcs)`,
        rawMaterialName: materialName,
        rawMaterialUnitPrice: matPrice,
        yieldPerUnit: yieldVal,
        materialUsagePerPcs:
          calcDetail.materialUsagePerPcs ||
          (yieldVal > 0 ? Number((1 / yieldVal).toFixed(6)) : acc.materialUsagePerPcs),
        rawMaterialSize: calcDetail.rawMaterialSize || acc.rawMaterialSize,
        pieceCuttingSize: calcDetail.pieceCuttingSize || acc.pieceCuttingSize,
        divisionFormula: calcDetail.divisionFormula || acc.divisionFormula,
        differentSizeNotes: calcDetail.differentSizeNotes || acc.differentSizeNotes,
        fromConsumption: true,
      };
    }

    // 2. Jika tidak ada di perhitungan konsumsi, gunakan Master Accessories
    if (acc.category === 'ready_made' || acc.category === 'service') {
      const fallbackAcc = INITIAL_ACCESSORIES.find((a) => a.id === acc.id);
      const price = acc.purchasePrice || fallbackAcc?.purchasePrice || 0;
      const isService = acc.category === 'service';
      return {
        unitPrice: price,
        sourceLabel: isService ? 'Tarif Jasa Pengerjaan' : 'Beli Jadi (Langsung)',
        detailText: isService
          ? `Tarif Rp ${price.toLocaleString('id-ID')} / ${acc.unit}`
          : `Rp ${price.toLocaleString('id-ID')} / ${acc.unit}`,
        rawMaterialName: '-',
        rawMaterialUnitPrice: 0,
        yieldPerUnit: 1,
        materialUsagePerPcs: 1,
        fromConsumption: false,
      };
    }

    // 3. raw_material_based dari Master
    const mat = rawMaterials.find((m) => m.id === acc.defaultRawMaterialId);
    const fallbackMat = INITIAL_RAW_MATERIALS.find((m) => m.id === acc.defaultRawMaterialId);
    const matPrice = mat?.unitPrice || fallbackMat?.unitPrice || 0;
    const yieldVal = acc.defaultYieldPerUnit || 1;
    const price = yieldVal > 0 && matPrice > 0 ? Number((matPrice / yieldVal).toFixed(2)) : 0;
    const fallbackAcc = INITIAL_ACCESSORIES.find((a) => a.id === acc.id);

    return {
      unitPrice: price > 0 ? price : (acc.purchasePrice || fallbackAcc?.purchasePrice || 0),
      sourceLabel: `Olah ${mat?.name || fallbackMat?.name || 'Bahan'} (Master)`,
      detailText:
        matPrice > 0
          ? `Rp ${matPrice.toLocaleString('id-ID')} ÷ ${yieldVal} yield`
          : 'Belum diisi harga bahan baku',
      rawMaterialName: mat?.name || fallbackMat?.name || '-',
      rawMaterialUnitPrice: matPrice,
      yieldPerUnit: yieldVal,
      materialUsagePerPcs:
        yieldVal > 0 ? Number((1 / yieldVal).toFixed(6)) : acc.materialUsagePerPcs,
      fromConsumption: false,
    };
  };

  // Helper to build initial default costing items from product accessories and standard services
  const buildDefaultItems = (
    prod: Product,
    orderQty: number,
    calcRef?: CalculationRecord | null
  ): ProductCostingItem[] => {
    const items: ProductCostingItem[] = (prod.accessories || []).map((rel) => {
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
      const totalUsageQty = usageQtyPerProduct * orderQty;
      const totalCostPerProduct = usageQtyPerProduct * priceInfo.unitPrice;
      const totalCostBatch = totalUsageQty * priceInfo.unitPrice;

      return {
        accessoryId: acc.id,
        accessoryName: acc.name,
        accessoryCategory: acc.category,
        rawMaterialName: priceInfo.rawMaterialName,
        rawMaterialUnitPrice: priceInfo.rawMaterialUnitPrice,
        yieldPerUnit: priceInfo.yieldPerUnit,
        materialUsagePerPcs:
          priceInfo.materialUsagePerPcs ||
          (priceInfo.yieldPerUnit ? Number((1 / priceInfo.yieldPerUnit).toFixed(6)) : acc.materialUsagePerPcs),
        rawMaterialSize: priceInfo.rawMaterialSize || acc.rawMaterialSize,
        pieceCuttingSize: priceInfo.pieceCuttingSize || acc.pieceCuttingSize,
        divisionFormula: priceInfo.divisionFormula || acc.divisionFormula,
        differentSizeNotes: priceInfo.differentSizeNotes || acc.differentSizeNotes,
        unitPrice: priceInfo.unitPrice,
        usageQtyPerProduct,
        totalUsageQty,
        totalCostPerProduct,
        totalCostBatch,
        notes: priceInfo.detailText,
      };
    });

    // Automatically include standard master services if not already present in product
    const standardServices = accessories.filter((a) => a.category === 'service');
    standardServices.forEach((srv) => {
      if (!items.some((i) => i.accessoryId === srv.id)) {
        const srvPrice = srv.purchasePrice || 0;
        items.push({
          accessoryId: srv.id,
          accessoryName: srv.name,
          accessoryCategory: 'service',
          rawMaterialName: '-',
          rawMaterialUnitPrice: 0,
          yieldPerUnit: 1,
          materialUsagePerPcs: 1,
          unitPrice: srvPrice,
          usageQtyPerProduct: 1,
          totalUsageQty: orderQty,
          totalCostPerProduct: srvPrice,
          totalCostBatch: srvPrice * orderQty,
          notes: srv.notes || `Tarif Rp ${srvPrice.toLocaleString('id-ID')} / ${srv.unit}`,
        });
      }
    });

    return items;
  };

  const isInitializedRef = React.useRef(false);
  const prevInitialCalcIdRef = React.useRef<string | undefined>(initialCalculationId);
  const prevInitialProdIdRef = React.useRef<string | undefined>(initialProductId);

  // Safe initial setup: runs ONCE on mount or when explicit external navigation props change.
  // NEVER overwrites user-edited services or ready-made accessories on background re-renders!
  useEffect(() => {
    const propChanged =
      (initialCalculationId && initialCalculationId !== prevInitialCalcIdRef.current) ||
      (initialProductId && initialProductId !== prevInitialProdIdRef.current);

    if (propChanged) {
      prevInitialCalcIdRef.current = initialCalculationId;
      prevInitialProdIdRef.current = initialProductId;
      if (initialProductId) setSelectedProductId(initialProductId);
      if (initialCalculationId) setSelectedCalculationId(initialCalculationId);
      setActiveCostingId(null);
      const targetProd = products.find((p) => p.id === initialProductId) || currentProduct;
      if (targetProd) {
        const targetCalc = allCalculations.find((c) => c.id === initialCalculationId) || null;
        const targetQty = targetCalc?.orderQuantity || 1000;
        setOrderQuantity(targetQty);
        setTitle(`Costing HPP ${targetProd.name} (Batch ${targetQty.toLocaleString('id-ID')} Pcs)`);
        setCostingItems(buildDefaultItems(targetProd, targetQty, targetCalc));
      }
      return;
    }

    if (!isInitializedRef.current && currentProduct) {
      isInitializedRef.current = true;
      const initialQty = activeReferencedCalc?.orderQuantity || orderQuantity || 1000;
      setOrderQuantity(initialQty);
      setTitle(`Costing HPP ${currentProduct.name} (Batch ${initialQty.toLocaleString('id-ID')} Pcs)`);
      if (costingItems.length === 0) {
        setCostingItems(buildDefaultItems(currentProduct, initialQty, activeReferencedCalc));
      }
    }
  }, [currentProduct, initialProductId, initialCalculationId]);

  // Handler for explicit product dropdown selection by user
  const handleProductChange = (newProductId: string) => {
    setSelectedProductId(newProductId);
    setActiveCostingId(null);
    const newProd = products.find((p) => p.id === newProductId);
    if (!newProd) return;

    const newMatchingCalc = allCalculations.find(
      (c) => c.productId === newProductId || c.productName.trim().toLowerCase() === newProd.name.trim().toLowerCase()
    );
    const targetCalc = newMatchingCalc || null;
    const targetQty = targetCalc?.orderQuantity || orderQuantity || 1000;
    setOrderQuantity(targetQty);

    const newNum = `CST-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;
    setCostingNumber(newNum);
    setTitle(`Costing HPP ${newProd.name} (Batch ${targetQty.toLocaleString('id-ID')} Pcs)`);

    const defaultItems = buildDefaultItems(newProd, targetQty, targetCalc);
    setCostingItems(defaultItems);
    setNotice(`Memuat formulir baru costing untuk produk: ${newProd.name}`);
    setTimeout(() => setNotice(null), 3000);
  };

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

  // Separate Accessories vs Services
  const accessoryItems = useMemo(() => {
    return updatedItems.filter((i) => i.accessoryCategory !== 'service');
  }, [updatedItems]);

  const serviceItems = useMemo(() => {
    return updatedItems.filter((i) => i.accessoryCategory === 'service');
  }, [updatedItems]);

  // Subtotals
  const totalAccessoriesCostPerUnit = useMemo(() => {
    return accessoryItems.reduce((acc, item) => acc + item.totalCostPerProduct, 0);
  }, [accessoryItems]);

  const totalAccessoriesBatchCost = useMemo(() => {
    return totalAccessoriesCostPerUnit * orderQuantity;
  }, [totalAccessoriesCostPerUnit, orderQuantity]);

  const totalServicesCostPerUnit = useMemo(() => {
    return serviceItems.reduce((acc, item) => acc + item.totalCostPerProduct, 0);
  }, [serviceItems]);

  const totalServicesBatchCost = useMemo(() => {
    return totalServicesCostPerUnit * orderQuantity;
  }, [totalServicesCostPerUnit, orderQuantity]);

  // Grand Total HPP (Costing)
  const totalCostPerUnit = useMemo(() => {
    return totalAccessoriesCostPerUnit + totalServicesCostPerUnit;
  }, [totalAccessoriesCostPerUnit, totalServicesCostPerUnit]);

  const totalBatchCost = useMemo(() => {
    return totalAccessoriesBatchCost + totalServicesBatchCost;
  }, [totalAccessoriesBatchCost, totalServicesBatchCost]);

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

  // Handlers for modifying table rows (both accessories and services)
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
      setNotice(`Komponen "${acc.name}" sudah ada di dalam tabel costing.`);
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
      materialUsagePerPcs: priceInfo.yieldPerUnit ? Number((1 / priceInfo.yieldPerUnit).toFixed(6)) : acc.materialUsagePerPcs,
      rawMaterialSize: acc.rawMaterialSize,
      pieceCuttingSize: acc.pieceCuttingSize,
      divisionFormula: acc.divisionFormula,
      differentSizeNotes: acc.differentSizeNotes,
      unitPrice: priceInfo.unitPrice,
      usageQtyPerProduct,
      totalUsageQty,
      totalCostPerProduct,
      totalCostBatch,
      notes: priceInfo.detailText,
    };

    setCostingItems((prev) => [...prev, newItem]);
    setSelectedAccToAdd('');
    setNotice(`Komponen "${acc.name}" berhasil ditambahkan ke costing!`);
    setTimeout(() => setNotice(null), 3000);
  };

  // Add service from master dropdown
  const [selectedServiceToAdd, setSelectedServiceToAdd] = useState<string>('');

  const handleAddServiceFromMaster = () => {
    if (!selectedServiceToAdd) return;
    const srv = accessories.find((a) => a.id === selectedServiceToAdd);
    if (!srv) return;

    if (costingItems.some((i) => i.accessoryId === srv.id)) {
      setNotice(`Jasa "${srv.name}" sudah ada di dalam rincian costing.`);
      setTimeout(() => setNotice(null), 3000);
      return;
    }

    const price = srv.purchasePrice || 0;
    const usageQtyPerProduct = 1;
    const totalUsageQty = usageQtyPerProduct * orderQuantity;
    const totalCostPerProduct = usageQtyPerProduct * price;
    const totalCostBatch = totalUsageQty * price;

    const newItem: ProductCostingItem = {
      accessoryId: srv.id,
      accessoryName: srv.name,
      accessoryCategory: 'service',
      unitPrice: price,
      usageQtyPerProduct,
      totalUsageQty,
      totalCostPerProduct,
      totalCostBatch,
      notes: srv.notes || `Tarif Rp ${price.toLocaleString('id-ID')} / ${srv.unit}`,
    };

    setCostingItems((prev) => [...prev, newItem]);
    setSelectedServiceToAdd('');
    setNotice(`Jasa "${srv.name}" berhasil ditambahkan ke costing!`);
    setTimeout(() => setNotice(null), 3000);
  };

  // Add custom service
  const handleAddCustomService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customServiceName.trim()) return;

    const newId = `jasa-custom-${Date.now()}`;
    const price = Number(customServicePrice) || 0;
    const qty = Number(customServiceQty) || 1;
    const totalUsageQty = qty * orderQuantity;
    const totalCostPerProduct = qty * price;
    const totalCostBatch = totalUsageQty * price;

    const newItem: ProductCostingItem = {
      accessoryId: newId,
      accessoryName: customServiceName.trim(),
      accessoryCategory: 'service',
      unitPrice: price,
      usageQtyPerProduct: qty,
      totalUsageQty,
      totalCostPerProduct,
      totalCostBatch,
      notes: `Jasa Pengerjaan (${customServiceUnit})`,
    };

    setCostingItems((prev) => [...prev, newItem]);
    setCustomServiceName('');
    setCustomServicePrice(10000);
    setCustomServiceQty(1);
    setIsCustomServiceModalOpen(false);
    setNotice(`Jasa kustom "${newItem.accessoryName}" berhasil ditambahkan!`);
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
      companyName: companyName.trim() || companyProfile.companyName || 'PT. GARMENT PRESISI NUSANTARA',
      productId: currentProduct.id,
      productName: currentProduct.name,
      productCode: currentProduct.code,
      productCategory: currentProduct.category,
      orderQuantity,
      items: updatedItems,
      totalCostPerUnit,
      totalBatchCost,
      totalAccessoriesCostPerUnit,
      totalServicesCostPerUnit,
      totalAccessoriesBatchCost,
      totalServicesBatchCost,
      targetMarkupPercent,
      targetSellingPricePerUnit: recommendedSellingPricePerUnit,
      calculationDate,
      notes,
      createdAt: existingRec ? existingRec.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setActiveCostingId(targetId);
    setCostingItems(updatedItems);
    const updated = storageService.saveSingleProductCosting(record);
    setSavedCostings(updated);
    if (onCostingsUpdated) onCostingsUpdated();

    const accCount = updatedItems.filter((i) => i.accessoryCategory !== 'service').length;
    const srvCount = updatedItems.filter((i) => i.accessoryCategory === 'service').length;

    const targetUrl = (effectiveSheetsConfig?.webAppUrl || storageService.getSheetsConfig()?.webAppUrl || '').trim();
    if (targetUrl) {
      setIsSyncingSheets(true);
      sheetsSyncService.pushSingleCosting(targetUrl, record).then((res) => {
        setIsSyncingSheets(false);
        if (res.success) {
          const syncedRecord: ProductCostingRecord = {
            ...record,
            syncStatus: 'synced',
            syncedAt: new Date().toISOString(),
          };
          storageService.saveSingleProductCosting(syncedRecord);
          setSavedCostings(storageService.getProductCostings());
          setNotice(`✓ Dokumen Costing "${record.costingNumber}" berhasil diperbarui & otomatis tersimpan ke Google Sheets! Tersimpan ${updatedItems.length} item (${accCount} aksesoris & ${srvCount} jasa).`);
        } else {
          setNotice(`Dokumen Costing disimpan di penyimpanan lokal (${updatedItems.length} item: ${accCount} aksesoris, ${srvCount} jasa). Sheets: ${res.message}`);
        }
        setTimeout(() => setNotice(null), 5000);
      });
    } else {
      setNotice(`✓ Dokumen Costing "${record.costingNumber}" berhasil diperbarui di penyimpanan lokal! Tersimpan ${updatedItems.length} item (${accCount} aksesoris & ${srvCount} jasa pengerjaan).`);
      setTimeout(() => setNotice(null), 4000);
    }
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
      companyName: companyName.trim() || companyProfile.companyName || 'PT. GARMENT PRESISI NUSANTARA',
      productId: currentProduct.id,
      productName: currentProduct.name,
      productCode: currentProduct.code,
      productCategory: currentProduct.category,
      orderQuantity,
      items: updatedItems,
      totalCostPerUnit,
      totalBatchCost,
      totalAccessoriesCostPerUnit,
      totalServicesCostPerUnit,
      totalAccessoriesBatchCost,
      totalServicesBatchCost,
      targetMarkupPercent,
      targetSellingPricePerUnit: recommendedSellingPricePerUnit,
      calculationDate,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setCostingItems(updatedItems);
    const updated = storageService.saveSingleProductCosting(record);
    setSavedCostings(updated);
    if (onCostingsUpdated) onCostingsUpdated();

    const accCount = updatedItems.filter((i) => i.accessoryCategory !== 'service').length;
    const srvCount = updatedItems.filter((i) => i.accessoryCategory === 'service').length;

    const targetUrl = (effectiveSheetsConfig?.webAppUrl || storageService.getSheetsConfig()?.webAppUrl || '').trim();
    if (targetUrl) {
      setIsSyncingSheets(true);
      sheetsSyncService.pushSingleCosting(targetUrl, record).then((res) => {
        setIsSyncingSheets(false);
        if (res.success) {
          const syncedRecord: ProductCostingRecord = {
            ...record,
            syncStatus: 'synced',
            syncedAt: new Date().toISOString(),
          };
          storageService.saveSingleProductCosting(syncedRecord);
          setSavedCostings(storageService.getProductCostings());
          setNotice(`✓ Dokumen baru Costing "${finalNum}" berhasil disimpan & otomatis tersimpan ke Google Sheets! Tersimpan ${updatedItems.length} item (${accCount} aksesoris & ${srvCount} jasa).`);
        } else {
          setNotice(`Dokumen baru Costing disimpan di penyimpanan lokal (${updatedItems.length} item: ${accCount} aksesoris, ${srvCount} jasa). Sheets: ${res.message}`);
        }
        setTimeout(() => setNotice(null), 5000);
      });
    } else {
      setNotice(`✓ Dokumen baru Costing "${finalNum}" berhasil dibuat & disimpan! Tersimpan ${updatedItems.length} item (${accCount} aksesoris & ${srvCount} jasa pengerjaan).`);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  const handleSyncSingleCostingToSheets = async (rec: ProductCostingRecord) => {
    const targetUrl = (effectiveSheetsConfig?.webAppUrl || storageService.getSheetsConfig()?.webAppUrl || '').trim();
    if (!targetUrl) {
      setNotice('Web App URL Google Sheets belum diatur. Silakan atur URL di menu Sinkronisasi Sheets.');
      setTimeout(() => setNotice(null), 4000);
      return;
    }
    setIsSyncingSheets(true);
    const res = await sheetsSyncService.pushSingleCosting(targetUrl, rec);
    setIsSyncingSheets(false);
    if (res.success) {
      const syncedRecord: ProductCostingRecord = {
        ...rec,
        syncStatus: 'synced',
        syncedAt: new Date().toISOString(),
      };
      storageService.saveSingleProductCosting(syncedRecord);
      setSavedCostings(storageService.getProductCostings());
    }
    setNotice(res.message);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleSyncAllCostingsToSheets = async () => {
    const targetUrl = (effectiveSheetsConfig?.webAppUrl || storageService.getSheetsConfig()?.webAppUrl || '').trim();
    if (!targetUrl) {
      setNotice('Web App URL Google Sheets belum diatur. Silakan atur URL di menu Sinkronisasi Sheets.');
      setTimeout(() => setNotice(null), 4000);
      return;
    }
    setIsSyncingSheets(true);
    const res = await sheetsSyncService.pushAllToSheets(targetUrl, {
      calculations: storageService.getCalculations(),
      products,
      rawMaterials,
      accessories,
      costings: savedCostings,
    });
    setIsSyncingSheets(false);
    setNotice(res.message);
    setTimeout(() => setNotice(null), 4000);
  };

  const handlePullCostingsFromSheets = async () => {
    const targetUrl = (effectiveSheetsConfig?.webAppUrl || storageService.getSheetsConfig()?.webAppUrl || '').trim();
    if (!targetUrl) {
      setNotice('Web App URL Google Sheets belum diatur. Silakan atur URL di menu Sinkronisasi Sheets.');
      setTimeout(() => setNotice(null), 4000);
      return;
    }
    setIsSyncingSheets(true);
    try {
      const res = await sheetsSyncService.pullAllFromSheets(targetUrl);
      if (res.success && res.data) {
        if (res.data.costings && res.data.costings.length > 0) {
          storageService.saveProductCostings(res.data.costings);
          setSavedCostings(res.data.costings);
          setNotice(`✓ Berhasil menarik & memulihkan ${res.data.costings.length} arsip perhitungan costing dari Google Sheets!`);
        } else {
          setNotice('Koneksi berhasil, namun belum ada baris data costing di tab Product_Costing Google Sheets.');
        }
        if (res.data.calculations) storageService.saveCalculations(res.data.calculations);
        if (res.data.products) storageService.saveProducts(res.data.products);
        if (res.data.rawMaterials) storageService.saveRawMaterials(res.data.rawMaterials);
        if (res.data.accessories) storageService.saveAccessories(res.data.accessories);
        if (onCostingsUpdated) onCostingsUpdated();
      } else {
        setNotice(`Gagal menarik data dari Google Sheets: ${res.message}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNotice(`Gagal menarik data: ${msg}`);
    } finally {
      setIsSyncingSheets(false);
      setTimeout(() => setNotice(null), 5000);
    }
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
    if (rec.companyName) setCompanyName(rec.companyName);
    setCalculationDate(rec.calculationDate);
    setNotes(rec.notes || '');
    if (rec.targetMarkupPercent !== undefined) setTargetMarkupPercent(rec.targetMarkupPercent);

    // Validate and restore all items from the saved record (both accessories and services)
    const restoredItems: ProductCostingItem[] = (rec.items || []).map((item) => {
      const usageQty = item.usageQtyPerProduct ?? 1;
      const unitPrice = item.unitPrice ?? 0;
      const totalUsageQty = item.totalUsageQty ?? (usageQty * rec.orderQuantity);
      const totalCostPerProduct = item.totalCostPerProduct ?? (usageQty * unitPrice);
      const totalCostBatch = item.totalCostBatch ?? (totalUsageQty * unitPrice);
      return {
        ...item,
        accessoryCategory: item.accessoryCategory || (item.accessoryId.startsWith('jasa') ? 'service' : 'raw_material_based'),
        usageQtyPerProduct: usageQty,
        unitPrice,
        totalUsageQty,
        totalCostPerProduct,
        totalCostBatch,
      };
    });

    setCostingItems(restoredItems);
    setCostingSubTab('calculator');
    const accCount = restoredItems.filter((i) => i.accessoryCategory !== 'service').length;
    const srvCount = restoredItems.filter((i) => i.accessoryCategory === 'service').length;
    setNotice(`✓ Berhasil memuat arsip costing "${rec.costingNumber}" (${accCount} aksesoris & ${srvCount} jasa pengerjaan).`);
    setTimeout(() => setNotice(null), 4000);
  };

  // Mulai Perhitungan Baru untuk Product Costing (Reset formulir bersih & generate nomor dokumen baru)
  const handleStartNewCosting = () => {
    const newNum = `CST-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;
    setActiveCostingId(null);
    setCostingNumber(newNum);
    const prod = products.find((p) => p.id === selectedProductId) || products[0] || currentProduct;
    if (prod) {
      setSelectedProductId(prod.id);
      setTitle(`Costing HPP ${prod.name} (Batch 1.000 Pcs)`);
    } else {
      setTitle('Analisis HPP Accessories & Jasa');
    }
    setOrderQuantity(1000);
    setCompanyName(companyProfile.companyName || 'PT. GARMENT PRESISI NUSANTARA');
    setBuyerName(companyProfile.defaultBuyerName || '-');
    setCalculationDate(new Date().toISOString().split('T')[0]);
    setNotes('Estimasi biaya komponen accessories dan ongkos jasa pengerjaan untuk penentuan HPP.');
    setTargetMarkupPercent(25);

    if (prod) {
      const items = buildDefaultItems(prod, 1000, activeReferencedCalc);
      setCostingItems(items);
    }

    setCostingSubTab('calculator');
    setNotice('Perhitungan costing baru dimulai! Formulir telah direset bersih.');
    setTimeout(() => setNotice(null), 4000);
  };

  // Export to CSV
  const handleExportCsv = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += `LAPORAN PRODUCT COSTING (HPP ACCESSORIES & JASA)\n`;
    csv += `Perusahaan,${companyName || companyProfile.companyName || 'PT. GARMENT PRESISI NUSANTARA'}\n`;
    csv += `No Dokumen Costing,${costingNumber}\n`;
    csv += `Nama Produk,${currentProduct?.name}\n`;
    csv += `Kode Produk,${currentProduct?.code}\n`;
    csv += `Nama Buyer / Pemesan,${buyerName || '-'}\n`;
    csv += `Jumlah Pesanan,${orderQuantity} Pcs\n`;
    csv += `Tanggal,${calculationDate}\n\n`;

    csv += `1. RINCIAN KOMPONEN ACCESSORIES\n`;
    csv += `No,Nama Accessories,Kategori,Sumber / Yield,Harga Satuan (Rp),Pemakaian / Pcs,Total Pemakaian (Pcs),Total Biaya / Pcs (Rp),Total Biaya Batch (Rp)\n`;
    accessoryItems.forEach((item, idx) => {
      csv += `${idx + 1},"${item.accessoryName}","${item.accessoryCategory === 'ready_made' ? 'Accessories Jadi' : 'Olah Bahan Baku'}","${item.notes || '-'}",${item.unitPrice.toFixed(2)},${item.usageQtyPerProduct},${item.totalUsageQty},${item.totalCostPerProduct.toFixed(2)},${item.totalCostBatch.toFixed(2)}\n`;
    });
    csv += `Subtotal Biaya Accessories,,,,,,"Rp ${totalAccessoriesCostPerUnit.toFixed(2)}","Rp ${totalAccessoriesBatchCost.toFixed(2)}"\n\n`;

    csv += `2. RINCIAN BIAYA JASA & ONGKOS PENGERJAAN\n`;
    csv += `No,Nama Jasa,Kategori,Keterangan,Tarif Satuan (Rp),Jumlah Pengerjaan / Pcs,Total Pengerjaan Batch,Total Biaya Jasa / Pcs (Rp),Total Biaya Jasa Batch (Rp)\n`;
    serviceItems.forEach((item, idx) => {
      csv += `${idx + 1},"${item.accessoryName}","Jasa Pengerjaan","${item.notes || '-'}",${item.unitPrice.toFixed(2)},${item.usageQtyPerProduct},${item.totalUsageQty},${item.totalCostPerProduct.toFixed(2)},${item.totalCostBatch.toFixed(2)}\n`;
    });
    csv += `Subtotal Biaya Jasa,,,,,,"Rp ${totalServicesCostPerUnit.toFixed(2)}","Rp ${totalServicesBatchCost.toFixed(2)}"\n\n`;

    csv += `RINGKASAN REKAPITULASI HPP & LABA\n`;
    csv += `Subtotal Biaya Accessories / Pcs,Rp ${totalAccessoriesCostPerUnit.toFixed(2)}\n`;
    csv += `Subtotal Biaya Jasa / Pcs,Rp ${totalServicesCostPerUnit.toFixed(2)}\n`;
    csv += `GRAND TOTAL HPP / Pcs,Rp ${totalCostPerUnit.toFixed(2)}\n`;
    csv += `Total Biaya Batch (${orderQuantity} Pcs),Rp ${totalBatchCost.toFixed(2)}\n`;
    csv += `Target Markup Keuntungan,${targetMarkupPercent}%\n`;
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

  // Dokumen ProductCostingRecord aktif untuk preview, simpan, dan ekspor
  const currentCostingRecord: ProductCostingRecord = useMemo(() => {
    return {
      id: activeCostingId || `cst-${Date.now()}`,
      costingNumber,
      title,
      companyName,
      productId: selectedProductId,
      productName: currentProduct?.name || 'Produk',
      productCode: currentProduct?.code || 'PRD-001',
      orderQuantity,
      items: updatedItems,
      totalCostPerUnit,
      totalBatchCost,
      totalAccessoriesCostPerUnit,
      totalServicesCostPerUnit,
      totalAccessoriesBatchCost,
      totalServicesBatchCost,
      targetMarkupPercent,
      targetSellingPricePerUnit: recommendedSellingPricePerUnit,
      calculationDate,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [
    activeCostingId,
    costingNumber,
    title,
    companyName,
    selectedProductId,
    currentProduct,
    orderQuantity,
    updatedItems,
    totalCostPerUnit,
    totalBatchCost,
    totalAccessoriesCostPerUnit,
    totalServicesCostPerUnit,
    totalAccessoriesBatchCost,
    totalServicesBatchCost,
    targetMarkupPercent,
    recommendedSellingPricePerUnit,
    calculationDate,
    notes,
  ]);

  // Buka Modal Cetak & Ekspor Multi-Halaman Proporsional
  const handleOpenPrintModal = () => {
    setIsFormatModalOpen(false);
    setPrintCostingAutoAction(null);
    setIsPrintCostingModalOpen(true);
  };

  // Export to PDF
  const handleExportPdf = () => {
    setIsFormatModalOpen(false);
    setPrintCostingAutoAction('pdf');
    setIsPrintCostingModalOpen(true);
  };

  // Export as high-resolution JPEG (.jpg)
  const handleExportJpg = () => {
    setIsFormatModalOpen(false);
    setPrintCostingAutoAction('jpg');
    setIsPrintCostingModalOpen(true);
  };

  // Export as lossless PNG (.png)
  const handleExportPng = () => {
    setIsFormatModalOpen(false);
    setPrintCostingAutoAction('png');
    setIsPrintCostingModalOpen(true);
  };

  // Master lists filtered
  const masterAccessoriesList = useMemo(() => {
    return accessories.filter((a) => a.category !== 'service');
  }, [accessories]);

  const masterServicesList = useMemo(() => {
    return accessories.filter((a) => a.category === 'service');
  }, [accessories]);

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
                HPP Accessories & Jasa
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Kalkulasi HPP terintegrasi: komponen accessories (beli jadi & olah bahan baku) serta ongkos jasa pengerjaan (jahit, bordir, cutting, finishing)
            </p>
          </div>
        </div>

        {/* View Switcher: Calculator vs Saved Costings & Back to Consumption */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-top-start-new-costing"
            onClick={handleStartNewCosting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs"
            title="Mulai perhitungan costing baru dengan formulir bersih dan nomor dokumen baru"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>+ Mulai Perhitungan Baru</span>
          </button>

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
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-slate-700" />
              <h3 className="text-xs font-bold text-slate-900 uppercase">Daftar Arsip Perhitungan Costing Produk</h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500">Total: {savedCostings.length} Dokumen</span>
              {effectiveSheetsConfig?.webAppUrl && (
                <button
                  type="button"
                  onClick={handlePullCostingsFromSheets}
                  disabled={isSyncingSheets}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white px-2.5 py-1 text-xs font-semibold transition shadow-xs"
                  title="Tarik atau pulihkan arsip costing dari Google Sheets"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                  <span>{isSyncingSheets ? 'Menarik...' : 'Tarik dari Google Sheets'}</span>
                </button>
              )}
              {effectiveSheetsConfig?.webAppUrl && savedCostings.length > 0 && (
                <button
                  type="button"
                  onClick={handleSyncAllCostingsToSheets}
                  disabled={isSyncingSheets}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white px-2.5 py-1 text-xs font-semibold transition shadow-xs"
                  title="Kirim semua data costing ke Google Sheets"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>{isSyncingSheets ? 'Menyinkronkan...' : 'Sinkronkan Semua ke Sheets'}</span>
                </button>
              )}
            </div>
          </div>

          {savedCostings.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs space-y-3">
              <Coins className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700 text-sm">Belum ada arsip costing di penyimpanan lokal</p>
              <p className="max-w-md mx-auto text-slate-500">
                Jika Anda telah membuat kalkulasi sebelumnya dan menyimpannya ke Google Sheets, klik tombol di bawah untuk menarik dan memulihkan seluruh arsip costing Anda.
              </p>
              {effectiveSheetsConfig?.webAppUrl ? (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handlePullCostingsFromSheets}
                    disabled={isSyncingSheets}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white px-4 py-2 font-bold text-xs shadow-md transition"
                  >
                    <RotateCw className={`w-4 h-4 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                    <span>{isSyncingSheets ? 'Sedang Memulihkan Data...' : '⚡ Tarik & Pulihkan Data dari Google Sheets'}</span>
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-amber-700 font-medium">
                  Lakukan kalkulasi di tab Kalkulator Costing dan klik tombol "Simpan Kalkulasi Costing"
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                    <th className="py-3 px-4 font-bold">No Dokumen</th>
                    <th className="py-3 px-4 font-bold">Nama Produk & Judul</th>
                    <th className="py-3 px-4 font-bold text-center">Batch Qty</th>
                    <th className="py-3 px-4 font-bold text-right">Biaya Accessories</th>
                    <th className="py-3 px-4 font-bold text-right">Biaya Jasa</th>
                    <th className="py-3 px-4 font-bold text-right">Grand Total HPP</th>
                    <th className="py-3 px-4 font-bold text-right">Total Batch</th>
                    <th className="py-3 px-4 font-bold">Tanggal</th>
                    <th className="py-3 px-4 font-bold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {savedCostings.map((rec) => {
                    const accCost = rec.totalAccessoriesCostPerUnit ?? rec.items.filter(i => i.accessoryCategory !== 'service').reduce((s, i) => s + i.totalCostPerProduct, 0);
                    const srvCost = rec.totalServicesCostPerUnit ?? rec.items.filter(i => i.accessoryCategory === 'service').reduce((s, i) => s + i.totalCostPerProduct, 0);

                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-mono font-bold text-blue-900">{rec.costingNumber}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{rec.productName}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[200px]">{rec.title}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                          {rec.orderQuantity.toLocaleString('id-ID')} Pcs
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          Rp {accCost.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-indigo-700 font-semibold">
                          Rp {srvCost.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                          Rp {rec.totalCostPerUnit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-amber-900 whitespace-nowrap">
                          Rp {rec.totalBatchCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{rec.calculationDate}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleLoadSavedCosting(rec)}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 px-2 py-1 text-[11px] font-semibold transition"
                              title="Buka & edit costing ini"
                            >
                              <span>Buka</span>
                            </button>
                            {effectiveSheetsConfig?.webAppUrl && (
                              <button
                                onClick={() => handleSyncSingleCostingToSheets(rec)}
                                disabled={isSyncingSheets}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 px-2 py-1 text-[11px] font-semibold transition"
                                title="Sinkronkan costing ini ke Google Sheets"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Sync Sheets</span>
                              </button>
                            )}
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
                    );
                  })}
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
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 hidden sm:inline">
                  Data produk terhubung dengan BOM
                </span>
                <button
                  type="button"
                  id="btn-card-start-new-costing"
                  onClick={handleStartNewCosting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs"
                  title="Mulai perhitungan costing baru dengan nomor dokumen dan formulir bersih"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Mulai Perhitungan Baru</span>
                </button>
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
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 font-bold outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 text-xs"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code}) — {p.accessories?.length || 0} Komponen
                    </option>
                  ))}
                </select>
              </div>

              {/* Order Quantity */}
              <div className="md:col-span-3 space-y-1">
                <label className="block font-semibold text-slate-700">
                  Jumlah Pesanan (Batch) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono font-bold text-slate-900 outline-hidden focus:border-amber-600 text-xs"
                  />
                  <span className="absolute right-3 top-2 text-slate-400 font-semibold text-xs">Pcs</span>
                </div>
                <div className="flex gap-1.5 pt-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setOrderQuantity(100)}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium"
                  >
                    100 Pcs
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

              {/* Nama Perusahaan & Buyer */}
              <div className="md:col-span-6 space-y-1">
                <label className="block font-semibold text-slate-700 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-700" />
                  <span>Nama Perusahaan / Produsen</span> <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Contoh: PT. GARMENT PRESISI NUSANTARA"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 font-semibold outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 text-xs"
                />
              </div>

              <div className="md:col-span-6 space-y-1">
                <label className="block font-semibold text-slate-700">Nama Buyer / Pemesan</label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Contoh: MABES TNI / KEMHAN RI"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-amber-600 text-xs"
                />
              </div>

              {/* Judul Analisis Biaya */}
              <div className="md:col-span-12 space-y-1">
                <label className="block font-semibold text-slate-700">Judul / Keterangan Analisis Biaya</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-amber-600 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Kartu Acuan Modul Consumption (BOM) & Harga Aksesoris */}
          <div className="rounded-2xl border-2 border-emerald-500/40 bg-linear-to-r from-emerald-50/80 via-teal-50/40 to-white p-4.5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shrink-0 font-bold shadow-xs">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-slate-900 uppercase">
                      Acuan Perhitungan Modul Consumption (BOM)
                    </h4>
                    {activeReferencedCalc ? (
                      <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Terhubung: {activeReferencedCalc.calculationNumber}</span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 text-slate-600 border border-slate-300 px-2 py-0.5 text-[10px] font-medium">
                        Menggunakan Standar Master
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Harga satuan accessories olahan bahan baku otomatis dikalkulasi dari harga bahan baku ÷ yield/lembar (+ susut) sesuai hasil modul consumption.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {onNavigateToConsumption && (
                  <button
                    type="button"
                    onClick={onNavigateToConsumption}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-600 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-bold transition shadow-2xs"
                  >
                    <RotateCcw className="w-3 h-3 text-emerald-600" />
                    <span>Buka Modul Consumption</span>
                  </button>
                )}
              </div>
            </div>

            {/* Selector Dokumen Perhitungan Konsumsi */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-emerald-200/60 items-center text-xs">
              <div className="sm:col-span-4 font-semibold text-slate-700">
                Pilih Dokumen Perhitungan Konsumsi:
              </div>
              <div className="sm:col-span-8">
                <select
                  value={selectedCalculationId}
                  onChange={(e) => setSelectedCalculationId(e.target.value)}
                  className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-1.5 font-bold text-slate-900 outline-hidden focus:border-emerald-600 text-xs shadow-2xs"
                >
                  <option value="">
                    -- Otomatis (Gunakan Hasil Konsumsi Terbaru untuk {currentProduct?.name}) --
                  </option>
                  {allCalculations.map((calc) => (
                    <option key={calc.id} value={calc.id}>
                      {calc.calculationNumber} — {calc.title || calc.productName} ({calc.orderQuantity.toLocaleString('id-ID')} Pcs - {calc.calculationDate})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {activeReferencedCalc && (
              <div className="bg-white/90 rounded-xl p-2.5 border border-emerald-200 text-[11px] text-slate-700 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-emerald-950">
                    Rincian BOM Terpilih:
                  </span>
                  <span>
                    {activeReferencedCalc.details?.length || 0} Komponen accessories dihitung dengan bahan baku dan yield spesifik.
                  </span>
                </div>
                <span className="font-mono text-emerald-900 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 text-[10px]">
                  Batch: {activeReferencedCalc.orderQuantity.toLocaleString('id-ID')} Pcs • Ref PO: {activeReferencedCalc.customerOrPoRef || '-'}
                </span>
              </div>
            )}
          </div>

          {/* TABEL 1: Rincian Komponen Accessories (Beli Jadi & Olahan Bahan Baku) */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden space-y-0">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-600" />
                  <span>2. Rincian Komponen Accessories & Kalkulasi Biaya Pesanan ({orderQuantity.toLocaleString('id-ID')} Pcs)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Hasil perhitungan disesuaikan untuk total jumlah pesanan ({orderQuantity.toLocaleString('id-ID')} Pcs). Harga satuan dihitung otomatis dari Master Accessories atau Modul Konsumsi (Harga Bahan ÷ Yield).
                </p>
              </div>

              {/* Tambah Accessories Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedAccToAdd}
                  onChange={(e) => setSelectedAccToAdd(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-hidden focus:border-amber-600 max-w-[220px]"
                >
                  <option value="">+ Pilih Aksesoris Tambahan...</option>
                  {masterAccessoriesList.map((a) => {
                    const mat = rawMaterials.find((m) => m.id === a.defaultRawMaterialId);
                    return (
                      <option key={a.id} value={a.id}>
                        {a.name} {a.category === 'raw_material_based' && mat ? `[Bahan: ${mat.name}]` : `(${a.category === 'ready_made' ? 'Beli Jadi' : 'Jasa'})`}
                      </option>
                    );
                  })}
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
                    <th className="py-3 px-3 font-bold w-[13%]">Tipe & Sumber</th>
                    <th className="py-3 px-3 font-bold text-right w-[15%]">
                      Harga Satuan (Rp)
                    </th>
                    <th className="py-3 px-3 font-bold text-center w-[10%]">
                      Qty / Pcs
                    </th>
                    <th className="py-3 px-3 font-bold text-right w-[14%]">
                      Total Pemakaian ({orderQuantity} Pcs)
                    </th>
                    <th className="py-3 px-3 font-bold text-right w-[10%] text-slate-600">
                      Biaya / Pcs
                    </th>
                    <th className="py-3 px-3 font-bold text-right w-[18%] bg-amber-100/70 text-amber-950 font-black">
                      Total Biaya Pesanan ({orderQuantity.toLocaleString('id-ID')} Pcs)
                    </th>
                    <th className="py-3 px-2 font-bold text-center w-[4%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {accessoryItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-400">
                        Tidak ada komponen accessories dalam kalkulasi ini. Silakan klik "+ Tambah" diatas.
                      </td>
                    </tr>
                  ) : (
                    accessoryItems.map((item, idx) => {
                      const isReady = item.accessoryCategory === 'ready_made';

                      return (
                        <tr key={item.accessoryId} className="hover:bg-slate-50/70">
                          {/* 1. No */}
                          <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>

                          {/* 2. Nama Accessories */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900">{item.accessoryName}</span>
                              {!isReady && item.rawMaterialName && (
                                <span className="text-[10px] font-semibold text-purple-800 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                                  Bahan: {item.rawMaterialName}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">{item.notes || '-'}</div>
                            {!isReady && (
                              <div className="mt-1 space-y-0.5 text-[10px]">
                                {item.yieldPerUnit && (
                                  <div className="text-purple-950 font-mono font-semibold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/60 inline-block">
                                    Yield: {item.yieldPerUnit} pcs • Pemakaian: 1÷{item.yieldPerUnit} = {(1 / item.yieldPerUnit).toLocaleString('id-ID', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}/pcs
                                  </div>
                                )}
                                {(item.rawMaterialSize || item.pieceCuttingSize) && (
                                  <div className="text-slate-600 bg-slate-100 rounded px-1.5 py-0.5 font-mono">
                                    📐 {item.rawMaterialSize ? `Bahan: ${item.rawMaterialSize}` : ''} {item.pieceCuttingSize ? `| Potong: ${item.pieceCuttingSize}` : ''}
                                  </div>
                                )}
                                {item.divisionFormula && (
                                  <div className="text-purple-900 bg-purple-50 rounded px-1.5 py-0.5 font-mono border border-purple-200/50">
                                    ➗ Rumus: {item.divisionFormula}
                                  </div>
                                )}
                                {item.differentSizeNotes && (
                                  <div className="text-amber-900 bg-amber-50 rounded px-1.5 py-0.5 border border-amber-200/50 font-medium">
                                    💡 Acuan Berbeda: {item.differentSizeNotes}
                                  </div>
                                )}
                              </div>
                            )}
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

                          {/* 4. Harga Accessories */}
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
                              {isReady ? 'Harga Beli' : 'Bahan ÷ Yield'}
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

                          {/* 7. Biaya Satuan / Pcs */}
                          <td className="py-3 px-3 text-right font-mono text-slate-600 text-xs">
                            Rp {item.totalCostPerProduct.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* 8. Total Biaya Pesanan (Sesuai Jumlah Order) */}
                          <td className="py-3 px-3 text-right bg-amber-50/70 border-l border-amber-200/60">
                            <div className="font-mono font-black text-amber-950 text-sm sm:text-base">
                              Rp {item.totalCostBatch.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                            </div>
                            <div className="text-[10px] text-amber-800 font-medium">
                              (Rp {item.totalCostPerProduct.toLocaleString('id-ID', { minimumFractionDigits: 2 })}/pcs)
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
                {/* Table Footer with Subtotal Accessories */}
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900">
                    <td colSpan={6} className="py-2.5 px-4 text-right uppercase text-xs">
                      Total Biaya Accessories untuk {orderQuantity.toLocaleString('id-ID')} Pcs Pesanan:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600 text-xs whitespace-nowrap">
                      Rp {totalAccessoriesCostPerUnit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / pcs
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-amber-950 text-sm sm:text-base bg-amber-100/80 whitespace-nowrap">
                      Rp {totalAccessoriesBatchCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* TABEL 2: Rincian Jasa & Biaya Pengerjaan (Jasa Jahit, Bordir, Cutting, Finishing) */}
          <div className="rounded-2xl border border-indigo-200 bg-white shadow-xs overflow-hidden space-y-0">
            <div className="p-4 border-b border-indigo-100 bg-indigo-50/70 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-indigo-950 uppercase flex items-center gap-1.5">
                  <Scissors className="w-4 h-4 text-indigo-700" />
                  <span>3. Rincian Biaya Jasa & Kalkulasi Ongkos Pesanan ({orderQuantity.toLocaleString('id-ID')} Pcs)</span>
                </h3>
                <p className="text-[11px] text-indigo-800 mt-0.5">
                  Hasil perhitungan ongkos jasa dihitung penuh untuk {orderQuantity.toLocaleString('id-ID')} Pcs pesanan (Jahit, Bordir, Cutting & Finishing).
                </p>
              </div>

              {/* Tambah Jasa Dropdown & Tombol Jasa Kustom */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedServiceToAdd}
                  onChange={(e) => setSelectedServiceToAdd(e.target.value)}
                  className="rounded-xl border border-indigo-300 bg-white px-2.5 py-1.5 text-xs text-indigo-950 outline-hidden focus:border-indigo-600 max-w-[220px]"
                >
                  <option value="">+ Pilih Dari Master Jasa...</option>
                  {masterServicesList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Rp {(s.purchasePrice || 0).toLocaleString('id-ID')})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddServiceFromMaster}
                  disabled={!selectedServiceToAdd}
                  className="inline-flex items-center gap-1 rounded-xl bg-indigo-700 hover:bg-indigo-800 disabled:opacity-40 px-3 py-1.5 text-xs font-bold text-white transition shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomServiceModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-xl bg-white border border-indigo-300 hover:bg-indigo-100 px-3 py-1.5 text-xs font-bold text-indigo-900 transition shadow-2xs"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-indigo-700" />
                  <span>+ Jasa Kustom</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-indigo-100 bg-indigo-50/40 text-indigo-950">
                    <th className="py-3 px-3 font-bold w-[4%] text-center">No</th>
                    <th className="py-3 px-3 font-bold w-[26%]">Nama Jasa / Biaya Pengerjaan</th>
                    <th className="py-3 px-3 font-bold w-[12%]">Kategori</th>
                    <th className="py-3 px-3 font-bold text-right w-[15%]">
                      Tarif Satuan (Rp)
                    </th>
                    <th className="py-3 px-3 font-bold text-center w-[10%]">
                      Qty / Pcs
                    </th>
                    <th className="py-3 px-3 font-bold text-right w-[14%]">
                      Total Pengerjaan ({orderQuantity} Pcs)
                    </th>
                    <th className="py-3 px-3 font-bold text-right w-[10%] text-indigo-900">
                      Biaya / Pcs
                    </th>
                    <th className="py-3 px-3 font-bold text-right w-[18%] bg-indigo-100/70 text-indigo-950 font-black">
                      Total Biaya Jasa Pesanan ({orderQuantity.toLocaleString('id-ID')} Pcs)
                    </th>
                    <th className="py-3 px-2 font-bold text-center w-[4%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-100/70">
                  {serviceItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-400">
                        Belum ada biaya jasa yang ditambahkan. Silakan pilih dari Master Jasa atau klik "+ Jasa Kustom" diatas.
                      </td>
                    </tr>
                  ) : (
                    serviceItems.map((item, idx) => (
                      <tr key={item.accessoryId} className="hover:bg-indigo-50/40">
                        {/* 1. No */}
                        <td className="py-3 px-3 text-center text-indigo-400 font-mono">{idx + 1}</td>

                        {/* 2. Nama Jasa */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{item.accessoryName}</div>
                          <div className="text-[10px] text-indigo-600 font-mono">{item.notes || 'Ongkos Kerja'}</div>
                        </td>

                        {/* 3. Kategori */}
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100/80 px-2 py-0.5 text-indigo-900 border border-indigo-200 font-semibold text-[10px]">
                            <Scissors className="w-3 h-3 text-indigo-700" />
                            <span>Jasa Kerja</span>
                          </span>
                        </td>

                        {/* 4. Harga / Tarif Jasa (Editable) */}
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-1 justify-end">
                            <span className="text-[11px] text-slate-400">Rp</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unitPrice}
                              onChange={(e) => handleUpdateItemPrice(item.accessoryId, parseFloat(e.target.value) || 0)}
                              className="w-24 text-right rounded-lg border border-indigo-300 px-2 py-1 font-mono font-bold text-indigo-950 text-xs focus:border-indigo-600"
                              title="Klik untuk mengubah tarif jasa manual khusus kalkulasi ini"
                            />
                          </div>
                          <div className="text-[10px] text-indigo-600 mt-0.5 font-medium">Tarif Pengerjaan</div>
                        </td>

                        {/* 5. Jumlah Pengerjaan (Per 1 Pcs Produk) (Editable) */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0.1"
                              step="any"
                              value={item.usageQtyPerProduct}
                              onChange={(e) => handleUpdateItemQty(item.accessoryId, parseFloat(e.target.value) || 0)}
                              className="w-16 text-center rounded-lg border border-indigo-300 px-1.5 py-1 font-mono font-bold text-indigo-950 text-xs focus:border-indigo-600"
                            />
                            <span className="text-[11px] text-indigo-700 font-medium">x pengerjaan</span>
                          </div>
                        </td>

                        {/* 6. Total Pengerjaan Batch */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-indigo-950">
                          <div>{item.totalUsageQty.toLocaleString('id-ID')} kali</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {item.usageQtyPerProduct} × {orderQuantity.toLocaleString('id-ID')}
                          </div>
                        </td>

                        {/* 7. Biaya Satuan / Pcs */}
                        <td className="py-3 px-3 text-right font-mono text-indigo-800 text-xs">
                          Rp {item.totalCostPerProduct.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* 8. Total Biaya Jasa Pesanan (Sesuai Jumlah Order) */}
                        <td className="py-3 px-3 text-right bg-indigo-50/70 border-l border-indigo-200/60">
                          <div className="font-mono font-black text-indigo-950 text-sm sm:text-base">
                            Rp {item.totalCostBatch.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                          </div>
                          <div className="text-[10px] text-indigo-800 font-medium">
                            (Rp {item.totalCostPerProduct.toLocaleString('id-ID', { minimumFractionDigits: 2 })}/pcs)
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={() => handleDeleteItem(item.accessoryId)}
                            className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Hapus jasa ini dari kalkulasi costing"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {/* Table Footer with Subtotal Jasa */}
                <tfoot>
                  <tr className="border-t-2 border-indigo-200 bg-indigo-100/60 font-bold text-indigo-950">
                    <td colSpan={6} className="py-2.5 px-4 text-right uppercase text-xs">
                      Total Biaya Jasa untuk {orderQuantity.toLocaleString('id-ID')} Pcs Pesanan:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-indigo-800 text-xs whitespace-nowrap">
                      Rp {totalServicesCostPerUnit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / pcs
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-950 text-sm sm:text-base bg-indigo-200/70 whitespace-nowrap">
                      Rp {totalServicesBatchCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Financial KPI Cards & Margin Simulator - Disesuaikan dengan Jumlah Order & Nilai Besar (Milyaran) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Biaya Aksesoris Pesanan */}
            <div className="rounded-2xl border border-amber-300 bg-amber-50/40 p-4 shadow-xs flex flex-col justify-between min-w-0 overflow-hidden">
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 truncate">
                    Total Accessories ({orderQuantity.toLocaleString('id-ID')} Pcs)
                  </span>
                  <span className="rounded-md bg-amber-200/80 text-amber-950 px-1.5 py-0.2 text-[9px] font-bold shrink-0">
                    Pesanan
                  </span>
                </div>
                <div className="mt-1 font-mono text-amber-950 min-w-0" title={`Rp ${totalAccessoriesBatchCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`}>
                  <div className={getAdaptiveCurrencyClass(totalAccessoriesBatchCost)}>
                    Rp {totalAccessoriesBatchCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                  </div>
                  {formatShortIndonesianCurrency(totalAccessoriesBatchCost) && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200/80 text-amber-950">
                      {formatShortIndonesianCurrency(totalAccessoriesBatchCost)}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-amber-900 mt-1">
                  Akumulasi seluruh komponen accessories ({accessoryItems.length} item)
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-amber-200/80 flex items-center justify-between text-[11px] gap-2">
                <span className="text-slate-600 shrink-0">Biaya Satuan:</span>
                <span className="font-mono font-bold text-slate-800 truncate text-right">
                  Rp {totalAccessoriesCostPerUnit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / pcs
                </span>
              </div>
            </div>

            {/* Card 2: Total Biaya Jasa Pesanan */}
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-xs flex flex-col justify-between min-w-0 overflow-hidden">
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 truncate">
                    Total Jasa ({orderQuantity.toLocaleString('id-ID')} Pcs)
                  </span>
                  <span className="rounded-md bg-indigo-200/80 text-indigo-950 px-1.5 py-0.2 text-[9px] font-bold shrink-0">
                    Pesanan
                  </span>
                </div>
                <div className="mt-1 font-mono text-indigo-950 min-w-0" title={`Rp ${totalServicesBatchCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`}>
                  <div className={getAdaptiveCurrencyClass(totalServicesBatchCost)}>
                    Rp {totalServicesBatchCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                  </div>
                  {formatShortIndonesianCurrency(totalServicesBatchCost) && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-200/80 text-indigo-950">
                      {formatShortIndonesianCurrency(totalServicesBatchCost)}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-indigo-800 mt-1">
                  Total ongkos pengerjaan ({serviceItems.length} layanan jasa)
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-indigo-200/80 flex items-center justify-between text-[11px] gap-2">
                <span className="text-indigo-800 shrink-0">Biaya Satuan:</span>
                <span className="font-mono font-bold text-indigo-950 truncate text-right">
                  Rp {totalServicesCostPerUnit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / pcs
                </span>
              </div>
            </div>

            {/* Card 3: Grand Total HPP Pesanan */}
            <div className="rounded-2xl border-2 border-emerald-600 bg-emerald-50/70 p-4 shadow-sm flex flex-col justify-between ring-2 ring-emerald-500/20 min-w-0 overflow-hidden">
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-950 truncate">
                    TOTAL HPP PESANAN ({orderQuantity.toLocaleString('id-ID')} Pcs)
                  </span>
                  <span className="rounded-md bg-emerald-700 text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wide shrink-0">
                    HPP Batch
                  </span>
                </div>
                <div className="mt-1 font-mono text-emerald-950 min-w-0" title={`Rp ${totalBatchCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`}>
                  <div className={getAdaptiveCurrencyClass(totalBatchCost, true)}>
                    Rp {totalBatchCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                  </div>
                  {formatShortIndonesianCurrency(totalBatchCost) && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-emerald-700 text-white text-[11px] font-black shadow-2xs">
                      {formatShortIndonesianCurrency(totalBatchCost)}
                    </span>
                  )}
                </div>
                <p className="text-[10.5px] text-emerald-900 mt-1 font-medium">
                  Total modal biaya produksi untuk menyelesaikan seluruh {orderQuantity.toLocaleString('id-ID')} Pcs pesanan
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-emerald-300 flex items-center justify-between text-[11px] gap-2">
                <span className="text-emerald-950 font-bold shrink-0">HPP Dasar per Unit:</span>
                <span className="font-mono font-black text-emerald-950 truncate text-right">
                  Rp {totalCostPerUnit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / Pcs
                </span>
              </div>
            </div>

            {/* Card 4: Total Nilai Penjualan & Laba Pesanan */}
            <div className="rounded-2xl border border-amber-400 bg-amber-50/80 p-4 shadow-xs flex flex-col justify-between min-w-0 overflow-hidden">
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 truncate">
                    Total Nilai Jual ({orderQuantity.toLocaleString('id-ID')} Pcs)
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-bold text-amber-950">Markup:</span>
                    <input
                      type="number"
                      min="0"
                      max="200"
                      value={targetMarkupPercent}
                      onChange={(e) => setTargetMarkupPercent(parseFloat(e.target.value) || 0)}
                      className="w-12 rounded-lg border border-amber-400 bg-white px-1 py-0.5 text-center font-mono font-bold text-xs text-amber-950 outline-hidden"
                    />
                    <span className="text-xs font-bold text-amber-950">%</span>
                  </div>
                </div>

                <div className="mt-1 font-mono text-amber-950 min-w-0" title={`Rp ${(recommendedSellingPricePerUnit * orderQuantity).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`}>
                  <div className={getAdaptiveCurrencyClass(recommendedSellingPricePerUnit * orderQuantity)}>
                    Rp {(recommendedSellingPricePerUnit * orderQuantity).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                  </div>
                  {formatShortIndonesianCurrency(recommendedSellingPricePerUnit * orderQuantity) && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200/90 text-amber-950">
                      {formatShortIndonesianCurrency(recommendedSellingPricePerUnit * orderQuantity)}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-amber-900 mt-0.5">
                  Harga jual: Rp {recommendedSellingPricePerUnit.toLocaleString('id-ID', { maximumFractionDigits: 0 })} / Pcs (+{targetMarkupPercent}%)
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-amber-300 flex items-center justify-between text-[11px] gap-2">
                <span className="text-amber-950 font-bold shrink-0">Est. Laba Pesanan:</span>
                <span className="font-mono font-black text-emerald-700 truncate text-right">
                  + Rp {estimatedTotalProfitBatch.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>

          {/* Action Toolbar Bottom */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                id="btn-bottom-start-new-costing"
                onClick={handleStartNewCosting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold text-white transition shadow-sm"
                title="Mulai perhitungan costing baru dengan formulir bersih"
              >
                <PlusCircle className="w-4 h-4 text-white" />
                <span>+ Mulai Perhitungan Baru</span>
              </button>

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
              {/* Tombol Pilihan Format Modal */}
              <button
                id="btn-choose-costing-format"
                onClick={() => setIsPrintCostingModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-2.5 text-xs font-bold text-white transition shadow-sm"
                title="Buka preview & pilihan format cetak dokumen costing (PDF, JPEG, PNG)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Pilihan Format (PDF / JPEG / PNG)</span>
              </button>

              <button
                id="btn-export-costing-pdf"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-2.5 text-xs font-bold text-white transition shadow-xs disabled:opacity-50"
                title="Unduh laporan lembar costing format PDF A4"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
                <span>PDF (A4)</span>
              </button>

              <button
                id="btn-export-costing-jpeg"
                onClick={handleExportJpg}
                disabled={isExportingJpg}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 px-3 py-2.5 text-xs font-bold text-white transition shadow-xs disabled:opacity-50"
                title="Unduh berkas gambar JPEG resolusi tinggi"
              >
                {isExportingJpg ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5" />
                )}
                <span>JPEG</span>
              </button>

              <button
                id="btn-export-costing-png"
                onClick={handleExportPng}
                disabled={isExportingPng}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white transition shadow-xs disabled:opacity-50"
                title="Unduh berkas gambar PNG tanpa kompresi"
              >
                {isExportingPng ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-200" />
                )}
                <span>PNG</span>
              </button>

              <button
                id="btn-export-costing-csv"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2.5 text-xs font-semibold text-slate-200 border border-slate-700 transition shadow-xs"
                title="Unduh lembar costing dalam format CSV / Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog Tambah Jasa Kustom */}
      {isCustomServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-900">
                  <Scissors className="w-5 h-5 text-indigo-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Tambah Biaya Jasa / Pengerjaan Kustom
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Input nama jasa dan tarif pengerjaan untuk pesanan ini
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomServiceModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomService} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Jasa / Biaya Pengerjaan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={customServiceName}
                  onChange={(e) => setCustomServiceName(e.target.value)}
                  placeholder="Contoh: Jasa Jahit Rompi, Jasa Bordir Logo, Sablon, Finishing"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-hidden focus:border-indigo-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tarif / Harga Jasa Satuan (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={customServicePrice}
                    onChange={(e) => setCustomServicePrice(parseFloat(e.target.value) || 0)}
                    placeholder="Contoh: 12500"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono font-bold text-slate-900 outline-hidden focus:border-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Satuan Pengerjaan
                  </label>
                  <input
                    type="text"
                    value={customServiceUnit}
                    onChange={(e) => setCustomServiceUnit(e.target.value)}
                    placeholder="pcs, titik, set"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-hidden focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Jumlah Pengerjaan per 1 Pcs Produk <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={customServiceQty}
                  onChange={(e) => setCustomServiceQty(parseFloat(e.target.value) || 1)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono font-bold text-slate-900 outline-hidden focus:border-indigo-600"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Contoh: 1 kali jahit per produk, atau 2 titik bordir per produk
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCustomServiceModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-slate-600 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 px-4 py-2 font-bold text-white transition shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Tambahkan ke Costing</span>
                </button>
              </div>
            </form>
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
                  Memperbarui dokumen costing yang sedang dibuka (<strong className="font-mono text-slate-900">{costingNumber}</strong> - {title}) dengan rincian accessories & jasa saat ini.
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

      {/* Modal Dialog Pilihan Format Unduh Laporan Product Costing (PDF / JPEG / PNG / CSV) */}
      {isFormatModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
                  <Download className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Pilihan Format Unduh Laporan Product Costing
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pilih format berkas costing yang ingin Anda unduh ke perangkat:
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormatModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* 1. Format PDF */}
              <div
                onClick={handleExportPdf}
                className="cursor-pointer rounded-xl border-2 border-slate-200 hover:border-rose-500 hover:bg-rose-50/40 p-3.5 transition flex flex-col justify-between group shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <FileText className="w-4 h-4 text-rose-600" />
                      Dokumen PDF (.pdf)
                    </span>
                    <span className="rounded-md bg-rose-100 text-rose-800 px-1.5 py-0.2 text-[9px] font-bold">
                      Standar A4
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Format resmi standar A4 siap cetak atau dikirim ke direksi dan pihak eksternal / buyer.
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-3 w-full py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs group-hover:bg-rose-700 transition"
                >
                  Unduh PDF
                </button>
              </div>

              {/* 2. Format JPEG */}
              <div
                onClick={handleExportJpg}
                className="cursor-pointer rounded-xl border-2 border-slate-200 hover:border-amber-500 hover:bg-amber-50/40 p-3.5 transition flex flex-col justify-between group shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <ImageIcon className="w-4 h-4 text-amber-600" />
                      Gambar JPEG (.jpg)
                    </span>
                    <span className="rounded-md bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[9px] font-bold">
                      Foto Ringan
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Format gambar standar beresolusi tinggi, sangat praktis dibagikan via WhatsApp atau presentasi.
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-3 w-full py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs group-hover:bg-amber-700 transition"
                >
                  Unduh JPEG
                </button>
              </div>

              {/* 3. Format PNG */}
              <div
                onClick={handleExportPng}
                className="cursor-pointer rounded-xl border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 p-3.5 transition flex flex-col justify-between group shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <ImageIcon className="w-4 h-4 text-indigo-600" />
                      Gambar PNG (.png)
                    </span>
                    <span className="rounded-md bg-indigo-100 text-indigo-800 px-1.5 py-0.2 text-[9px] font-bold">
                      Resolusi Tinggi
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Format gambar jernih tanpa kompresi buram, teks rincian dan angka tetap tajam saat di-zoom.
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-3 w-full py-1.5 rounded-lg bg-indigo-700 text-white font-bold text-xs group-hover:bg-indigo-800 transition"
                >
                  Unduh PNG
                </button>
              </div>

              {/* 4. Format CSV */}
              <div
                onClick={() => {
                  setIsFormatModalOpen(false);
                  handleExportCsv();
                }}
                className="cursor-pointer rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 p-3.5 transition flex flex-col justify-between group shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      Excel / CSV (.csv)
                    </span>
                    <span className="rounded-md bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[9px] font-bold">
                      Tabel Data
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Format data spreadsheet mentah untuk pengolahan lebih lanjut di Microsoft Excel atau Google Sheets.
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-3 w-full py-1.5 rounded-lg bg-emerald-700 text-white font-bold text-xs group-hover:bg-emerald-800 transition"
                >
                  Unduh CSV
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsFormatModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Batal / Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden printable A4 sheet container for high-resolution JPEG and PNG export */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden="true">
        <div
          id="product-costing-printable-sheet"
          className="w-[820px] bg-white p-10 text-slate-900 border border-slate-300"
          style={{ boxSizing: 'border-box', fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          {/* Letterhead */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {companyName || companyProfile.companyName || 'PT. GARMENT PRESISI NUSANTARA'}
              </h1>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mt-0.5">
                LAPORAN PRODUCT COSTING • HPP ACCESSORIES & BIAYA JASA
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {companyProfile.companyAddress || 'Kawasan Industri Tekstil, Jawa Barat'}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block rounded-md bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-black uppercase">
                Product Costing
              </span>
              <p className="text-[10px] font-mono text-slate-500 mt-1">
                Dicetak: {new Date().toLocaleDateString('id-ID')}
              </p>
            </div>
          </div>

          {/* Meta Info Grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 py-4 text-xs border-b border-slate-200">
            <div>
              <span className="text-slate-500">No Dokumen Costing:</span>{' '}
              <strong className="font-mono text-slate-900">{costingNumber}</strong>
            </div>
            <div>
              <span className="text-slate-500">Tanggal:</span>{' '}
              <strong className="text-slate-900">{calculationDate}</strong>
            </div>
            <div>
              <span className="text-slate-500">Produk:</span>{' '}
              <strong className="text-slate-900">{currentProduct?.name} ({currentProduct?.code})</strong>
            </div>
            <div>
              <span className="text-slate-500">Jumlah Pesanan (Batch):</span>{' '}
              <strong className="font-mono text-slate-900">{orderQuantity.toLocaleString('id-ID')} Pcs</strong>
            </div>
            <div>
              <span className="text-slate-500">Nama Buyer / Pemesan:</span>{' '}
              <strong className="text-slate-900">{buyerName || '-'}</strong>
            </div>
            <div>
              <span className="text-slate-500">Judul / Catatan:</span>{' '}
              <strong className="text-slate-900">{title}</strong>
            </div>
          </div>

          {/* Tabel 1: Accessories */}
          <div className="mt-5">
            <h2 className="text-xs font-bold text-slate-900 uppercase mb-2">
              1. Rincian Komponen Accessories
            </h2>
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-y border-slate-300">
                  <th className="py-1.5 px-2 font-bold w-8">No</th>
                  <th className="py-1.5 px-2 font-bold">Nama Komponen</th>
                  <th className="py-1.5 px-2 font-bold">Sumber / Keterangan</th>
                  <th className="py-1.5 px-2 font-bold text-right">Harga Satuan</th>
                  <th className="py-1.5 px-2 font-bold text-center">Pemakaian / Pcs</th>
                  <th className="py-1.5 px-2 font-bold text-right">Biaya / Pcs</th>
                  <th className="py-1.5 px-2 font-bold text-right">Total Batch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {accessoryItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-2 px-2 text-center text-slate-400 italic">
                      Tidak ada komponen accessories
                    </td>
                  </tr>
                ) : (
                  accessoryItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5 px-2 text-slate-500">{idx + 1}</td>
                      <td className="py-1.5 px-2 font-semibold text-slate-900">
                        {item.accessoryName}
                        {item.accessoryCategory === 'raw_material_based' && item.rawMaterialName && (
                          <span className="text-[9px] text-purple-800 font-normal ml-1">[{item.rawMaterialName}]</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-slate-500">
                        <div>{item.notes || '-'}</div>
                        {item.accessoryCategory === 'raw_material_based' && item.yieldPerUnit && (
                          <div className="text-[9px] font-mono text-purple-900 bg-purple-50 px-1 py-0.5 rounded mt-0.5 inline-block border border-purple-200">
                            Yield: {item.yieldPerUnit} pcs • Pemakaian: 1÷{item.yieldPerUnit} = {(1 / item.yieldPerUnit).toLocaleString('id-ID', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}/pcs
                          </div>
                        )}
                        {(item.rawMaterialSize || item.pieceCuttingSize) && (
                          <div className="text-[9px] font-mono text-slate-600 bg-slate-100 px-1 py-0.5 rounded mt-0.5">
                            📐 {item.rawMaterialSize ? `Bahan: ${item.rawMaterialSize}` : ''} {item.pieceCuttingSize ? `| Potong: ${item.pieceCuttingSize}` : ''}
                          </div>
                        )}
                        {item.divisionFormula && (
                          <div className="text-[9px] font-mono text-purple-900 bg-purple-50 px-1 py-0.5 rounded mt-0.5 inline-block border border-purple-200">
                            ➗ {item.divisionFormula}
                          </div>
                        )}
                        {item.differentSizeNotes && (
                          <div className="text-[9px] text-amber-900 bg-amber-50 px-1 py-0.5 rounded mt-0.5 border border-amber-200">
                            💡 {item.differentSizeNotes}
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 px-2 font-mono text-right text-slate-700">
                        Rp {item.unitPrice.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                      </td>
                      <td className="py-1.5 px-2 font-mono text-center text-slate-700">{item.usageQtyPerProduct}</td>
                      <td className="py-1.5 px-2 font-mono font-bold text-right text-slate-900">
                        Rp {item.totalCostPerProduct.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                      </td>
                      <td className="py-1.5 px-2 font-mono text-right text-slate-700">
                        Rp {item.totalCostBatch.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="bg-slate-50 font-bold border-t border-slate-300">
                  <td colSpan={5} className="py-2 px-2 text-slate-800 text-right">
                    Subtotal Biaya Accessories:
                  </td>
                  <td className="py-2 px-2 font-mono text-right text-slate-900">
                    Rp {totalAccessoriesCostPerUnit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-2 font-mono text-right text-amber-900">
                    Rp {totalAccessoriesBatchCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tabel 2: Jasa */}
          <div className="mt-5">
            <h2 className="text-xs font-bold text-slate-900 uppercase mb-2">
              2. Rincian Ongkos Jasa Pengerjaan
            </h2>
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-indigo-50 text-indigo-900 border-y border-indigo-200">
                  <th className="py-1.5 px-2 font-bold w-8">No</th>
                  <th className="py-1.5 px-2 font-bold">Nama Jasa / Pengerjaan</th>
                  <th className="py-1.5 px-2 font-bold">Keterangan</th>
                  <th className="py-1.5 px-2 font-bold text-right">Tarif Satuan</th>
                  <th className="py-1.5 px-2 font-bold text-center">Jumlah / Pcs</th>
                  <th className="py-1.5 px-2 font-bold text-right">Biaya Jasa / Pcs</th>
                  <th className="py-1.5 px-2 font-bold text-right">Total Batch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {serviceItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-2 px-2 text-center text-slate-400 italic">
                      Tidak ada komponen jasa pengerjaan
                    </td>
                  </tr>
                ) : (
                  serviceItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5 px-2 text-slate-500">{idx + 1}</td>
                      <td className="py-1.5 px-2 font-semibold text-slate-900">{item.accessoryName}</td>
                      <td className="py-1.5 px-2 text-slate-500">{item.notes || 'Jasa Pengerjaan'}</td>
                      <td className="py-1.5 px-2 font-mono text-right text-slate-700">
                        Rp {item.unitPrice.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                      </td>
                      <td className="py-1.5 px-2 font-mono text-center text-slate-700">{item.usageQtyPerProduct}</td>
                      <td className="py-1.5 px-2 font-mono font-bold text-right text-indigo-950">
                        Rp {item.totalCostPerProduct.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                      </td>
                      <td className="py-1.5 px-2 font-mono text-right text-slate-700">
                        Rp {item.totalCostBatch.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="bg-indigo-50/60 font-bold border-t border-indigo-200">
                  <td colSpan={5} className="py-2 px-2 text-indigo-900 text-right">
                    Subtotal Biaya Jasa:
                  </td>
                  <td className="py-2 px-2 font-mono text-right text-indigo-950">
                    Rp {totalServicesCostPerUnit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-2 font-mono text-right text-indigo-950">
                    Rp {totalServicesBatchCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Rekapitulasi Summary Box */}
          <div className="mt-5 p-4 rounded-xl bg-amber-50/70 border border-amber-300">
            <h3 className="text-xs font-black uppercase text-amber-950 mb-2">
              Rekapitulasi HPP Sesuai Jumlah Pesanan ({orderQuantity.toLocaleString('id-ID')} Pcs)
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2 p-3 bg-emerald-800 text-white rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-100 uppercase">
                    TOTAL HPP BIAYA PESANAN ({orderQuantity.toLocaleString('id-ID')} PCS):
                  </span>
                  <div className="font-mono text-xl font-black">
                    Rp {totalBatchCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-100 block">Total Nilai Penjualan:</span>
                  <span className="font-mono font-bold text-base">
                    Rp {(recommendedSellingPricePerUnit * orderQuantity).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-slate-600">Total Accessories ({orderQuantity} Pcs):</span>{' '}
                <strong className="font-mono text-slate-900">
                  Rp {totalAccessoriesBatchCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                </strong>
                <span className="text-[9.5px] text-slate-500 block">
                  (Rp {totalAccessoriesCostPerUnit.toLocaleString('id-ID', { minimumFractionDigits: 2 })}/pcs)
                </span>
              </div>
              <div>
                <span className="text-slate-600">Total Biaya Jasa ({orderQuantity} Pcs):</span>{' '}
                <strong className="font-mono text-indigo-950">
                  Rp {totalServicesBatchCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                </strong>
                <span className="text-[9.5px] text-indigo-700 block">
                  (Rp {totalServicesCostPerUnit.toLocaleString('id-ID', { minimumFractionDigits: 2 })}/pcs)
                </span>
              </div>
              <div className="pt-1 border-t border-amber-200">
                <span className="text-slate-800 font-bold">HPP Dasar / Pcs:</span>{' '}
                <strong className="font-mono text-emerald-950 text-sm">
                  Rp {totalCostPerUnit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
              <div className="pt-1 border-t border-amber-200">
                <span className="text-slate-800 font-bold">Estimasi Laba Pesanan:</span>{' '}
                <strong className="font-mono text-emerald-700 text-sm">
                  + Rp {estimatedTotalProfitBatch.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                </strong>
              </div>
              <div>
                <span className="text-amber-900 font-semibold">Target Markup Keuntungan:</span>{' '}
                <strong className="text-amber-950">{targetMarkupPercent}%</strong>
              </div>
              <div>
                <span className="text-amber-900 font-semibold">Rekomendasi Jual / Pcs:</span>{' '}
                <strong className="font-mono text-amber-950 text-sm">
                  Rp {recommendedSellingPricePerUnit.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                </strong>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
            <div>
              <div className="text-slate-500">Dibuat Oleh:</div>
              <div className="h-14"></div>
              <div className="font-bold text-slate-900 border-t border-slate-400 pt-1">
                ( Staff Estimasi Biaya )
              </div>
            </div>
            <div>
              <div className="text-slate-500">Diperiksa:</div>
              <div className="h-14"></div>
              <div className="font-bold text-slate-900 border-t border-slate-400 pt-1">
                ( Manager Keuangan )
              </div>
            </div>
            <div>
              <div className="text-slate-500">Disetujui:</div>
              <div className="h-14"></div>
              <div className="font-bold text-slate-900 border-t border-slate-400 pt-1">
                ( Direktur Operasional )
              </div>
            </div>
          </div>

          {/* Sheet Footer */}
          <div className="mt-6 pt-2 border-t border-slate-200 text-center text-[10px] text-slate-400">
            Dicetak secara otomatis dari Sistem GarmentPro • {new Date().toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      {/* Modal Dialog Cetak & Ekspor Laporan Costing Multi-Halaman Proporsional */}
      {isPrintCostingModalOpen && (
        <PrintCostingReportModal
          costing={currentCostingRecord}
          companyProfile={companyProfile}
          autoAction={printCostingAutoAction}
          onClose={() => {
            setIsPrintCostingModalOpen(false);
            setPrintCostingAutoAction(null);
          }}
        />
      )}
    </div>
  );
};
