import { Product, RawMaterial, Accessory, CalculationRecord, GoogleSheetsConfig, SyncLog, AppThemeId, ProductCostingRecord } from '../types';
import { INITIAL_PRODUCTS, INITIAL_RAW_MATERIALS, INITIAL_ACCESSORIES, INITIAL_CALCULATIONS } from '../data/defaultData';
import { DEFAULT_THEME_ID } from '../data/themes';

const KEYS = {
  PRODUCTS: 'garment_master_products_v1',
  RAW_MATERIALS: 'garment_master_raw_materials_v1',
  ACCESSORIES: 'garment_master_accessories_v1',
  CALCULATIONS: 'garment_calculations_v1',
  COSTINGS: 'garment_product_costings_v1',
  SHEETS_CONFIG: 'garment_sheets_config_v1',
  SYNC_LOGS: 'garment_sync_logs_v1',
  COMPANY_PROFILE: 'garment_company_profile_v1',
  THEME: 'garment_app_theme_v1',
};

export interface CompanyProfile {
  companyName: string;
  companyLogo?: string;
  defaultBuyerName?: string;
}

export const storageService = {
  // Theme Settings
  getTheme(): AppThemeId {
    const raw = localStorage.getItem(KEYS.THEME) as AppThemeId | null;
    if (raw && ['army-green', 'camo-forest', 'desert-khaki', 'stealth-black', 'navy-blue'].includes(raw)) {
      return raw;
    }
    return DEFAULT_THEME_ID;
  },

  saveTheme(theme: AppThemeId): void {
    localStorage.setItem(KEYS.THEME, theme);
  },

  // Company Profile Settings
  getCompanyProfile(): CompanyProfile {
    const raw = localStorage.getItem(KEYS.COMPANY_PROFILE);
    if (!raw) {
      const defaultProfile: CompanyProfile = {
        companyName: 'PT. GARMENT PRESISI NUSANTARA',
        companyLogo: '',
        defaultBuyerName: 'MABES TNI / KEMHAN RI',
      };
      this.saveCompanyProfile(defaultProfile);
      return defaultProfile;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return {
        companyName: 'PT. GARMENT PRESISI NUSANTARA',
        companyLogo: '',
        defaultBuyerName: 'MABES TNI / KEMHAN RI',
      };
    }
  },

  saveCompanyProfile(profile: CompanyProfile): void {
    localStorage.setItem(KEYS.COMPANY_PROFILE, JSON.stringify(profile));
  },
  // Master Products
  getProducts(): Product[] {
    const raw = localStorage.getItem(KEYS.PRODUCTS);
    if (!raw) {
      this.saveProducts(INITIAL_PRODUCTS);
      return INITIAL_PRODUCTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_PRODUCTS;
    }
  },

  saveProducts(products: Product[]): void {
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  },

  // Master Raw Materials
  getRawMaterials(): RawMaterial[] {
    const raw = localStorage.getItem(KEYS.RAW_MATERIALS);
    if (!raw) {
      this.saveRawMaterials(INITIAL_RAW_MATERIALS);
      return INITIAL_RAW_MATERIALS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_RAW_MATERIALS;
    }
  },

  saveRawMaterials(materials: RawMaterial[]): void {
    localStorage.setItem(KEYS.RAW_MATERIALS, JSON.stringify(materials));
  },

  // Master Accessories
  getAccessories(): Accessory[] {
    const raw = localStorage.getItem(KEYS.ACCESSORIES);
    if (!raw) {
      this.saveAccessories(INITIAL_ACCESSORIES);
      return INITIAL_ACCESSORIES;
    }
    try {
      const parsed: Accessory[] = JSON.parse(raw);
      // Migrate each item to ensure category is defined
      const migrated = parsed.map((a) => ({
        ...a,
        category: a.category || (a.defaultRawMaterialId ? 'raw_material_based' : 'ready_made'),
      }));
      // If no ready-made accessory is present, seed the defaults
      const hasReadyMade = migrated.some((a) => a.category === 'ready_made');
      if (!hasReadyMade) {
        const readyDefaults = INITIAL_ACCESSORIES.filter((a) => a.category === 'ready_made');
        const merged = [...migrated, ...readyDefaults];
        this.saveAccessories(merged);
        return merged;
      }
      return migrated;
    } catch {
      return INITIAL_ACCESSORIES;
    }
  },

  saveAccessories(accessories: Accessory[]): void {
    localStorage.setItem(KEYS.ACCESSORIES, JSON.stringify(accessories));
  },

  // Product Costing Records
  getProductCostings(): ProductCostingRecord[] {
    const raw = localStorage.getItem(KEYS.COSTINGS);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveProductCostings(costings: ProductCostingRecord[]): void {
    localStorage.setItem(KEYS.COSTINGS, JSON.stringify(costings));
  },

  saveSingleProductCosting(costing: ProductCostingRecord): ProductCostingRecord[] {
    const list = this.getProductCostings();
    const existingIndex = list.findIndex((c) => c.id === costing.id);
    let updated: ProductCostingRecord[];
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = costing;
    } else {
      updated = [costing, ...list];
    }
    this.saveProductCostings(updated);
    return updated;
  },

  deleteProductCosting(id: string): ProductCostingRecord[] {
    const list = this.getProductCostings();
    const updated = list.filter((c) => c.id !== id);
    this.saveProductCostings(updated);
    return updated;
  },

  // Calculations
  getCalculations(): CalculationRecord[] {
    const raw = localStorage.getItem(KEYS.CALCULATIONS);
    if (!raw) {
      this.saveCalculations(INITIAL_CALCULATIONS);
      return INITIAL_CALCULATIONS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_CALCULATIONS;
    }
  },

  saveCalculations(calculations: CalculationRecord[]): void {
    localStorage.setItem(KEYS.CALCULATIONS, JSON.stringify(calculations));
  },

  saveSingleCalculation(calculation: CalculationRecord): CalculationRecord[] {
    const list = this.getCalculations();
    const existingIndex = list.findIndex((c) => c.id === calculation.id);
    let updated: CalculationRecord[];
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = calculation;
    } else {
      updated = [calculation, ...list];
    }
    this.saveCalculations(updated);
    return updated;
  },

  deleteCalculation(id: string): CalculationRecord[] {
    const list = this.getCalculations();
    const updated = list.filter((c) => c.id !== id);
    this.saveCalculations(updated);
    return updated;
  },

  // Sheets Config
  getSheetsConfig(): GoogleSheetsConfig {
    const raw = localStorage.getItem(KEYS.SHEETS_CONFIG);
    if (!raw) {
      const defaultConfig: GoogleSheetsConfig = {
        webAppUrl: '',
        spreadsheetName: 'Data_Produksi_Garment_Konsumsi_Bahan',
        autoSyncOnSave: true,
      };
      this.saveSheetsConfig(defaultConfig);
      return defaultConfig;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return {
        webAppUrl: '',
        autoSyncOnSave: true,
      };
    }
  },

  saveSheetsConfig(config: GoogleSheetsConfig): void {
    localStorage.setItem(KEYS.SHEETS_CONFIG, JSON.stringify(config));
  },

  // Sync Logs
  getSyncLogs(): SyncLog[] {
    const raw = localStorage.getItem(KEYS.SYNC_LOGS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  addSyncLog(log: Omit<SyncLog, 'id' | 'timestamp'>): void {
    const logs = this.getSyncLogs();
    const newLog: SyncLog = {
      ...log,
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
    };
    const updated = [newLog, ...logs].slice(0, 50); // keep last 50
    localStorage.setItem(KEYS.SYNC_LOGS, JSON.stringify(updated));
  },

  // Reset to default data
  resetAllToDefault(): void {
    this.saveProducts(INITIAL_PRODUCTS);
    this.saveRawMaterials(INITIAL_RAW_MATERIALS);
    this.saveAccessories(INITIAL_ACCESSORIES);
    this.saveCalculations(INITIAL_CALCULATIONS);
  },
};
