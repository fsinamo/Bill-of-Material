export interface ProductAccessoryRelation {
  accessoryId: string;
  qtyPerProduct: number;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  description?: string;
  accessories: ProductAccessoryRelation[];
  createdAt: string;
  updatedAt: string;
}

export interface RawMaterial {
  id: string;
  code: string;
  name: string;
  specification: string;
  unit: string;
  currentStock: number;
  unitPrice?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type AccessoryCategory = 'ready_made' | 'raw_material_based' | 'service';

export interface Accessory {
  id: string;
  code: string;
  name: string;
  unit: string;
  category: AccessoryCategory; // 'ready_made' (Accessories Jadi) | 'raw_material_based' (Membutuhkan Bahan Baku) | 'service' (Jasa / Biaya Pengerjaan)
  purchasePrice?: number; // Harga beli satuan (Rp) jika accessories jadi ATAU tarif jasa (Rp) jika jasa
  defaultRawMaterialId?: string; // ID bahan baku jika membutuhkan bahan baku
  defaultYieldPerUnit?: number; // Yield / hasil per 1 unit bahan baku jika membutuhkan bahan baku
  materialUsagePerPcs?: number; // Pemakaian bahan per pcs accessories (1 / Yield, misal 1 / 160 = 0.006250)
  rawMaterialSize?: string; // Ukuran / dimensi bahan baku acuan (misal: "120 x 36 cm (4.320 cm²)" atau "100 cm")
  pieceCuttingSize?: string; // Ukuran potong per pcs (misal: "3.0 x 3.0 cm (9.28 cm²)" atau "5 cm")
  divisionFormula?: string; // Angka / rumus pembagian bahan dengan hasil (misal: "4.320 cm² ÷ 9.28 cm² = 465 pcs/lembar")
  differentSizeNotes?: string; // Acuan jika menggunakan ukuran bahan baku yang berbeda (misal: "Acuan: Bahan baru ÷ 9.28 cm² = Yield baru")
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCostingItem {
  accessoryId: string;
  accessoryName: string;
  accessoryCategory: AccessoryCategory;
  rawMaterialName?: string;
  rawMaterialUnitPrice?: number;
  yieldPerUnit?: number;
  materialUsagePerPcs?: number; // Pemakaian bahan baku per pcs (1 / yield)
  rawMaterialSize?: string;
  pieceCuttingSize?: string;
  divisionFormula?: string;
  differentSizeNotes?: string;
  unitPrice: number; // Harga per satuan accessory / tarif jasa (Rp)
  usageQtyPerProduct: number; // Jumlah pemakaian / frekuensi pengerjaan per pcs produk
  totalUsageQty: number; // Total pemakaian untuk seluruh pesanan
  totalCostPerProduct: number; // Biaya per pcs produk (usageQtyPerProduct * unitPrice)
  totalCostBatch: number; // Total biaya batch pesanan (totalUsageQty * unitPrice)
  notes?: string;
}

export interface ProductCostingRecord {
  id: string;
  costingNumber: string;
  title: string;
  companyName?: string; // Nama perusahaan kop surat
  productId: string;
  productName: string;
  productCode: string;
  productCategory?: string;
  orderQuantity: number;
  items: ProductCostingItem[];
  totalCostPerUnit: number; // Total HPP / Biaya per 1 pcs produk (Accessories + Jasa)
  totalBatchCost: number; // Total Biaya untuk seluruh orderQuantity
  totalAccessoriesCostPerUnit?: number; // Subtotal Biaya Aksesoris per pcs
  totalServicesCostPerUnit?: number; // Subtotal Biaya Jasa per pcs
  totalAccessoriesBatchCost?: number; // Subtotal Biaya Aksesoris batch
  totalServicesBatchCost?: number; // Subtotal Biaya Jasa batch
  targetMarkupPercent?: number; // Margin keuntungan (%)
  targetSellingPricePerUnit?: number; // Estimasi harga jual rekomendasi per unit
  calculationDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsumptionDetail {
  accessoryId: string;
  accessoryName: string;
  qtyPerProduct: number;
  totalAccessoryNeeded: number;
  rawMaterialId: string;
  rawMaterialName: string;
  rawMaterialSpec: string;
  rawMaterialUnit: string;
  yieldPerUnit: number; // pcs produced per 1 raw material unit
  materialUsagePerPcs?: number; // 1 / yieldPerUnit (misal 1 / 160 = 0.006250 lembar/pcs)
  rawMaterialCalculated: number; // totalAccessoryNeeded / yieldPerUnit (atau totalAccessoryNeeded * materialUsagePerPcs)
  allowancePercent: number; // % waste/afval/tolerance
  rawMaterialWithAllowance: number;
  rawMaterialSize?: string; // Ukuran / dimensi bahan baku acuan
  pieceCuttingSize?: string; // Ukuran potong per pcs
  divisionFormula?: string; // Angka & rumus pembagian bahan dengan hasil
  differentSizeNotes?: string; // Acuan jika menggunakan ukuran bahan berbeda
}

export interface RawMaterialSummary {
  rawMaterialId: string;
  rawMaterialName: string;
  specification: string;
  unit: string;
  totalRequired: number; // decimal (e.g. 26.61)
  roundedRequired: number; // Math.ceil (e.g. 27)
  breakdown: Array<{
    accessoryName: string;
    accessoryQty: number;
    yieldPerUnit: number;
    materialUsagePerPcs?: number;
    rawMaterialPortion: number;
    divisionFormula?: string;
    differentSizeNotes?: string;
  }>;
}

export interface CalculationRecord {
  id: string;
  calculationNumber: string;
  title: string;
  companyName?: string;
  companyLogo?: string;
  buyerName?: string;
  productId: string;
  productName: string;
  orderQuantity: number;
  customerOrPoRef?: string;
  calculationDate: string;
  details: ConsumptionDetail[];
  summary: RawMaterialSummary[];
  notes?: string;
  syncStatus: 'synced' | 'pending' | 'failed' | 'local_only';
  syncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleSheetsConfig {
  webAppUrl: string;
  spreadsheetName?: string;
  autoSyncOnSave: boolean;
  lastSyncTimestamp?: string;
}

export interface SyncLog {
  id: string;
  timestamp: string;
  action: string;
  status: 'success' | 'error';
  message: string;
}

export type AppThemeId =
  | 'army-green'
  | 'camo-forest'
  | 'desert-khaki'
  | 'stealth-black'
  | 'navy-blue';

export interface AppThemeConfig {
  id: AppThemeId;
  name: string;
  tagline: string;
  primaryColor: string;
  badgeBg: string;
  headerBg: string;
  accentText: string;
  militaryTone: string;
}
