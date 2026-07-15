'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, Loader2, ChevronLeft, ChevronRight,
  Trash2, Settings2, Car, ChevronRight as ArrowRight,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import type { ChecklistSummary, PaginatedResult } from '@/types/checklist';

interface ChecklistListClientProps {
  isAdmin: boolean;
}

export function ChecklistListClient({ isAdmin }: ChecklistListClientProps) {
  const [page, setPage]         = useState(1);
  const [result, setResult]     = useState<PaginatedResult<ChecklistSummary> | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/checklist?page=${p}&pageSize=20`);
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page); }, [load, page]);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    if (!confirm('¿Eliminar este checklist? Esta acción no se puede deshacer.')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/checklist/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      await load(page);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  };

  const totalPages = result ? Math.ceil(result.total / result.pageSize) : 0;

  return (
    <div className="space-y-4">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-gray-900 leading-tight shrink-0">
          Checklist<br className="sm:hidden" />
          <span className="sm:ml-1">Seminuevos</span>
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <Link
              href="/checklist/admin"
              className="flex items-center gap-1.5 border border-gray-300 text-gray-600 px-3 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Settings2 size={14} />
              <span className="hidden sm:inline">Template</span>
            </Link>
          )}
          <Link
            href="/checklist/nuevo"
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus size={15} /> Nuevo
          </Link>
        </div>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
      )}

      {loading && !result ? (
        <div className="flex justify-center py-16">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {/* ── Vista MÓVIL: cards ──────────────────────────────────── */}
          <div className="md:hidden space-y-2">
            {result?.data.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-10 text-center text-gray-400 text-sm">
                No hay checklists registrados
              </div>
            )}

            {result?.data.map((c) => {
              const vehiculo = [c.Marca, c.SubMarca].filter(Boolean).join(' ');
              const version  = c.Version ?? '';
              const fecha    = new Date(c.Crtd_DateTime).toLocaleDateString('es-MX', {
                day: '2-digit', month: 'short', year: 'numeric',
              });

              return (
                <Link
                  key={c.ChecklistID}
                  href={`/checklist/${c.ChecklistID}`}
                  className="block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden active:scale-[.99] transition-transform"
                >
                  <div className="flex items-stretch">
                    {/* Accent lateral por status */}
                    <div className={`w-1 shrink-0 ${c.Status === 2 ? 'bg-green-400' : 'bg-yellow-400'}`} />

                    <div className="flex-1 min-w-0 px-4 py-3.5">
                      {/* Fila 1: vehículo + status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm leading-snug truncate">
                            {vehiculo || '—'}{c.ModeloYr ? ` ${c.ModeloYr}` : ''}
                          </p>
                          {version && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">{version}</p>
                          )}
                        </div>
                        <div className="shrink-0 mt-0.5">
                          <StatusBadge status={c.Status} />
                        </div>
                      </div>

                      {/* Fila 2: clave + empresa */}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {c.SLInvtID && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                            {c.SLInvtID}
                          </span>
                        )}
                        {isAdmin && c.CpnyName && (
                          <span className="text-[10px] text-gray-400 truncate">{c.CpnyName}</span>
                        )}
                        <span className="text-[10px] text-gray-400 ml-auto">{fecha}</span>
                      </div>
                    </div>

                    {/* Flecha + delete */}
                    <div className="flex flex-col items-center justify-center px-3 gap-2 border-l border-gray-50">
                      <ArrowRight size={16} className="text-gray-300" />
                      {isAdmin && (
                        <button
                          onClick={(e) => handleDelete(e, c.ChecklistID)}
                          disabled={deleting === c.ChecklistID}
                          className="text-red-300 hover:text-red-500 disabled:opacity-40 transition-colors p-1"
                        >
                          {deleting === c.ChecklistID
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Trash2 size={13} />
                          }
                        </button>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* ── Vista DESKTOP: tabla ────────────────────────────────── */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Clave</th>
                  <th className="px-4 py-3 text-left">VIN</th>
                  <th className="px-4 py-3 text-left">Vehículo</th>
                  <th className="px-4 py-3 text-left">Año</th>
                  {isAdmin && <th className="px-4 py-3 text-left">Empresa</th>}
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Creado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result?.data.map((c) => (
                  <tr key={c.ChecklistID} className="hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{c.ChecklistID}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.SLInvtID ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.VIN ?? '—'}</td>
                    <td className="px-4 py-3">
                      {[c.Marca, c.SubMarca, c.Version].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-4 py-3">{c.ModeloYr ?? '—'}</td>
                    {isAdmin && <td className="px-4 py-3 text-xs">{c.CpnyName ?? '—'}</td>}
                    <td className="px-4 py-3"><StatusBadge status={c.Status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(c.Crtd_DateTime).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/checklist/${c.ChecklistID}`}
                          className="text-blue-600 hover:underline text-xs font-medium"
                        >
                          Ver
                        </Link>
                        {isAdmin && (
                          <button
                            onClick={(e) => handleDelete(e, c.ChecklistID)}
                            disabled={deleting === c.ChecklistID}
                            title="Eliminar checklist"
                            className="text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors"
                          >
                            {deleting === c.ChecklistID
                              ? <Loader2 size={14} className="animate-spin" />
                              : <Trash2 size={14} />
                            }
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {result?.data.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} className="px-4 py-10 text-center text-gray-400">
                      No hay checklists registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Paginación ──────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page <= 1 || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={14} /> Anterior
              </button>
              <span className="text-xs text-gray-500">
                {page} / {totalPages} · {result?.total} registros
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Siguiente <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
