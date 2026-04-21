'use client';

import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { Upload, Search, Database, AlertCircle, BarChart as BarChartIcon, TrendingUp, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ClinicaInventarioNuevos() {
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [globalSucursal, setGlobalSucursal] = useState('Todas');
  const [isLoaded, setIsLoaded] = useState(false);

  const cleanNumber = (val: any) => {
    if (!val) return 0;
    return parseFloat(String(val).replace(/,/g, '').replace(/\$/g, '')) || 0;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          let parsedData: any[] = [];
          
          results.data.forEach((row: any) => {
            const colorStr = row['Color'] ? String(row['Color']) : '';
            // Filtro: Color NO es nulo y NO contiene "Total"
            if (colorStr && !colorStr.toLowerCase().includes('total')) {
              
              const cleanCosto = cleanNumber(row['Costo Total']);
              const cleanAntiguedad = cleanNumber(row['Antigüedad Promedio']);
              const cleanCant = cleanNumber(row['Cant. Total']);

              const finUds = cleanNumber(row['Financiado']);
              const finCosto = cleanNumber(row['Costo Financiados']);
              const propUds = cleanNumber(row['Propios']);
              const propCosto = cleanNumber(row['Costo Propios']);
              const demUds = cleanNumber(row['Demo']);
              const demCosto = cleanNumber(row['Costo Demo']);
              const demPropUds = cleanNumber(row['Demo Propios']);
              const demPropCosto = cleanNumber(row['Costo Demo Propios']);

              let origenArr = [];
              if (finUds > 0) origenArr.push('Financiado');
              if (propUds > 0) origenArr.push('Propio');
              if (demUds > 0) origenArr.push('Demo');
              if (demPropUds > 0) origenArr.push('Demo Propio');
              const origenStr = origenArr.join(', ') || 'N/A';

              parsedData.push({
                ...row,
                'Costo Total Num': cleanCosto,
                'Antigüedad Num': cleanAntiguedad,
                'Cant Num': cleanCant,
                'Financiado Uds': finUds,
                'Financiado Costo': finCosto,
                'Propios Uds': propUds,
                'Propios Costo': propCosto,
                'Demo Uds': demUds,
                'Demo Costo': demCosto,
                'Demo Propios Uds': demPropUds,
                'Demo Propios Costo': demPropCosto,
                'OrigenStr': origenStr
              });
            }
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

  // Obtener lista de sucursales únicas para el dropdown
  const sucursales = useMemo(() => {
    const s = new Set<string>();
    data.forEach(d => {
      if (d['Sucursal']) s.add(d['Sucursal']);
    });
    return Array.from(s).sort();
  }, [data]);

  // Datos filtrados globalmente (Sucursal)
  const sucursalFilteredData = useMemo(() => {
    if (globalSucursal === 'Todas') return data;
    return data.filter(d => d['Sucursal'] === globalSucursal);
  }, [data, globalSucursal]);

  // KPIs
  const totalUnidades = sucursalFilteredData.reduce((acc, curr) => acc + curr['Cant Num'], 0);
  const inversionTotal = sucursalFilteredData.reduce((acc, curr) => acc + curr['Costo Total Num'], 0);
  const edadPromedio = sucursalFilteredData.length > 0 
    ? (sucursalFilteredData.reduce((acc, curr) => acc + curr['Antigüedad Num'], 0) / sucursalFilteredData.length).toFixed(1)
    : 0;

  // KPIs Financieros Separados
  const sumFinCosto = sucursalFilteredData.reduce((acc, curr) => acc + curr['Financiado Costo'], 0);
  const sumPropCosto = sucursalFilteredData.reduce((acc, curr) => acc + curr['Propios Costo'], 0);
  const sumDemCosto = sucursalFilteredData.reduce((acc, curr) => acc + curr['Demo Costo'], 0);
  const sumDemPropCosto = sucursalFilteredData.reduce((acc, curr) => acc + curr['Demo Propios Costo'], 0);

  // Aging Histogram
  const agingData = useMemo(() => {
    let a0_30 = 0, a31_60 = 0, a61_90 = 0, a90plus = 0;
    sucursalFilteredData.forEach(d => {
      const e = d['Antigüedad Num'];
      const c = d['Cant Num'];
      if(e <= 30) a0_30 += c;
      else if(e <= 60) a31_60 += c;
      else if(e <= 90) a61_90 += c;
      else a90plus += c;
    });
    return [
      { name: '0-30 días', value: a0_30, fill: '#10b981' }, // Verde
      { name: '31-60 días', value: a31_60, fill: '#eab308' }, // Amarillo
      { name: '61-90 días', value: a61_90, fill: '#f97316' }, // Naranja
      { name: '+90 días', value: a90plus, fill: '#ef4444' }, // Rojo
    ];
  }, [sucursalFilteredData]);

  // Gráfica de Capital
  const capitalData = useMemo(() => [
    { name: 'Financiados', value: sumFinCosto, fill: '#3b82f6' }, // Azul
    { name: 'Propios', value: sumPropCosto, fill: '#10b981' }, // Verde
    { name: 'Demos', value: sumDemCosto, fill: '#8b5cf6' }, // Morado
    { name: 'Demos Propios', value: sumDemPropCosto, fill: '#f59e0b' }, // Naranja/Amarillo
  ], [sumFinCosto, sumPropCosto, sumDemCosto, sumDemPropCosto]);

  // Mix de Modelos (Submarca)
  const mapModelos = useMemo(() => {
    const m: any = {};
    sucursalFilteredData.forEach(d => {
      const mod = d['Submarca'] || 'Desconocido';
      m[mod] = (m[mod] || 0) + d['Cant Num'];
    });
    return Object.keys(m)
      .map(k => ({ name: k, value: m[k] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [sucursalFilteredData]);

  // Muro de los Lamentos (Top 10 más antiguos)
  const muroLamentosData = useMemo(() => {
    return [...sucursalFilteredData]
      .sort((a, b) => b['Antigüedad Num'] - a['Antigüedad Num'])
      .slice(0, 10);
  }, [sucursalFilteredData]);

  // Datos filtrados para tabla inferior (Text search)
  const tableFilteredData = useMemo(() => {
    if (!searchTerm) return sucursalFilteredData;
    const lower = searchTerm.toLowerCase();
    return sucursalFilteredData.filter(d => 
      (d['Submarca'] && String(d['Submarca']).toLowerCase().includes(lower)) ||
      (d['Sucursal'] && String(d['Sucursal']).toLowerCase().includes(lower)) ||
      (d['Versión'] && String(d['Versión']).toLowerCase().includes(lower)) ||
      (d['Color'] && String(d['Color']).toLowerCase().includes(lower))
    );
  }, [sucursalFilteredData, searchTerm]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isCurrency = payload[0].payload.name === 'Financiados' || payload[0].payload.name === 'Propios' || payload[0].payload.name === 'Demos' || payload[0].payload.name === 'Demos Propios';
      return (
        <div className="bg-white text-slate-800 p-3 rounded-xl border border-slate-200 shadow-xl text-sm z-50 relative">
          <p className="font-bold text-slate-500 mb-1">{`${label}`}</p>
          <p className="text-xl font-black text-slate-800">
            {isCurrency ? formatCurrency(payload[0].value) : `${payload[0].value} unidades`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-full bg-slate-50 text-slate-800 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* Cabecera y Carga */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-blue-600 pointer-events-none">
            <Database size={150} />
          </div>
          <div className="relative z-10 w-full md:w-auto">
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <span className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-600/30">
                <BarChartIcon size={24} />
              </span>
              Clínica de Inventario
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Reporte Jerárquico de Stock</p>
          </div>
          
          <div className="relative z-10 w-full md:w-auto flex flex-col md:flex-row gap-4">
            {isLoaded && (
              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Filtro Global</label>
                <select 
                  className="bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                  value={globalSucursal}
                  onChange={(e) => setGlobalSucursal(e.target.value)}
                >
                  <option value="Todas">Todas las Sucursales</option>
                  {sucursales.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div className="flex items-end">
              <label className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer font-bold transition-all shadow-lg shadow-blue-600/30 w-full md:w-auto h-[46px]">
                <Upload size={18} />
                Cargar Archivo CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </div>
        </div>

        {isLoaded && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-xl relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-5 text-blue-500"><TrendingUp size={100} /></div>
                <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-2 z-10">Unidades Totales</h3>
                <p className="text-5xl font-black text-slate-800 z-10">{totalUnidades}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-xl relative overflow-hidden">
                <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-2 z-10">Inversión Total</h3>
                <p className="text-4xl font-black text-blue-600 z-10">{formatCurrency(inversionTotal)}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-xl relative overflow-hidden">
                <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-2 z-10">Antigüedad Promedio</h3>
                <p className="text-4xl font-black text-amber-500 z-10">{edadPromedio} <span className="text-lg text-slate-400 font-medium">días</span></p>
              </div>
            </div>

            {/* Separación de Estatus Financiero */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 flex flex-col shadow-sm">
                <h4 className="text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">Financiados</h4>
                <p className="text-xl font-black text-slate-800">{formatCurrency(sumFinCosto)}</p>
              </div>
              <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex flex-col shadow-sm">
                <h4 className="text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">Propios</h4>
                <p className="text-xl font-black text-slate-800">{formatCurrency(sumPropCosto)}</p>
              </div>
              <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100 flex flex-col shadow-sm">
                <h4 className="text-purple-600 font-bold text-xs uppercase tracking-wider mb-1">Demos</h4>
                <p className="text-xl font-black text-slate-800">{formatCurrency(sumDemCosto)}</p>
              </div>
              <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 flex flex-col shadow-sm">
                <h4 className="text-amber-600 font-bold text-xs uppercase tracking-wider mb-1">Demos Propios</h4>
                <p className="text-xl font-black text-slate-800">{formatCurrency(sumDemPropCosto)}</p>
              </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Aging */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl">
                <h3 className="text-slate-800 font-black text-lg mb-6 flex items-center gap-2">
                  Histograma de Aging (Días)
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: '#f1f5f9', opacity: 0.8}} content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {agingData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Capital Stack */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl">
                <h3 className="text-slate-800 font-black text-lg mb-6">Dinero Estancado por Estatus</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={capitalData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000000}M`} />
                      <Tooltip cursor={{fill: '#f1f5f9', opacity: 0.8}} content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {capitalData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Muro de los Lamentos & Top 10 Modelos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Top Modelos */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl">
                <h3 className="text-slate-800 font-black text-lg mb-6">Top 10 Submarcas (Unidades)</h3>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mapModelos} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={130} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: '#f1f5f9', opacity: 0.8}} content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#64748b" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Muro de los Lamentos */}
              <div className="bg-red-50 p-6 rounded-2xl border border-red-100 shadow-xl flex flex-col">
                <h3 className="text-red-700 font-black text-lg mb-4 flex items-center gap-2">
                  <AlertTriangle size={20} className="text-red-500"/>
                  Muro de los Lamentos (Top 10 Antiguos)
                </h3>
                <div className="flex-1 overflow-auto rounded-xl border border-red-200 bg-white">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-red-100/50 text-xs uppercase text-red-800 tracking-wider sticky top-0">
                      <tr>
                        <th className="px-4 py-3 font-bold border-b border-red-100">Modelo</th>
                        <th className="px-4 py-3 font-bold border-b border-red-100">Color</th>
                        <th className="px-4 py-3 font-bold border-b border-red-100 text-center">Días</th>
                        <th className="px-4 py-3 font-bold border-b border-red-100 text-center">Origen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {muroLamentosData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-slate-700">
                            <div className="font-bold">{row['Submarca'] || '-'}</div>
                            <div className="text-[10px] text-slate-400">{row['Sucursal'] || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs">{row['Color'] || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                              {row['Antigüedad Num']}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-xs font-medium text-slate-500">
                            {row['OrigenStr']}
                          </td>
                        </tr>
                      ))}
                      {muroLamentosData.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-400 font-medium">No hay registros disponibles</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Table */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="text-slate-800 font-black text-lg">Detalle de Registros ({tableFilteredData.length})</h3>
                <div className="relative w-full md:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Filtrar sucursal, submarca, versión..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full md:w-80 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-bold border-b border-slate-200">Sucursal</th>
                      <th className="px-6 py-4 font-bold border-b border-slate-200">Submarca</th>
                      <th className="px-6 py-4 font-bold border-b border-slate-200">Versión</th>
                      <th className="px-6 py-4 font-bold border-b border-slate-200">Color</th>
                      <th className="px-6 py-4 font-bold border-b border-slate-200 text-right">Costo Total</th>
                      <th className="px-6 py-4 font-bold border-b border-slate-200 text-center">Antigüedad (Días)</th>
                      <th className="px-6 py-4 font-black border-b border-slate-200 text-center text-blue-600 bg-blue-50/50">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableFilteredData.slice(0, 100).map((row, idx) => {
                      const isOld = row['Antigüedad Num'] > 70;
                      return (
                        <tr key={idx} className={`hover:bg-slate-50 transition-colors ${isOld ? 'bg-red-50/50' : 'bg-white'}`}>
                          <td className="px-6 py-3 whitespace-nowrap text-slate-600">{row['Sucursal'] || '-'}</td>
                          <td className="px-6 py-3 font-bold text-slate-800">{row['Submarca'] || '-'}</td>
                          <td className="px-6 py-3 text-xs text-slate-500 min-w-[200px] leading-relaxed">{row['Versión'] || '-'}</td>
                          <td className="px-6 py-3 text-slate-600">{row['Color'] || '-'}</td>
                          <td className="px-6 py-3 text-right font-medium text-slate-700">{formatCurrency(row['Costo Total Num'])}</td>
                          <td className="px-6 py-3 text-center">
                            {isOld ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 shadow-sm">
                                <AlertCircle size={12} />
                                {row['Antigüedad Num']}
                              </span>
                            ) : (
                              <span className="text-slate-600 font-medium">{row['Antigüedad Num']}</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-center font-black text-blue-600 bg-blue-50/30 text-base">{row['Cant Num']}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {tableFilteredData.length > 100 && (
                <p className="text-xs text-slate-400 mt-4 text-center font-medium">Mostrando primeros 100 de {tableFilteredData.length} registros. Usa la búsqueda para afinar.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
