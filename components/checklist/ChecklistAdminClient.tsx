'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Check, X, Loader2, GripVertical } from 'lucide-react';
import type { TemplateItem } from '@/types/checklist';

export function ChecklistAdminClient() {
  const [items, setItems]       = useState<TemplateItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [adding, setAdding]     = useState(false);
  const [newItem, setNewItem]   = useState({ categoria: '', descripcion: '' });
  const [saving, setSaving]     = useState(false);
  const [editId, setEditId]     = useState<number | null>(null);
  const [editData, setEditData] = useState({ categoria: '', descripcion: '', orderIndex: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checklist/template');
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      setItems(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newItem.categoria.trim() || !newItem.descripcion.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/checklist/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoria:   newItem.categoria.trim(),
          descripcion: newItem.descripcion.trim(),
          orderIndex:  items.length,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      setNewItem({ categoria: '', descripcion: '' });
      setAdding(false);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al agregar');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: TemplateItem) => {
    setEditId(item.TemplateItemID);
    setEditData({ categoria: item.Categoria, descripcion: item.Descripcion, orderIndex: item.OrderIndex });
    setAdding(false);
  };

  const handleUpdate = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/checklist/template/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      setEditId(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este ítem del template? Los checklists ya creados no se verán afectados.')) return;
    try {
      const res = await fetch(`/api/checklist/template/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  return (
    <div className="space-y-4">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-gray-900">Template de Checklist</h1>
          <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">
            Estos ítems se cargan automáticamente al crear un checklist.
          </p>
        </div>
        <button
          onClick={() => { setAdding(true); setEditId(null); }}
          className="shrink-0 flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Agregar ítem</span>
          <span className="sm:hidden">Agregar</span>
        </button>
      </div>

      {error && (
        <p className="text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">{error}</p>
      )}

      {/* ── Formulario nuevo ítem ─────────────────────────────────────── */}
      {adding && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-blue-800">Nuevo ítem</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              autoFocus
              placeholder="Categoría (ej. Motor, Carrocería…)"
              value={newItem.categoria}
              onChange={e => setNewItem(p => ({ ...p, categoria: e.target.value }))}
              className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <input
              placeholder="Descripción del punto a inspeccionar"
              value={newItem.descripcion}
              onChange={e => setNewItem(p => ({ ...p, descripcion: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving || !newItem.categoria.trim() || !newItem.descripcion.trim()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Guardar
            </button>
            <button
              onClick={() => { setAdding(false); setNewItem({ categoria: '', descripcion: '' }); }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <X size={14} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={28} className="animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {/* ── Vista MÓVIL: cards ──────────────────────────────────── */}
          <div className="md:hidden space-y-2">
            {items.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-10 text-center text-gray-400 text-sm">
                Sin ítems — agrega el primero con el botón de arriba.
              </div>
            )}

            {items.map(item => (
              <div
                key={item.TemplateItemID}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {editId === item.TemplateItemID ? (
                  /* ── Modo edición (card inline) ── */
                  <div className="p-4 space-y-3">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Editando ítem</p>
                    <div className="space-y-2">
                      <input
                        autoFocus
                        placeholder="Categoría"
                        value={editData.categoria}
                        onChange={e => setEditData(p => ({ ...p, categoria: e.target.value }))}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        placeholder="Descripción"
                        value={editData.descripcion}
                        onChange={e => setEditData(p => ({ ...p, descripcion: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleUpdate()}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 shrink-0">Orden</label>
                        <input
                          type="number"
                          value={editData.orderIndex}
                          onChange={e => setEditData(p => ({ ...p, orderIndex: parseInt(e.target.value) || 0 }))}
                          className="w-20 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdate}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Guardar
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <X size={14} /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Modo lectura ── */
                  <div className="flex items-stretch">
                    {/* Número de orden */}
                    <div className="flex items-center justify-center w-10 shrink-0 bg-gray-50 border-r border-gray-100">
                      <span className="text-xs text-gray-400 font-mono">{item.OrderIndex}</span>
                    </div>

                    <div className="flex-1 min-w-0 px-4 py-3.5">
                      <span className="text-[10px] font-bold tracking-widest uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {item.Categoria}
                      </span>
                      <p className="text-sm font-medium text-gray-800 mt-1.5 leading-snug">
                        {item.Descripcion}
                      </p>
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-col items-center justify-center px-3 gap-2 border-l border-gray-50">
                      <button
                        onClick={() => startEdit(item)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.TemplateItemID)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Vista DESKTOP: tabla ────────────────────────────────── */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 w-8" />
                  <th className="px-4 py-3 text-left w-24">Orden</th>
                  <th className="px-4 py-3 text-left">Categoría</th>
                  <th className="px-4 py-3 text-left">Descripción</th>
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(item => (
                  <tr key={item.TemplateItemID} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3 text-gray-300"><GripVertical size={16} /></td>
                    <td className="px-4 py-3">
                      {editId === item.TemplateItemID ? (
                        <input
                          type="number"
                          value={editData.orderIndex}
                          onChange={e => setEditData(p => ({ ...p, orderIndex: parseInt(e.target.value) || 0 }))}
                          className="w-16 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="text-gray-400 text-xs">{item.OrderIndex}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700">
                      {editId === item.TemplateItemID ? (
                        <input
                          autoFocus
                          value={editData.categoria}
                          onChange={e => setEditData(p => ({ ...p, categoria: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : item.Categoria}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {editId === item.TemplateItemID ? (
                        <input
                          value={editData.descripcion}
                          onChange={e => setEditData(p => ({ ...p, descripcion: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleUpdate()}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : item.Descripcion}
                    </td>
                    <td className="px-4 py-3">
                      {editId === item.TemplateItemID ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={handleUpdate}
                            disabled={saving}
                            className="text-green-600 hover:text-green-800 disabled:opacity-40 transition-colors"
                          >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />}
                          </button>
                          <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(item)} className="text-gray-400 hover:text-blue-600 transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(item.TemplateItemID)} className="text-gray-400 hover:text-red-600 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                      Sin ítems en el template — agrega el primero con el botón de arriba.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {items.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          {items.length} ítem{items.length !== 1 ? 's' : ''} en el template · Los checklists nuevos los cargarán automáticamente
        </p>
      )}
    </div>
  );
}
