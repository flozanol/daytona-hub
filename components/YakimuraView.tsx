'use client';

import { useEffect, useState, useMemo } from 'react';

interface VentaRow {
  CpnyId: string;
  Marca: string;
  SubMarca: string;
  Version: string;
  Anio: number;
  Color: string;
  Periodo_Menos_3: number;
  Periodo_Menos_2: number;
  Periodo_Menos_1: number;
  Periodo_Actual: number;
  QtyAF: number;
  QtyAP: number;
  Inventario: number;
}

interface ColorRow {
  Color: string;
  p3: number; p2: number; p1: number;
  ventas3m: number;
  promedio: number;
  qtyAF: number;
  qtyAP: number;
  inventario: number;
}

interface VersionGroup {
  key: string;
  CpnyId: string;
  Marca: string;
  SubMarca: string;
  Version: string;
  Anio: number;
  p3: number; p2: number; p1: number;
  totalVentas: number;
  promedio: number;
  qtyAF: number;
  qtyAP: number;
  inventario: number;
  colores: ColorRow[];
}

const Badge = ({ n }: { n: number }) => {
  if (n > 0) return <span className="inline-block bg-green-700 text-white text-xs font-black px-2.5 py-0.5 rounded-md">+{n} COMPRAR</span>;
  if (n < 0) return <span className="inline-block bg-red-100 text-red-700 text-xs font-black px-2.5 py-0.5 rounded-md">{n} SOBRA</span>;
  return <span className="inline-block bg-gray-200 text-gray-500 text-xs px-2.5 py-0.5 rounded-md">✔ OK</span>;
};

