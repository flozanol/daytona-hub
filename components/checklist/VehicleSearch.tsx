'use client';

import { useState, useCallback, useEffect } from 'react';
import { Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
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

  // Cargar primeros 10 al montar
  useEffect(() => { doSearch('', 1); }, [doSearch]);

  const handleSearch = () => {
    setPage(1);
    doSearch(search, 1);
  };

  const handlePage = (next: number) => {
    setPage(next);
    doSearch(search, next);
  };

  const totalPages = result ? Math.ceil(result.total / result.pageSize) : 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Buscar por VIN, Clave, Marca o SubMarca…"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Buscar
        </button>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {result && (
        <>
          <p className="text-xs text-gray-500">{result.total} vehículo{result.total !== 1 ? 's' : ''} encontrado{result.total !== 1 ? 's' : ''}</p>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left">Clave</th>
                  <th className="px-3 py-2 text-left">VIN</th>
                  <th className="px-3 py-2 text-left">Vehículo</th>
                  <th className="px-3 py-2 text-left">Año</th>
                  <th className="px-3 py-2 text-left">Empresa</th>
                  <th className="px-3 py-2 text-left">Km</th>
                  <th className="px-3 py-2"></th>
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
                        className="bg-blue-600 text-white text-xs px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <button
                onClick={() => handlePage(page - 1)}
                disabled={page <= 1 || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={14} /> Anterior
              </button>
              <span className="text-gray-500">Página {page} de {totalPages}</span>
              <button
                onClick={() => handlePage(page + 1)}
                disabled={page >= totalPages || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
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
