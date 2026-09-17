/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Product,
  RawMaterial,
  Accessory,
  CalculationRecord,
  GoogleSheetsConfig
} from './types';
import { storageService } from './services/storageService';
import { ConsumptionCalculator } from './components/ConsumptionCalculator';
import { SavedCalculationsView } from './components/SavedCalculationsView';
import { MasterProductsView } from './components/MasterProductsView';
import { MasterRawMaterialsView } from './components/MasterRawMaterialsView';
import { MasterAccessoriesView } from './components/MasterAccessoriesView';
import { GoogleSheetsSyncView } from './components/GoogleSheetsSyncView';
import { ModularOverviewView } from './components/ModularOverviewView';
import { PrintReportModal } from './components/PrintReportModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import {
  Scissors,
  FileText,
  Package,
  Layers,
  Sparkles,
  FileSpreadsheet,
  Boxes,
  Wifi,
  WifiOff,
  CloudCheck,
  RotateCw,
  Factory
} from 'lucide-react';

export default function App() {
  const isOnline = useOnlineStatus();

  // App state
  const [activeTab, setActiveTab] = useState<string>('calculator');
  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [calculations, setCalculations] = useState<CalculationRecord[]>([]);
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(storageService.getSheetsConfig());

  // Active calculation loaded in the calculator
  const [activeCalculation, setActiveCalculation] = useState<CalculationRecord | null>(null);

  // Modal print calculation
  const [calculationToPrint, setCalculationToPrint] = useState<CalculationRecord | null>(null);

  // Load initial data from localStorage
  const loadAllData = () => {
    setProducts(storageService.getProducts());
    setRawMaterials(storageService.getRawMaterials());
    setAccessories(storageService.getAccessories());
    const calcs = storageService.getCalculations();
    setCalculations(calcs);
    setSheetsConfig(storageService.getSheetsConfig());

    // If no calculation loaded, set the pre-seeded Kopelriem CN1 calculation
    if (!activeCalculation && calcs.length > 0) {
      setActiveCalculation(calcs[0]);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Handlers for calculations
  const handleSaveCalculation = (calc: CalculationRecord) => {
    const updated = storageService.saveSingleCalculation(calc);
    setCalculations(updated);
    setActiveCalculation(calc);
  };

  const handleDeleteCalculation = (id: string) => {
    const updated = storageService.deleteCalculation(id);
    setCalculations(updated);
    if (activeCalculation?.id === id) {
      setActiveCalculation(null);
    }
  };

  const handleLoadCalculation = (calc: CalculationRecord) => {
    setActiveCalculation(calc);
    setActiveTab('calculator');
  };

  const handleDuplicateCalculation = (calc: CalculationRecord) => {
    const newId = `calc-${Date.now()}`;
    const newNum = `${calc.calculationNumber}-COPY`;
    const copy: CalculationRecord = {
      ...calc,
      id: newId,
      calculationNumber: newNum,
      title: `${calc.title || calc.productName} (Salinan)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'local_only',
    };
    const updated = storageService.saveSingleCalculation(copy);
    setCalculations(updated);
    setActiveCalculation(copy);
    setActiveTab('calculator');
  };

  // Handlers for master products
  const handleSaveProduct = (p: Product) => {
    const list = storageService.getProducts();
    const idx = list.findIndex((item) => item.id === p.id);
    let updated: Product[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = p;
    } else {
      updated = [p, ...list];
    }
    storageService.saveProducts(updated);
    setProducts(updated);
  };

  const handleDeleteProduct = (id: string) => {
    const list = storageService.getProducts().filter((p) => p.id !== id);
    storageService.saveProducts(list);
    setProducts(list);
  };

  // Handlers for master raw materials
  const handleSaveRawMaterial = (m: RawMaterial) => {
    const list = storageService.getRawMaterials();
    const idx = list.findIndex((item) => item.id === m.id);
    let updated: RawMaterial[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = m;
    } else {
      updated = [m, ...list];
    }
    storageService.saveRawMaterials(updated);
    setRawMaterials(updated);
  };

  const handleDeleteRawMaterial = (id: string) => {
    const list = storageService.getRawMaterials().filter((m) => m.id !== id);
    storageService.saveRawMaterials(list);
    setRawMaterials(list);
  };

  // Handlers for master accessories
  const handleSaveAccessory = (a: Accessory) => {
    const list = storageService.getAccessories();
    const idx = list.findIndex((item) => item.id === a.id);
    let updated: Accessory[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = a;
    } else {
      updated = [a, ...list];
    }
    storageService.saveAccessories(updated);
    setAccessories(updated);
  };

  const handleDeleteAccessory = (id: string) => {
    const list = storageService.getAccessories().filter((a) => a.id !== id);
    storageService.saveAccessories(list);
    setAccessories(list);
  };

  const handleSelectProductForCalc = (p: Product) => {
    setActiveCalculation({
      id: `calc-${Date.now()}`,
      calculationNumber: `BOM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
      title: `Pesanan ${p.name}`,
      productId: p.id,
      productName: p.name,
      orderQuantity: 1000,
      customerOrPoRef: '',
      calculationDate: new Date().toISOString().split('T')[0],
      details: [],
      summary: [],
      syncStatus: 'local_only',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setActiveTab('calculator');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Offline Alert Strip */}
      {!isOnline && (
        <div className="bg-amber-600 px-4 py-1.5 text-center text-xs font-semibold text-white flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Mode Offline — Aplikasi tetap berjalan lancar menggunakan penyimpanan lokal.</span>
        </div>
      )}

      {/* Main App Bar */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-lg shadow-inner">
                <Factory className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-black tracking-tight text-white">GarmentPro</h1>
                  <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-400/30">
                    BOM Engine
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Modul Konsumsi Bahan Baku & Integrasi Google Sheets
                </p>
              </div>
            </div>

            {/* Quick Badges & PWA Install */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300">
                <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                  <Package className="w-3.5 h-3.5 text-blue-400" />
                  <span>{products.length} Produk</span>
                </span>
                <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>{rawMaterials.length} Bahan Baku</span>
                </span>
                <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{calculations.length} Tersimpan</span>
                </span>
              </div>

              <PWAInstallButton />
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <nav className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 text-xs scrollbar-none">
            <button
              id="nav-tab-calculator"
              onClick={() => setActiveTab('calculator')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition shrink-0 ${
                activeTab === 'calculator'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Konsumsi Bahan</span>
            </button>

            <button
              id="nav-tab-saved"
              onClick={() => setActiveTab('saved')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition shrink-0 ${
                activeTab === 'saved'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Riwayat Perhitungan</span>
              {calculations.length > 0 && (
                <span className="ml-1 rounded-full bg-slate-700 px-1.5 py-0.2 text-[10px] text-slate-200">
                  {calculations.length}
                </span>
              )}
            </button>

            <button
              id="nav-tab-products"
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition shrink-0 ${
                activeTab === 'products'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Master Produk</span>
            </button>

            <button
              id="nav-tab-materials"
              onClick={() => setActiveTab('materials')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition shrink-0 ${
                activeTab === 'materials'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Master Bahan Baku</span>
            </button>

            <button
              id="nav-tab-accessories"
              onClick={() => setActiveTab('accessories')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition shrink-0 ${
                activeTab === 'accessories'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Master Accessories & Yield</span>
            </button>

            <button
              id="nav-tab-sheets"
              onClick={() => setActiveTab('sheets')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition shrink-0 ${
                activeTab === 'sheets'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Sinkronisasi Sheets</span>
              {sheetsConfig.webAppUrl && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>

            <button
              id="nav-tab-modular"
              onClick={() => setActiveTab('modular')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition shrink-0 ${
                activeTab === 'modular'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Arsitektur Modular</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'calculator' && (
          <ConsumptionCalculator
            products={products}
            rawMaterials={rawMaterials}
            accessories={accessories}
            sheetsConfig={sheetsConfig}
            initialCalculation={activeCalculation}
            onSaveCalculation={handleSaveCalculation}
            onPrintCalculation={(calc) => setCalculationToPrint(calc)}
            onResetActiveCalculation={() => setActiveCalculation(null)}
          />
        )}

        {activeTab === 'saved' && (
          <SavedCalculationsView
            calculations={calculations}
            sheetsConfig={sheetsConfig}
            onLoadCalculation={handleLoadCalculation}
            onDuplicateCalculation={handleDuplicateCalculation}
            onPrintCalculation={(calc) => setCalculationToPrint(calc)}
            onDeleteCalculation={handleDeleteCalculation}
            onDataUpdated={loadAllData}
          />
        )}

        {activeTab === 'products' && (
          <MasterProductsView
            products={products}
            accessories={accessories}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onSelectForCalculation={handleSelectProductForCalc}
          />
        )}

        {activeTab === 'materials' && (
          <MasterRawMaterialsView
            rawMaterials={rawMaterials}
            onSaveRawMaterial={handleSaveRawMaterial}
            onDeleteRawMaterial={handleDeleteRawMaterial}
          />
        )}

        {activeTab === 'accessories' && (
          <MasterAccessoriesView
            accessories={accessories}
            rawMaterials={rawMaterials}
            onSaveAccessory={handleSaveAccessory}
            onDeleteAccessory={handleDeleteAccessory}
          />
        )}

        {activeTab === 'sheets' && (
          <GoogleSheetsSyncView
            config={sheetsConfig}
            onUpdateConfig={(cfg) => setSheetsConfig(cfg)}
            calculations={calculations}
            products={products}
            rawMaterials={rawMaterials}
            accessories={accessories}
            onDataRefreshed={loadAllData}
          />
        )}

        {activeTab === 'modular' && (
          <ModularOverviewView
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}
      </main>

      {/* Print / Save PDF Modal */}
      {calculationToPrint && (
        <PrintReportModal
          calculation={calculationToPrint}
          onClose={() => setCalculationToPrint(null)}
          onReturnHome={() => {
            setCalculationToPrint(null);
            setActiveTab('calculator');
          }}
        />
      )}

      {/* App Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            GarmentPro Modular Production System • Divisi Perencanaan Konsumsi Bahan (BOM)
          </p>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>PWA Offline-Ready</span>
            <span>•</span>
            <span>Google Sheets Connected</span>
            <span>•</span>
            <span>Kopelriem CN1 Standardized</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
