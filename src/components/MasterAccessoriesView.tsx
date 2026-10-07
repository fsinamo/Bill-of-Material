import React, { useState } from 'react';
import { Accessory, AccessoryCategory, RawMaterial } from '../types';
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Layers,
  ArrowRight,
  Package,
  Coins,
  Calculator,
  CheckCircle2,
  Scissors
} from 'lucide-react';

interface MasterAccessoriesViewProps {
  accessories: Accessory[];
  rawMaterials: RawMaterial[];
  onSaveAccessory: (acc: Accessory) => void;
  onDeleteAccessory: (id: string) => void;
}

export const MasterAccessoriesView: React.FC<MasterAccessoriesViewProps> = ({
  accessories,
  rawMaterials,
  onSaveAccessory,
  onDeleteAccessory,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<Accessory | null>(null);

  // Filter tab
  const [activeFilter, setActiveFilter] = useState<'all' | 'ready_made' | 'raw_material_based' | 'service'>('all');
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('buah');
  const [category, setCategory] = useState<AccessoryCategory>('raw_material_based');
  const [purchasePrice, setPurchasePrice] = useState<number>(1500);
  const [defaultRawMaterialId, setDefaultRawMaterialId] = useState('');
  const [defaultYieldPerUnit, setDefaultYieldPerUnit] = useState<number>(465);
  const [rawMaterialSize, setRawMaterialSize] = useState('');
  const [pieceCuttingSize, setPieceCuttingSize] = useState('');
  const [divisionFormula, setDivisionFormula] = useState('');
  const [differentSizeNotes, setDifferentSizeNotes] = useState('');
  const [notes, setNotes] = useState('');

  // Mini calculator state for auto-computing division formula
  const [calcMatLength, setCalcMatLength] = useState<number>(120);
  const [calcMatWidth, setCalcMatWidth] = useState<number>(36);
  const [calcCutLength, setCalcCutLength] = useState<number>(3.0);
  const [calcCutWidth, setCalcCutWidth] = useState<number>(3.0);
  const [showAutoCalc, setShowAutoCalc] = useState<boolean>(false);

  const handleApplyAutoCalculation = () => {
    const matArea = calcMatLength * calcMatWidth;
    const cutArea = calcCutLength * calcCutWidth;
    if (matArea > 0 && cutArea > 0) {
      const computedYield = Math.floor(matArea / cutArea);
      setDefaultYieldPerUnit(computedYield);
      const usageVal = Number((1 / computedYield).toFixed(6));
      const matSizeStr = `${calcMatLength} x ${calcMatWidth} cm (${matArea.toLocaleString('id-ID')} cm²)`;
      const cutSizeStr = `${calcCutLength} x ${calcCutWidth} cm (${cutArea.toFixed(2)} cm²)`;
      const formulaStr = `${matArea.toLocaleString('id-ID')} cm² ÷ ${cutArea.toFixed(2)} cm² = ${computedYield.toLocaleString('id-ID')} ${unit} / lembar (Pemakaian per pcs: 1 ÷ ${computedYield} = ${usageVal.toLocaleString('id-ID', { minimumFractionDigits: 4, maximumFractionDigits: 6 })} lembar/pcs)`;
      const diffNotesStr = `Acuan ukuran berbeda: Luas Plat Baru ÷ ${cutArea.toFixed(2)} cm² = Yield Baru`;

      setRawMaterialSize(matSizeStr);
      setPieceCuttingSize(cutSizeStr);
      setDivisionFormula(formulaStr);
      setDifferentSizeNotes(diffNotesStr);
    }
  };

  const handleOpenNew = (forcedCategory?: AccessoryCategory) => {
    const nextNum = accessories.length + 1;
    const initialCat = forcedCategory || (activeFilter !== 'all' ? activeFilter : 'ready_made');
    const prefix = initialCat === 'service' ? 'JSA' : 'ACC';
    setCode(`${prefix}-00${nextNum}`);
    setName('');
    setUnit(initialCat === 'service' ? 'pcs' : 'buah');
    setCategory(initialCat);
    setPurchasePrice(initialCat === 'service' ? 12500 : 1500);
    setDefaultRawMaterialId(rawMaterials[0]?.id || '');
    setDefaultYieldPerUnit(400);
    setRawMaterialSize('120 x 36 cm (4.320 cm²)');
    setPieceCuttingSize('3.0 x 3.0 cm (9.28 cm²)');
    setDivisionFormula('4.320 cm² ÷ 9.28 cm² = 465 buah / lembar');
    setDifferentSizeNotes('Acuan ukuran berbeda: Luas Plat Baru ÷ 9.28 cm² = Yield Baru');
    setNotes('');
    setEditingItem(null);
    setFormSuccessMessage(null);
    setFormErrorMessage(null);
    setIsEditing(true);
  };

  const handleOpenEdit = (a: Accessory) => {
    setEditingItem(a);
    setCode(a.code);
    setName(a.name);
    setUnit(a.unit);
    const cat: AccessoryCategory = a.category || (a.defaultRawMaterialId ? 'raw_material_based' : 'ready_made');
    setCategory(cat);
    setPurchasePrice(a.purchasePrice || 0);
    setDefaultRawMaterialId(a.defaultRawMaterialId || (rawMaterials[0]?.id || ''));
    setDefaultYieldPerUnit(a.defaultYieldPerUnit || 1);
    setRawMaterialSize(a.rawMaterialSize || '');
    setPieceCuttingSize(a.pieceCuttingSize || '');
    setDivisionFormula(a.divisionFormula || '');
    setDifferentSizeNotes(a.differentSizeNotes || '');
    setNotes(a.notes || '');
    setFormSuccessMessage(null);
    setFormErrorMessage(null);
    setIsEditing(true);
  };

  const handleSelectCategoryOption = (selectedCat: AccessoryCategory) => {
    setCategory(selectedCat);
    if (!editingItem) {
      const nextNum = accessories.length + 1;
      const prefix = selectedCat === 'service' ? 'JSA' : 'ACC';
      setCode(`${prefix}-00${nextNum}`);
      if (selectedCat === 'service') {
        if (unit === 'buah') setUnit('pcs');
        if (purchasePrice === 1500 || purchasePrice === 0) setPurchasePrice(12500);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const savedName = name.trim();
    const isNew = !editingItem;
    const isDirectPrice = category === 'ready_made' || category === 'service';
    const targetRawMatId = category === 'raw_material_based' ? (defaultRawMaterialId || (rawMaterials[0]?.id || '')) : undefined;

    // VALIDASI KUNCI KOMPOSIT:
    // Untuk aksesoris olahan bahan baku (raw_material_based):
    // BOLEH menyimpan nama yang sama, asalkan BAHAN BAKUNYA BERBEDA!
    // Kunci penyimpanan komposit: (Nama Aksesoris + ID Bahan Baku).
    // Hanya tolak jika NAMA SAMA dan BAHAN BAKU SAMA.
    if (category === 'raw_material_based') {
      const duplicateSameMat = accessories.find(
        (a) =>
          a.id !== editingItem?.id &&
          a.category === 'raw_material_based' &&
          a.name.trim().toLowerCase() === savedName.toLowerCase() &&
          a.defaultRawMaterialId === targetRawMatId
      );
      if (duplicateSameMat) {
        const mat = getMaterial(targetRawMatId);
        setFormErrorMessage(
          `Aksesoris "${savedName}" dengan bahan baku "${mat?.name || 'ini'}" sudah terdaftar (Kode: ${duplicateSameMat.code}). Kunci unik adalah [Nama + Bahan Baku]. Silakan pilih bahan baku yang berbeda jika ingin menambah varian bahan baru untuk aksesoris ini.`
        );
        return;
      }
    } else {
      const duplicateDirect = accessories.find(
        (a) =>
          a.id !== editingItem?.id &&
          a.category === category &&
          a.name.trim().toLowerCase() === savedName.toLowerCase()
      );
      if (duplicateDirect) {
        setFormErrorMessage(
          `${category === 'service' ? 'Jasa' : 'Aksesoris jadi'} "${savedName}" sudah terdaftar (Kode: ${duplicateDirect.code}).`
        );
        return;
      }
    }

    setFormErrorMessage(null);

    let finalCode = code.trim();
    if (!finalCode) {
      finalCode = category === 'service' ? `JSA-${Date.now().toString().slice(-4)}` : `ACC-${Date.now().toString().slice(-4)}`;
    }
    // Jika kode bertabrakan dengan item lain, auto-generate suffix varian agar kode tetap unik
    const codeCollision = accessories.find(
      (a) => a.id !== editingItem?.id && a.code.toLowerCase() === finalCode.toLowerCase()
    );
    if (codeCollision) {
      if (category === 'raw_material_based') {
        const mat = getMaterial(targetRawMatId);
        const matSuffix = (mat?.name || 'V').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
        finalCode = `${finalCode}-${matSuffix}`;
      } else {
        const nextNum = accessories.length + 1;
        finalCode = `${category === 'service' ? 'JSA' : 'ACC'}-00${nextNum}`;
      }
    }

    const item: Accessory = {
      id: editingItem
        ? editingItem.id
        : (category === 'service'
            ? `jasa-${Date.now()}`
            : `acc-${Date.now()}-${targetRawMatId ? targetRawMatId.replace(/[^a-zA-Z0-9]/g, '') : 'mat'}-${Math.random().toString(36).slice(2, 6)}`),
      code: finalCode,
      name: savedName,
      unit: unit.trim() || (category === 'service' ? 'pcs' : 'buah'),
      category: category,
      purchasePrice: isDirectPrice ? Number(purchasePrice) || 0 : undefined,
      defaultRawMaterialId: targetRawMatId,
      defaultYieldPerUnit: category === 'raw_material_based' ? (Number(defaultYieldPerUnit) || 1) : undefined,
      materialUsagePerPcs: category === 'raw_material_based' && defaultYieldPerUnit > 0 ? Number((1 / defaultYieldPerUnit).toFixed(6)) : undefined,
      rawMaterialSize: category === 'raw_material_based' ? rawMaterialSize.trim() : undefined,
      pieceCuttingSize: category === 'raw_material_based' ? pieceCuttingSize.trim() : undefined,
      divisionFormula: category === 'raw_material_based' ? divisionFormula.trim() : undefined,
      differentSizeNotes: category === 'raw_material_based' ? differentSizeNotes.trim() : undefined,
      notes: notes.trim(),
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveAccessory(item);

    // Jangan kembali ke halaman asal agar tidak perlu bolak-balik jika menginput beberapa data
    if (isNew) {
      const sameNameVariants = accessories.filter(
        (a) => a.id !== item.id && a.name.trim().toLowerCase() === savedName.toLowerCase()
      );
      if (category === 'raw_material_based' && sameNameVariants.length > 0) {
        const mat = getMaterial(targetRawMatId);
        setFormSuccessMessage(
          `Aksesoris "${savedName}" varian bahan "${mat?.name || 'baru'}" berhasil disimpan! (Total ${sameNameVariants.length + 1} varian bahan tersimpan untuk nama ini). Formulir siap untuk input berikutnya.`
        );
      } else {
        const typeLabel = category === 'service' ? 'Jasa' : 'Aksesoris';
        setFormSuccessMessage(`${typeLabel} "${savedName}" berhasil disimpan! Formulir siap untuk input data berikutnya.`);
      }

      const nextNum = accessories.length + 2;
      const prefix = category === 'service' ? 'JSA' : 'ACC';
      setCode(`${prefix}-00${nextNum}`);
      setName('');
      setNotes('');
      if (isDirectPrice) {
        setPurchasePrice(category === 'service' ? 10000 : 0);
      }
    } else {
      const typeLabel = category === 'service' ? 'jasa' : 'aksesoris';
      setFormSuccessMessage(`Perubahan data ${typeLabel} "${savedName}" berhasil disimpan!`);
    }
  };

  const getMaterial = (mId?: string) => {
    if (!mId) return null;
    return rawMaterials.find((m) => m.id === mId) || null;
  };

  // Helper to compute unit price of accessory or service
  const calculateAccessoryPrice = (a: Accessory) => {
    if (a.category === 'ready_made' || a.category === 'service') {
      return a.purchasePrice || 0;
    }
    const mat = getMaterial(a.defaultRawMaterialId);
    if (!mat || !mat.unitPrice || !a.defaultYieldPerUnit || a.defaultYieldPerUnit <= 0) {
      return 0;
    }
    return mat.unitPrice / a.defaultYieldPerUnit;
  };

  // Active raw material selected in form
  const selectedMaterial = getMaterial(defaultRawMaterialId);
  const liveCalculatedPrice = selectedMaterial?.unitPrice && defaultYieldPerUnit > 0
    ? selectedMaterial.unitPrice / defaultYieldPerUnit
    : 0;

  // Filtered accessories & services
  const filteredAccessories = accessories.filter((a) => {
    if (activeFilter === 'all') return true;
    return a.category === activeFilter;
  });

  const readyMadeCount = accessories.filter((a) => a.category === 'ready_made').length;
  const rawMaterialBasedCount = accessories.filter((a) => a.category === 'raw_material_based').length;
  const serviceCount = accessories.filter((a) => a.category === 'service').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-800">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Master Accessories & Jasa</h2>
              <span className="rounded-full bg-blue-100 text-blue-900 px-2 py-0.5 text-[10px] font-bold">
                Modul Consumption & Costing
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Klasifikasi Accessories Jadi (Beli Langsung), Olahan Bahan Baku (Rumus Yield), dan Jasa / Ongkos Pengerjaan untuk dasar kalkulasi HPP Product Costing
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-add-service"
            type="button"
            onClick={() => handleOpenNew('service')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 px-3.5 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-100 transition shadow-xs"
          >
            <Scissors className="w-4 h-4 text-indigo-600" />
            <span>+ Tambah Jasa</span>
          </button>
          <button
            id="btn-add-accessory"
            type="button"
            onClick={() => handleOpenNew('ready_made')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-800 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-900 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Accessories</span>
          </button>
        </div>
      </div>

      {/* Info Callout: Kunci Unik Nama + Bahan Baku */}
      <div className="rounded-2xl bg-purple-50/70 border border-purple-200 p-4 text-xs text-purple-900 flex items-start gap-3 shadow-2xs">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-600 text-white shrink-0 mt-0.5">
          <Layers className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <div className="font-bold text-purple-950 text-xs">
            Aturan Kunci Penyimpanan: Nama Aksesoris + Bahan Baku
          </div>
          <p className="text-[11px] text-purple-800 leading-relaxed">
            Untuk aksesoris <strong>Olah Bahan Baku</strong>, Anda diperbolehkan menyimpan nama aksesoris yang sama dengan bahan baku yang berbeda (misalnya <em>'Kotak'</em> dari <em>Plat Seng 0.5mm</em> dan <em>'Kotak'</em> dari <em>Plat Kuningan 0.8mm</em>). Kunci penyimpanan komposit adalah <strong>Nama + Bahan</strong>, sehingga setiap varian memiliki hasil yield dan harga pokok masing-masing.
          </p>
        </div>
      </div>

      {/* Form Tambah/Edit Accessories & Jasa */}
      {isEditing && (
        <div className="rounded-2xl border-2 border-purple-600 bg-white p-6 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {editingItem
                  ? (category === 'service' ? 'Edit Data Jasa / Ongkos Pengerjaan' : 'Edit Accessories')
                  : (category === 'service' ? 'Tambah Jasa / Ongkos Pengerjaan Baru' : 'Tambah Accessories / Jasa Baru')}
              </h3>
              <p className="text-[11px] text-slate-500">
                {category === 'service'
                  ? 'Input nama jasa dan tarif pengerjaan untuk diintegrasikan ke dalam kalkulasi Product Costing'
                  : 'Tentukan jenis komponen accessories apakah siap pakai, dipotong dari lembaran bahan baku, atau jasa pengerjaan'}
              </p>
            </div>
            <button
              onClick={() => {
                setIsEditing(false);
                setFormSuccessMessage(null);
              }}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="Tutup Formulir"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Alert Sukses Simpan (Tetap di Formulir untuk input beruntun) */}
          {formSuccessMessage && (
            <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-300 p-3.5 text-xs text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{formSuccessMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setFormSuccessMessage(null)}
                className="text-emerald-500 hover:text-emerald-700 font-bold ml-2"
              >
                ×
              </button>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5 text-xs">
            {/* 1. Pemilihan Jenis: Ready-made vs Raw-material-based vs Jasa / Service */}
            <div>
              <label className="block font-bold text-slate-800 mb-2">
                Pilih Tipe / Kategori Komponen <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Option 1: Accessories Jadi */}
                <div
                  onClick={() => handleSelectCategoryOption('ready_made')}
                  className={`cursor-pointer rounded-xl border-2 p-3.5 transition flex items-start gap-3 ${
                    category === 'ready_made'
                      ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                    category === 'ready_made' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Package className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">1. Accessories Jadi</span>
                      {category === 'ready_made' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Komponen siap pakai (buckle, ring D, kancing, velcro). <strong>Komponen: Nama & Harga Beli Satuan</strong>.
                    </p>
                  </div>
                </div>

                {/* Option 2: Membutuhkan Bahan Baku */}
                <div
                  onClick={() => handleSelectCategoryOption('raw_material_based')}
                  className={`cursor-pointer rounded-xl border-2 p-3.5 transition flex items-start gap-3 ${
                    category === 'raw_material_based'
                      ? 'border-purple-600 bg-purple-50/60 ring-2 ring-purple-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                    category === 'raw_material_based' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">2. Olah Bahan Baku</span>
                      {category === 'raw_material_based' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Dipotong dari lembaran (kotak, lidah, bentuk U). <strong>Harga = Harga Bahan ÷ Yield</strong>.
                    </p>
                  </div>
                </div>

                {/* Option 3: Jasa / Ongkos Pengerjaan */}
                <div
                  onClick={() => handleSelectCategoryOption('service')}
                  className={`cursor-pointer rounded-xl border-2 p-3.5 transition flex items-start gap-3 ${
                    category === 'service'
                      ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                    category === 'service' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Scissors className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">3. Jasa / Ongkos Kerja</span>
                      {category === 'service' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Biaya proses (jahit rompi, bordir, sablon, cutting, QC). <strong>Komponen: Nama & Tarif / Harga</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Info: Code, Name, Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {category === 'service' ? 'Kode Jasa' : 'Kode Accessories'}
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 font-mono outline-hidden focus:border-purple-600"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  {category === 'service' ? 'Nama Jasa / Biaya Pengerjaan' : 'Nama Accessories'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (formErrorMessage) setFormErrorMessage(null);
                  }}
                  placeholder={
                    category === 'service'
                      ? "Contoh: Jasa Jahit Rompi, Jasa Bordir Logo / Emblem, Jasa Cutting Plong, Jasa Finishing & QC"
                      : (category === 'ready_made'
                          ? "Contoh: Buckle Tactical 5.5cm, Ring D Hitam, Kancing Snap"
                          : "Contoh: Kotak, Lidah, Bentuk U, Ujung Kopel")
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-purple-600"
                  required
                />
                {category === 'raw_material_based' && (
                  <p className="text-[10px] text-purple-700 mt-1 leading-relaxed">
                    💡 <strong>Aturan Kunci:</strong> Aksesoris olahan bahan boleh memiliki nama yang sama dengan bahan baku berbeda (misal: 'Keling Plat' dari Plat Seng vs 'Keling Plat' dari Plat Kuningan). Kunci unik: <strong>Nama + Bahan Baku</strong>.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {category === 'service' ? 'Satuan Pengerjaan' : 'Satuan Komponen'}
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder={category === 'service' ? "pcs, titik, set, jam, pasang" : "buah, pcs, set, pasang"}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-purple-600"
                  required
                />
              </div>

              {/* Conditional Block 1: Jika Accessories Jadi -> Input Harga Langsung */}
              {category === 'ready_made' && (
                <div className="sm:col-span-2 rounded-xl bg-emerald-50/80 p-4 border border-emerald-200">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900 mb-1">
                    <Coins className="w-4 h-4 text-emerald-700" />
                    <span>Harga Beli Satuan (Accessories Jadi):</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 mb-2">
                    Masukkan harga beli langsung per 1 {unit || 'buah'}. Harga ini akan otomatis ditarik sebagai harga modal (cost) pada modul <strong>Product Costing</strong>.
                  </p>
                  <div className="flex items-center gap-2 max-w-xs">
                    <span className="font-bold text-slate-700">Rp</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                      placeholder="Contoh: 4500"
                      className="w-full rounded-lg border border-emerald-400 bg-white px-3 py-2 font-mono font-bold text-emerald-950 text-sm outline-hidden focus:ring-1 focus:ring-emerald-600"
                      required
                    />
                    <span className="text-slate-600 font-medium whitespace-nowrap">/ {unit || 'buah'}</span>
                  </div>
                </div>
              )}

              {/* Conditional Block 3: Jika Jasa / Ongkos Pengerjaan -> Input Tarif / Harga Jasa Satuan */}
              {category === 'service' && (
                <div className="sm:col-span-2 rounded-xl bg-indigo-50/80 p-4 border border-indigo-200">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-900 mb-1">
                    <Coins className="w-4 h-4 text-indigo-700" />
                    <span>Tarif / Harga Jasa Satuan:</span>
                  </div>
                  <p className="text-[11px] text-indigo-800 mb-2">
                    Sama seperti accessories jadi, cukup masukkan nama dan harga jasa per 1 {unit || 'pcs'}. Harga ini akan otomatis ditarik ke dalam perhitungan <strong>Product Costing</strong>.
                  </p>
                  <div className="flex items-center gap-2 max-w-xs">
                    <span className="font-bold text-slate-700">Rp</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                      placeholder="Contoh: 12500"
                      className="w-full rounded-lg border border-indigo-400 bg-white px-3 py-2 font-mono font-bold text-indigo-950 text-sm outline-hidden focus:ring-1 focus:ring-indigo-600"
                      required
                    />
                    <span className="text-slate-600 font-medium whitespace-nowrap">/ {unit || 'pcs'}</span>
                  </div>
                </div>
              )}

              {/* Conditional Block 2: Jika Membutuhkan Bahan Baku -> Pilih Bahan & Input Yield */}
              {category === 'raw_material_based' && (
                <>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Bahan Baku Yang Dipakai <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={defaultRawMaterialId}
                      onChange={(e) => setDefaultRawMaterialId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-purple-600 bg-white"
                      required
                    >
                      {rawMaterials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.specification || m.unit}) — Rp {m.unitPrice ? m.unitPrice.toLocaleString('id-ID') : '0'} / {m.unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3 rounded-xl bg-purple-50/80 p-4 border border-purple-200 space-y-3">
                    <div className="font-bold text-purple-900 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-purple-700" />
                        <span>Rumus Hasil Pemakaian (Yield Output):</span>
                      </div>
                      {selectedMaterial && (
                        <span className="text-[11px] font-normal text-purple-800">
                          Harga Bahan: <strong>Rp {selectedMaterial.unitPrice?.toLocaleString('id-ID') || 0} / {selectedMaterial.unit}</strong>
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-purple-800">
                      Berapa banyak buah accessories yang dapat dihasilkan dari 1 satuan ({selectedMaterial?.unit || 'lembar'}) bahan baku terpilih?
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-700">1 {selectedMaterial?.unit || 'Lembar'} menghasilkan</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={defaultYieldPerUnit}
                        onChange={(e) => setDefaultYieldPerUnit(parseFloat(e.target.value) || 1)}
                        className="w-28 rounded-lg border border-purple-400 bg-white px-3 py-1.5 text-center font-mono font-bold text-sm text-purple-950 outline-hidden focus:ring-1 focus:ring-purple-600"
                        required
                      />
                      <span className="font-bold text-slate-700">{unit} {name || 'accessories'}</span>
                    </div>

                    {/* Live Calculation Display */}
                    <div className="mt-2 pt-2 border-t border-purple-200/80 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Calculator className="w-3.5 h-3.5 text-purple-600" />
                          <span>Kalkulasi Harga Modal (Cost):</span>
                          <span className="font-mono text-slate-600">
                            Rp {selectedMaterial?.unitPrice?.toLocaleString('id-ID') || 0} ÷ {defaultYieldPerUnit || 1} yield =
                          </span>
                        </div>
                        <div className="font-mono font-black text-sm text-purple-950 bg-white px-2.5 py-1 rounded-lg border border-purple-200">
                          Rp {liveCalculatedPrice.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {unit}
                        </div>
                      </div>

                      {/* Pemakaian Bahan per Pcs Accessories (1 / Yield) */}
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/90 p-2.5 border border-purple-200 text-purple-950">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">Pemakaian Bahan per Pcs:</span>
                          <span className="font-mono text-purple-800 font-semibold">
                            1 {selectedMaterial?.unit || 'Lembar'} ÷ {defaultYieldPerUnit || 1} yield =
                          </span>
                        </div>
                        <div className="font-mono font-black text-xs text-purple-950 bg-purple-100/90 px-2.5 py-1 rounded border border-purple-300">
                          {((defaultYieldPerUnit || 1) > 0 ? (1 / (defaultYieldPerUnit || 1)).toLocaleString('id-ID', { minimumFractionDigits: 4, maximumFractionDigits: 6 }) : '0')} {selectedMaterial?.unit || 'lembar'} / {unit}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rincian Angka Pembagian Bahan & Acuan Ukuran Berbeda */}
                  <div className="sm:col-span-3 rounded-xl bg-purple-50/40 p-4 border border-purple-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                        <Calculator className="w-4 h-4 text-purple-700" />
                        <span>Angka Pembagian Bahan dengan Hasil & Acuan Ukuran:</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAutoCalc(!showAutoCalc)}
                        className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline flex items-center gap-1"
                      >
                        {showAutoCalc ? 'Tutup Kalkulator Otomatis' : '⚡ Buka Kalkulator Dimensi'}
                      </button>
                    </div>

                    {showAutoCalc && (
                      <div className="rounded-lg bg-white p-3 border border-purple-300 text-xs space-y-2 shadow-2xs">
                        <div className="font-bold text-slate-800 text-[11px]">
                          Kalkulator Pembagian Dimensi Bahan Baku (Auto-Hitung Hasil / Yield):
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500 font-semibold">P. Bahan (cm)</label>
                            <input
                              type="number"
                              step="any"
                              value={calcMatLength}
                              onChange={(e) => setCalcMatLength(parseFloat(e.target.value) || 0)}
                              className="w-full rounded border border-slate-300 px-2 py-1 text-slate-800 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 font-semibold">L. Bahan (cm)</label>
                            <input
                              type="number"
                              step="any"
                              value={calcMatWidth}
                              onChange={(e) => setCalcMatWidth(parseFloat(e.target.value) || 0)}
                              className="w-full rounded border border-slate-300 px-2 py-1 text-slate-800 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 font-semibold">P. Potong (cm)</label>
                            <input
                              type="number"
                              step="any"
                              value={calcCutLength}
                              onChange={(e) => setCalcCutLength(parseFloat(e.target.value) || 0)}
                              className="w-full rounded border border-slate-300 px-2 py-1 text-slate-800 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 font-semibold">L. Potong (cm)</label>
                            <input
                              type="number"
                              step="any"
                              value={calcCutWidth}
                              onChange={(e) => setCalcCutWidth(parseFloat(e.target.value) || 0)}
                              className="w-full rounded border border-slate-300 px-2 py-1 text-slate-800 text-xs"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-purple-900 font-mono">
                            Luas Bahan: {(calcMatLength * calcMatWidth).toLocaleString('id-ID')} cm² | Luas Potong: {(calcCutLength * calcCutWidth).toFixed(2)} cm² | Hasil: <strong>{calcCutLength * calcCutWidth > 0 ? Math.floor((calcMatLength * calcMatWidth) / (calcCutLength * calcCutWidth)) : 0} {unit}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={handleApplyAutoCalculation}
                            className="px-2.5 py-1 bg-purple-600 text-white rounded text-[11px] font-bold hover:bg-purple-700 transition"
                          >
                            Terapkan ke Rumus & Yield
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Ukuran / Dimensi Bahan Baku Acuan
                        </label>
                        <input
                          type="text"
                          value={rawMaterialSize}
                          onChange={(e) => setRawMaterialSize(e.target.value)}
                          placeholder="Contoh: 120 x 36 cm (4.320 cm²) atau 100 meter"
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 bg-white outline-hidden focus:border-purple-600"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Ukuran Potong per Pcs / Komponen
                        </label>
                        <input
                          type="text"
                          value={pieceCuttingSize}
                          onChange={(e) => setPieceCuttingSize(e.target.value)}
                          placeholder="Contoh: 3.0 x 3.0 cm (9.28 cm²) atau 5 cm"
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 bg-white outline-hidden focus:border-purple-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Angka & Rumus Pembagian Bahan dengan Hasil
                        </label>
                        <input
                          type="text"
                          value={divisionFormula}
                          onChange={(e) => setDivisionFormula(e.target.value)}
                          placeholder="Contoh: 4.320 cm² ÷ 9.28 cm² = 465 buah / lembar"
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 bg-white font-mono outline-hidden focus:border-purple-600"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Acuan Jika Menggunakan Ukuran Bahan Berbeda
                        </label>
                        <input
                          type="text"
                          value={differentSizeNotes}
                          onChange={(e) => setDifferentSizeNotes(e.target.value)}
                          placeholder="Contoh: Acuan: Luas Plat Baru ÷ 9.28 cm² = Yield Baru"
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 bg-white outline-hidden focus:border-purple-600"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="sm:col-span-3">
                <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={category === 'service' ? "Keterangan vendor bordir / operator penjahit / detail proses kerja" : "Keterangan vendor supplier / proses cutting plong / spesifikasi"}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-purple-600"
                />
              </div>
            </div>

            {formErrorMessage && (
              <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2 animate-in fade-in">
                <X className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{formErrorMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 flex-wrap">
              <div className="text-[11px] text-slate-500 font-medium">
                {!editingItem && '💡 Setelah simpan, formulir akan tetap terbuka agar Anda dapat langsung menginput data berikutnya tanpa keluar menu.'}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormSuccessMessage(null);
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  {formSuccessMessage ? '✓ Selesai & Tutup' : 'Batal / Tutup'}
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-800 px-5 py-2 text-xs font-semibold text-white hover:bg-purple-900 transition shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingItem ? 'Simpan Perubahan' : (category === 'service' ? '💾 Simpan & Input Jasa Lain' : '💾 Simpan & Input Data Lain')}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({accessories.length})
          </button>
          <button
            onClick={() => setActiveFilter('ready_made')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeFilter === 'ready_made'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Accessories Jadi ({readyMadeCount})</span>
          </button>
          <button
            onClick={() => setActiveFilter('raw_material_based')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeFilter === 'raw_material_based'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-purple-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Olah Bahan Baku ({rawMaterialBasedCount})</span>
          </button>
          <button
            onClick={() => setActiveFilter('service')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeFilter === 'service'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-indigo-700'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Jasa & Pengerjaan ({serviceCount})</span>
          </button>
        </div>

        <div className="text-xs text-slate-500">
          Menampilkan <strong>{filteredAccessories.length}</strong> dari {accessories.length} data
        </div>
      </div>

      {/* Table Accessories & Jasa List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                <th className="py-3 px-4 font-bold">Kode</th>
                <th className="py-3 px-4 font-bold">Nama Aksesoris / Jasa</th>
                <th className="py-3 px-4 font-bold">Kategori / Jenis</th>
                <th className="py-3 px-4 font-bold">Sumber Bahan / Proses</th>
                <th className="py-3 px-4 font-bold text-right">Harga Satuan / Tarif (Cost)</th>
                <th className="py-3 px-4 font-bold">Catatan</th>
                <th className="py-3 px-4 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredAccessories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada data pada kategori ini. Klik tombol "+ Tambah" diatas untuk memasukkan data baru.
                  </td>
                </tr>
              ) : (
                filteredAccessories.map((a) => {
                  const isReady = a.category === 'ready_made';
                  const isService = a.category === 'service';
                  const mat = getMaterial(a.defaultRawMaterialId);
                  const unitPrice = calculateAccessoryPrice(a);

                  return (
                    <tr key={a.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono font-bold text-slate-600">{a.code}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900">{a.name}</span>
                          {!isReady && !isService && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                              Bahan: {mat?.name || 'Olah Bahan Baku'}
                            </span>
                          )}
                          {!isReady && !isService && accessories.filter((other) => other.name.trim().toLowerCase() === a.name.trim().toLowerCase()).length > 1 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              ⚡ Varian Bahan Berbeda
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">Satuan: {a.unit}</div>
                      </td>
                      <td className="py-3 px-4">
                        {isService ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-indigo-800 border border-indigo-200/70 font-semibold text-[11px]">
                            <Scissors className="w-3 h-3 text-indigo-600" />
                            <span>Jasa Pengerjaan</span>
                          </span>
                        ) : isReady ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-emerald-800 border border-emerald-200/70 font-semibold text-[11px]">
                            <Package className="w-3 h-3 text-emerald-600" />
                            <span>Accessories Jadi</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-purple-800 border border-purple-200/70 font-semibold text-[11px]">
                            <Layers className="w-3 h-3 text-purple-600" />
                            <span>Olah Bahan Baku</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isService ? (
                          <div className="text-slate-600 text-[11px]">
                            <span className="font-medium text-indigo-900">Ongkos Kerja / Operasional</span>
                            <div className="text-slate-400">Jahit, bordir, finishing, non-bahan</div>
                          </div>
                        ) : isReady ? (
                          <div className="text-slate-600 text-[11px]">
                            <span className="font-medium text-slate-800">Komponen Beli Jadi</span>
                            <div className="text-slate-400">Siap pakai langsung rakit</div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="font-semibold text-slate-800">
                              {mat?.name || 'Bahan Baku Tidak Terdaftar'}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-purple-700 font-mono">
                              <span>1 {mat?.unit || 'Lembar'}</span>
                              <ArrowRight className="w-2.5 h-2.5 text-purple-400" />
                              <span className="font-bold">{a.defaultYieldPerUnit || 1} {a.unit}</span>
                              <span className="text-slate-400">|</span>
                              <span className="text-purple-950 font-semibold bg-purple-100/80 px-1.5 py-0.5 rounded text-[10px]">
                                Pemakaian: 1 ÷ {a.defaultYieldPerUnit || 1} = {((a.defaultYieldPerUnit || 1) > 0 ? (1 / (a.defaultYieldPerUnit || 1)).toLocaleString('id-ID', { minimumFractionDigits: 4, maximumFractionDigits: 6 }) : '0')} {mat?.unit || 'lembar'}/pcs
                              </span>
                            </div>

                            {/* Info Ukuran & Rumus Pembagian */}
                            {(a.rawMaterialSize || a.pieceCuttingSize) && (
                              <div className="text-[10px] text-slate-600 bg-slate-100/80 rounded px-1.5 py-0.5 font-mono">
                                📐 {a.rawMaterialSize ? `Bahan: ${a.rawMaterialSize}` : ''} {a.pieceCuttingSize ? `| Potong: ${a.pieceCuttingSize}` : ''}
                              </div>
                            )}

                            {a.divisionFormula && (
                              <div className="text-[10px] text-purple-900 bg-purple-50 rounded px-1.5 py-0.5 font-mono border border-purple-200/60">
                                ➗ <strong>Rumus:</strong> {a.divisionFormula}
                              </div>
                            )}

                            {a.differentSizeNotes && (
                              <div className="text-[10px] text-amber-900 bg-amber-50 rounded px-1.5 py-0.5 border border-amber-200/60 font-medium">
                                💡 <strong>Acuan Ukuran Berbeda:</strong> {a.differentSizeNotes}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isService ? (
                          <div>
                            <div className="font-mono font-bold text-indigo-900 text-sm">
                              Rp {(a.purchasePrice || 0).toLocaleString('id-ID')}
                            </div>
                            <div className="text-[10px] text-indigo-600 font-medium">Tarif Jasa Satuan</div>
                          </div>
                        ) : isReady ? (
                          <div>
                            <div className="font-mono font-bold text-emerald-800 text-sm">
                              Rp {(a.purchasePrice || 0).toLocaleString('id-ID')}
                            </div>
                            <div className="text-[10px] text-emerald-600">Harga Beli Langsung</div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-mono font-bold text-purple-950 text-sm">
                              Rp {unitPrice.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Rp {(mat?.unitPrice || 0).toLocaleString('id-ID')} ÷ {a.defaultYieldPerUnit} yield
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] max-w-[180px] truncate">{a.notes || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(a)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                            title="Edit data"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Hapus ${a.category === 'service' ? 'jasa' : 'accessories'} "${a.name}"?`)) onDeleteAccessory(a.id);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                            title="Hapus data"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
