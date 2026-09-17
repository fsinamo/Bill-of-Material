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

export interface Accessory {
  id: string;
  code: string;
  name: string;
  unit: string;
  defaultRawMaterialId: string;
  defaultYieldPerUnit: number; // e.g. 1 sheet of raw material yields X pieces of this accessory
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
