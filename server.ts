import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  INITIAL_RAW_MATERIALS,
  INITIAL_ACCESSORIES,
  INITIAL_PRODUCTS,
  INITIAL_CALCULATIONS,
  INITIAL_COSTINGS,
} from './src/data/defaultData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'sheets-config.json');
const URL_BACKUP_FILE = path.join(DATA_DIR, 'webapp-url.txt');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper to get persistent webAppUrl from either config file or dedicated text backup
const SECONDARY_BACKUP_FILE = path.join(DATA_DIR, 'sheets-url-permanent.txt');

const getPersistentWebAppUrl = (): string => {
  if (fs.existsSync(URL_BACKUP_FILE)) {
    try {
      const txt = fs.readFileSync(URL_BACKUP_FILE, 'utf-8').trim();
      if (txt) return txt;
    } catch {}
  }
  if (fs.existsSync(SECONDARY_BACKUP_FILE)) {
    try {
      const txt = fs.readFileSync(SECONDARY_BACKUP_FILE, 'utf-8').trim();
      if (txt) return txt;
    } catch {}
  }
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed?.webAppUrl && typeof parsed.webAppUrl === 'string' && parsed.webAppUrl.trim()) {
        return parsed.webAppUrl.trim();
      }
    } catch {}
  }
  if (process.env.VITE_GOOGLE_SHEETS_WEBAPP_URL && process.env.VITE_GOOGLE_SHEETS_WEBAPP_URL.trim()) {
    return process.env.VITE_GOOGLE_SHEETS_WEBAPP_URL.trim();
  }
  if (process.env.GOOGLE_SHEETS_WEBAPP_URL && process.env.GOOGLE_SHEETS_WEBAPP_URL.trim()) {
    return process.env.GOOGLE_SHEETS_WEBAPP_URL.trim();
  }
  return '';
};

// Ensure sheets-config.json exists and sanitize on startup
if (!fs.existsSync(CONFIG_FILE)) {
  const existingUrl = getPersistentWebAppUrl();
  const initialConfig = {
    webAppUrl: existingUrl,
    spreadsheetName: 'Data_Produksi_Garment_Konsumsi_Bahan',
    autoSyncOnSave: true,
    lastUpdated: new Date().toISOString()
  };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(initialConfig, null, 2), 'utf-8');
} else {
  // Sanitize existing file
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    let dirty = false;
    if ('clearExplicitly' in parsed) {
      delete parsed.clearExplicitly;
      dirty = true;
    }
    const backupUrl = getPersistentWebAppUrl();
    if (!parsed.webAppUrl && backupUrl) {
      parsed.webAppUrl = backupUrl;
      dirty = true;
    }
    if (dirty) {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
    }
  } catch {}
}

// API: Dedicated simple URL endpoints for fast atomic persistence
app.get('/api/sheets-url', (req, res) => {
  const url = getPersistentWebAppUrl();
  return res.json({ webAppUrl: url });
});

app.post('/api/sheets-url', (req, res) => {
  try {
    const { webAppUrl, clearExplicitly } = req.body || {};
    if (clearExplicitly) {
      if (fs.existsSync(URL_BACKUP_FILE)) {
        try { fs.unlinkSync(URL_BACKUP_FILE); } catch {}
      }
      if (fs.existsSync(SECONDARY_BACKUP_FILE)) {
        try { fs.unlinkSync(SECONDARY_BACKUP_FILE); } catch {}
      }
      if (fs.existsSync(CONFIG_FILE)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
          delete parsed.clearExplicitly;
          parsed.webAppUrl = '';
          fs.writeFileSync(CONFIG_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
        } catch {}
      }
      return res.json({ success: true, webAppUrl: '' });
    }

    const clean = (typeof webAppUrl === 'string') ? webAppUrl.trim() : '';
    if (clean) {
      fs.writeFileSync(URL_BACKUP_FILE, clean, 'utf-8');
      fs.writeFileSync(SECONDARY_BACKUP_FILE, clean, 'utf-8');
      let existing: any = {};
      if (fs.existsSync(CONFIG_FILE)) {
        try { existing = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')); } catch {}
      }
      delete existing.clearExplicitly;
      const updated = {
        ...existing,
        webAppUrl: clean,
        lastUpdated: new Date().toISOString(),
      };
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
      return res.json({ success: true, webAppUrl: clean });
    }
    return res.json({ success: true, webAppUrl: getPersistentWebAppUrl() });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to save URL' });
  }
});

// API: Get Google Sheets configuration
app.get('/api/sheets-config', (req, res) => {
  try {
    let parsed: any = {
      webAppUrl: '',
      spreadsheetName: 'Data_Produksi_Garment_Konsumsi_Bahan',
      autoSyncOnSave: true
    };

    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      parsed = JSON.parse(data);
      if ('clearExplicitly' in parsed) {
        delete parsed.clearExplicitly;
      }
    }

    // Always ensure webAppUrl fallback from dedicated persistent backup files if missing
    if (!parsed.webAppUrl) {
      const backupUrl = getPersistentWebAppUrl();
      if (backupUrl) {
        parsed.webAppUrl = backupUrl;
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
      }
    }

    return res.json(parsed);
  } catch (error) {
    console.error('Error reading sheets config:', error);
    return res.status(500).json({ error: 'Failed to read sheets configuration' });
  }
});

