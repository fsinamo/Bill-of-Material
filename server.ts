import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

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

app.use(express.json({ limit: '10mb' }));

const DATA_DIR = path.join(__dirname, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'sheets-config.json');
const URL_BACKUP_FILE = path.join(DATA_DIR, 'webapp-url.txt');
const SECONDARY_BACKUP_FILE = path.join(DATA_DIR, 'sheets-url-permanent.txt');
const ENV_FILE = path.join(__dirname, '.env');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Read URL directly from .env file if present
const readUrlFromEnvFile = (): string => {
  try {
    if (fs.existsSync(ENV_FILE)) {
      const content = fs.readFileSync(ENV_FILE, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('VITE_GOOGLE_SHEETS_WEBAPP_URL=')) {
          const val = trimmed.replace('VITE_GOOGLE_SHEETS_WEBAPP_URL=', '').trim();
          if (val) return val;
        }
        if (trimmed.startsWith('GOOGLE_SHEETS_WEBAPP_URL=')) {
          const val = trimmed.replace('GOOGLE_SHEETS_WEBAPP_URL=', '').trim();
          if (val) return val;
        }
      }
    }
  } catch {}
  return '';
};

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
  const fromEnvFile = readUrlFromEnvFile();
  if (fromEnvFile) return fromEnvFile;

  if (process.env.VITE_GOOGLE_SHEETS_WEBAPP_URL && process.env.VITE_GOOGLE_SHEETS_WEBAPP_URL.trim()) {
    return process.env.VITE_GOOGLE_SHEETS_WEBAPP_URL.trim();
  }
  if (process.env.GOOGLE_SHEETS_WEBAPP_URL && process.env.GOOGLE_SHEETS_WEBAPP_URL.trim()) {
    return process.env.GOOGLE_SHEETS_WEBAPP_URL.trim();
  }
  return '';
};

// Permanent multi-layer persistence helper
const persistUrlOnServer = (rawUrl: string) => {
  const clean = (rawUrl || '').trim();
  if (!clean || !clean.startsWith('http')) return;

  try {
    fs.writeFileSync(URL_BACKUP_FILE, clean, 'utf-8');
    fs.writeFileSync(SECONDARY_BACKUP_FILE, clean, 'utf-8');

    // Update config file
    let existing: any = {
      spreadsheetName: 'Data_Produksi_Garment_Konsumsi_Bahan',
      autoSyncOnSave: true,
    };
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        existing = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      } catch {}
    }
    delete existing.clearExplicitly;
    const updated = {
      ...existing,
      webAppUrl: clean,
      lastUpdated: new Date().toISOString(),
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');

    // Update process.env runtime
    process.env.VITE_GOOGLE_SHEETS_WEBAPP_URL = clean;
    process.env.GOOGLE_SHEETS_WEBAPP_URL = clean;

    // Update .env file on disk to survive container/process restarts
    try {
      let envContent = '';
      if (fs.existsSync(ENV_FILE)) {
        envContent = fs.readFileSync(ENV_FILE, 'utf-8');
      }
      let lines = envContent.split('\n').filter((l) =>
        !l.trim().startsWith('VITE_GOOGLE_SHEETS_WEBAPP_URL=') &&
        !l.trim().startsWith('GOOGLE_SHEETS_WEBAPP_URL=')
      );
      lines.push(`VITE_GOOGLE_SHEETS_WEBAPP_URL=${clean}`);
      lines.push(`GOOGLE_SHEETS_WEBAPP_URL=${clean}`);
      fs.writeFileSync(ENV_FILE, lines.join('\n').trim() + '\n', 'utf-8');
    } catch {}
  } catch (err) {
    console.warn('Error persisting URL on server:', err);
  }
};

const clearUrlOnServer = () => {
  try {
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
        parsed.lastUpdated = new Date().toISOString();
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
      } catch {}
    }
    delete process.env.VITE_GOOGLE_SHEETS_WEBAPP_URL;
    delete process.env.GOOGLE_SHEETS_WEBAPP_URL;
    if (fs.existsSync(ENV_FILE)) {
      try {
        const envContent = fs.readFileSync(ENV_FILE, 'utf-8');
        const lines = envContent.split('\n').filter((l) =>
          !l.trim().startsWith('VITE_GOOGLE_SHEETS_WEBAPP_URL=') &&
          !l.trim().startsWith('GOOGLE_SHEETS_WEBAPP_URL=')
        );
        fs.writeFileSync(ENV_FILE, lines.join('\n').trim() + '\n', 'utf-8');
      } catch {}
    }
  } catch {}
};

