'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Loader2, CalendarRange, ChevronRight, ArrowLeft,
  Building2, Plus, Settings2, Trash2, ChevronLeft,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { formatWeekRange, formatWeekDay } from '@/lib/week';
import type { WeekRunProgress, ChecklistSummary, PaginatedResult } from '@/types/checklist';

type View =
  | { step: 'weeks' }
  | { step: 'companies'; weekStartDate: string }
  | { step: 'list'; weekStartDate: string; run: WeekRunProgress }
  | { step: 'resolving' };

interface WeekSummary {
  weekStartDate: string;
  companyCount: number;
  total: number;
  completed: number;
  pending: number;
}

function pctOf(completed: number, total: number) {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
      <div className="h-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Counts({ total, completed, pending }: { total: number; completed: number; pending: number }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
      <span className="text-gray-500">
        Total <span className="font-semibold text-gray-800">{total}</span>
      </span>
      <span className="text-green-700">
        Completados <span className="font-semibold">{completed}</span>
      </span>
      <span className="text-amber-700">
        Pendientes <span className="font-semibold">{pending}</span>
      </span>
    </div>
  );
}

function BackButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 -ml-2 px-3 py-2.5 text-sm text-gray-500 hover:text-gray-800 transition-colors cursor-pointer shrink-0"
    >
      <ArrowLeft size={14} />
      {label}
    </button>
  );
}

const rowButtonClass =
  'w-full text-left px-4 py-4 hover:bg-blue-50/70 active:bg-blue-50 transition-colors cursor-pointer';

function isWeekDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function AdminWeekHubClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const weekParam = searchParams.get('week');
  const weekRunIdParam = searchParams.get('weekRunId');
  const weekRunIdNum = weekRunIdParam && /^\d+$/.test(weekRunIdParam)
    ? parseInt(weekRunIdParam, 10)
    : null;

  const [allRuns, setAllRuns] = useState<WeekRunProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [list, setList] = useState<PaginatedResult<ChecklistSummary> | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const goWeeks = useCallback(() => {
    router.push('/checklist');
  }, [router]);

  const goCompanies = useCallback((weekStartDate: string) => {
    router.push(`/checklist?week=${weekStartDate}`);
  }, [router]);

  const goList = useCallback((weekStartDate: string, weekRunId: number) => {
    setPage(1);
    setList(null);
    router.push(`/checklist?week=${weekStartDate}&weekRunId=${weekRunId}`);
  }, [router]);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checklist/week-runs?week=all&page=1&pageSize=200');
      const json = await res.json();
      if (!res.ok) throw new Error(json.details ? `${json.error}: ${json.details}` : (json.error ?? res.statusText));
      setAllRuns(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar semanas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  const resolvedRun = useMemo(() => {
    if (weekRunIdNum == null) return null;
    return allRuns.find((r) => r.WeekRunID === weekRunIdNum) ?? null;
  }, [allRuns, weekRunIdNum]);

  // Si el weekRunId de la URL no existe tras cargar, bajamos a companies
  useEffect(() => {
    if (loading) return;
    if (!isWeekDate(weekParam) || weekRunIdNum == null) return;
    if (resolvedRun) return;
    router.replace(`/checklist?week=${weekParam}`);
  }, [loading, weekParam, weekRunIdNum, resolvedRun, router]);

  const view: View = useMemo(() => {
    if (!isWeekDate(weekParam)) return { step: 'weeks' };
    if (weekRunIdNum != null) {
      if (loading || !resolvedRun) return { step: 'resolving' };
      return {
        step: 'list',
        weekStartDate: weekParam,
        run: resolvedRun,
      };
    }
    return { step: 'companies', weekStartDate: weekParam };
  }, [weekParam, weekRunIdNum, loading, resolvedRun]);

  const loadList = useCallback(async (weekRunId: number, p: number) => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetch(`/api/checklist?page=${p}&pageSize=20&weekRunId=${weekRunId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.details ? `${json.error}: ${json.details}` : (json.error ?? res.statusText));
      setList(json);
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Error al cargar checklists');
    } finally {
      setListLoading(false);
    }
  }, []);

  const listRunId = view.step === 'list' ? view.run.WeekRunID : null;

  useEffect(() => {
    if (listRunId == null) return;
    loadList(listRunId, page);
  }, [listRunId, page, loadList]);

  // Al cambiar de corrida en la URL, reiniciar página/lista
  useEffect(() => {
    setPage(1);
    setList(null);
  }, [weekRunIdNum]);

  const weekSummaries: WeekSummary[] = useMemo(() => {
    const map = new Map<string, WeekSummary>();
    for (const run of allRuns) {
      const key = String(run.WeekStartDate).slice(0, 10);
      const total = run.TotalCreated || (run.CompletedCount + run.PendingCount);
      const cur = map.get(key) ?? {
        weekStartDate: key,
        companyCount: 0,
        total: 0,
        completed: 0,
        pending: 0,
      };
      cur.companyCount += 1;
      cur.total += total;
      cur.completed += run.CompletedCount;
      cur.pending += run.PendingCount;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));
  }, [allRuns]);

  const companiesForWeek = (weekStartDate: string) =>
    allRuns
      .filter((r) => String(r.WeekStartDate).slice(0, 10) === weekStartDate)
      .sort((a, b) => (a.CpnyName ?? '').localeCompare(b.CpnyName ?? '', 'es'));

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    if (view.step !== 'list') return;
    if (!confirm('¿Eliminar este checklist? Esta acción no se puede deshacer.')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/checklist/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      await loadList(view.run.WeekRunID, page);
      await loadRuns();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  };

  const totalPages = list ? Math.ceil(list.total / list.pageSize) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-gray-900 leading-tight shrink-0">
          Checklist<br className="sm:hidden" />
          <span className="sm:ml-1">Seminuevos</span>
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/checklist/admin"
            className="flex items-center gap-1.5 border border-gray-300 text-gray-600 px-3 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <Settings2 size={14} />
            <span className="hidden sm:inline">Template</span>
          </Link>
          <Link
            href="/checklist/nuevo"
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus size={15} /> Nuevo
          </Link>
        </div>
      </div>

      {/* ═══════════════ STEP: semanas ═══════════════ */}
      {view.step === 'weeks' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <CalendarRange size={16} className="text-blue-600 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Avance semanal</h2>
              <p className="text-[11px] text-gray-400">Selecciona una semana para ver las sucursales</p>
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-xs bg-red-50 px-4 py-2 border-b border-red-100">{error}</p>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={28} className="animate-spin text-blue-500" />
            </div>
          ) : weekSummaries.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-12 px-4">
              Aún no hay corridas semanales generadas
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              {weekSummaries.map((w) => {
                const pct = pctOf(w.completed, w.total);
                return (
                  <button
                    key={w.weekStartDate}
                    type="button"
                    onClick={() => goCompanies(w.weekStartDate)}
                    className={rowButtonClass}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          Semana {formatWeekRange(w.weekStartDate)}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {w.companyCount} sucursal{w.companyCount === 1 ? '' : 'es'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold text-gray-700">{pct}%</span>
                        <ChevronRight size={14} className="text-gray-300" />
                      </div>
                    </div>
                    <ProgressBar pct={pct} />
                    <Counts total={w.total} completed={w.completed} pending={w.pending} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ STEP: companies de la semana ═══════════════ */}
      {view.step === 'companies' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <BackButton label="Semanas" onClick={goWeeks} />
            <div className="min-w-0 border-l border-gray-200 pl-3">
              <h2 className="text-sm font-semibold text-gray-900 truncate">
                Semana {formatWeekRange(view.weekStartDate)}
              </h2>
              <p className="text-[11px] text-gray-400">Selecciona una sucursal</p>
            </div>
          </div>

          {(() => {
            const companies = companiesForWeek(view.weekStartDate);
            if (loading) {
              return (
                <div className="flex justify-center py-12">
                  <Loader2 size={28} className="animate-spin text-blue-500" />
                </div>
              );
            }
            if (companies.length === 0) {
              return (
                <p className="text-center text-gray-400 text-sm py-12 px-4">
                  No hay sucursales en esta semana
                </p>
              );
            }
            return (
              <div className="divide-y divide-gray-50">
                {companies.map((run) => {
                  const total = run.TotalCreated || (run.CompletedCount + run.PendingCount);
                  const pct = pctOf(run.CompletedCount, total);
                  return (
                    <button
                      key={run.WeekRunID}
                      type="button"
                      onClick={() => goList(view.weekStartDate, run.WeekRunID)}
                      className={rowButtonClass}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <Building2 size={16} className="text-blue-500 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {run.CpnyName?.trim() || `Empresa ${run.CpnyID}`}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              Corrida del {formatWeekDay(String(run.WeekStartDate))}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-semibold text-gray-700">{pct}%</span>
                          <ChevronRight size={14} className="text-gray-300" />
                        </div>
                      </div>
                      <ProgressBar pct={pct} />
                      <Counts
                        total={total}
                        completed={run.CompletedCount}
                        pending={run.PendingCount}
                      />
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {view.step === 'resolving' && (
        <div className="flex justify-center py-16">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      )}

      {/* ═══════════════ STEP: lista de checklists ═══════════════ */}
      {view.step === 'list' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <BackButton
              label="Volver al avance semanal"
              onClick={() => goCompanies(view.weekStartDate)}
            />
            <div className="sm:border-l sm:border-gray-200 sm:pl-3 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {view.run.CpnyName?.trim() || `Empresa ${view.run.CpnyID}`}
              </p>
              <p className="text-[11px] text-gray-400">
                Semana {formatWeekRange(view.weekStartDate)}
              </p>
            </div>
          </div>

          {listError && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{listError}</p>
          )}

          {listLoading && !list ? (
            <div className="flex justify-center py-16">
              <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              {/* Móvil */}
              <div className="md:hidden space-y-2">
                {list?.data.length === 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-10 text-center text-gray-400 text-sm">
                    No hay checklists en esta corrida
                  </div>
                )}
                {list?.data.map((c) => {
                  const vehiculo = [c.Marca, c.SubMarca].filter(Boolean).join(' ');
                  return (
                    <Link
                      key={c.ChecklistID}
                      href={`/checklist/${c.ChecklistID}`}
                      className="block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden active:scale-[.99] transition-transform cursor-pointer"
                    >
                      <div className="flex items-stretch">
                        <div className={`w-1 shrink-0 ${c.Status === 2 ? 'bg-green-400' : 'bg-yellow-400'}`} />
                        <div className="flex-1 min-w-0 px-4 py-3.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-gray-900 text-sm truncate">
                              {vehiculo || '—'}{c.ModeloYr ? ` ${c.ModeloYr}` : ''}
                            </p>
                            <StatusBadge status={c.Status} />
                          </div>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {c.SLInvtID && (
                              <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                {c.SLInvtID}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-center justify-center px-3 gap-2 border-l border-gray-50">
                          <ChevronRight size={16} className="text-gray-300" />
                          <button
                            onClick={(e) => handleDelete(e, c.ChecklistID)}
                            disabled={deleting === c.ChecklistID}
                            className="text-red-300 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed p-1.5 cursor-pointer"
                          >
                            {deleting === c.ChecklistID
                              ? <Loader2 size={13} className="animate-spin" />
                              : <Trash2 size={13} />}
                          </button>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Clave</th>
                      <th className="px-4 py-3 text-left">VIN</th>
                      <th className="px-4 py-3 text-left">Vehículo</th>
                      <th className="px-4 py-3 text-left">Año</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Creado</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {list?.data.map((c) => (
                      <tr key={c.ChecklistID} className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-xs">{c.ChecklistID}</td>
                        <td className="px-4 py-3 font-mono text-xs">{c.SLInvtID ?? '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs">{c.VIN ?? '—'}</td>
                        <td className="px-4 py-3">
                          {[c.Marca, c.SubMarca, c.Version].filter(Boolean).join(' ') || '—'}
                        </td>
                        <td className="px-4 py-3">{c.ModeloYr ?? '—'}</td>
                        <td className="px-4 py-3"><StatusBadge status={c.Status} /></td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(c.Crtd_DateTime).toLocaleDateString('es-MX')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/checklist/${c.ChecklistID}`}
                              className="text-blue-600 hover:underline text-xs font-medium cursor-pointer"
                            >
                              Ver
                            </Link>
                            <button
                              onClick={(e) => handleDelete(e, c.ChecklistID)}
                              disabled={deleting === c.ChecklistID}
                              className="text-red-400 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer p-1"
                            >
                              {deleting === c.ChecklistID
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Trash2 size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {list?.data.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                          No hay checklists en esta corrida
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page <= 1 || listLoading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft size={14} /> Anterior
                  </button>
                  <span className="text-xs text-gray-500">
                    {page} / {totalPages} · {list?.total} registros
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages || listLoading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Siguiente <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