// API: Save Google Sheets configuration permanently
app.post('/api/sheets-config', (req, res) => {
  try {
    const newConfig = req.body;
    if (!newConfig || typeof newConfig !== 'object') {
      return res.status(400).json({ error: 'Invalid configuration payload' });
    }

    // Merge with existing config if present
    let existing: any = {};
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        existing = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      } catch {
        existing = {};
      }
    }
    delete existing.clearExplicitly;

    const clearExplicitly = Boolean(newConfig.clearExplicitly);

    let targetUrl = '';
    if (clearExplicitly) {
      targetUrl = '';
      if (fs.existsSync(URL_BACKUP_FILE)) {
        try { fs.unlinkSync(URL_BACKUP_FILE); } catch {}
      }
      if (fs.existsSync(SECONDARY_BACKUP_FILE)) {
        try { fs.unlinkSync(SECONDARY_BACKUP_FILE); } catch {}
      }
    } else {
      const incomingUrl = (newConfig.webAppUrl && typeof newConfig.webAppUrl === 'string') ? newConfig.webAppUrl.trim() : '';
      const backupUrl = getPersistentWebAppUrl();
      // If incomingUrl is present, update. If incomingUrl is empty, PRESERVE existing URL!
      targetUrl = incomingUrl || existing.webAppUrl || backupUrl || '';

      // Persist to backup text files whenever valid
      if (targetUrl) {
        fs.writeFileSync(URL_BACKUP_FILE, targetUrl, 'utf-8');
        fs.writeFileSync(SECONDARY_BACKUP_FILE, targetUrl, 'utf-8');
      }
    }

    const merged = {
      ...existing,
      ...newConfig,
      webAppUrl: targetUrl,
      lastUpdated: new Date().toISOString()
    };

    // NEVER store clearExplicitly flag inside persistent config file
    delete merged.clearExplicitly;

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    return res.json({ success: true, config: merged });
  } catch (error) {
    console.error('Error saving sheets config:', error);
    return res.status(500).json({ error: 'Failed to persist sheets configuration' });
  }
});

const COSTINGS_FILE = path.join(DATA_DIR, 'costings.json');
const CALCULATIONS_FILE = path.join(DATA_DIR, 'calculations.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const MATERIALS_FILE = path.join(DATA_DIR, 'materials.json');
const ACCESSORIES_FILE = path.join(DATA_DIR, 'accessories.json');

// Helper to read or seed array file
const readOrSeed = (filePath: string, defaultData: any[]) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    return parsed;
  } catch {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }
};

// Ensure data files exist with default seeds if empty
readOrSeed(CALCULATIONS_FILE, INITIAL_CALCULATIONS);
readOrSeed(PRODUCTS_FILE, INITIAL_PRODUCTS);
readOrSeed(MATERIALS_FILE, INITIAL_RAW_MATERIALS);
readOrSeed(ACCESSORIES_FILE, INITIAL_ACCESSORIES);

readOrSeed(COSTINGS_FILE, INITIAL_COSTINGS);

