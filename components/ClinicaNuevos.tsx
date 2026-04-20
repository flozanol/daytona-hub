'use client';

import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { Upload, Search, Database, AlertCircle, BarChart as BarChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ClinicaNuevos() {
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedData = results.data.map((row: any) => {
            const rawValor = row['Valor Unidad'] || '0';
            const cleanValor = parseFloat(String(rawValor).replace(/[^\d.-]/g, '')) || 0;
            const rawAntiguedad = row['Antigüedad'] || row['Edad'] || '0';
            const cleanAntiguedad = parseInt(String(rawAntiguedad).replace(/[^\d.-]/g, ''), 10) || 0;
            
            return {
              ...row,
              'Valor Unidad Num': cleanValor,
              'Antigüedad Num': cleanAntiguedad,
            };
          });
          setData(parsedData);
          setIsLoaded(true);
        }
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  };

  // KPIs
  const totalUnidades = data.length;
  const valorInventario = data.reduce((acc, curr) => acc + curr['Valor Unidad Num'], 0);
  const edadPromedio = totalUnidades > 0 
    ? (data.reduce((acc, curr) => acc + curr['Antigüedad Num'], 0) / totalUnidades).toFixed(1) 
    : 0;

  // Aging Histogram
  const agingData = useMemo(() => {
    let a0_30 = 0, a31_60 = 0, a61_90 = 0, a90plus = 0;
    data.forEach(d => {
      const e = d['Antigüedad Num'];
      if(e <= 30) a0_30++;
      else if(e <= 60) a31_60++;
      else if(e <= 90) a61_90++;
      else a90plus++;
    });
    return [
      { name: '0-30 días', value: a0_30, fill: '#3b82f6' }, // blue-500
      { name: '31-60 días', value: a31_60, fill: '#eab308' }, // yellow-500
      { name: '61-90 días', value: a61_90, fill: '#f97316' }, // orange-500
      { name: '+90 días', value: a90plus, fill: '#ef4444' }, // red-500
    ];
  }, [data]);

  // Mix Agencia
  const mapAgencia = useMemo(() => {
    const m: any = {};
    data.forEach(d => {
      const ag = d['Agencia'] || 'Sin Agencia';
      m[ag] = (m[ag] || 0) + 1;
    });
    return Object.keys(m)
      .map(k => ({ name: k, value: m[k] }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  // Top 10 Modelos
  const mapModelos = useMemo(() => {
    const m: any = {};
    data.forEach(d => {
      const mod = d['Modelo'] || 'Desconocido';
      m[mod] = (m[mod] || 0) + 1;
    });
    return Object.keys(m)
      .map(k => ({ name: k, value: m[k] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [data]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter(d => 
      (d['Modelo'] && String(d['Modelo']).toLowerCase().includes(lower)) ||
      (d['Agencia'] && String(d['Agencia']).toLowerCase().includes(lower)) ||
      (d['Version'] && String(d['Version']).toLowerCase().includes(lower)) ||
      (d['Color Exterior'] && String(d['Color Exterior']).toLowerCase().includes(lower))
    );
  }, [data, searchTerm]);

  // Custom Tooltips para Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1e293b] text-white p-3 rounded-lg border border-slate-700 shadow-xl text-sm">
          <p className="font-bold text-slate-300">{`${label}`}</p>
          <p className="text-xl font-black">{`${payload[0].value} unidades`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-full bg-[#0b1120] text-slate-300 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* Cabecera y Carga */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-white pointer-events-none">
            <Database size={150} />
          </div>
          <div className="relative z-10 w-full md:w-auto">
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <span className="bg-blue-600 p-2 rounded-xl text-white">
                <BarChartIcon size={24} />
              </span>
              Clínica de Inventario
            </h1>
            <p className="text-slate-400 mt-2 font-medium">Cargue el reporte de inventario (CSV) para generar el diagnóstico.</p>
          </div>
          
          <div className="relative z-10 w-full md:w-auto">
            <label className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer font-bold transition-colors shadow-md w-full md:w-auto">
              <Upload size={18} />
              Cargar CSV
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>

        {isLoaded && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-lg">
                <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">Total Unidades</h3>
                <p className="text-4xl font-black text-white">{totalUnidades}</p>
              </div>
              <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-lg">
                <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">Valor Inventario</h3>
                <p className="text-4xl font-black text-emerald-400">{formatCurrency(valorInventario)}</p>
              </div>
              <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-lg">
                <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">Edad Promedio</h3>
                <p className="text-4xl font-black text-amber-400">{edadPromedio} <span className="text-lg text-amber-600/50">días</span></p>
              </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Aging */}
              <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-lg">
                <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">Histograma de Aging</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: '#334155', opacity: 0.4}} content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Mix Agencia */}
              <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-lg">
                <h3 className="text-white font-bold text-lg mb-6">Mix por Agencia</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mapAgencia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => String(val).substring(0, 8) + '...'} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: '#334155', opacity: 0.4}} content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#818cf8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Charts Row 2 */}
            <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-lg">
              <h3 className="text-white font-bold text-lg mb-6">Top 10 Modelos en Inventario</h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mapModelos} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={150} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: '#334155', opacity: 0.4}} content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table */}
            <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-lg">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="text-white font-bold text-lg">Detalle de Unidades ({filteredData.length})</h3>
                <div className="relative w-full md:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar modelo, agencia, versión..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full md:w-80 bg-[#0b1120] border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#0b1120] text-xs uppercase text-slate-400 tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-bold border-b border-slate-700">Agencia</th>
                      <th className="px-6 py-4 font-bold border-b border-slate-700">Modelo</th>
                      <th className="px-6 py-4 font-bold border-b border-slate-700">Versión</th>
                      <th className="px-6 py-4 font-bold border-b border-slate-700">Color</th>
                      <th className="px-6 py-4 font-bold border-b border-slate-700 text-right">Valor</th>
                      <th className="px-6 py-4 font-bold border-b border-slate-700 text-center">Edad (Días)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredData.slice(0, 100).map((row, idx) => {
                      const isOld = row['Antigüedad Num'] > 90;
                      return (
                        <tr key={idx} className={`hover:bg-slate-800/30 transition-colors ${isOld ? 'bg-red-950/20' : ''}`}>
                          <td className="px-6 py-3 whitespace-nowrap text-slate-300">{row['Agencia'] || '-'}</td>
                          <td className="px-6 py-3 font-medium text-white">{row['Modelo'] || '-'}</td>
                          <td className="px-6 py-3 text-slate-400 text-xs">{row['Version'] || '-'}</td>
                          <td className="px-6 py-3 text-slate-400">{row['Color Exterior'] || '-'}</td>
                          <td className="px-6 py-3 text-right font-medium text-emerald-400">{formatCurrency(row['Valor Unidad Num'])}</td>
                          <td className="px-6 py-3 text-center">
                            {isOld ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                                <AlertCircle size={12} />
                                {row['Antigüedad Num']}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-medium">{row['Antigüedad Num']}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredData.length > 100 && (
                <p className="text-xs text-slate-500 mt-4 text-center">Mostrando 100 resultados de {filteredData.length}. Utilice la búsqueda para afinar los resultados.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
