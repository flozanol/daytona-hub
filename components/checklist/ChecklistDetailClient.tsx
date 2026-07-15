'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, Check, X, MessageSquare,
  CheckCircle2, XCircle, MinusCircle, ArrowUp,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import type { ChecklistSummary, ChecklistItem, ChecklistStatus, ItemResultado } from '@/types/checklist';

interface ChecklistDetailClientProps {
  checklistId: number;
  isAdmin: boolean;
}

type Pending = { itemId: number; newValue: ItemResultado } | null;

// ── Modal de notas ────────────────────────────────────────────────────────────
function NotasModal({
  item,
  onClose,
  onSave,
}: {
  item: ChecklistItem;
  onClose: () => void;
  onSave: (notas: string) => Promise<void>;
}) {
  const [text, setText]     = useState(item.Notas ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(text);
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="font-semibold text-gray-900 text-sm">{item.Categoria}</p>
          <p className="text-xs text-gray-500 mt-0.5">{item.Descripcion}</p>
        </div>
        <div className="p-5">
          <label className="block text-xs font-medium text-gray-600 mb-2">Nota</label>
          <textarea
            autoFocus
            rows={4}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Escribe una nota sobre este ítem…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          />
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Badge solo lectura ────────────────────────────────────────────────────────
function ResultadoBadge({ value }: { value: ItemResultado }) {
  if (value === true)  return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full"><CheckCircle2 size={12} /> Bueno</span>;
  if (value === false) return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full"><XCircle size={12} /> Malo</span>;
  return <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full"><MinusCircle size={12} /> Sin evaluar</span>;
}

// ── Toggle desktop ────────────────────────────────────────────────────────────
function ResultadoToggle({
  value,
  pending,
  onChange,
}: {
  value: ItemResultado;
  pending: ItemResultado | undefined;
  onChange: (v: ItemResultado) => void;
}) {
  const isSaving = pending !== undefined;
  return (
    <div className="flex gap-1.5">
      <button
        onClick={() => !isSaving && onChange(value === true ? null : true)}
        disabled={isSaving}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all disabled:cursor-not-allowed
          ${value === true
            ? 'bg-green-500 border-green-500 text-white shadow-sm'
            : 'border-gray-200 text-gray-400 hover:border-green-300 hover:text-green-600 hover:bg-green-50'
          }`}
      >
        {isSaving && pending === true ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
        Bueno
      </button>
      <button
        onClick={() => !isSaving && onChange(value === false ? null : false)}
        disabled={isSaving}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all disabled:cursor-not-allowed
          ${value === false
            ? 'bg-red-500 border-red-500 text-white shadow-sm'
            : 'border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-600 hover:bg-red-50'
          }`}
      >
        {isSaving && pending === false ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
        Malo
      </button>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export function ChecklistDetailClient({ checklistId, isAdmin }: ChecklistDetailClientProps) {
  const [checklist, setChecklist]   = useState<ChecklistSummary | null>(null);
  const [items, setItems]           = useState<ChecklistItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [pending, setPending]       = useState<Pending>(null);
  const [notasItem, setNotasItem]   = useState<ChecklistItem | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 280);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clRes, itemsRes] = await Promise.all([
        fetch(`/api/checklist/${checklistId}`),
        fetch(`/api/checklist/${checklistId}/items`),
      ]);
      if (!clRes.ok)    throw new Error((await clRes.json()).error    ?? clRes.statusText);
      if (!itemsRes.ok) throw new Error((await itemsRes.json()).error ?? itemsRes.statusText);
      setChecklist(await clRes.json());
      setItems(await itemsRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [checklistId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const patchItem = async (item: ChecklistItem, patch: Partial<{ resultado: ItemResultado; notas: string | null }>) => {
    const body = {
      categoria:   item.Categoria,
      descripcion: item.Descripcion,
      resultado:   patch.resultado !== undefined ? patch.resultado : item.Resultado,
      notas:       patch.notas     !== undefined ? patch.notas    : item.Notas,
    };
    const res = await fetch(`/api/checklist/${checklistId}/items/${item.ItemID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
    setItems(prev => prev.map(i =>
      i.ItemID === item.ItemID ? { ...i, Resultado: body.resultado, Notas: body.notas } : i,
    ));
  };

  const handleResultado = async (item: ChecklistItem, resultado: ItemResultado) => {
    setPending({ itemId: item.ItemID, newValue: resultado });
    try { await patchItem(item, { resultado }); }
    catch (e) { alert(e instanceof Error ? e.message : 'Error al actualizar'); }
    finally { setPending(null); }
  };

  const handleSaveNotas = async (notas: string) => {
    if (!notasItem) return;
    try {
      await patchItem(notasItem, { notas: notas.trim() || null });
      setNotasItem(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al guardar nota');
    }
  };

  const handleStatusChange = async (status: ChecklistStatus) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/checklist/${checklistId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      await loadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al cambiar status');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !checklist) {
    return (
      <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
        {error ?? 'Checklist no encontrado'}
      </p>
    );
  }

  const vehicle  = [checklist.Marca, checklist.SubMarca, checklist.Version].filter(Boolean).join(' ');
  const bueno    = items.filter(i => i.Resultado === true).length;
  const malo     = items.filter(i => i.Resultado === false).length;
  const sinEval  = items.filter(i => i.Resultado === null).length;
  const total    = items.length;
  const evaluated = bueno + malo;
  const allDone  = total > 0 && sinEval === 0;
  const progress = total > 0 ? (evaluated / total) * 100 : 0;

  return (
    <>
      {notasItem && (
        <NotasModal
          item={notasItem}
          onClose={() => setNotasItem(null)}
          onSave={handleSaveNotas}
        />
      )}

      {/* Padding inferior en móvil para no quedar tapado por la barra sticky */}
      <div className="space-y-4 pb-0 md:pb-0" style={{ paddingBottom: isAdmin ? undefined : undefined }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-5">

          {/* Título — más compacto en móvil */}
          <h1 className="text-base md:text-xl font-bold text-gray-900 leading-snug">
            {vehicle || 'Vehículo'} — {checklist.ModeloYr}
          </h1>

          {/* Meta — solo desktop */}
          <p className="hidden sm:block text-sm text-gray-500 mt-1">
            Clave: <span className="font-mono">{checklist.SLInvtID ?? '—'}</span>
            {' · '}VIN: <span className="font-mono">{checklist.VIN ?? '—'}</span>
            {checklist.CpnyName && <> · {checklist.CpnyName}</>}
          </p>

          {/* Status + conteos */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <StatusBadge status={checklist.Status} />
            {total > 0 && (
              <span className="text-xs text-gray-400">
                <span className="text-green-600 font-semibold">{bueno} buenos</span>
                {' · '}
                <span className="text-red-500 font-semibold">{malo} malos</span>
                {' · '}
                <span className="text-gray-400">{sinEval} sin evaluar</span>
              </span>
            )}
          </div>

          {/* Botones de status — solo desktop */}
          {isAdmin && (
            <div className="hidden md:flex gap-2 flex-wrap mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => handleStatusChange(1)}
                disabled={checklist.Status === 1 || saving}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-yellow-300 text-yellow-700 hover:bg-yellow-50 disabled:opacity-40 transition-colors"
              >
                Marcar En proceso
              </button>
              <button
                onClick={() => handleStatusChange(2)}
                disabled={checklist.Status === 2 || saving}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-40 transition-colors"
              >
                Marcar Completado
              </button>
            </div>
          )}
        </div>

        {/* ── Ítems: MÓVIL ─────────────────────────────────────────────── */}
        <div className="md:hidden space-y-3 pb-28">
          {total === 0 && (
            <p className="text-center text-gray-400 text-sm py-10 bg-white rounded-xl border border-gray-100">
              Sin ítems de inspección
            </p>
          )}
          {items.map(item => {
            const isSavingThis = pending?.itemId === item.ItemID;
            return (
              <div
                key={item.ItemID}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* Header card: categoría + nota */}
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                    {item.Categoria}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => setNotasItem(item)}
                      className={`p-2 rounded-xl transition-colors active:scale-95 ${
                        item.Notas ? 'text-blue-500 bg-blue-50' : 'text-gray-300 active:bg-gray-100'
                      }`}
                    >
                      <MessageSquare size={16} />
                    </button>
                  )}
                </div>

                {/* Descripción */}
                <p className="px-4 pb-4 text-sm font-medium text-gray-800 leading-snug">
                  {item.Descripcion}
                </p>

                <div className="h-px bg-gray-100 mx-4" />

                {/* Botones */}
                <div className="p-3">
                  {isAdmin ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => !isSavingThis && handleResultado(item, item.Resultado === true ? null : true)}
                        disabled={isSavingThis}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[.98] disabled:cursor-not-allowed
                          ${item.Resultado === true
                            ? 'bg-green-500 text-white shadow-sm'
                            : 'bg-gray-50 border border-gray-200 text-gray-500'
                          }`}
                      >
                        {isSavingThis && pending?.newValue === true
                          ? <Loader2 size={15} className="animate-spin" />
                          : <Check size={15} className={item.Resultado === true ? 'text-white' : 'text-gray-400'} />
                        }
                        Bueno
                      </button>
                      <button
                        onClick={() => !isSavingThis && handleResultado(item, item.Resultado === false ? null : false)}
                        disabled={isSavingThis}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[.98] disabled:cursor-not-allowed
                          ${item.Resultado === false
                            ? 'bg-red-500 text-white shadow-sm'
                            : 'bg-gray-50 border border-gray-200 text-gray-500'
                          }`}
                      >
                        {isSavingThis && pending?.newValue === false
                          ? <Loader2 size={15} className="animate-spin" />
                          : <X size={15} className={item.Resultado === false ? 'text-white' : 'text-gray-400'} />
                        }
                        Malo
                      </button>
                    </div>
                  ) : (
                    <div className="py-1"><ResultadoBadge value={item.Resultado} /></div>
                  )}
                </div>

                {/* Nota preview */}
                {item.Notas && (
                  <div className="mx-3 mb-3 flex items-start gap-2 bg-blue-50 rounded-xl px-3 py-2.5">
                    <MessageSquare size={12} className="text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-700 leading-relaxed">{item.Notas}</p>
                  </div>
                )}

                {/* Guardando deselección */}
                {isSavingThis && pending?.newValue === null && (
                  <div className="px-4 pb-3 flex items-center gap-1.5 text-xs text-gray-400">
                    <Loader2 size={11} className="animate-spin" /> Guardando…
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Ítems: DESKTOP tabla ─────────────────────────────────────── */}
        <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Ítems de inspección ({total})</h2>
          </div>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 text-left w-32">Categoría</th>
                <th className="px-5 py-3 text-left">Descripción</th>
                <th className="px-5 py-3 text-left w-44">Resultado</th>
                <th className="px-5 py-3 text-left w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item.ItemID} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-700 text-xs uppercase tracking-wide">{item.Categoria}</td>
                  <td className="px-5 py-3 text-gray-600">{item.Descripcion}</td>
                  <td className="px-5 py-3">
                    {isAdmin
                      ? (
                        <ResultadoToggle
                          value={item.Resultado}
                          pending={pending?.itemId === item.ItemID ? pending.newValue : undefined}
                          onChange={(v) => handleResultado(item, v)}
                        />
                      )
                      : <ResultadoBadge value={item.Resultado} />
                    }
                  </td>
                  <td className="px-5 py-3">
                    {isAdmin ? (
                      <button
                        onClick={() => setNotasItem(item)}
                        title={item.Notas ?? 'Agregar nota'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          item.Notas
                            ? 'text-blue-500 bg-blue-50 hover:bg-blue-100'
                            : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        <MessageSquare size={15} />
                      </button>
                    ) : item.Notas ? (
                      <span className="text-xs text-gray-400 italic">{item.Notas}</span>
                    ) : null}
                  </td>
                </tr>
              ))}
              {total === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-gray-400">
                    Sin ítems de inspección
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Barra sticky inferior (móvil, solo admins) ────────────────── */}
      {isAdmin && (
        <div className="fixed bottom-0 left-0 right-0 md:hidden z-30">
          {/* Barra de progreso */}
          <div className="h-1 bg-gray-200">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 px-4 py-3 flex items-center gap-3">

            {/* Scroll to top */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className={`shrink-0 p-2.5 rounded-xl border border-gray-200 text-gray-500 transition-all ${
                showScrollTop ? 'opacity-100' : 'opacity-30 pointer-events-none'
              }`}
            >
              <ArrowUp size={16} />
            </button>

            {/* Conteo */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700">
                {evaluated} de {total} evaluados
              </p>
              {!allDone && sinEval > 0 && (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Falta{sinEval > 1 ? 'n' : ''} {sinEval} ítem{sinEval > 1 ? 's' : ''} por evaluar
                </p>
              )}
              {allDone && checklist.Status !== 2 && (
                <p className="text-[10px] text-green-600 mt-0.5 font-medium">
                  ¡Todo evaluado! Ya puedes completar.
                </p>
              )}
              {checklist.Status === 2 && (
                <p className="text-[10px] text-green-600 mt-0.5 font-medium">
                  Checklist completado
                </p>
              )}
            </div>

            {/* Botón Completar */}
            <button
              onClick={() => handleStatusChange(2)}
              disabled={!allDone || checklist.Status === 2 || saving}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${allDone && checklist.Status !== 2
                  ? 'bg-green-500 text-white shadow-sm active:scale-95 active:bg-green-600'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
            >
              {saving
                ? <Loader2 size={14} className="animate-spin" />
                : <CheckCircle2 size={14} />
              }
              Completar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
