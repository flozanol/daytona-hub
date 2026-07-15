'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ClipboardCheck, ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { VehicleSearch } from './VehicleSearch';
import type { VehicleRow } from '@/types/checklist';

export function NuevoChecklistClient() {
  const router = useRouter();
  const [selected, setSelected] = useState<VehicleRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleCreate = async () => {
    if (!selected) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invtId: selected.InvtID }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      router.push(`/checklist/${data.checklistId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear checklist');
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/checklist"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={14} /> Volver
        </Link>
        <h1 className="text-lg font-bold text-gray-900">Nuevo Checklist</h1>
      </div>

      {/* Estado: buscando vehículo */}
      {!selected && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Search size={16} className="text-blue-500" />
            Busca y selecciona el vehículo
          </h2>
          <VehicleSearch onSelect={(v) => { setSelected(v); setError(null); }} />
        </div>
      )}

      {/* Estado: vehículo seleccionado */}
      {selected && (
        <div className="space-y-4">

          {/* Tarjeta del vehículo */}
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
            <div className="bg-blue-600 px-4 py-3">
              <p className="text-white font-semibold text-sm">Vehículo seleccionado</p>
              <p className="text-blue-100 text-xs mt-0.5">
                {selected.Marca} {selected.SubMarca} {selected.ModeloYr}
              </p>
            </div>

            <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <span className="text-gray-400 text-xs block">Clave</span>
                <span className="font-mono font-semibold text-gray-800">{selected.SLInvtID}</span>
              </div>
              <div>
                <span className="text-gray-400 text-xs block">Año</span>
                <span className="font-semibold text-gray-800">{selected.ModeloYr}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400 text-xs block">VIN</span>
                <span className="font-mono text-gray-700 break-all">{selected.VIN}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400 text-xs block">Versión</span>
                <span className="text-gray-700">{selected.Version}</span>
              </div>
              <div>
                <span className="text-gray-400 text-xs block">Color</span>
                <span className="text-gray-700">{selected.CExterior}</span>
              </div>
              <div>
                <span className="text-gray-400 text-xs block">Kilometraje</span>
                <span className="text-gray-700">{Number(selected.Kilometraje).toLocaleString()} km</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400 text-xs block">Empresa</span>
                <span className="text-gray-700">{selected.CpnyName}</span>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
          )}

          {/* Acciones */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => { setSelected(null); setError(null); }}
              className="flex-1 sm:flex-none px-4 py-3 rounded-xl border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors text-center"
            >
              Cambiar vehículo
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {creating
                ? <><Loader2 size={16} className="animate-spin" /> Creando…</>
                : <><ClipboardCheck size={16} /> Crear Checklist</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
