'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Car, Skull, FileSpreadsheet, TrendingUp, AlertTriangle, PieChart as PieChartIcon, Database, Calendar, Search, Download } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import * as XLSX from 'xlsx';

// Mapa de sucursales (ajustado a tus IDs de SQL)
const CPNY_MAP: Record<string, string> = {
  'TEC': 'Motos Tecamachalco', 'IZT': 'Motos Iztapalapa', 'SAT': 'Motos Satélite',
  'ECA': 'Motos Ecatepec', 'CUE': 'Motos Cuernavaca', 'CUU': 'Motos Cuautla',
  '001': 'KIA Interlomas', '002': 'KIA Iztapalapa', 'ACUI': 'Acura Interlomas',
  'MGINT': 'MG Interlomas', 'MGSFE': 'MG Santa Fe', 'MGIZT': 'MG Iztapalapa',
  'MGCUA': 'MG Cuajimalpa', 'GWCUE': 'GWM Cuernavaca', 'GWIZT': 'GWM Iztapalapa',
  'CUA': 'Honda Cuajimalpa', 'INT': 'Honda Interlomas'
};

export default function ClinicaSeminuevosSQL() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgencia, setSelectedAgencia] = useState('Todas');

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
      })
      .catch(err => {
        console.error("Error cargando seminuevos:", err);
        setLoading(false);
      });
  }, []);

  const filteredData = useMemo(() => {
    return selectedAgencia === 'Todas' ? data : data.filter(d => d.Sucursal === selectedAgencia);
  }, [data, selectedAgencia]);

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

  const donutData = useMemo(() => [
    { name: 'Sano (0-30)', value: filteredData.filter(d => d.Días <= 30).length, color: '#10b981' },
    { name: 'Precaución (31-60)', value: filteredData.filter(d => d.Días > 30 && d.Días <= 60).length, color: '#f59e0b' },
    { name: 'Alerta (61-90)', value: filteredData.filter(d => d.Días > 60 && d.Días <= 90).length, color: '#f97316' },
    { name: 'Tóxico (>90)', value: filteredData.filter(d => d.Días > 90).length, color: '#fd0019' }
  ], [filteredData]);

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, `Inventario_Seminuevos_${selectedAgencia}.xlsx`);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
      <p className="font-bold text-slate-600 uppercase tracking-widest text-xs">Sincronizando con SQL Server Seminuevos...</p>
    </div>
  );

  return (
    <div className="min-h-full bg-slate-50 p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* CABECERA (Look & Feel del portal original) */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#111827] text-white p-6 rounded-3xl shadow-xl border-b-4 border-red-600">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-3 rounded-xl shadow-lg"><PieChartIcon size={24} /></div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">Clínica de Seminuevos</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Auditoría de Riesgo y Capital en Tiempo Real (SQL)</p>
            </div>
          </div>
          <div className="flex gap-3">
            <select 
              value={selectedAgencia} 
              onChange={(e) => setSelectedAgencia(e.target.value)}
              className="bg-gray-800 border border-gray-600 text-white text-xs font-bold rounded-lg px-4 py-2 outline-none focus:ring-2 ring-red-600"
            >
              <option value="Todas">Todas las Sucursales</option>
              {[...new Set(data.map(d => d.Sucursal))].sort().map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={exportarExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg transition-colors">
              <Download size={18} />
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <KPICard title="Unidades Totales" value={stats.unidades} icon={<Car />} color="text-slate-800" />
            <KPICard title="Costo Invertido" value={`$${(stats.costo/1000000).toFixed(2)}M`} icon={<Database />} color="text-blue-900" />
            <KPICard title="Capital en Riesgo" value={`$${(stats.riesgo/1000000).toFixed(2)}M`} icon={<AlertTriangle />} color="text-red-600" subtitle={`${stats.pctRiesgo.toFixed(1)}% del capital total`} />
            <KPICard title="Promedio Días" value={`${stats.diasPromedio} Días`} icon={<Calendar />} color="text-slate-800" />
        </div>

        {/* GRÁFICA Y MURO */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1">
                <h2 className="text-xs font-black uppercase mb-4 border-b pb-2 tracking-widest">Semáforo de Rotación</h2>
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={donutData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                {donutData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                    {donutData.map(d => (
                        <div key={d.name} className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: d.color}}></span>{d.name}</span>
                            <span className="text-slate-900">{d.value} ud.</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border-t-4 border-black lg:col-span-3 overflow-hidden">
                <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                    <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                      <Skull className="text-red-500" size={16}/> Muro de los Lamentos (Huesos)
                    </h2>
                    <span className="text-[10px] font-bold bg-red-600 px-2 py-1 rounded">CRÍTICO: +90 DÍAS</span>
                </div>
                <div className="overflow-auto max-h-96 scrollbar-thin">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 sticky top-0 font-black uppercase text-[10px] text-slate-500 border-b">
                            <tr>
                                <th className="p-3 text-center">Días</th>
                                <th className="p-3">Vehículo</th>
                                <th className="p-3">VIN</th>
                                <th className="p-3">Sucursal</th>
                                <th className="p-3 text-right">Costo</th>
                                <th className="p-3 text-right">Margen Exp.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.filter(d => d.Días > 90).sort((a,b) => b.Días - a.Días).map((auto, i) => (
                                <tr key={i} className="hover:bg-red-50 transition-colors">
                                    <td className="p-3 text-center"><span className="bg-red-600 text-white px-2 py-1 rounded font-black text-[11px]">{auto.Días}</span></td>
                                    <td className="p-3 font-bold text-slate-900">{auto.Anio} {auto.Marca} {auto.Modelo}</td>
                                    <td className="p-3 font-mono text-[10px] text-slate-400">{auto.VIN}</td>
                                    <td className="p-3 uppercase text-slate-500 font-semibold">{auto.Sucursal}</td>
                                    <td className="p-3 text-right font-black text-red-600">${auto.Costo.toLocaleString()}</td>
                                    <td className="p-3 text-right font-bold text-emerald-600">${(auto.Margen || 0).toLocaleString()}</td>
                                </tr>
                            ))}
                            {filteredData.filter(d => d.Días > 90).length === 0 && (
                              <tr>
                                <td colSpan={6} className="p-10 text-center font-bold text-slate-400 uppercase tracking-widest">¡Felicidades! No hay hueso en este inventario 🥂</td>
                              </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, color, subtitle }: any) {
    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition-shadow">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
            <h3 className={`text-3xl font-black ${color} tracking-tighter`}>{value}</h3>
            {subtitle && <p className="text-[10px] font-bold text-red-500 mt-1 uppercase">{subtitle}</p>}
            <div className="absolute -bottom-2 -right-2 opacity-5 text-7xl group-hover:scale-110 transition-transform duration-500">{icon}</div>
        </div>
    );
}
