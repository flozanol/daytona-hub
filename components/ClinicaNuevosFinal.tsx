'use client';

import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { Upload, Search, Database, Filter, Clock, BadgeDollarSign, Car, BarChart3, AlertCircle } from 'lucide-react';

export default function ClinicaNuevosFinal() {
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgencia, setSelectedAgencia] = useState('Todas');
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. LIMPIEZA DE NÚMEROS
  const cleanNumber = (val: any) => {
    if (!val) return 0;
    const cleanStr = String(val).replace(/,/g, '').replace(/\$/g, '').replace(/\s/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
  };

  // 2. PARSEO DE CSV Y LÓGICA DE FILTRADO
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedData: any[] = [];
          
          results.data.forEach((row: any) => {
            const colorStr = row['Color'] ? String(row['Color']).trim() : '';
            
            // 1. FILTRADO (CRÍTICO)
            if (colorStr !== '' && colorStr.toLowerCase() !== 'total' && colorStr.toLowerCase() !== 'sin clasificar') {
              
              const uFinanciados = cleanNumber(row['Financiado']);
              const mFinanciados = cleanNumber(row['Costo Financiados']);
              
              const uPropios = cleanNumber(row['Propios']);
              const mPropios = cleanNumber(row['Costo Propios']);
              
              const uDemos = cleanNumber(row['Demo']);
              const mDemos = cleanNumber(row['Costo Demo']);
              
              const uDemosPropios = cleanNumber(row['Demo Propios']);
              const mDemosPropios = cleanNumber(row['Costo Demo Propios']);

              const antiguedad = cleanNumber(row['Antigüedad Promedio'] || row['Antigüedad']);
              
              // CÁLCULO DE UNIDADES (Suma estas 4 columnas)
              const rowUnidadesTotales = uFinanciados + uPropios + uDemos + uDemosPropios;
              const rowMontoTotal = mFinanciados + mPropios + mDemos + mDemosPropios;

              let tipoCapital = 'Otro';
              if (mPropios > 0 || uPropios > 0 || mDemosPropios > 0 || uDemosPropios > 0) tipoCapital = 'PROPIA';
              else if (mFinanciados > 0 || uFinanciados > 0) tipoCapital = 'FINANCIADA';
              else if (mDemos > 0 || uDemos > 0) tipoCapital = 'DEMO';

              parsedData.push({
                ...row,
                Sucursal: row['Sucursal'] ? String(row['Sucursal']).trim() : 'Sin Sucursal',
                Submarca: row['Submarca'] ? String(row['Submarca']).trim() : '',
                Versión: row['Versión'] ? String(row['Versión']).trim() : '',
                Color: colorStr,
                AntigüedadVal: antiguedad, // Promedio de 'Antigüedad Promedio'
                CostoTotalVal: rowMontoTotal, // Usar la sumatoria asegurada según instrucción
                rowUnidadesTotales,
                rowMontoTotal,
                
                uFinanciados,
                mFinanciados,
                uPropios,
                mPropios,
                uDemos,
                mDemos,
                uDemosPropios,
                mDemosPropios,
                tipoCapital
              });
            }
          });
          
          setData(parsedData);
          setIsLoaded(true);
        }
      });
    }
  };

  // 3. DERIVACIÓN DE DATOS (ESTADO, KPI)
  const dashboardData = useMemo(() => {
    if (selectedAgencia === 'Todas') return data;
    return data.filter(d => d.Sucursal === selectedAgencia);
  }, [data, selectedAgencia]);

  const agenciasUnicas = useMemo(() => {
    const set = new Set<string>();
    data.forEach(d => set.add(d.Sucursal || 'Desconocida'));
    return ['Todas', ...Array.from(set).sort()];
  }, [data]);

  const stats = useMemo(() => {
    let totUFinanciados = 0, totMFinanciados = 0;
    let totUPropios = 0, totMPropios = 0;
    let totUDemos = 0, totMDemos = 0;
    let totUDemosPropios = 0, totMDemosPropios = 0;
    
    let sumAntiguedad = 0;
    let countAntiguedad = 0;

    dashboardData.forEach(d => {
      totUFinanciados += d.uFinanciados;
      totMFinanciados += d.mFinanciados;
      
      totUPropios += d.uPropios;
      totMPropios += d.mPropios;
      
      totUDemos += d.uDemos;
      totMDemos += d.mDemos;
      
      totUDemosPropios += d.uDemosPropios;
      totMDemosPropios += d.mDemosPropios;

      // Ponderar la edad promedio por las unidades totales
      const effectiveUnits = d.rowUnidadesTotales || 1;
      
      sumAntiguedad += (d.AntigüedadVal * effectiveUnits);
      countAntiguedad += effectiveUnits;
    });

    const totalUnidades = totUFinanciados + totUPropios + totUDemos + totUDemosPropios;
    const totalInversion = totMFinanciados + totMPropios + totMDemos + totMDemosPropios;
    const edadPromedio = countAntiguedad > 0 ? (sumAntiguedad / countAntiguedad) : 0;
    const capitalPropioEstancado = totMPropios + totMDemosPropios;

    return {
      financiados: { uds: totUFinanciados, monto: totMFinanciados },
      propios: { uds: totUPropios, monto: totMPropios },
      demos: { uds: totUDemos, monto: totMDemos },
      demosPropios: { uds: totUDemosPropios, monto: totMDemosPropios },
      totalUnidades,
      totalInversion,
      edadPromedio,
      capitalPropioEstancado
    };
  }, [dashboardData]);

  const tableData = useMemo(() => {
    if (!searchTerm) return dashboardData;
    const lower = searchTerm.toLowerCase();
    return dashboardData.filter(d => 
      (d.Submarca && String(d.Submarca).toLowerCase().includes(lower)) ||
      (d.Versión && String(d.Versión).toLowerCase().includes(lower)) ||
      (d.Color && String(d.Color).toLowerCase().includes(lower)) ||
      (d.Sucursal && String(d.Sucursal).toLowerCase().includes(lower))
    );
  }, [dashboardData, searchTerm]);

  // FORMATTERS
  const formatCurrencyM = (value: number) => {
    if (value >= 100000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  };

  return (
    <div className="min-h-full bg-slate-50 text-slate-800 p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
        
        {/* ENCABEZADO Y FILTRO POR AGENCIA */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-[1.5rem] shadow-sm border border-slate-200">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Car className="text-blue-600" size={32} />
              Clínica de Inventario Nuevos
            </h1>
            <p className="text-slate-500 text-sm font-semibold mt-1">Dashbaord de Capital y Abastecimiento</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            {isLoaded && agenciasUnicas.length > 1 && (
              <div className="flex flex-col w-full sm:w-auto">
                <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1">
                  <Filter size={12} /> Sucursal (Agencia)
                </label>
                <div className="relative">
                  <select
                    value={selectedAgencia}
                    onChange={(e) => setSelectedAgencia(e.target.value)}
                    className="w-full sm:w-56 appearance-none bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-all cursor-pointer"
                  >
                    {agenciasUnicas.map(ag => (
                      <option key={ag} value={ag}>{ag}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                </div>
              </div>
            )}

            <label className="flex items-center justify-center gap-2 px-6 py-2.5 mt-5 sm:mt-0 bg-slate-900 hover:bg-slate-800 text-white rounded-xl cursor-pointer font-bold transition-all shadow-md w-full sm:w-auto text-sm">
              <Upload size={18} />
              {isLoaded ? 'Actualizar CSV' : 'Cargar Inventario (2).csv'}
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>

        {isLoaded && (
          <>
            {/* CARDS SUPERIORES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 text-slate-400 mb-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Database size={18} className="stroke-[2.5px]" />
                  </div>
                  <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-500">Inventario Total</h3>
                </div>
                <p className="text-3xl font-black text-slate-900 tracking-tight">{stats.totalUnidades}</p>
              </div>

              <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 text-slate-400 mb-2">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <BadgeDollarSign size={18} className="stroke-[2.5px]" />
                  </div>
                  <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-500">Inversión Total</h3>
                </div>
                <p className="text-3xl font-black text-emerald-600 tracking-tight">{formatCurrencyM(stats.totalInversion)}</p>
              </div>

              <div className="bg-amber-50 p-6 rounded-[1.5rem] shadow-sm border border-amber-200 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 text-amber-700 mb-2 z-10">
                  <div className="p-2 bg-amber-500 text-white rounded-lg shadow-sm">
                    <AlertCircle size={18} className="stroke-[2.5px]" />
                  </div>
                  <h3 className="font-black uppercase tracking-wider text-[11px]">Capital Propio</h3>
                </div>
                <p className="text-3xl font-black text-amber-600 tracking-tight z-10 mx-[-2px]">{formatCurrencyM(stats.capitalPropioEstancado)}</p>
                <div className="text-[10px] text-amber-800/70 mt-1 font-bold z-10 uppercase tracking-widest">
                  (Dinero Estancado)
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 text-slate-400 mb-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Clock size={18} className="stroke-[2.5px]" />
                  </div>
                  <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-500">Antigüedad Promedio</h3>
                </div>
                <p className="text-3xl font-black text-slate-900 tracking-tight">{Math.round(stats.edadPromedio)} <span className="text-base text-slate-400 font-semibold">días</span></p>
              </div>

            </div>

            {/* SECCIÓN INTERMEDIA: DESGLOSE DE CAPITAL */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-slate-200 col-span-1 lg:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="text-slate-400" size={20} />
                  <h3 className="text-slate-900 font-black text-lg">Desglose de Capital por Modalidad</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-center">
                    <span className="text-sm font-bold text-slate-700 mb-1">Financiados</span>
                    <span className="text-2xl font-black text-slate-900">{formatCurrencyM(stats.financiados.monto)}</span>
                    <span className="text-xs text-slate-500 font-semibold">{stats.financiados.uds} uds</span>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex flex-col justify-center">
                    <span className="text-sm font-bold text-amber-800 mb-1">Propios</span>
                    <span className="text-2xl font-black text-amber-600">{formatCurrencyM(stats.propios.monto)}</span>
                    <span className="text-xs text-amber-700/70 font-semibold">{stats.propios.uds} uds</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-center">
                    <span className="text-sm font-bold text-slate-700 mb-1">Demos</span>
                    <span className="text-2xl font-black text-slate-900">{formatCurrencyM(stats.demos.monto)}</span>
                    <span className="text-xs text-slate-500 font-semibold">{stats.demos.uds} uds</span>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex flex-col justify-center">
                    <span className="text-sm font-bold text-amber-800 mb-1">Demos Propios</span>
                    <span className="text-2xl font-black text-amber-600">{formatCurrencyM(stats.demosPropios.monto)}</span>
                    <span className="text-xs text-amber-700/70 font-semibold">{stats.demosPropios.uds} uds</span>
                  </div>
                </div>
              </div>

            </div>

            {/* TABLA DE DETALLE (LISTA COMPLETA) */}
            <div className="bg-white overflow-hidden rounded-[1.5rem] shadow-sm border border-slate-200 flex flex-col min-h-[500px]">
              <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 bg-white z-10">
                <h3 className="text-slate-900 font-black text-lg">
                  Lista de Unidades ({tableData.length})
                </h3>
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar sucursal, submarca, versión..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-11 pr-5 py-2 text-sm font-semibold outline-none focus:border-slate-400 transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-x-auto bg-white">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#f8fafc] text-[11px] uppercase text-slate-500 font-black border-b border-slate-200 sticky top-0 z-0">
                    <tr>
                      <th className="px-6 py-4">Sucursal</th>
                      <th className="px-6 py-4">Submarca / Versión</th>
                      <th className="px-6 py-4">Color</th>
                      <th className="px-6 py-4 text-center">Tipo</th>
                      <th className="px-6 py-4 text-center">Antigüedad</th>
                      <th className="px-6 py-4 text-right">Costo Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.slice(0, 150).map((row, idx) => {
                      const antiguedad = row.AntigüedadVal;
                      const isAlert = antiguedad > 70; // > 70 días resaltado en rojo brillante
                      
                      return (
                        <tr key={idx} className={`transition-colors group ${isAlert ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-50'}`}>
                          <td className="px-6 py-4 text-slate-700 font-bold whitespace-nowrap">{row.Sucursal}</td>
                          <td className="px-6 py-4">
                            <div className="font-black text-slate-900">{row.Submarca || '-'}</div>
                            <div className="text-xs font-medium text-slate-500 max-w-[200px] truncate" title={row.Versión}>{row.Versión || '-'}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-medium">{row.Color}</td>
                          <td className="px-6 py-4 text-center">
                            {/* MARCADOR VISUAL PROPIA VS FINANCIADA */}
                            {row.tipoCapital === 'PROPIA' && <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-widest">Propia</span>}
                            {row.tipoCapital === 'FINANCIADA' && <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-widest">Financiada</span>}
                            {row.tipoCapital === 'DEMO' && <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-widest">Demo</span>}
                            {row.tipoCapital === 'Otro' && <span className="text-slate-400 font-semibold text-xs">-</span>}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`font-black ${isAlert ? 'text-red-700' : 'text-slate-700'} ${isAlert && 'bg-red-100 px-2.5 py-1 rounded-md border border-red-200'}`}>
                              {antiguedad} <span className={`text-xs font-medium ${isAlert ? 'text-red-500' : 'text-slate-400'}`}>días</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-black text-slate-900 whitespace-nowrap">
                            {formatCurrency(row.CostoTotalVal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {tableData.length > 150 && (
                <div className="p-3 text-center text-xs font-semibold text-slate-500 bg-slate-50 border-t border-slate-100">
                  Mostrando 150 de {tableData.length}. Filtre para ver más reigstros.
                </div>
              )}
            </div>

          </>
        )}

      </div>
    </div>
  );
}
