'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Database, TrendingUp, Filter, Clock, 
  BadgeDollarSign, Car, BarChart3, ShieldAlert, 
  Download, Calendar, Skull, FileSpreadsheet, AlertTriangle 
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import * as XLSX from 'xlsx';

// 1. Mapeo de Almacenes (Actualizado con AS25)
const CPNY_MAP: Record<string, string> = {
  'AS25': 'Acura Interlomas', // Almacén solicitado
  'ACUI': 'Acura Interlomas',
  'TEC': 'Motos Tecamachalco',
  'IZT': 'Motos Iztapalapa',
  'SAT': 'Motos Satélite',
  'ECA': 'Motos Ecatepec',
  'CUE': 'Motos Cuernavaca',
  'CUU': 'Motos Cuautla',
  '001': 'KIA Interlomas',
  '002': 'KIA Iztapalapa',
  'MGINT': 'MG Interlomas',
  'MGSFE': 'MG Santa Fe',
  'MGIZT': 'MG Iztapalapa',
  'MGCUA': 'MG Cuajimalpa',
  'GWCUE': 'GWM Cuernavaca',
  'GWIZT': 'GWM Iztapalapa',
  'CUA': 'Honda Cuajimalpa',
  'INT': 'Honda Interlomas'
};

const fmtMoney = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);

