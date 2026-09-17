import React, { useState } from 'react';
import { Product, Accessory } from '../types';
import { Package, Plus, Edit2, Trash2, Check, X, Calculator, Layers } from 'lucide-react';

interface MasterProductsViewProps {
  products: Product[];
  accessories: Accessory[];
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onSelectForCalculation: (product: Product) => void;
}

export const MasterProductsView: React.FC<MasterProductsViewProps> = ({
  products,
  accessories,
  onSaveProduct,
  onDeleteProduct,
  onSelectForCalculation,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('Pcs');
  const [description, setDescription] = useState('');
  const [productAccessories, setProductAccessories] = useState<
    Array<{ accessoryId: string; qtyPerProduct: number }>
  >([]);

  const handleOpenNew = () => {
    const nextNum = products.length + 1;
    setCode(`PRD-00${nextNum}`);
    setName('');
    setCategory('Perlengkapan Dinas / Kopel');
    setUnit('Pcs');
    setDescription('');
    setProductAccessories([]);
    setEditingProduct(null);
    setIsEditing(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setCode(p.code);
    setName(p.name);
    setCategory(p.category);
    setUnit(p.unit);
    setDescription(p.description || '');
    setProductAccessories([...p.accessories]);
    setIsEditing(true);
  };

  const handleToggleAccessory = (accId: string) => {
    const exists = productAccessories.find((a) => a.accessoryId === accId);
    if (exists) {
      setProductAccessories(productAccessories.filter((a) => a.accessoryId !== accId));
    } else {
      setProductAccessories([...productAccessories, { accessoryId: accId, qtyPerProduct: 2 }]);
    }
  };

  const handleUpdateAccQty = (accId: string, qty: number) => {
    setProductAccessories(
      productAccessories.map((a) => (a.accessoryId === accId ? { ...a, qtyPerProduct: qty } : a))
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const item: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      code: code.trim() || `PRD-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      category: category.trim() || 'Garment Umum',
      unit: unit.trim() || 'Pcs',
      description: description.trim(),
      accessories: productAccessories,
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveProduct(item);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Master Data Produk</h2>
            <p className="text-xs text-slate-500">
              Daftar produk jadi dan konfigurasi komposisi accessories pembentuknya
            </p>
          </div>
        </div>
        <button
          id="btn-add-product"
          onClick={handleOpenNew}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-800 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-900 transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Produk Baru</span>
        </button>
      </div>

      {/* Modal / Form Create or Edit */}
      {isEditing && (
        <div className="rounded-2xl border-2 border-blue-600 bg-white p-6 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
            <h3 className="text-sm font-bold text-slate-900">
              {editingProduct ? 'Edit Master Produk' : 'Tambah Produk Baru'}
            </h3>
            <button
              onClick={() => setIsEditing(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kode Produk</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 font-mono outline-hidden focus:border-blue-600"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Produk <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Kopelriem CN1"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Contoh: Perlengkapan Dinas"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Satuan</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Pcs, Pasang, Set"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Keterangan / Deskripsi</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Spesifikasi umum produk"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-blue-600"
                />
              </div>
            </div>

            {/* Accessories Assignment Section */}
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-xs">Pilih Accessories yang Digunakan Produk Ini</div>
                  <div className="text-[11px] text-slate-500">
                    Centang accessories dan masukkan jumlah kebutuhan per 1 pcs produk jadi.
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-blue-800 bg-blue-100/60 px-2.5 py-1 rounded-md">
                  {productAccessories.length} Accessories Terpilih
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
                {accessories.map((acc) => {
                  const isSelected = productAccessories.some((a) => a.accessoryId === acc.id);
                  const selectedRel = productAccessories.find((a) => a.accessoryId === acc.id);

                  return (
                    <div
                      key={acc.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0 pr-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleAccessory(acc.id)}
                          className="rounded text-blue-700 focus:ring-blue-600 h-4 w-4"
                        />
                        <div className="truncate">
                          <div className="font-semibold text-slate-800 text-xs truncate">{acc.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{acc.code}</div>
                        </div>
                      </label>

                      {isSelected && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            value={selectedRel?.qtyPerProduct || 2}
                            onChange={(e) => handleUpdateAccQty(acc.id, parseFloat(e.target.value) || 1)}
                            className="w-14 rounded-md border border-blue-300 bg-white px-1.5 py-1 text-center font-bold text-blue-900 text-xs focus:ring-1 focus:ring-blue-600 outline-hidden"
                          />
                          <span className="text-[10px] text-slate-500">{acc.unit}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-800 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-900 transition shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Produk</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Product List Cards / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {products.map((prod) => (
          <div
            key={prod.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-600">
                  {prod.code}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{prod.name}</h3>
                <span className="text-xs text-slate-500">{prod.category}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(prod)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                  title="Edit produk"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Hapus produk ${prod.name}?`)) onDeleteProduct(prod.id);
                  }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                  title="Hapus produk"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {prod.description && <p className="text-xs text-slate-600 leading-relaxed">{prod.description}</p>}

            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-700" />
                  <span>Komposisi Accessories:</span>
                </div>
                <span className="text-slate-500 font-normal">{prod.accessories.length} komponen</span>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {prod.accessories.map((rel) => {
                  const acc = accessories.find((a) => a.id === rel.accessoryId);
                  return (
                    <span
                      key={rel.accessoryId}
                      className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-medium text-slate-700 border border-slate-200 shadow-2xs"
                    >
                      <span>{acc?.name || rel.accessoryId}</span>
                      <strong className="text-blue-900 font-bold">({rel.qtyPerProduct} {acc?.unit || 'buah'})</strong>
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="pt-1">
              <button
                onClick={() => onSelectForCalculation(prod)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 py-2 text-xs font-bold text-blue-900 hover:bg-blue-100/80 transition"
              >
                <Calculator className="w-3.5 h-3.5 text-blue-700" />
                <span>Hitung Konsumsi Bahan Produk Ini</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
