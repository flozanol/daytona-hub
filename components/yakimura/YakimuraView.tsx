'use client';

import { useMemo, useState } from 'react';
import { useYakimuraData } from '../../hooks/useYakimuraData';
import { YakimuraBadge } from './YakimuraBadge';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { ErrorState } from '../shared/ErrorState';
import type { VersionGroup, ColorRow, VentaRow } from '../../types';

function calcComprar(promedio: number, inventario: number, mesOptimo: number) {
  return Math.ceil(promedio * mesOptimo) - inventario;
}

function buildGroups(rows: VentaRow[]): VersionGroup[] {
  const map: Record<string, VersionGroup> = {};
  for (const row of rows) {
    const key = `${row.CpnyId}||${row.SubMarca}||${row.Version}||${row.Anio}`;
    if (!map[key]) {
      map[key] = {
        key, CpnyId: row.CpnyId, Marca: row.Marca, SubMarca: row.SubMarca,
        Version: row.Version, Anio: row.Anio,
        p3: 0, p2: 0, p1: 0, totalVentas: 0, promedio: 0,
        qtyAF: 0, qtyAP: 0, inventario: 0, colores: [],
      };
    }
    const ventas3m = (row.Periodo_Menos_3 ?? 0) + (row.Periodo_Menos_2 ?? 0) + (row.Periodo_Menos_1 ?? 0);
    const g = map[key];
    g.p3 += row.Periodo_Menos_3 ?? 0;
    g.p2 += row.Periodo_Menos_2 ?? 0;
    g.p1 += row.Periodo_Menos_1 ?? 0;
    g.totalVentas += ventas3m;
    g.qtyAF += row.QtyAF ?? 0;
    g.qtyAP += row.QtyAP ?? 0;
    g.inventario += row.Inventario ?? 0;
    g.colores.push({
      Color: row.Color, p3: row.Periodo_Menos_3 ?? 0, p2: row.Periodo_Menos_2 ?? 0,
      p1: row.Periodo_Menos_1 ?? 0, ventas3m, promedio: ventas3m / 3,
      qtyAF: row.QtyAF ?? 0, qtyAP: row.QtyAP ?? 0, inventario: row.Inventario ?? 0,
    } satisfies ColorRow);
  }
  return Object.values(map).map(g => ({ ...g, promedio: g.totalVentas / 3 }));
}

