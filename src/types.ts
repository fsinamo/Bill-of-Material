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

export type AccessoryCategory = 'ready_made' | 'raw_material_based';

export interface Accessory {
  id: string;
  code: string;
  name: string;
  unit: string;
  category: AccessoryCategory; // 'ready_made' (Accessories Jadi) | 'raw_material_based' (Membutuhkan Bahan Baku)
  purchasePrice?: number; // Harga beli satuan (Rp) jika accessories jadi
  defaultRawMaterialId?: string; // ID bahan baku jika membutuhkan bahan baku
  defaultYieldPerUnit?: number; // Yield / hasil per 1 unit bahan baku jika membutuhkan bahan baku
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
  unitPrice: number; // Harga per satuan accessory (Rp)
  usageQtyPerProduct: number; // Jumlah pemakaian per pcs produk
  totalUsageQty: number; // Total pemakaian untuk seluruh pesanan
  totalCostPerProduct: number; // Biaya per pcs produk (usageQtyPerProduct * unitPrice)
  totalCostBatch: number; // Total biaya batch pesanan (totalUsageQty * unitPrice)
  notes?: string;
}

export interface ProductCostingRecord {
  id: string;
  costingNumber: string;
  title: string;
  productId: string;
  productName: string;
  productCode: string;
  productCategory?: string;
  orderQuantity: number;
  items: ProductCostingItem[];
  totalCostPerUnit: number; // Total HPP / Biaya Accessories per 1 pcs produk
  totalBatchCost: number; // Total Biaya Accessories untuk seluruh orderQuantity
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
  rawMaterialCalculated: number; // totalAccessoryNeeded / yieldPerUnit
  allowancePercent: number; // % waste/afval/tolerance
  rawMaterialWithAllowance: number;
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
    rawMaterialPortion: number;
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