// API: Get Product Costing records permanently stored on server
app.get('/api/costings', (req, res) => {
  try {
    if (fs.existsSync(COSTINGS_FILE)) {
      const data = fs.readFileSync(COSTINGS_FILE, 'utf-8');
      return res.json(JSON.parse(data));
    }
    return res.json([]);
  } catch (error) {
    console.error('Error reading costings:', error);
    return res.status(500).json({ error: 'Failed to read costings' });
  }
});

// API: Save Product Costing records permanently on server
app.post('/api/costings', (req, res) => {
  try {
    const costings = req.body;
    if (!Array.isArray(costings)) {
      return res.status(400).json({ error: 'Payload must be an array of costings' });
    }
    fs.writeFileSync(COSTINGS_FILE, JSON.stringify(costings, null, 2), 'utf-8');
    return res.json({ success: true, count: costings.length });
  } catch (error) {
    console.error('Error saving costings:', error);
    return res.status(500).json({ error: 'Failed to persist costings' });
  }
});

// API: Get Calculation records permanently stored on server
app.get('/api/calculations', (req, res) => {
  try {
    if (fs.existsSync(CALCULATIONS_FILE)) {
      const data = fs.readFileSync(CALCULATIONS_FILE, 'utf-8');
      return res.json(JSON.parse(data));
    }
    return res.json([]);
  } catch (error) {
    console.error('Error reading calculations:', error);
    return res.status(500).json({ error: 'Failed to read calculations' });
  }
});

// API: Save Calculation records permanently on server
app.post('/api/calculations', (req, res) => {
  try {
    const calculations = req.body;
    if (!Array.isArray(calculations)) {
      return res.status(400).json({ error: 'Payload must be an array of calculations' });
    }
    fs.writeFileSync(CALCULATIONS_FILE, JSON.stringify(calculations, null, 2), 'utf-8');
    return res.json({ success: true, count: calculations.length });
  } catch (error) {
    console.error('Error saving calculations:', error);
    return res.status(500).json({ error: 'Failed to persist calculations' });
  }
});

// API: Master Products
app.get('/api/products', (req, res) => {
  try {
    if (fs.existsSync(PRODUCTS_FILE)) {
      const data = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
      return res.json(JSON.parse(data));
    }
    return res.json([]);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to read products' });
  }
});

app.post('/api/products', (req, res) => {
  try {
    const products = req.body;
    if (!Array.isArray(products)) return res.status(400).json({ error: 'Invalid payload' });
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8');
    return res.json({ success: true, count: products.length });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save products' });
  }
});

// API: Master Materials
app.get('/api/raw-materials', (req, res) => {
  try {
    if (fs.existsSync(MATERIALS_FILE)) {
      const data = fs.readFileSync(MATERIALS_FILE, 'utf-8');
      return res.json(JSON.parse(data));
    }
    return res.json([]);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to read materials' });
  }
});

app.post('/api/raw-materials', (req, res) => {
  try {
    const materials = req.body;
    if (!Array.isArray(materials)) return res.status(400).json({ error: 'Invalid payload' });
    fs.writeFileSync(MATERIALS_FILE, JSON.stringify(materials, null, 2), 'utf-8');
    return res.json({ success: true, count: materials.length });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save materials' });
  }
});

// API: Master Accessories
app.get('/api/accessories', (req, res) => {
  try {
    if (fs.existsSync(ACCESSORIES_FILE)) {
      const data = fs.readFileSync(ACCESSORIES_FILE, 'utf-8');
      return res.json(JSON.parse(data));
    }
    return res.json([]);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to read accessories' });
  }
});

app.post('/api/accessories', (req, res) => {
  try {
    const accessories = req.body;
    if (!Array.isArray(accessories)) return res.status(400).json({ error: 'Invalid payload' });
    fs.writeFileSync(ACCESSORIES_FILE, JSON.stringify(accessories, null, 2), 'utf-8');
    return res.json({ success: true, count: accessories.length });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save accessories' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Vite middleware for development or static serving for production
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      host: HOST,
      port: PORT,
      allowedHosts: true,
      hmr: false,
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const distDir = path.join(__dirname, 'dist');
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, HOST, () => {
  console.log(`GarmentPro server listening at http://${HOST}:${PORT}`);
});
