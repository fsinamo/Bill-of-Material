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
  SHEETS_CONFIG_BACKUP: 'garment_sheets_config_permanent_backup_v1',
  WEBAPP_URL_PERMANENT: 'garment_permanent_webapp_url_v1',
  SYNC_LOGS: 'garment_sync_logs_v1',
  COMPANY_PROFILE: 'garment_company_profile_v1',
  THEME: 'garment_app_theme_v1',
};

export interface CompanyProfile {
  companyName: string;
  companyLogo?: string;
  defaultBuyerName?: string;
}

// IndexedDB helper for settings that persist even when browser clears localStorage
const IDB_NAME = 'GarmentPro_DB';
const IDB_STORE = 'app_settings';

function openSettingsDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const target = event.target as IDBOpenDBRequest;
        const db = target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveToIndexedDB(key: string, value: unknown): Promise<void> {
  try {
    const db = await openSettingsDB();
    if (!db) return;
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.put({ key, value });
  } catch (e) {
    console.warn('IDB write fallback warning:', e);
  }
}

async function getFromIndexedDB<T>(key: string): Promise<T | null> {
  try {
    const db = await openSettingsDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? (req.result.value as T) : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
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
        companyName: 'CV. RAVINA',
        companyLogo: '',
        defaultBuyerName: '-',
      };
      this.saveCompanyProfile(defaultProfile);
      return defaultProfile;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return {
        companyName: 'CV. RAVINA',
        companyLogo: '',
        defaultBuyerName: '-',
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
      // Migrate each item to ensure category and cutting division properties are defined
      const migrated: Accessory[] = parsed.map((a): Accessory => {
        const defaultMatch = INITIAL_ACCESSORIES.find((init) => init.id === a.id);
        return {
          ...a,
          category: a.category || (a.defaultRawMaterialId ? 'raw_material_based' : 'ready_made'),
          rawMaterialSize: a.rawMaterialSize || defaultMatch?.rawMaterialSize,
          pieceCuttingSize: a.pieceCuttingSize || defaultMatch?.pieceCuttingSize,
          divisionFormula: a.divisionFormula || defaultMatch?.divisionFormula,
          differentSizeNotes: a.differentSizeNotes || defaultMatch?.differentSizeNotes,
          materialUsagePerPcs: a.materialUsagePerPcs || (a.defaultYieldPerUnit && a.defaultYieldPerUnit > 0 ? Number((1 / a.defaultYieldPerUnit).toFixed(6)) : defaultMatch?.materialUsagePerPcs),
        };
      });
      // If no ready-made accessory is present, seed the defaults
      const hasReadyMade = migrated.some((a) => a.category === 'ready_made');
      let currentList: Accessory[] = migrated;
      if (!hasReadyMade) {
        const readyDefaults: Accessory[] = INITIAL_ACCESSORIES.filter((a) => a.category === 'ready_made');
        currentList = [...currentList, ...readyDefaults];
      }
      // If no service / jasa is present, seed default jasa
      const hasService = currentList.some((a) => a.category === 'service');
      if (!hasService) {
        const serviceDefaults: Accessory[] = INITIAL_ACCESSORIES.filter((a) => a.category === 'service');
        if (serviceDefaults.length > 0) {
          currentList = [...currentList, ...serviceDefaults];
        }
      }
      if (currentList.length !== parsed.length) {
        this.saveAccessories(currentList);
      }
      return currentList;
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

  // Sheets Config with Multi-Tier Permanent Persistence (Server, IDB, LocalStorage Primary & Backup)
  getSheetsConfig(): GoogleSheetsConfig {
    let config: GoogleSheetsConfig | null = null;
    const raw = localStorage.getItem(KEYS.SHEETS_CONFIG);
    if (raw) {
      try {
        config = JSON.parse(raw);
      } catch {
        config = null;
      }
    }

    // Fallback 1: check permanent backup config if webAppUrl is missing
    if (!config?.webAppUrl) {
      const backupRaw = localStorage.getItem(KEYS.SHEETS_CONFIG_BACKUP);
      if (backupRaw) {
        try {
          const parsedBackup = JSON.parse(backupRaw);
          if (parsedBackup?.webAppUrl) {
            config = { ...(config || {}), ...parsedBackup };
          }
        } catch {
          // ignore
        }
      }
    }

    // Fallback 2: check isolated permanent webapp url key
    if (!config?.webAppUrl) {
      const isolatedUrl = localStorage.getItem(KEYS.WEBAPP_URL_PERMANENT);
      if (isolatedUrl && isolatedUrl.trim()) {
        config = {
          ...(config || {
            spreadsheetName: 'Data_Produksi_Garment_Konsumsi_Bahan',
            autoSyncOnSave: true,
          }),
          webAppUrl: isolatedUrl.trim(),
        };
      }
    }

    if (!config) {
      config = {
        webAppUrl: '',
        spreadsheetName: 'Data_Produksi_Garment_Konsumsi_Bahan',
        autoSyncOnSave: true,
      };
    }

    return config;
  },

  saveSheetsConfig(config: GoogleSheetsConfig): void {
    // 1. Primary localStorage
    localStorage.setItem(KEYS.SHEETS_CONFIG, JSON.stringify(config));

    // 2. If valid webAppUrl is present, write to multiple independent backup keys
    if (config.webAppUrl && config.webAppUrl.trim()) {
      const cleanUrl = config.webAppUrl.trim();
      const updatedConfig = { ...config, webAppUrl: cleanUrl };
      localStorage.setItem(KEYS.SHEETS_CONFIG_BACKUP, JSON.stringify(updatedConfig));
      localStorage.setItem(KEYS.WEBAPP_URL_PERMANENT, cleanUrl);

      // 3. Save to IndexedDB
      saveToIndexedDB('sheetsConfig', updatedConfig);
      saveToIndexedDB('webAppUrl', cleanUrl);

      // 4. Save to Server Disk via /api/sheets-config
      fetch('/api/sheets-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig),
      }).catch((err) => {
        console.warn('Background server sync for sheets config:', err);
      });
    } else {
      // If user deliberately wants to clear, update IDB & server as well
      saveToIndexedDB('sheetsConfig', config);
      fetch('/api/sheets-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      }).catch(() => {});
    }
  },

  async syncPermanentSheetsConfig(): Promise<GoogleSheetsConfig | null> {
    const local = this.getSheetsConfig();

    // Check server first
    try {
      const res = await fetch('/api/sheets-config');
      if (res.ok) {
        const serverConfig: GoogleSheetsConfig = await res.json();
        // If server has a configured webAppUrl and local doesn't, or server is newer
        if (serverConfig.webAppUrl && serverConfig.webAppUrl.trim()) {
          this.saveSheetsConfig(serverConfig);
          return serverConfig;
        } else if (local.webAppUrl && local.webAppUrl.trim()) {
          // Local has it but server doesn't -> push local to server!
          fetch('/api/sheets-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(local),
          }).catch(() => {});
        }
      }
    } catch {
      // Server might be unreachable (offline)
    }

    // Check IndexedDB if local is still missing url
    if (!local.webAppUrl) {
      try {
        const idbConfig = await getFromIndexedDB<GoogleSheetsConfig>('sheetsConfig');
        const idbUrl = await getFromIndexedDB<string>('webAppUrl');
        const restoredUrl = idbConfig?.webAppUrl || idbUrl;
        if (restoredUrl) {
          const restored = { ...local, webAppUrl: restoredUrl };
          this.saveSheetsConfig(restored);
          return restored;
        }
      } catch {
        // ignore
      }
    }

    return local;
  },

  clearSheetsConfigPermanently(): GoogleSheetsConfig {
    const cleared: GoogleSheetsConfig = {
      webAppUrl: '',
      spreadsheetName: 'Data_Produksi_Garment_Konsumsi_Bahan',
      autoSyncOnSave: true,
    };
    localStorage.removeItem(KEYS.SHEETS_CONFIG);
    localStorage.removeItem(KEYS.SHEETS_CONFIG_BACKUP);
    localStorage.removeItem(KEYS.WEBAPP_URL_PERMANENT);
    saveToIndexedDB('sheetsConfig', cleared);
    saveToIndexedDB('webAppUrl', '');
    fetch('/api/sheets-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleared),
    }).catch(() => {});
    return cleared;
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