function exportCSV(filtrados: VersionGroup[], mesOptimo: number) {
  const filas: string[][] = [
    ['Agencia','Marca','Modelo','Versión','Año','Color',
     'Mes -3','Mes -2','Mes -1','Total 3M','Prom./mes',
     'Financiados (AF)','Propios (AP)','Inventario total','Pedir'],
  ];
  for (const g of filtrados) {
    filas.push([
      g.CpnyId, g.Marca, g.SubMarca, g.Version, String(g.Anio), 'TOTAL VERSION',
      String(g.p3), String(g.p2), String(g.p1), String(g.totalVentas), g.promedio.toFixed(1),
      String(g.qtyAF), String(g.qtyAP), String(g.inventario),
      String(calcComprar(g.promedio, g.inventario, mesOptimo)),
    ]);
    for (const c of g.colores.slice().sort((a, b) => b.ventas3m - a.ventas3m)) {
      filas.push([
        g.CpnyId, g.Marca, g.SubMarca, g.Version, String(g.Anio), c.Color,
        String(c.p3), String(c.p2), String(c.p1), String(c.ventas3m), c.promedio.toFixed(1),
        String(c.qtyAF), String(c.qtyAP), String(c.inventario),
        String(calcComprar(c.promedio, c.inventario, mesOptimo)),
      ]);
    }
  }
  const csv = '﻿' + filas.map(f => f.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = `Yakimura_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

export function YakimuraView() {
  const { data, loading, error } = useYakimuraData();
  const [mesOptimo, setMesOptimo] = useState(1.5);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [soloComprar, setSoloComprar] = useState(false);
  const [filtraMarca, setFiltraMarca] = useState('Todas');
  const [filtraAgencia, setFiltraAgencia] = useState('Todas');

  const marcas   = useMemo(() => ['Todas', ...Array.from(new Set(data.map(r => r.Marca))).sort()], [data]);
  const agencias = useMemo(() => ['Todas', ...Array.from(new Set(data.map(r => r.CpnyId))).sort()], [data]);

  const datosFiltrados = useMemo(() =>
    data.filter(r =>
      (filtraMarca    === 'Todas' || r.Marca   === filtraMarca) &&
      (filtraAgencia  === 'Todas' || r.CpnyId  === filtraAgencia)
    ),
    [data, filtraMarca, filtraAgencia]
  );

  const grupos = useMemo(() => buildGroups(datosFiltrados), [datosFiltrados]);

  const filtrados = useMemo(() =>
    grupos
      .filter(g => `${g.SubMarca} ${g.Version}`.toLowerCase().includes(busqueda.toLowerCase()))
      .filter(g => !soloComprar || calcComprar(g.promedio, g.inventario, mesOptimo) > 0)
      .sort((a, b) => calcComprar(b.promedio, b.inventario, mesOptimo) - calcComprar(a.promedio, a.inventario, mesOptimo)),
    [grupos, busqueda, soloComprar, mesOptimo]
  );

  const totalComprar    = grupos.reduce((s, g) => s + Math.max(0, calcComprar(g.promedio, g.inventario, mesOptimo)), 0);
  const totalInventario = grupos.reduce((s, g) => s + g.inventario, 0);
  const totalAF         = grupos.reduce((s, g) => s + g.qtyAF, 0);
  const totalAP         = grupos.reduce((s, g) => s + g.qtyAP, 0);

  if (loading) return <LoadingSpinner label="Cargando datos Yakimura..." />;
  if (error)   return <ErrorState title="Error de conexión SQL" message={error.msg} details={error.details} />;

  return (
    <div className="p-6 md:p-8 max-w-screen-xl mx-auto">
      {/* Título + export */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#003366] flex items-center gap-2">🏭 Yakimura</h1>
          <p className="text-gray-500 text-sm mt-1">
            Pedido a planta — fórmula:{' '}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-indigo-700 text-xs font-mono">
              Pedir = ceil(Promedio × MesÓptimo) − Inventario
            </code>
            <span className="ml-3 text-xs">
              <span className="text-blue-500 font-bold">●F</span> = Financiados &nbsp;
              <span className="text-emerald-600 font-bold">●P</span> = Propios
            </span>
          </p>
        </div>
        <button
          onClick={() => exportCSV(filtrados, mesOptimo)}
          className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          📥 Exportar a Excel
        </button>
      </div>

      {/* KPIs */}
      <div className="flex flex-wrap gap-4 mb-6">
        {[
          { label: 'Versiones analizadas', value: grupos.length,     color: 'text-[#003366]' },
          { label: 'Inventario total',     value: totalInventario,   color: 'text-amber-600' },
          { label: 'Unidades a pedir',     value: totalComprar,      color: 'text-green-700' },
          { label: 'Mes óptimo',           value: `×${mesOptimo}`,   color: 'text-indigo-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl px-5 py-3 shadow-sm min-w-[150px]">
            <div className={`text-2xl font-black ${color}`}>{value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
            {label === 'Inventario total' && (
              <div className="text-xs mt-1">
                <span className="text-blue-500 font-bold">{totalAF} Financiados</span>
                <span className="text-gray-300 mx-1">/</span>
                <span className="text-emerald-600 font-bold">{totalAP} Propios</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
          <span className="text-xs font-black text-gray-500 uppercase tracking-wide">Marca</span>
          <select
            value={filtraMarca}
            onChange={e => setFiltraMarca(e.target.value)}
            className="text-sm font-bold text-[#003366] bg-transparent border-none outline-none cursor-pointer"
          >
            {marcas.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
          <span className="text-xs font-black text-gray-500 uppercase tracking-wide">Agencia</span>
          <select
            value={filtraAgencia}
            onChange={e => setFiltraAgencia(e.target.value)}
            className="text-sm font-bold text-[#003366] bg-transparent border-none outline-none cursor-pointer"
          >
            {agencias.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
          <span className="text-xs font-black text-gray-500 uppercase tracking-wide">Mes óptimo</span>
          <input
            type="number" step="0.5" min="0.5" max="6" value={mesOptimo}
            onChange={e => setMesOptimo(parseFloat(e.target.value) || 1)}
            className="w-14 text-center text-sm font-black text-indigo-700 bg-transparent border-none outline-none"
          />
        </div>
        <input
          type="text"
          placeholder="🔍 Buscar modelo o versión..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm shadow-sm outline-none focus:border-blue-300 min-w-[220px]"
        />
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={soloComprar}
            onChange={e => setSoloComprar(e.target.checked)}
            className="w-4 h-4 accent-green-700"
          />
          <span className="font-semibold text-gray-700">Solo los que hay que comprar</span>
        </label>
        <span className="ml-auto text-xs text-gray-400">{filtrados.length} versiones</span>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden overflow-x-auto bg-white">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#003366] text-white">
              {['Agencia','Marca','Modelo','Versión','Año','Mes -3','Mes -2','Mes -1',
                'Prom./mes','Inv. total','Financiados','Propios','Pedir','Colores'].map(h => (
                <th key={h} className="px-3 py-3 font-bold whitespace-nowrap text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={14} className="py-16 text-center text-gray-400">No hay resultados.</td>
              </tr>
            )}
            {filtrados.map((g, i) => {
              const comprar = calcComprar(g.promedio, g.inventario, mesOptimo);
              const isOpen  = expandido === g.key;
              return (
                <>
                  <tr
                    key={g.key}
                    className={`border-b border-gray-100 transition-colors hover:bg-indigo-50 ${
                      isOpen ? 'bg-indigo-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-3 py-2.5 text-xs text-gray-400 font-mono">{g.CpnyId}</td>
                    <td className="px-3 py-2.5 font-bold text-[#003366]">{g.Marca}</td>
                    <td className="px-3 py-2.5 font-bold">{g.SubMarca}</td>
                    <td className="px-3 py-2.5 text-gray-600 max-w-[200px] truncate" title={g.Version}>{g.Version}</td>
                    <td className="px-3 py-2.5 text-center text-gray-400">{g.Anio}</td>
                    <td className="px-3 py-2.5 text-center">{g.p3}</td>
                    <td className="px-3 py-2.5 text-center">{g.p2}</td>
                    <td className="px-3 py-2.5 text-center">{g.p1}</td>
                    <td className="px-3 py-2.5 text-center font-black">{g.promedio.toFixed(1)}</td>
                    <td className="px-3 py-2.5 text-center font-black text-amber-600">{g.inventario}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-blue-500">{g.qtyAF}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-emerald-600">{g.qtyAP}</td>
                    <td className="px-3 py-2.5 text-center"><YakimuraBadge n={comprar} /></td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => setExpandido(isOpen ? null : g.key)}
                        className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors ${
                          isOpen ? 'bg-indigo-600 text-white' : 'bg-[#003366] text-white hover:bg-indigo-700'
                        }`}
                      >
                        {isOpen ? '▲ Ocultar' : '▼ Ver colores'}
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${g.key}-det`}>
                      <td colSpan={14} className="bg-indigo-50 px-6 pb-4 pt-1">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="text-indigo-700 border-b-2 border-indigo-200">
                              {['🎨 Color','Mes -3','Mes -2','Mes -1','Total 3M','Prom./mes',
                                'Inv. total','Financiados','Propios','% modelo','Pedir'].map(h => (
                                <th key={h} className="px-2 py-1.5 text-left font-black">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {g.colores.slice().sort((a, b) => b.ventas3m - a.ventas3m).map(c => {
                              const pct      = g.totalVentas > 0 ? Math.round((c.ventas3m / g.totalVentas) * 100) : 0;
                              const cComprar = calcComprar(c.promedio, c.inventario, mesOptimo);
                              return (
                                <tr key={c.Color} className="border-b border-indigo-100 hover:bg-indigo-100">
                                  <td className="px-2 py-1.5 font-semibold text-[#003366]">{c.Color || '(sin color)'}</td>
                                  <td className="px-2 py-1.5 text-center text-gray-500">{c.p3}</td>
                                  <td className="px-2 py-1.5 text-center text-gray-500">{c.p2}</td>
                                  <td className="px-2 py-1.5 text-center text-gray-500">{c.p1}</td>
                                  <td className="px-2 py-1.5 text-center font-bold">{c.ventas3m}</td>
                                  <td className="px-2 py-1.5 text-center font-bold">{c.promedio.toFixed(1)}</td>
                                  <td className="px-2 py-1.5 text-center font-black text-amber-600">{c.inventario}</td>
                                  <td className="px-2 py-1.5 text-center font-bold text-blue-500">{c.qtyAF}</td>
                                  <td className="px-2 py-1.5 text-center font-bold text-emerald-600">{c.qtyAP}</td>
                                  <td className="px-2 py-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <div className="bg-indigo-200 rounded h-1.5 w-16 overflow-hidden">
                                        <div className="bg-indigo-600 h-full" style={{ width: `${pct}%` }} />
                                      </div>
                                      <span>{pct}%</span>
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5"><YakimuraBadge n={cComprar} /></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-gray-400">
        Datos en tiempo real · SQL Server · Intranet · vw_VentasUltimos4Periodos ✕ InventoryAN
      </p>
    </div>
  );
}
