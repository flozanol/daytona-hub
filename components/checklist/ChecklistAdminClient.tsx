'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, Check, X, Loader2, GripVertical, List, ToggleLeft } from 'lucide-react';
import type { TemplateItem, TipoItem } from '@/types/checklist';

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  categoria: string;
  descripcion: string;
  orderIndex: number;
  tipoItem: TipoItem;
  opciones: string[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Excelente · Bueno · Regular · Malo', values: ['Excelente', 'Bueno', 'Regular', 'Malo'] },
  { label: 'Sí · No · N/A',                      values: ['Sí', 'No', 'N/A'] },
  { label: 'Funciona · Falla · No aplica',        values: ['Funciona', 'Falla', 'No aplica'] },
];

const DEFAULT_OPCIONES = ['Excelente', 'Bueno', 'Regular', 'Malo'];

function TipoBadge({ tipo }: { tipo: TipoItem }) {
  return tipo === 'opciones'
    ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full"><List size={9} /> Opciones</span>
    : <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full"><ToggleLeft size={9} /> Sí / No</span>;
}

// ─── Card selector de tipo ────────────────────────────────────────────────────

function TipoCards({ value, onChange }: { value: TipoItem; onChange: (v: TipoItem) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Sí / No */}
      <button
        type="button"
        onClick={() => onChange('boolean')}
        className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
          value === 'boolean'
            ? 'border-green-500 bg-green-50 shadow-sm'
            : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        {value === 'boolean' && (
          <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
            <Check size={11} className="text-white" />
          </div>
        )}
        <div className="text-xl mb-2">✅</div>
        <p className={`text-sm font-bold ${value === 'boolean' ? 'text-green-800' : 'text-gray-700'}`}>Sí / No</p>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">Marca el punto como <span className="font-semibold text-green-700">Bueno</span> o <span className="font-semibold text-red-500">Malo</span></p>
      </button>

      {/* Opciones */}
      <button
        type="button"
        onClick={() => onChange('opciones')}
        className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
          value === 'opciones'
            ? 'border-purple-500 bg-purple-50 shadow-sm'
            : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        {value === 'opciones' && (
          <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
            <Check size={11} className="text-white" />
          </div>
        )}
        <div className="text-xl mb-2">📋</div>
        <p className={`text-sm font-bold ${value === 'opciones' ? 'text-purple-800' : 'text-gray-700'}`}>Opciones</p>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">Elige entre varias <span className="font-semibold text-purple-600">opciones predefinidas</span></p>
      </button>
    </div>
  );
}

// ─── Input de opciones tipo chips ─────────────────────────────────────────────

function OpcionesInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setDraft('');
    inputRef.current?.focus();
  };

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Opciones disponibles
          <span className="ml-1.5 text-gray-400 font-normal normal-case tracking-normal">({value.length} opciones)</span>
        </label>
      </div>

      {/* Sugerencias rápidas */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Sugerencias rápidas</p>
        <div className="flex flex-col gap-1.5">
          {PRESETS.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(p.values)}
              className={`text-left text-xs px-3 py-2 rounded-xl border transition-colors ${
                JSON.stringify(value) === JSON.stringify(p.values)
                  ? 'border-purple-400 bg-purple-50 text-purple-700 font-semibold'
                  : 'border-gray-200 text-gray-600 hover:border-purple-300 hover:bg-purple-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chips actuales */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-3 focus-within:border-purple-400 transition-colors min-h-[52px]">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((o, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-xs font-medium px-2.5 py-1 rounded-full">
              {o}
              <button type="button" onClick={() => remove(i)} className="hover:text-purple-900 ml-0.5">
                <X size={10} />
              </button>
            </span>
          ))}
          {value.length === 0 && (
            <span className="text-xs text-gray-400 italic py-1">Sin opciones — agrega usando el campo de abajo</span>
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-gray-100 pt-2">
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder="Escribir opción y presionar Enter…"
            className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400 bg-transparent"
          />
          <button
            type="button"
            onClick={add}
            disabled={!draft.trim()}
            className="p-1 rounded-lg text-purple-600 hover:bg-purple-100 disabled:opacity-30 transition-colors"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Formulario reutilizable ──────────────────────────────────────────────────

function ItemForm({
  title,
  data,
  onChange,
  onSave,
  onCancel,
  saving,
  isEdit,
}: {
  title: string;
  data: Omit<FormData, 'orderIndex'> & { orderIndex?: number };
  onChange: (patch: Partial<FormData>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isEdit?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-5 space-y-4 border ${isEdit ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
      <p className={`text-sm font-bold ${isEdit ? 'text-amber-800' : 'text-blue-800'}`}>{title}</p>

      {/* Selector de tipo */}
      <TipoCards
        value={data.tipoItem}
        onChange={v => onChange({
          tipoItem: v,
          opciones: v === 'opciones' ? DEFAULT_OPCIONES : [],
        })}
      />

      {/* Categoría + Descripción */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Información del punto</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <input
              autoFocus
              placeholder="Categoría (ej. Motor, Carrocería…)"
              value={data.categoria}
              onChange={e => onChange({ categoria: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            />
            <p className="text-[10px] text-gray-400 mt-1 ml-1">Agrupa ítems relacionados</p>
          </div>
          <div>
            <input
              placeholder="Punto a inspeccionar"
              value={data.descripcion}
              onChange={e => onChange({ descripcion: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && data.tipoItem === 'boolean' && onSave()}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            />
            <p className="text-[10px] text-gray-400 mt-1 ml-1">Describe qué se va a revisar</p>
          </div>
        </div>
      </div>

      {/* Opciones (solo si tipo = opciones) */}
      {data.tipoItem === 'opciones' && (
        <OpcionesInput
          value={data.opciones}
          onChange={opciones => onChange({ opciones })}
        />
      )}

      {/* Botones */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={saving || !data.categoria.trim() || !data.descripcion.trim() || (data.tipoItem === 'opciones' && data.opciones.length === 0)}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Guardar
        </button>
        <button
          onClick={onCancel}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <X size={14} /> Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

const EMPTY_NEW = { categoria: '', descripcion: '', tipoItem: 'boolean' as TipoItem, opciones: [] as string[] };

export function ChecklistAdminClient() {
  const [items, setItems]       = useState<TemplateItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [adding, setAdding]     = useState(false);
  const [newItem, setNewItem]   = useState(EMPTY_NEW);
  const [saving, setSaving]     = useState(false);
  const [editId, setEditId]     = useState<number | null>(null);
  const [editData, setEditData] = useState<FormData>({
    categoria: '', descripcion: '', orderIndex: 0, tipoItem: 'boolean', opciones: [],
  });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/checklist/template');
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      setItems(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally { setLoading(false); }
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
          tipoItem:    newItem.tipoItem,
          opciones:    newItem.tipoItem === 'opciones' && newItem.opciones.length ? newItem.opciones : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      setNewItem(EMPTY_NEW);
      setAdding(false);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al agregar');
    } finally { setSaving(false); }
  };

  const startEdit = (item: TemplateItem) => {
    setEditId(item.TemplateItemID);
    setEditData({
      categoria:   item.Categoria,
      descripcion: item.Descripcion,
      orderIndex:  item.OrderIndex,
      tipoItem:    item.TipoItem,
      opciones:    item.Opciones ?? [],
    });
    setAdding(false);
  };

  const handleUpdate = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/checklist/template/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoria:   editData.categoria,
          descripcion: editData.descripcion,
          orderIndex:  editData.orderIndex,
          tipoItem:    editData.tipoItem,
          opciones:    editData.tipoItem === 'opciones' && editData.opciones.length ? editData.opciones : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      setEditId(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al actualizar');
    } finally { setSaving(false); }
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

      {/* Header */}
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

      {error && <p className="text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">{error}</p>}

      {/* Formulario nuevo ítem */}
      {adding && (
        <ItemForm
          title="Nuevo ítem"
          data={newItem}
          onChange={patch => setNewItem(p => ({ ...p, ...patch } as typeof EMPTY_NEW))}
          onSave={handleAdd}
          onCancel={() => { setAdding(false); setNewItem(EMPTY_NEW); }}
          saving={saving}
        />
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={28} className="animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {/* Vista MÓVIL: cards */}
          <div className="md:hidden space-y-2">
            {items.length === 0 && !adding && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-10 text-center text-gray-400 text-sm">
                Sin ítems — agrega el primero con el botón de arriba.
              </div>
            )}

            {items.map(item => (
              <div key={item.TemplateItemID} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {editId === item.TemplateItemID ? (
                  <div className="p-4">
                    <ItemForm
                      title="Editando ítem"
                      data={editData}
                      onChange={patch => setEditData(p => ({ ...p, ...patch }))}
                      onSave={handleUpdate}
                      onCancel={() => setEditId(null)}
                      saving={saving}
                      isEdit
                    />
                  </div>
                ) : (
                  <div className="flex items-stretch">
                    <div className="flex items-center justify-center w-10 shrink-0 bg-gray-50 border-r border-gray-100">
                      <span className="text-xs text-gray-400 font-mono">{item.OrderIndex}</span>
                    </div>
                    <div className="flex-1 min-w-0 px-4 py-3.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          {item.Categoria}
                        </span>
                        <TipoBadge tipo={item.TipoItem} />
                      </div>
                      <p className="text-sm font-medium text-gray-800 mt-1.5 leading-snug">{item.Descripcion}</p>
                      {item.TipoItem === 'opciones' && item.Opciones && item.Opciones.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.Opciones.map(o => (
                            <span key={o} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{o}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-center justify-center px-3 gap-2 border-l border-gray-50">
                      <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Editar">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(item.TemplateItemID)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors" title="Eliminar">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Vista DESKTOP: tabla */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 w-8" />
                  <th className="px-4 py-3 text-left w-20">Orden</th>
                  <th className="px-4 py-3 text-left w-28">Tipo</th>
                  <th className="px-4 py-3 text-left w-32">Categoría</th>
                  <th className="px-4 py-3 text-left">Descripción / Opciones</th>
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(item => (
                  <tr key={item.TemplateItemID} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3 text-gray-300"><GripVertical size={16} /></td>
                    <td className="px-4 py-3">
                      {editId === item.TemplateItemID
                        ? <input type="number" value={editData.orderIndex} onChange={e => setEditData(p => ({ ...p, orderIndex: parseInt(e.target.value) || 0 }))}
                            className="w-16 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        : <span className="text-gray-400 text-xs">{item.OrderIndex}</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {editId === item.TemplateItemID
                        ? <div className="space-y-1">
                            {(['boolean', 'opciones'] as TipoItem[]).map(t => (
                              <button key={t} type="button"
                                onClick={() => setEditData(p => ({ ...p, tipoItem: t, opciones: t === 'opciones' ? (p.opciones.length ? p.opciones : DEFAULT_OPCIONES) : [] }))}
                                className={`w-full text-xs px-2 py-1.5 rounded-lg border font-medium transition-colors ${
                                  editData.tipoItem === t
                                    ? t === 'boolean' ? 'bg-green-600 text-white border-green-600' : 'bg-purple-600 text-white border-purple-600'
                                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                {t === 'boolean' ? '✅ Sí / No' : '📋 Opciones'}
                              </button>
                            ))}
                          </div>
                        : <TipoBadge tipo={item.TipoItem} />
                      }
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700">
                      {editId === item.TemplateItemID
                        ? <input autoFocus value={editData.categoria} onChange={e => setEditData(p => ({ ...p, categoria: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        : item.Categoria
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {editId === item.TemplateItemID
                        ? <div className="space-y-2">
                            <input value={editData.descripcion} onChange={e => setEditData(p => ({ ...p, descripcion: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && editData.tipoItem === 'boolean' && handleUpdate()}
                              placeholder="Descripción"
                              className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            {editData.tipoItem === 'opciones' && (
                              <OpcionesInput value={editData.opciones} onChange={opciones => setEditData(p => ({ ...p, opciones }))} />
                            )}
                          </div>
                        : <div>
                            <span>{item.Descripcion}</span>
                            {item.TipoItem === 'opciones' && item.Opciones && item.Opciones.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {item.Opciones.map(o => (
                                  <span key={o} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{o}</span>
                                ))}
                              </div>
                            )}
                          </div>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {editId === item.TemplateItemID
                        ? <div className="flex items-center gap-1.5">
                            <button onClick={handleUpdate} disabled={saving} className="text-green-600 hover:text-green-800 disabled:opacity-40 transition-colors">
                              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />}
                            </button>
                            <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={15} /></button>
                          </div>
                        : <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(item)} className="text-gray-400 hover:text-blue-600 transition-colors"><Pencil size={14} /></button>
                            <button onClick={() => handleDelete(item.TemplateItemID)} className="text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                          </div>
                      }
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Sin ítems en el template — agrega el primero con el botón de arriba.</td></tr>
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
