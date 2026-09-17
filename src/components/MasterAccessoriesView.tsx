import React, { useState } from 'react';
import { Accessory, RawMaterial } from '../types';
import { Sparkles, Plus, Edit2, Trash2, Check, X, Layers, ArrowRight } from 'lucide-react';

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

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('buah');
  const [defaultRawMaterialId, setDefaultRawMaterialId] = useState('');
  const [defaultYieldPerUnit, setDefaultYieldPerUnit] = useState<number>(465);
  const [notes, setNotes] = useState('');

  const handleOpenNew = () => {
    const nextNum = accessories.length + 1;
    setCode(`ACC-00${nextNum}`);
    setName('');
    setUnit('buah');
    setDefaultRawMaterialId(rawMaterials[0]?.id || '');
    setDefaultYieldPerUnit(400);
    setNotes('');
    setEditingItem(null);
    setIsEditing(true);
  };

  const handleOpenEdit = (a: Accessory) => {
    setEditingItem(a);
    setCode(a.code);
    setName(a.name);
    setUnit(a.unit);
    setDefaultRawMaterialId(a.defaultRawMaterialId);
    setDefaultYieldPerUnit(a.defaultYieldPerUnit);
    setNotes(a.notes || '');
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const item: Accessory = {
      id: editingItem ? editingItem.id : `acc-${Date.now()}`,
      code: code.trim() || `ACC-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      unit: unit.trim() || 'buah',
      defaultRawMaterialId: defaultRawMaterialId || (rawMaterials[0]?.id || ''),
      defaultYieldPerUnit: Number(defaultYieldPerUnit) || 1,
      notes: notes.trim(),
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveAccessory(item);
    setIsEditing(false);
  };

  const getMaterialName = (mId: string) => {
    return rawMaterials.find((m) => m.id === mId)?.name || 'Bahan Baku Tidak Terdaftar';
  };

  const getMaterialUnit = (mId: string) => {
    return rawMaterials.find((m) => m.id === mId)?.unit || 'Lembar';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-800">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Master Data Accessories & Rumus Hasil (Yield)</h2>
            <p className="text-xs text-slate-500">
              Menghubungkan komponen accessories dengan bahan baku dan yield output (jumlah buah per 1 lembar)
            </p>
          </div>
        </div>
        <button
          id="btn-add-accessory"
          onClick={handleOpenNew}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-800 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-900 transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Accessories</span>
        </button>
      </div>

      {isEditing && (
        <div className="rounded-2xl border-2 border-purple-600 bg-white p-6 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
            <h3 className="text-sm font-bold text-slate-900">
              {editingItem ? 'Edit Accessories' : 'Tambah Accessories Baru'}
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
                <label className="block font-semibold text-slate-700 mb-1">Kode Accessories</label>
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
                  Nama Accessories <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Kotak, Lidah, Bentuk U, Ujung Kopel"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-purple-600"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Satuan Accessories</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="buah, pcs, pasang"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-purple-600"
                  required
                />
              </div>

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
                      {m.name} ({m.specification || m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3 rounded-xl bg-purple-50/70 p-4 border border-purple-200">
                <div className="font-bold text-purple-900 mb-1 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  <span>Rumus Hasil Pemakaian (Yield):</span>
                </div>
                <p className="text-[11px] text-purple-800 mb-3">
                  Berapa banyak buah accessories yang dapat dihasilkan dari 1 satuan (lembar) bahan baku terpilih?
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-700">1 {getMaterialUnit(defaultRawMaterialId)} menghasilkan</span>
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
              </div>

              <div className="sm:col-span-3">
                <label className="block font-semibold text-slate-700 mb-1">Catatan</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Keterangan proses plong / stamping / cutting"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-hidden focus:border-purple-600"
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-800 px-5 py-2 text-xs font-semibold text-white hover:bg-purple-900 transition shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Accessories</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Accessories Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                <th className="py-3 px-4 font-bold">Kode</th>
                <th className="py-3 px-4 font-bold">Nama Accessories</th>
                <th className="py-3 px-4 font-bold">Bahan Baku Asal</th>
                <th className="py-3 px-4 font-bold text-right">Rumus Yield Output</th>
                <th className="py-3 px-4 font-bold">Catatan</th>
                <th className="py-3 px-4 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {accessories.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-mono font-bold text-slate-600">{a.code}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{a.name}</div>
                    <div className="text-[11px] text-slate-500">Satuan: {a.unit}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{getMaterialName(a.defaultRawMaterialId)}</div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-2.5 py-1 text-purple-900 border border-purple-200/60 font-mono font-bold">
                      <span>1 {getMaterialUnit(a.defaultRawMaterialId)}</span>
                      <ArrowRight className="w-3 h-3 text-purple-500" />
                      <span>{a.defaultYieldPerUnit} {a.unit}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{a.notes || '-'}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(a)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                        title="Edit accessories"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Hapus accessories ${a.name}?`)) onDeleteAccessory(a.id);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Hapus accessories"
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
