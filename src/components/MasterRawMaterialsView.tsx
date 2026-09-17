import React, { useState } from 'react';
import { RawMaterial } from '../types';
import { Layers, Plus, Edit2, Trash2, Check, X, ShieldAlert } from 'lucide-react';

interface MasterRawMaterialsViewProps {
  rawMaterials: RawMaterial[];
  onSaveRawMaterial: (material: RawMaterial) => void;
  onDeleteRawMaterial: (id: string) => void;
}

export const MasterRawMaterialsView: React.FC<MasterRawMaterialsViewProps> = ({
  rawMaterials,
  onSaveRawMaterial,
  onDeleteRawMaterial,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<RawMaterial | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [specification, setSpecification] = useState('');
  const [unit, setUnit] = useState('Lembar');
  const [currentStock, setCurrentStock] = useState<number>(100);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const handleOpenNew = () => {
    const nextNum = rawMaterials.length + 1;
    setCode(`BB-00${nextNum}`);
    setName('');
    setSpecification('');
    setUnit('Lembar');
    setCurrentStock(100);
    setUnitPrice(250000);
    setNotes('');
    setEditingItem(null);
    setIsEditing(true);
  };

  const handleOpenEdit = (m: RawMaterial) => {
    setEditingItem(m);
    setCode(m.code);
    setName(m.name);
    setSpecification(m.specification);
    setUnit(m.unit);
    setCurrentStock(m.currentStock);
    setUnitPrice(m.unitPrice || 0);
    setNotes(m.notes || '');
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const item: RawMaterial = {
      id: editingItem ? editingItem.id : `bb-${Date.now()}`,
      code: code.trim() || `BB-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      specification: specification.trim(),
      unit: unit.trim() || 'Lembar',
      currentStock: Number(currentStock) || 0,
      unitPrice: Number(unitPrice) || 0,
      notes: notes.trim(),
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveRawMaterial(item);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Master Data Bahan Baku</h2>
            <p className="text-xs text-slate-500">
              Pengelolaan lembaran plat kuningan, plat stainless, kain, dan material utama produksi
            </p>
          </div>
        </div>
        <button
          id="btn-add-raw-material"
          onClick={handleOpenNew}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-800 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-900 transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Bahan Baku</span>
        </button>
      </div>

      {isEditing && (
        <div className="rounded-2xl border-2 border-amber-600 bg-white p-6 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
            <h3 className="text-sm font-bold text-slate-900">
              {editingItem ? 'Edit Bahan Baku' : 'Tambah Bahan Baku Baru'}
            </h3>
            <button
              onClick={() => setIsEditing(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kode Bahan</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 font-mono outline-hidden focus:border-amber-600"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Bahan Baku <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Plat Kuningan Tebal 0,65 mm Ukuran 60 cm x 120"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-amber-600"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Spesifikasi & Dimensi</label>
                <input
                  type="text"
                  value={specification}
                  onChange={(e) => setSpecification(e.target.value)}
                  placeholder="Contoh: Kuningan MS-63, Tebal 0,65 mm, Dimensi 60 cm x 120 cm"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-amber-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Satuan Utama</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Lembar, Meter, Roll, Kg"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-amber-600"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Stok Tersedia di Gudang</label>
                <input
                  type="number"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-amber-600 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Estimasi Harga Satuan (Rp)</label>
                <input
                  type="number"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-amber-600 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Supplier / catatan penyimpanan"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-amber-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-700 px-5 py-2 text-xs font-semibold text-white hover:bg-amber-800 transition shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Bahan Baku</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Raw Material Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                <th className="py-3 px-4 font-bold">Kode</th>
                <th className="py-3 px-4 font-bold">Nama Bahan Baku</th>
                <th className="py-3 px-4 font-bold">Spesifikasi & Ukuran</th>
                <th className="py-3 px-4 font-bold">Satuan</th>
                <th className="py-3 px-4 font-bold text-right">Stok Gudang</th>
                <th className="py-3 px-4 font-bold text-right">Harga Satuan</th>
                <th className="py-3 px-4 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rawMaterials.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-mono font-bold text-slate-600">{m.code}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{m.name}</div>
                    {m.notes && <div className="text-[11px] text-slate-500">{m.notes}</div>}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{m.specification || '-'}</td>
                  <td className="py-3 px-4 font-medium text-slate-700">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-800">
                      {m.unit}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                    {m.currentStock.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">
                    {m.unitPrice ? `Rp ${m.unitPrice.toLocaleString('id-ID')}` : '-'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(m)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                        title="Edit bahan"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Hapus bahan baku ${m.name}?`)) onDeleteRawMaterial(m.id);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Hapus bahan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