export default function ClinicaSeminuevosSQL() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgencias, setSelectedAgencias] = useState<string[]>([]); // Multi-selección

  useEffect(() => {
    fetch('/api/seminuevos')
      .then(res => res.json())
      .then(sqlData => {
        if (Array.isArray(sqlData)) {
          const mapeado = sqlData.map((row: any) => ({
            ...row,
            Sucursal: CPNY_MAP[row.CpnyID] || row.Ubicacion || row.CpnyID,
            Costo: Number(row.Costo) || 0,
            Días: Number(row.Antiguedad) || 0,
            Margen: (Number(row.PrecioVenta) || 0) - (Number(row.Costo) || 0)
          }));
          setData(mapeado);
        }
        setLoading(false);
      });
  }, []);

  // Filtros Globales
  const filteredData = useMemo(() => {
    let current = data;
    if (selectedAgencias.length > 0) current = current.filter(d => selectedAgencias.includes(d.Sucursal));
    if (searchTerm) {
        const s = searchTerm.toLowerCase();
        current = current.filter(d => 
            d.Marca?.toLowerCase().includes(s) || 
            d.Modelo?.toLowerCase().includes(s) || 
            d.VIN?.toLowerCase().includes(s)
        );
    }
    return current;
  }, [data, selectedAgencias, searchTerm]);

  // KPIs
  const stats = useMemo(() => {
    const totalCosto = filteredData.reduce((acc, curr) => acc + curr.Costo, 0);
    const costHueso = filteredData.filter(d => d.Días > 90).reduce((acc, curr) => acc + curr.Costo, 0);
    return {
      unidades: filteredData.length,
      costo: totalCosto,
      riesgo: costHueso,
      pctRiesgo: (costHueso / (totalCosto || 1)) * 100,
      diasPromedio: Math.round(filteredData.reduce((acc, curr) => acc + curr.Días, 0) / (filteredData.length || 1))
    };
  }, [filteredData]);

  // 2. Lógica de Marcas Tóxicas (>90 días)
  const marcasToxicas = useMemo(() => {
    const counts: Record<string, { uds: number, monto: number }> = {};
    filteredData.filter(d => d.Días > 90).forEach(d => {
      if (!counts[d.Marca]) counts[d.Marca] = { uds: 0, monto: 0 };
      counts[d.Marca].uds++;
      counts[d.Marca].monto += d.Costo;
    });
    return Object.entries(counts)
      .map(([name, val]) => ({ name, ...val }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5);
  }, [filteredData]);

  // 3. Radiografía por Sucursal
  const radiografia = useMemo(() => {
    const sucs: Record<string, any> = {};
    filteredData.forEach(d => {
      if (!sucs[d.Sucursal]) sucs[d.Sucursal] = { name: d.Sucursal, total: 0, sano: 0, hueso: 0, montoHueso: 0 };
      sucs[d.Sucursal].total++;
      if (d.Días <= 30) sucs[d.Sucursal].sano++;
      if (d.Días > 90) {
        sucs[d.Sucursal].hueso++;
        sucs[d.Sucursal].montoHueso += d.Costo;
      }
    });
    return Object.values(sucs).sort((a, b) => (b.hueso/b.total) - (a.hueso/a.total));
  }, [filteredData]);

  const donutData = useMemo(() => [
    { name: 'Sano (0-30)', value: filteredData.filter(d => d.Días <= 30).length, color: '#10b981' },
    { name: 'Precaución (31-60)', value: filteredData.filter(d => d.Días > 30 && d.Días <= 60).length, color: '#f59e0b' },
    { name: 'Alerta (61-90)', value: filteredData.filter(d => d.Días > 60 && d.Días <= 90).length, color: '#f97316' },
    { name: 'Tóxico (>90)', value: filteredData.filter(d => d.Días > 90).length, color: '#fd0019' }
  ], [filteredData]);

  const exportToExcel = (rows: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  if (loading) return <div className="p-20 text-center font-black animate-pulse">SINCRONIZANDO CON SQL...</div>;

  return (
    <div className="min-h-full bg-slate-50 p-6 md:p-8 font-sans space-y-8">
      
      {/* HEADER & MULTI-FILTRO */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <Car className="text-[#fd0019]" size={32} /> Clínica de Seminuevos
            </h1>
            <div className="flex flex-wrap gap-2 justify-center">
                {Object.values(CPNY_MAP).filter((v, i, a) => a.indexOf(v) === i).map(suc => (
                    <button 
                        key={suc}
                        onClick={() => setSelectedAgencias(prev => prev.includes(suc) ? prev.filter(s => s !== suc) : [...prev, suc])}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all ${selectedAgencias.includes(suc) ? 'bg-slate-900 text-white border-black' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-400'}`}
                    >
                        {suc}
                    </button>
                ))}
            </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <KPICard title="Unidades Totales" value={stats.unidades} icon={<Car />} color="text-slate-800" />
            <KPICard title="Costo Invertido" value={fmtMoney(stats.costo)} icon={<Database />} color="text-[#003366]" />
            <KPICard title="Capital en Riesgo" value={fmtMoney(stats.riesgo)} icon={<AlertTriangle />} color="text-[#fd0019]" subtitle={`${stats.pctRiesgo.toFixed(1)}% del capital total`} />
            <KPICard title="Promedio Días" value={`${stats.diasPromedio} Días`} icon={<Calendar />} color="text-slate-800" />
        </div>
      </div>

      {/* FILA 1: Dona, Marcas Tóxicas y Radiografía */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Dona */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 lg:col-span-1">
            <h2 className="text-xs font-black uppercase mb-6 border-b pb-2 tracking-widest">Semáforo Rotación</h2>
            <div className="h-48 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={donutData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {donutData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="space-y-2">
                {donutData.map(d => (
                    <div key={d.name} className="flex justify-between text-[10px] font-bold uppercase">
                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{backgroundColor: d.color}}></span>{d.name}</span>
                        <span>{d.value} ud.</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Top Marcas Tóxicas */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 lg:col-span-1">
            <h2 className="text-xs font-black uppercase mb-2 border-b pb-2 text-[#fd0019]">Top Marcas Tóxicas</h2>
            <p className="text-[9px] text-gray-400 font-bold uppercase mb-4 tracking-tighter">Dinero congelado (+90 días)</p>
            <div className="space-y-4">
                {marcasToxicas.map(m => (
                    <div key={m.name}>
                        <div className="flex justify-between text-[11px] font-black mb-1">
                            <span>{m.name} <span className="text-slate-400 font-normal">({m.uds} ud)</span></span>
                            <span className="text-[#fd0019]">{fmtMoney(m.monto)}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#fd0019] h-full" style={{ width: `${(m.monto / marcasToxicas[0].monto) * 100}%` }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Radiografía por Sucursal */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 lg:col-span-2 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xs font-black uppercase tracking-widest">Radiografía por Sucursal</h2>
                <span className="text-[9px] font-black text-slate-400 uppercase">Inventario >90 Días</span>
            </div>
            <div className="overflow-auto flex-1 scrollbar-thin">
                <table className="w-full text-left text-[10px]">
                    <thead className="bg-slate-900 text-white sticky top-0 font-black uppercase">
                        <tr>
                            <th className="p-3">Sucursal</th>
                            <th className="p-3 text-center">Unidades</th>
                            <th className="p-3 text-center text-green-400">Sano</th>
                            <th className="p-3 text-center text-red-500">Hueso</th>
                            <th className="p-3 text-right">Cost. Congelado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {radiografia.map(ag => (
                            <tr key={ag.name} className="hover:bg-slate-50 font-bold">
                                <td className="p-3 text-slate-900">{ag.name}</td>
                                <td className="p-3 text-center text-slate-500">{ag.total}</td>
                                <td className="p-3 text-center text-green-600">{ag.sano}</td>
                                <td className="p-3 text-center text-red-600">{ag.hueso}</td>
                                <td className="p-3 text-right text-[#fd0019]">{fmtMoney(ag.montoHueso)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* FILA 2: Muro de los Lamentos */}
      <div className="bg-white rounded-3xl shadow-md border-2 border-red-500 overflow-hidden">
        <div className="bg-slate-900 p-4 flex justify-between items-center">
            <h2 className="text-white font-black text-sm uppercase flex items-center gap-2">
                <Skull className="text-red-500" size={18}/> Muro de los Lamentos (Huesos)
            </h2>
            <button 
                onClick={() => exportToExcel(filteredData.filter(d => d.Días > 90), 'Huesos_Seminuevos')}
                className="bg-[#fd0019] text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-2"
            >
                <FileSpreadsheet size={14}/> Descargar Huesos
            </button>
        </div>
        <div className="overflow-auto max-h-80 scrollbar-thin">
            <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-black uppercase text-[10px] text-slate-500 border-b">
                    <tr>
                        <th className="p-3 text-center">Días</th>
                        <th className="p-3">Vehículo</th>
                        <th className="p-3">VIN</th>
                        <th className="p-3">Sucursal</th>
                        <th className="p-3 text-right">Costo Atrapado</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredData.filter(d => d.Días > 90).sort((a,b) => b.Días - a.Días).map((auto, i) => (
                        <tr key={i} className="hover:bg-red-50 transition-colors font-bold">
                            <td className="p-3 text-center"><span className="bg-red-600 text-white px-2 py-1 rounded-md">{auto.Días}</span></td>
                            <td className="p-3">{auto.Anio} {auto.Marca} {auto.Modelo}</td>
                            <td className="p-3 font-mono text-[10px] text-slate-400">{auto.VIN}</td>
                            <td className="p-3 uppercase text-slate-500">{auto.Sucursal}</td>
                            <td className="p-3 text-right text-red-600">{fmtMoney(auto.Costo)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* FILA 3: Inventario Completo */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-slate-900 font-black text-lg flex items-center gap-2">
                <Database size={24} className="text-blue-500" /> Inventario Completo ({filteredData.length})
            </h2>
            <div className="flex gap-3 w-full md:w-auto">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" placeholder="Buscar..." 
                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="bg-slate-50 w-full pl-10 pr-4 py-2 rounded-xl text-xs font-bold outline-none border border-slate-200 focus:border-blue-500"
                    />
                </div>
                <button 
                    onClick={() => exportToExcel(filteredData, 'Inventario_Seminuevos_Completo')}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2"
                >
                    <Download size={16}/> Exportar
                </button>
            </div>
        </div>
        <div className="overflow-auto max-h-[500px] scrollbar-thin">
            <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 sticky top-0 font-black uppercase text-[10px] text-slate-500 border-b">
                    <tr>
                        <th className="p-3">Sucursal</th>
                        <th className="p-3">Vehículo</th>
                        <th className="p-3">Versión</th>
                        <th className="p-3">Color</th>
                        <th className="p-3 text-center">Antigüedad</th>
                        <th className="p-3 text-center">Estatus</th>
                        <th className="p-3 text-right">Precio Venta</th>
                        <th className="p-3 text-right">Costo</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 font-medium">
                            <td className="p-3 font-bold text-slate-600">{row.Sucursal}</td>
                            <td className="p-3 font-black text-slate-900">{row.Anio} {row.Marca} {row.Modelo}</td>
                            <td className="p-3 text-slate-500">{row.Version}</td>
                            <td className="p-3 text-slate-500">{row.Color}</td>
                            <td className="p-3 text-center font-black">
                                <span className={`${row.Días > 90 ? 'text-red-600' : 'text-slate-900'}`}>{row.Días} días</span>
                            </td>
                            <td className="p-3 text-center">
                                <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${row.EstatusFinanciero === 'PROPIO' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {row.EstatusFinanciero}
                                </span>
                            </td>
                            <td className="p-3 text-right font-black text-emerald-600">{fmtMoney(row.PrecioVenta)}</td>
                            <td className="p-3 text-right font-black text-slate-900">{fmtMoney(row.Costo)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, color, subtitle }: any) {
    return (
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
            <h3 className={`text-2xl font-black ${color} tracking-tighter`}>{value}</h3>
            {subtitle && <p className="text-[10px] font-bold text-[#fd0019] mt-1 uppercase">{subtitle}</p>}
            <div className="absolute -bottom-2 -right-2 opacity-5 text-6xl group-hover:scale-110 transition-transform duration-500">{icon}</div>
        </div>
    );
}