export default function YakimuraView() {
  const [data, setData] = useState<VentaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ msg: string; details?: string } | null>(null);
  const [mesOptimo, setMesOptimo] = useState(1.5);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [soloComprar, setSoloComprar] = useState(false);
  const [filtraMarca, setFiltraMarca] = useState('Todas');
  const [filtraAgencia, setFiltraAgencia] = useState('Todas');

  useEffect(() => {
    fetch('/api/yakimura')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setData(d);
        } else if (d?.error) {
          // La API devolvió un error SQL — mostrarlo completo
          setError({ msg: d.error, details: d.details });
        } else {
          setError({ msg: 'Respuesta inesperada del servidor', details: JSON.stringify(d) });
        }
        setLoading(false);
      })
      .catch(e => {
        setError({ msg: 'No se pudo contactar la API', details: e?.message });
        setLoading(false);
      });
  }, []);

  const marcas = useMemo(() => ['Todas', ...Array.from(new Set(data.map(r => r.Marca))).sort()], [data]);
  const agencias = useMemo(() => ['Todas', ...Array.from(new Set(data.map(r => r.CpnyId))).sort()], [data]);

  const datosFiltrados = useMemo(() => data.filter(r =>
    (filtraMarca === 'Todas' || r.Marca === filtraMarca) &&
    (filtraAgencia === 'Todas' || r.CpnyId === filtraAgencia)
  ), [data, filtraMarca, filtraAgencia]);

  const grupos = useMemo<VersionGroup[]>(() => {
    const map: Record<string, VersionGroup> = {};
    datosFiltrados.forEach(row => {
      const key = `${row.CpnyId}||${row.SubMarca}||${row.Version}||${row.Anio}`;
      if (!map[key]) {
        map[key] = { key, CpnyId: row.CpnyId, Marca: row.Marca, SubMarca: row.SubMarca,
          Version: row.Version, Anio: row.Anio, p3: 0, p2: 0, p1: 0,
          totalVentas: 0, promedio: 0, qtyAF: 0, qtyAP: 0, inventario: 0, colores: [] };
      }
      const ventas3m = (row.Periodo_Menos_3 ?? 0) + (row.Periodo_Menos_2 ?? 0) + (row.Periodo_Menos_1 ?? 0);
      map[key].p3          += row.Periodo_Menos_3 ?? 0;
      map[key].p2          += row.Periodo_Menos_2 ?? 0;
      map[key].p1          += row.Periodo_Menos_1 ?? 0;
      map[key].totalVentas += ventas3m;
      map[key].qtyAF       += row.QtyAF ?? 0;
      map[key].qtyAP       += row.QtyAP ?? 0;
      map[key].inventario  += row.Inventario ?? 0;
      map[key].colores.push({
        Color: row.Color, p3: row.Periodo_Menos_3 ?? 0, p2: row.Periodo_Menos_2 ?? 0,
        p1: row.Periodo_Menos_1 ?? 0, ventas3m, promedio: ventas3m / 3,
        qtyAF: row.QtyAF ?? 0, qtyAP: row.QtyAP ?? 0, inventario: row.Inventario ?? 0,
      });
    });
    return Object.values(map).map(g => ({ ...g, promedio: g.totalVentas / 3 }));
  }, [datosFiltrados]);

  const calcComprar = (promedio: number, inventario: number) =>
    Math.ceil(promedio * mesOptimo) - inventario;

  const filtrados = grupos
    .filter(g => `${g.SubMarca} ${g.Version}`.toLowerCase().includes(busqueda.toLowerCase()))
    .filter(g => !soloComprar || calcComprar(g.promedio, g.inventario) > 0)
    .sort((a, b) => calcComprar(b.promedio, b.inventario) - calcComprar(a.promedio, a.inventario));

  const totalComprar    = grupos.reduce((s, g) => s + Math.max(0, calcComprar(g.promedio, g.inventario)), 0);
  const totalInventario = grupos.reduce((s, g) => s + g.inventario, 0);
  const totalAF         = grupos.reduce((s, g) => s + g.qtyAF, 0);
  const totalAP         = grupos.reduce((s, g) => s + g.qtyAP, 0);

  const exportarExcel = () => {
    const filas: string[][] = [];
    filas.push(['Agencia','Marca','Modelo','Versión','Año','Color',
      'Mes -3','Mes -2','Mes -1','Total 3M','Prom./mes',
      'Financiados (AF)','Propios (AP)','Inventario total','Pedir']);
    filtrados.forEach(g => {
      filas.push([g.CpnyId, g.Marca, g.SubMarca, g.Version, String(g.Anio), 'TOTAL VERSION',
        String(g.p3), String(g.p2), String(g.p1), String(g.totalVentas), g.promedio.toFixed(1),
        String(g.qtyAF), String(g.qtyAP), String(g.inventario), String(calcComprar(g.promedio, g.inventario))]);
      g.colores.slice().sort((a, b) => b.ventas3m - a.ventas3m).forEach(c => {
        filas.push([g.CpnyId, g.Marca, g.SubMarca, g.Version, String(g.Anio), c.Color,
          String(c.p3), String(c.p2), String(c.p1), String(c.ventas3m), c.promedio.toFixed(1),
          String(c.qtyAF), String(c.qtyAP), String(c.inventario), String(calcComprar(c.promedio, c.inventario))]);
      });
    });
    const csv = '\uFEFF' + filas.map(f => f.map(v => `"${v.replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `Yakimura_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-gray-400">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366] mb-4"></div>
      <p className="text-sm font-bold tracking-widest uppercase">Cargando datos...</p>
    </div>
  );

  if (error) return (
    <div className="max-w-2xl mx-auto mt-16 p-6 bg-red-50 border border-red-200 rounded-2xl">
      <p className="text-red-700 font-black text-lg mb-2">❌ Error de conexión SQL</p>
      <p className="text-red-600 font-semibold mb-3">{error.msg}</p>
      {error.details && (
        <pre className="bg-red-100 text-red-800 text-xs p-4 rounded-xl overflow-x-auto whitespace-pre-wrap break-all">{error.details}</pre>
      )}
      <p className="text-xs text-red-400 mt-4">
        Verifica las variables de entorno en Vercel: <code className="bg-red-100 px-1 rounded">DB_SERVER</code>, <code className="bg-red-100 px-1 rounded">DB_USER</code>, <code className="bg-red-100 px-1 rounded">DB_PASSWORD</code>, <code className="bg-red-100 px-1 rounded">DB_PORT</code>
      </p>
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-screen-xl mx-auto">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#003366] flex items-center gap-2">🏭 Yakimura</h1>
          <p className="text-gray-500 text-sm mt-1">
            Pedido a planta — fórmula: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-indigo-700 text-xs font-mono">Pedir = ceil(Promedio × MesÓptimo) − Inventario</code>
            <span className="ml-3 text-xs"><span className="text-blue-500 font-bold">●F</span> = Financiados &nbsp;<span className="text-emerald-600 font-bold">●P</span> = Propios</span>
          </p>
        </div>
        <button onClick={exportarExcel}
          className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
          📥 Exportar a Excel
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-xl px-5 py-3 shadow-sm min-w-[150px]">
          <div className="text-2xl font-black text-[#003366]">{grupos.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">Versiones analizadas</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl px-5 py-3 shadow-sm min-w-[180px]">
          <div className="text-2xl font-black text-amber-600">{totalInventario}</div>
          <div className="text-xs text-gray-400 mt-0.5">Inventario total</div>
          <div className="text-xs mt-1">
            <span className="text-blue-500 font-bold">{totalAF} Financiados</span>
            <span className="text-gray-300 mx-1">/</span>
            <span className="text-emerald-600 font-bold">{totalAP} Propios</span>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl px-5 py-3 shadow-sm min-w-[150px]">
          <div className="text-2xl font-black text-green-700">{totalComprar}</div>
          <div className="text-xs text-gray-400 mt-0.5">Unidades a pedir</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl px-5 py-3 shadow-sm min-w-[150px]">
          <div className="text-2xl font-black text-indigo-700">×{mesOptimo}</div>
          <div className="text-xs text-gray-400 mt-0.5">Mes óptimo</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
          <span className="text-xs font-black text-gray-500 uppercase tracking-wide">Marca</span>
          <select value={filtraMarca} onChange={e => setFiltraMarca(e.target.value)}
            className="text-sm font-bold text-[#003366] bg-transparent border-none outline-none cursor-pointer">
            {marcas.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
          <span className="text-xs font-black text-gray-500 uppercase tracking-wide">Agencia</span>
          <select value={filtraAgencia} onChange={e => setFiltraAgencia(e.target.value)}
            className="text-sm font-bold text-[#003366] bg-transparent border-none outline-none cursor-pointer">
            {agencias.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
          <span className="text-xs font-black text-gray-500 uppercase tracking-wide">Mes óptimo</span>
          <input type="number" step="0.5" min="0.5" max="6" value={mesOptimo}
            onChange={e => setMesOptimo(parseFloat(e.target.value) || 1)}
            className="w-14 text-center text-sm font-black text-indigo-700 bg-transparent border-none outline-none" />
        </div>
        <input type="text" placeholder="🔍 Buscar modelo o versión..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm shadow-sm outline-none focus:border-blue-300 min-w-[220px]" />
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={soloComprar} onChange={e => setSoloComprar(e.target.checked)} className="w-4 h-4 accent-green-700" />
          <span className="font-semibold text-gray-700">Solo los que hay que comprar</span>
        </label>
        <span className="ml-auto text-xs text-gray-400">{filtrados.length} versiones</span>
      </div>

      <div className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden overflow-x-auto bg-white">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#003366] text-white">
              {['Agencia','Marca','Modelo','Versión','Año','Mes -3','Mes -2','Mes -1','Prom./mes',
                'Inv. total','Financiados','Propios','Pedir','Colores'].map(h => (
                <th key={h} className="px-3 py-3 font-bold whitespace-nowrap text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr><td colSpan={14} className="py-16 text-center text-gray-400">No hay resultados.</td></tr>
            )}
            {filtrados.map((g, i) => {
              const comprar = calcComprar(g.promedio, g.inventario);
              const isOpen  = expandido === g.key;
              return (
                <>
                  <tr key={g.key} className={`border-b border-gray-100 transition-colors ${
                    isOpen ? 'bg-indigo-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } hover:bg-indigo-50`}>
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
                    <td className="px-3 py-2.5 text-center"><Badge n={comprar} /></td>
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={() => setExpandido(isOpen ? null : g.key)}
                        className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors ${
                          isOpen ? 'bg-indigo-600 text-white' : 'bg-[#003366] text-white hover:bg-indigo-700'
                        }`}>
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
                              const cComprar = calcComprar(c.promedio, c.inventario);
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
                                  <td className="px-2 py-1.5"><Badge n={cComprar} /></td>
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