// Ensure sheets-config.json exists and sanitize on startup
const startupUrl = getPersistentWebAppUrl();
if (!fs.existsSync(CONFIG_FILE)) {
  const initialConfig = {
    webAppUrl: startupUrl,
    spreadsheetName: 'Data_Produksi_Garment_Konsumsi_Bahan',
    autoSyncOnSave: true,
    lastUpdated: new Date().toISOString(),
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
    if (!parsed.webAppUrl && startupUrl) {
      parsed.webAppUrl = startupUrl;
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
      clearUrlOnServer();
      return res.json({ success: true, webAppUrl: '' });
    }

    const clean = (typeof webAppUrl === 'string') ? webAppUrl.trim() : '';
    if (clean) {
      persistUrlOnServer(clean);
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
      autoSyncOnSave: true,
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

    const clearExplicitly = Boolean(newConfig.clearExplicitly);
    if (clearExplicitly) {
      clearUrlOnServer();
      return res.json({
        success: true,
        config: {
          webAppUrl: '',
          spreadsheetName: newConfig.spreadsheetName || 'Data_Produksi_Garment_Konsumsi_Bahan',
          autoSyncOnSave: true,
        },
      });
    }

    let existing: any = {};
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        existing = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      } catch {
        existing = {};
      }
    }
    delete existing.clearExplicitly;

    const incomingUrl = (newConfig.webAppUrl && typeof newConfig.webAppUrl === 'string') ? newConfig.webAppUrl.trim() : '';
    const backupUrl = getPersistentWebAppUrl();
    const targetUrl = incomingUrl || existing.webAppUrl || backupUrl || '';

    if (targetUrl) {
      persistUrlOnServer(targetUrl);
    }

    const merged = {
      ...existing,
      ...newConfig,
      webAppUrl: targetUrl,
      lastUpdated: new Date().toISOString(),
    };
    delete merged.clearExplicitly;

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    return res.json({ success: true, config: merged });
  } catch (error) {
    console.error('Error saving sheets config:', error);
    return res.status(500).json({ error: 'Failed to persist sheets configuration' });
  }
});

// =========================================================================
// API: Server-side Proxy for Google Apps Script
// Bypasses browser CORS issues & follows 302 redirects flawlessly in Node 22
// =========================================================================
app.post('/api/sheets-proxy', async (req, res) => {
  try {
    const { url, action, payload } = req.body || {};
    const targetUrl = (typeof url === 'string' && url.trim()) ? url.trim() : getPersistentWebAppUrl();

    if (!targetUrl || !targetUrl.startsWith('http')) {
      return res.status(400).json({
        status: 'error',
        message: 'URL Google Apps Script belum diatur atau tidak valid. Silakan atur di menu Sinkronisasi Sheets.',
      });
    }

    // Auto-persist valid URL
    persistUrlOnServer(targetUrl);

    const postBody = payload
      ? { ...payload, action: action || payload.action || 'push' }
      : { action: action || 'ping' };

    const response = await fetch(targetUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(postBody),
    });

    const rawText = await response.text();
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Returned HTML (e.g. login redirect or permission denial)
      if (rawText.includes('ServiceLogin') || rawText.includes('accounts.google.com')) {
        return res.json({
          status: 'error',
          message: 'Google memblokir akses otomatis (mengalihkan ke login). Solusi: Di editor Apps Script Anda, buka menu Deploy > Manage deployments > Edit > ganti "Who has access" menjadi "Anyone" (Siapa saja).',
        });
      }
      return res.json({
        status: 'error',
        message: 'Google Sheets mengembalikan format bukan JSON. Pastikan Web App disetel "Who has access: Anyone".',
        rawPreview: rawText.slice(0, 250),
      });
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/sheets-proxy (POST):', error);
    return res.status(500).json({
      status: 'error',
      message: `Gagal tersambung ke Google Sheets via server: ${error.message || String(error)}`,
    });
  }
});

app.get('/api/sheets-proxy', async (req, res) => {
  try {
    const rawUrl = (req.query.url as string) || '';
    const targetUrl = (rawUrl && rawUrl.trim()) || getPersistentWebAppUrl();
    const action = (req.query.action as string) || 'pull';

    if (!targetUrl || !targetUrl.startsWith('http')) {
      return res.status(400).json({
        status: 'error',
        message: 'URL Google Apps Script belum diatur atau tidak valid.',
      });
    }

    persistUrlOnServer(targetUrl);

    const sep = targetUrl.includes('?') ? '&' : '?';
    const finalUrl = `${targetUrl}${sep}action=${encodeURIComponent(action)}&_t=${Date.now()}`;

    const response = await fetch(finalUrl, {
      method: 'GET',
      redirect: 'follow',
    });

    const rawText = await response.text();
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return res.json({
        status: 'error',
        message: 'Google Sheets mengembalikan respons bukan JSON.',
        rawPreview: rawText.slice(0, 250),
      });
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/sheets-proxy (GET):', error);
    return res.status(500).json({
      status: 'error',
      message: `Gagal menarik data via server proxy: ${error.message || String(error)}`,
    });
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
