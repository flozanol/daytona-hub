'use client';

import { useState, useCallback, useEffect } from 'react';
import { Search, Loader2, ChevronLeft, ChevronRight, Gauge } from 'lucide-react';
import type { VehicleRow, PaginatedResult } from '@/types/checklist';

interface VehicleSearchProps {
  onSelect: (vehicle: VehicleRow) => void;
}

export function VehicleSearch({ onSelect }: VehicleSearchProps) {
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [result, setResult]   = useState<PaginatedResult<VehicleRow> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const doSearch = useCallback(async (q: string, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: '10' });
      if (q.trim()) params.set('search', q.trim());
      const res = await fetch(`/api/checklist/inventario?${params}`);
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al buscar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { doSearch('', 1); }, [doSearch]);

  const handleSearch = () => { setPage(1); doSearch(search, 1); };
  const handlePage   = (next: number) => { setPage(next); doSearch(search, next); };

  const totalPages = result ? Math.ceil(result.total / result.pageSize) : 0;

  return (
    <div className="space-y-3">

      {/* Buscador */}
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="VIN, Clave, Marca, Versión, Año…"
          className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          <span className="hidden sm:inline">Buscar</span>
        </button>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
      )}

      {result && (
        <>
          <p className="text-xs text-gray-400">
            {result.total} vehículo{result.total !== 1 ? 's' : ''} encontrado{result.total !== 1 ? 's' : ''}
          </p>

          {/* ── Vista MÓVIL: cards ──────────────────────────────────── */}
          <div className="md:hidden space-y-2">
            {result.data.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8 bg-white rounded-2xl border border-gray-100">
                No se encontraron vehículos
              </p>
            )}
            {result.data.map((v) => (
              <div
                key={v.InvtID}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="px-4 pt-3.5 pb-2">
                  {/* Título */}
                  <p className="font-semibold text-gray-900 text-sm leading-snug">
                    {v.Marca} {v.SubMarca} {v.ModeloYr}
                  </p>
                  {v.Version && (
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">{v.Version}</p>
                  )}

                  {/* Tags */}
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                      {v.SLInvtID}
                    </span>
                    <span className="text-[10px] text-gray-400">{v.CpnyName}</span>
                    <span className="flex items-center gap-1 text-[10px] text-gray-400 ml-auto">
                      <Gauge size={10} /> {Number(v.Kilometraje).toLocaleString()} km
                    </span>
                  </div>
                </div>

                <div className="h-px bg-gray-100 mx-4" />

                <div className="p-3">
                  <button
                    onClick={() => onSelect(v)}
                    className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-[.98] transition-all"
                  >
                    Seleccionar este vehículo
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Vista DESKTOP: tabla ────────────────────────────────── */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left">Clave</th>
                  <th className="px-3 py-2 text-left">VIN</th>
                  <th className="px-3 py-2 text-left">Vehículo</th>
                  <th className="px-3 py-2 text-left">Año</th>
                  <th className="px-3 py-2 text-left">Empresa</th>
                  <th className="px-3 py-2 text-left">Km</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.data.map((v) => (
                  <tr key={v.InvtID} className="hover:bg-blue-50 transition-colors">
                    <td className="px-3 py-2 font-mono text-xs">{v.SLInvtID}</td>
                    <td className="px-3 py-2 font-mono text-xs">{v.VIN}</td>
                    <td className="px-3 py-2">{v.Marca} {v.SubMarca} {v.Version}</td>
                    <td className="px-3 py-2">{v.ModeloYr}</td>
                    <td className="px-3 py-2 text-xs">{v.CpnyName}</td>
                    <td className="px-3 py-2 text-xs">{Number(v.Kilometraje).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => onSelect(v)}
                        className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Seleccionar
                      </button>
                    </td>
                  </tr>
                ))}
                {result.data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-gray-400 text-sm">
                      No se encontraron vehículos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <button
                onClick={() => handlePage(page - 1)}
                disabled={page <= 1 || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={14} /> Anterior
              </button>
              <span className="text-xs text-gray-500">{page} / {totalPages}</span>
              <button
                onClick={() => handlePage(page + 1)}
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
