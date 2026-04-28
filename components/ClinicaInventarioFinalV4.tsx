'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Database, TrendingUp, Filter, Clock, BadgeDollarSign, Car, BarChart3, ShieldAlert, Download, Mail, Trophy, Bell, AlertTriangle, Skull, FileSpreadsheet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import * as XLSX from 'xlsx';

const CATS_OPCIONES = ['FINANCIADO', 'PROPIO', 'DEMO', 'DEMO PROPIO'];

const CPNY_MAP: Record<string, { nombre: string, sector: string }> = {
  // MOTOS (Agencias de Motos)
  'TEC': { nombre: 'Motos Tecamachalco', sector: 'MOTOS' },
  'IZT': { nombre: 'Motos Iztapalapa', sector: 'MOTOS' },
  'SAT': { nombre: 'Motos Satélite', sector: 'MOTOS' },
  'ECA': { nombre: 'Motos Ecatepec', sector: 'MOTOS' },
  'CUE': { nombre: 'Motos Cuernavaca', sector: 'MOTOS' },
  'CUU': { nombre: 'Motos Cuautla', sector: 'MOTOS' },
  'SATPH': { nombre: 'Motos Satélite Power House', sector: 'MOTOS' },
  'TLN': { nombre: 'Motos Tlalnepantla', sector: 'MOTOS' },
  'ATX': { nombre: 'Motos Atlixco', sector: 'MOTOS' },
  // AUTOS
  '001': { nombre: 'KIA Interlomas', sector: 'AUTOS' },
  '002': { nombre: 'KIA Iztapalapa', sector: 'AUTOS' },
  'MGINT': { nombre: 'MG Interlomas', sector: 'AUTOS' },
  'MGSFE': { nombre: 'MG Santa Fe', sector: 'AUTOS' },
  'MGIZT': { nombre: 'MG Iztapalapa', sector: 'AUTOS' },
  'MGCUA': { nombre: 'MG Cuajimalpa', sector: 'AUTOS' },
  'GWCUE': { nombre: 'GWM Cuernavaca', sector: 'AUTOS' },
  'GWIZT': { nombre: 'GWM Iztapalapa', sector: 'AUTOS' },
  'CUA': { nombre: 'Honda Cuajimalpa', sector: 'AUTOS' },
  'INT': { nombre: 'Honda Interlomas', sector: 'AUTOS' },
  'ACUI': { nombre: 'Acura Interlomas', sector: 'AUTOS' }
};

const getCategoryBadge = (cat: string) => {
  switch(cat) {
    case 'DEMO PROPIO': return <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-pink-100 text-pink-800 border border-pink-200 uppercase tracking-widest">{cat}</span>;
    case 'DEMO':        return <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-widest">{cat}</span>;
    case 'PROPIO':      return <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-widest">{cat}</span>;
    case 'FINANCIADO':  return <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-widest">{cat}</span>;
    default:            return <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-widest">{cat}</span>;
  }
};

const getAgingColor = (dias: number): { bg: string; badge: string } => {
  if (dias <= 30) return { bg: 'bg-green-50',  badge: 'bg-green-100 text-green-800 border-green-200' };
  if (dias <= 60) return { bg: 'bg-yellow-50', badge: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
  if (dias <= 90) return { bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-800 border-orange-200' };
  return          { bg: 'bg-red-50',    badge: 'bg-red-100 text-red-800 border-red-200' };
};

const esFilaArbol = (row: any): boolean => {
  const checks = ['Sucursal','SubBrandDescrGbl','Submarca','Versión','Color'];
  for (const key of checks) {
    if (String(row[key] ?? '').trim().toLowerCase() === 'total') return true;
  }
  const color = String(row['Color'] ?? '').trim();
  return !color;
};

const exportToExcel = (rows: any[], filename: string) => {
  const exportData = rows.map(r => ({
    'Sucursal':  r.Sucursal,
    'Modelo':    r.Modelo,
    'Versión':   r.Versión,
    'VIN':       r.VIN,
    'Color':     r.Color,
    'Categoría': r.Categoría,
    'Días':      r.Días,
    'Costo':     r.Costo,
  }));
  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// Componente multi-checkbox para categorías
const FilterMultiCat = ({
  selected, onChange
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) => {
  const toggle = (cat: string) => {
    if (selected.includes(cat)) onChange(selected.filter(c => c !== cat));
    else onChange([...selected, cat]);
  };
  const colorMap: Record<string, string> = {
    'FINANCIADO':  'bg-blue-100 text-blue-800 border-blue-300',
    'PROPIO':      'bg-amber-100 text-amber-800 border-amber-300',
    'DEMO':        'bg-purple-100 text-purple-800 border-purple-300',
    'DEMO PROPIO': 'bg-pink-100 text-pink-800 border-pink-300',
  };
  return (
    <div className="flex flex-wrap gap-2">
      {CATS_OPCIONES.map(cat => {
        const active = selected.includes(cat);
        return (
          <button
            key={cat}
            onClick={() => toggle(cat)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black border uppercase tracking-widest transition-all ${
              active
                ? colorMap[cat]
                : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
};

export default function ClinicaInventarioFinal() {
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  // Multi-agencia
  const [selectedAgencias, setSelectedAgencias] = useState<string[]>([]);
  // Filtro por Año
  const [selectedAnios, setSelectedAnios] = useState<string[]>([]);
  // Multi-categoría Muro
  const [catsMuro, setCatsMuro] = useState<string[]>([]);
  // Multi-categoría Tabla
  const [catsTabla, setCatsTabla] = useState<string[]>([]);

  const cleanNumber = (val: any) => {
    if (!val) return 0;
    const n = parseFloat(String(val).replace(/,/g, '').replace(/\$/g, '').replace(/\s/g, ''));
    return isNaN(n) ? 0 : n;
  };

  useEffect(() => {
    const cargarDesdeSQL = async () => {
      try {
        const response = await fetch('/api/inventario');
        const sqlData = await response.json();

        const mapeado = sqlData.map((row: any, idx: number) => {
          const idRaw = (row.CpnyID || '').toString().trim().toUpperCase();
          const info = CPNY_MAP[idRaw];
          const ubiText = (row.Ubicacion || '').toString().toUpperCase();
          const qtyAD = Number(row.QtyAD) || 0;
          const qtyAF = Number(row.QtyAF) || 0;
          const qtyAP = Number(row.QtyAP) || 0;
          const qtyDP = Number(row.QtyDP) || 0;

          // 1. DETERMINAR CATEGORÍA PRIMERO con las columnas de cantidad
          let categoria = 'FINANCIADO';
          if (qtyDP > 0 || ubiText.includes('DEMO PROPIO')) categoria = 'DEMO PROPIO';
          else if (qtyAD > 0 || ubiText.includes('DEMO')) categoria = 'DEMO';
          else if (qtyAP > 0) categoria = 'PROPIO';
          else if (qtyAF > 0) categoria = 'FINANCIADO';

          // 2. ASIGNAR COSTO SEGÚN LA COLUMNA DE SQL CORRECTA
          let costoFinal = 0;
          if (categoria === 'DEMO')         costoFinal = Number(row.CostAD) || 0;
          else if (categoria === 'FINANCIADO')   costoFinal = Number(row.CostAF) || 0;
          else if (categoria === 'PROPIO')       costoFinal = Number(row.CostAP) || 0;
          else if (categoria === 'DEMO PROPIO')  costoFinal = Number(row.CostDP) || 0;

          return {
            ...row,
            id: `sql-${idx}`,
            Anio: row.Anio, // <--- Guardamos el año modelo
            Sucursal: info ? info.nombre : `ID: ${idRaw}`,
            Sector: info ? info.sector : 'DESCONOCIDO',
            VIN: row.VIN || 'N/A',
            Categoría: categoria,
            Costo: Number(costoFinal) || 0,
            Versión: row.Version,
            Días: row.Antiguedad,
            mFin: (ubiText.includes('DEMO')) ? 0 : (row.QtyAF === 0 ? 0 : (row.Precio || 0)),
            mProp: (ubiText.includes('DEMO')) ? 0 : (row.QtyAF === 0 ? (row.Precio || 0) : 0),
            mDem: (ubiText.includes('DEMO') && !ubiText.includes('PROPIO')) ? (row.Precio || 0) : 0,
            mDemProp: ubiText.includes('DEMO PROPIO') ? (row.Precio || 0) : 0
          };
        })
        .filter((row: any) => row.BrandDescr !== 'OTRO');

        setData(mapeado);
        setIsLoaded(true);
      } catch (error) {
        console.error("Error al conectar con SQL Daytona:", error);
      }
    };

    cargarDesdeSQL();
  }, []);

  // 1. Agrupamos las agencias que realmente tienen inventario
  const agenciasEnInventario = useMemo(() => {
    const únicas = [...new Set(data.map(d => d.Sucursal))];
    return {
      autos: únicas
        .filter(nombre => Object.values(CPNY_MAP).some(v => v.nombre === nombre && v.sector === 'AUTOS'))
        .sort((a, b) => a.localeCompare(b)),
      motos: únicas
        .filter(nombre => Object.values(CPNY_MAP).some(v => v.nombre === nombre && v.sector === 'MOTOS'))
        .sort((a, b) => a.localeCompare(b))
    };
  }, [data]);

  const toggleAgencia = (ag: string) => {
    setSelectedAgencias(prev =>
      prev.includes(ag) ? prev.filter(a => a !== ag) : [...prev, ag]
    );
  };

  const aniosUnicos = useMemo(() => {
    return [...new Set(data.map(d => String(d.Anio || '')))]
      .filter(a => a && a !== 'undefined' && a !== 'null')
      .sort((a, b) => Number(b) - Number(a));
  }, [data]);

  const toggleAnio = (anio: string) => {
    setSelectedAnios(prev =>
      prev.includes(anio) ? prev.filter(a => a !== anio) : [...prev, anio]
    );
  };

  const dashboardData = useMemo(() => {
    let current = data;
    if (selectedAgencias.length > 0) {
      current = current.filter(d => selectedAgencias.includes(d.Sucursal));
    }
    if (selectedAnios.length > 0) {
      current = current.filter(d => selectedAnios.includes(String(d.Anio || '')));
    }
    return current;
  }, [data, selectedAgencias, selectedAnios]);

  const stats = useMemo(() => {
    let totInversion = 0, totPropio = 0, totFin = 0, totDem = 0, totDemProp = 0;
    dashboardData.forEach(d => {
      totInversion += Number(d.Costo) || 0;
      if (d.Categoría === 'PROPIO') totPropio += Number(d.Costo) || 0;
      if (d.Categoría === 'FINANCIADO') totFin += Number(d.Costo) || 0;
      if (d.Categoría === 'DEMO') totDem += Number(d.Costo) || 0;
      if (d.Categoría === 'DEMO PROPIO') totDemProp += Number(d.Costo) || 0;
    });

    const montoMuro = dashboardData
      .filter(d => d.Días > 90)
      .reduce((acc, item) => acc + (Number(item.Costo) || 0), 0);

    const unidadesMuro = dashboardData.filter(d => d.Días > 90).length;

    return {
      unidades: new Intl.NumberFormat('en-US').format(dashboardData.length),
      inversion: totInversion,
      capitalPropio: totPropio + totDemProp,
      financiado: totFin,
      propio: totPropio,
      demo: totDem,
      demoPropio: totDemProp,
      montoMuro,
      unidadesMuro
    };
  }, [dashboardData]);

  const agingData = useMemo(() => {
    let a0 = 0, a1 = 0, a2 = 0, a3 = 0;
    dashboardData.forEach(d => {
      if (d.Días <= 30) a0++;
      else if (d.Días <= 60) a1++;
      else if (d.Días <= 90) a2++;
      else a3++;
    });
    return [
      { name: '0-30 días',  value: a0, fill: '#22c55e' },
      { name: '31-60 días', value: a1, fill: '#eab308' },
      { name: '61-90 días', value: a2, fill: '#f97316' },
      { name: '+90 días',   value: a3, fill: '#ef4444' },
    ];
  }, [dashboardData]);

  const capitalData = useMemo(() => ([
    { name: 'Financiado',  value: stats.financiado,  fill: '#3b82f6' },
    { name: 'Propio',      value: stats.propio,       fill: '#f59e0b' },
    { name: 'Demo',        value: stats.demo,         fill: '#8b5cf6' },
    { name: 'Demo Propio', value: stats.demoPropio,   fill: '#ec4899' },
  ]), [stats]);

  // RANKING TOP 10 modelos con más unidades en +90 días
  const rankingModelos = useMemo(() => {
    const conteo: Record<string, number> = {};
    dashboardData.filter(d => d.Días > 90).forEach(d => {
      const key = d.Modelo || 'Sin modelo';
      conteo[key] = (conteo[key] || 0) + 1;
    });
    return Object.entries(conteo)
      .map(([modelo, uds]) => ({ modelo, uds }))
      .sort((a, b) => b.uds - a.uds)
      .slice(0, 10);
  }, [dashboardData]);

  // ALERTAS POR SUCURSAL
  const alertasSucursal = useMemo(() => {
    const mapa: Record<string, { rojas: number; costo: number }> = {};
    dashboardData.filter(d => d.Días > 90).forEach(d => {
      if (!mapa[d.Sucursal]) mapa[d.Sucursal] = { rojas: 0, costo: 0 };
      mapa[d.Sucursal].rojas++;
      mapa[d.Sucursal].costo += d.Costo;
    });
    return Object.entries(mapa)
      .map(([suc, v]) => ({ sucursal: suc, ...v }))
      .sort((a, b) => b.rojas - a.rojas);
  }, [dashboardData]);

  // MURO: > 90 días, multi-categoría
  const muroLamentos = useMemo(() => {
    let base = dashboardData.filter(d => d.Días > 90);
    if (catsMuro.length > 0) base = base.filter(d => catsMuro.includes(d.Categoría));
    return base.sort((a, b) => b.Días - a.Días);
  }, [dashboardData, catsMuro]);

  // TABLA: antigüedad desc, multi-categoría + búsqueda
  const tableData = useMemo(() => {
    let current = [...dashboardData].sort((a, b) => b.Días - a.Días);
    if (catsTabla.length > 0) current = current.filter(d => catsTabla.includes(d.Categoría));
    if (!searchTerm) return current;
    const lower = searchTerm.toLowerCase();
    return current.filter(d =>
      d.Modelo?.toLowerCase().includes(lower)    ||
      d.Versión?.toLowerCase().includes(lower)   ||
      d.Color?.toLowerCase().includes(lower)     ||
      d.Sucursal?.toLowerCase().includes(lower)  ||
      d.Categoría?.toLowerCase().includes(lower)
    );
  }, [dashboardData, searchTerm, catsTabla]);

  const formatCurrencyM = (v: number) =>
    v >= 1000000 ? `$${(v / 1000000).toFixed(2)}M`
    : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

  const handleMailto = () => {
    const fecha = new Date().toLocaleDateString('es-MX');
    const agSel = selectedAgencias.length > 0 ? selectedAgencias.join(', ') : 'Todas';
    const rojas = dashboardData.filter(d => d.Días > 90).length;
    const alertasTexto = alertasSucursal
      .map(a => `  • ${a.sucursal}: ${a.rojas} unidades en rojo`)
      .join('\n');
    const rankingTexto = rankingModelos
      .map((r, i) => `  ${i + 1}. ${r.modelo}: ${r.uds} unidades`)
      .join('\n');
    const body = encodeURIComponent(
`Clínica de Inventario — ${fecha}
Sucursales: ${agSel}

RESUMEN GENERAL
• Total unidades: ${stats.unidades}
• Inversión total: ${formatCurrencyM(stats.inversion)}
• Capital propio: ${formatCurrencyM(stats.capitalPropio)}
• Unidades en rojo (+90 días): ${rojas}

ALERTAS POR SUCURSAL (+90 días)
${alertasTexto || '  Sin alertas'}

TOP 10 MODELOS MÁS ESTANCADOS (+90 días)
${rankingTexto || '  Sin datos'}
`
    );
    window.open(`mailto:?subject=Clínica de Inventario ${fecha}&body=${body}`, '_blank');
  };

  const CustomTooltipBar = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const val = payload[0].value;
    const color = payload[0].payload.fill;
    const display = String(label).includes('días') ? `${val} uds` : formatCurrency(val);
    return (
      <div className="bg-white text-slate-800 p-3 rounded-xl shadow-lg border border-slate-100 text-sm z-50">
        <p className="font-bold text-slate-500 mb-1">{label}</p>
        <p className="text-xl font-black" style={{ color }}>{display}</p>
      </div>
    );
  };

  return (
    <div className="min-h-full bg-slate-50 text-slate-800 p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ENCABEZADO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Car className="text-blue-600" size={32} />
              Clínica de Inventario
            </h1>
            <p className="text-slate-500 text-sm font-semibold mt-1">Precisión Financiera de Unidades Reales</p>
          </div>
          <div className="flex items-center gap-3">
            {data.length > 0 && (
              <button
                onClick={handleMailto}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-xl transition-all shadow-sm"
              >
                <Mail size={16} /> Enviar resumen
              </button>
            )}
          </div>
        </div>

        {/* FILTRO MULTI-AGENCIA */}
        {data.length > 0 && (agenciasEnInventario.autos.length + agenciasEnInventario.motos.length) > 1 && (
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200/60">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={16} className="text-slate-400" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                Filtros Globales
                {(selectedAgencias.length > 0 || selectedAnios.length > 0) && (
                  <span className="ml-2 text-blue-600">({selectedAgencias.length + selectedAnios.length} activos)</span>
                )}
              </span>
              {(selectedAgencias.length > 0 || selectedAnios.length > 0) && (
                <button
                  onClick={() => {
                    setSelectedAgencias([]);
                    setSelectedAnios([]);
                  }}
                  className="ml-auto text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>
            <div className="space-y-6">
              {aniosUnicos.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-widest">Año Modelo</h4>
                  <div className="flex flex-wrap gap-2">
                    {aniosUnicos.map(anio => {
                      const active = selectedAnios.includes(anio);
                      return (
                        <button
                          key={anio}
                          onClick={() => toggleAnio(anio)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                            active
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          {anio}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-widest">Sucursales Autos</h4>
                <div className="flex flex-wrap gap-2">
                  {agenciasEnInventario.autos.map(ag => {
                    const active = selectedAgencias.includes(ag);
                    return (
                      <button
                        key={ag}
                        onClick={() => toggleAgencia(ag)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                          active
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        {ag}
                        <span className="ml-1 opacity-50">{data.filter(d => d.Sucursal === ag).length}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-widest">Agencias de Motos</h4>
                <div className="flex flex-wrap gap-2">
                  {agenciasEnInventario.motos.map(ag => {
                    const active = selectedAgencias.includes(ag);
                    return (
                      <button
                        key={ag}
                        onClick={() => toggleAgencia(ag)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                          active
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        {ag}
                        <span className="ml-1 opacity-50">{data.filter(d => d.Sucursal === ag).length}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {data.length > 0 && (
          <>
            {/* 1. CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Database size={24} /></div>
                  <h3 className="font-bold uppercase tracking-widest text-xs text-slate-500">Unidades Totales</h3>
                </div>
                <p className="text-4xl font-black text-slate-900 tracking-tight">{stats.unidades}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><BadgeDollarSign size={24} /></div>
                  <h3 className="font-bold uppercase tracking-widest text-xs text-slate-500">Inversión Total</h3>
                </div>
                <p className="text-4xl font-black text-emerald-600 tracking-tight">{formatCurrencyM(stats.inversion)}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 text-amber-50 opacity-50 group-hover:scale-110 transition-transform duration-500">
                  <TrendingUp size={120} strokeWidth={1} />
                </div>
                <div className="flex items-center gap-3 mb-4 z-10 relative">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100"><TrendingUp size={24} /></div>
                  <h3 className="font-bold uppercase tracking-widest text-xs text-amber-600">Capital Propio</h3>
                </div>
                <p className="text-4xl font-black text-amber-600 tracking-tight z-10 relative">{formatCurrencyM(stats.capitalPropio)}</p>
                <div className="text-[10px] text-amber-800/60 mt-2 font-black z-10 relative uppercase tracking-widest">(Propios + Demo Propios)</div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-red-50 rounded-lg text-red-600">
                    <AlertTriangle size={20} />
                  </div>
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-tighter">Más de 90 Días</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-800">
                  ${(stats.montoMuro / 1000000).toFixed(2)}M
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  En {stats.unidadesMuro} unidades estancadas
                </p>
              </div>
            </div>

            {/* 2. GRÁFICAS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60">
                <div className="flex items-center gap-2 mb-6">
                  <Clock className="text-slate-400" size={20} />
                  <h3 className="text-slate-900 font-black text-lg">Distribución por Antigüedad</h3>
                </div>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agingData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltipBar />} />
                      <Bar dataKey="value" radius={[6,6,6,6]}>
                        {agingData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 className="text-slate-400" size={20} />
                  <h3 className="text-slate-900 font-black text-lg">Inversión por Capital</h3>
                </div>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={capitalData} margin={{ top: 10, right: 0, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} fontWeight={700} tickLine={false} axisLine={false}
                        tickFormatter={v => v >= 1000000 ? `$${(v/1000000).toFixed(0)}M` : `$${v/1000}k`} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltipBar />} />
                      <Bar dataKey="value" radius={[6,6,6,6]}>
                        {capitalData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 3. ALERTAS POR SUCURSAL + RANKING */}
            {alertasSucursal.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Alertas */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="p-2 bg-orange-50 text-orange-500 rounded-xl"><Bell size={20} /></div>
                    <h3 className="text-slate-900 font-black text-lg">Alertas por Sucursal</h3>
                  </div>
                  <div className="space-y-3">
                    {alertasSucursal.map((a, i) => {
                      const pct = Math.round((a.rojas / dashboardData.filter(d => d.Días > 90).length) * 100);
                      return (
                        <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex-shrink-0 w-8 h-8 bg-red-100 text-red-600 rounded-xl flex items-center justify-center text-xs font-black">
                            {a.rojas}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-slate-800 text-sm truncate">{a.sucursal}</p>
                            <p className="text-xs text-slate-500 font-semibold">{formatCurrencyM(a.costo)} inmovilizado · {pct}% del total rojo</p>
                          </div>
                          <span className="text-[10px] font-black px-2 py-1 bg-red-100 text-red-700 rounded-lg border border-red-200 whitespace-nowrap">
                            +90 días 🔴
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Ranking Top 10 */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="p-2 bg-yellow-50 text-yellow-500 rounded-xl"><Trophy size={20} /></div>
                    <h3 className="text-slate-900 font-black text-lg">Top 10 Modelos Estancados</h3>
                    <span className="text-xs text-slate-400 font-semibold ml-1">+90 días</span>
                  </div>
                  {rankingModelos.length === 0 ? (
                    <p className="text-slate-400 font-bold text-sm text-center py-8">Sin modelos en +90 días 🎉</p>
                  ) : (
                    <div className="space-y-2.5">
                      {rankingModelos.map((r, i) => {
                        const max = rankingModelos[0].uds;
                        const pct = Math.round((r.uds / max) * 100);
                        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-sm w-7 text-center flex-shrink-0">{medal}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-black text-slate-800 truncate">{r.modelo}</span>
                                <span className="text-xs font-black text-red-600 ml-2 flex-shrink-0">{r.uds} uds</span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-red-400 rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. MURO DE LOS LAMENTOS */}
            {dashboardData.some(d => d.Días > 90) && (
              <div className="bg-white p-6 rounded-3xl border-2 border-red-500 shadow-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-400" />
                <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Skull className="text-red-500" /> MURO DE LOS LAMENTOS
                  </h2>
                  <p className="text-sm text-slate-500">
                    Unidades con +90 días • Inversión estancada:
                    <span className="font-bold text-red-600 ml-1">
                      {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(stats.montoMuro)}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => exportToExcel(muroLamentos, 'muro-lamentos')}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition-all shadow-sm uppercase tracking-widest"
                >
                  <FileSpreadsheet size={16} /> EXCEL
                </button>
              </div>
                {/* Filtro multi-cat muro */}
                <div className="mb-4 flex items-center gap-3 flex-wrap">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrar:</span>
                  <FilterMultiCat selected={catsMuro} onChange={setCatsMuro} />
                  {catsMuro.length > 0 && (
                    <button onClick={() => setCatsMuro([])} className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors">
                      Limpiar
                    </button>
                  )}
                </div>
                {muroLamentos.length === 0 ? (
                  <p className="text-center text-slate-400 font-bold py-8">No hay unidades con esta categoría en el Muro.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 font-black border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">VIN</th>
                          <th className="px-4 py-3">SUCURSAL</th>
                          <th className="px-4 py-3">MODELO</th>
                          <th className="px-4 py-3">COSTO</th>
                          <th className="px-4 py-3">VERSIÓN</th>
                          <th className="px-4 py-3">COLOR</th>
                          <th className="px-4 py-3 text-center">DÍAS</th>
                          <th className="px-4 py-3 text-center">CATEGORÍA</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {muroLamentos.map((row, idx) => {
                          const aging = getAgingColor(row.Días);
                          return (
                            <tr key={idx} className={`transition-colors ${aging.bg} hover:brightness-95`}>
                              <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{row.VIN || '-'}</td>
                              <td className="px-4 py-3 font-bold text-slate-700 whitespace-nowrap">{row.Sucursal}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-black text-slate-900">{row.Modelo || '-'}</span>
                                  {row.Anio && (
                                    <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded w-fit">
                                      M.Y. {row.Anio}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 font-bold text-right">
                                {new Intl.NumberFormat('es-MX', { 
                                  style: 'currency', 
                                  currency: 'MXN',
                                  maximumFractionDigits: 0
                                }).format(row.Costo)}
                              </td>
                              <td className="px-4 py-3 text-xs font-medium text-slate-500 max-w-[200px] truncate" title={row.Versión}>{row.Versión || '-'}</td>
                              <td className="px-4 py-3 text-slate-600 font-medium">{row.Color}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={row.Días > 90 ? 'text-red-600 font-bold' : ''}>{row.Días} días</span>
                              </td>
                              <td className="px-4 py-3 text-center">{getCategoryBadge(row.Categoría)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 5. INVENTARIO EXPANDIDO */}
            <div className="bg-white overflow-hidden rounded-3xl shadow-sm border border-slate-200/60 flex flex-col min-h-[500px]">
              <div className="p-6 border-b border-slate-100 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="text-slate-900 font-black text-xl flex items-center gap-2">
                    <Database className="text-blue-500" size={24} />
                    Inventario Expandido ({tableData.length})
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        placeholder="Buscar sucursal, modelo, versión..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-11 pr-5 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 transition-all shadow-sm"
                      />
                    </div>
                    <button
                      onClick={() => exportToExcel(tableData, 'inventario-expandido')}
                      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-sm uppercase tracking-widest whitespace-nowrap"
                    >
                      <Download size={14} /> Excel
                    </button>
                  </div>
                </div>
                {/* Filtro multi-cat tabla */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrar:</span>
                  <FilterMultiCat selected={catsTabla} onChange={setCatsTabla} />
                  {catsTabla.length > 0 && (
                    <button onClick={() => setCatsTabla([])} className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors">
                      Limpiar
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/80 text-[11px] uppercase text-slate-500 font-black border-b border-slate-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4">VIN</th>
                      <th className="px-6 py-4">SUCURSAL</th>
                      <th className="px-6 py-4">MODELO / VERSIÓN</th>
                      <th className="px-6 py-4">COLOR</th>
                      <th className="px-6 py-4 text-center">CATEGORÍA</th>
                      <th className="px-6 py-4 text-center">ANTIGÜEDAD ↓</th>
                      <th className="px-6 py-4 text-right">COSTO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {tableData.slice(0, 150).map((row, idx) => {
                      const aging = getAgingColor(row.Días);
                      return (
                        <tr key={idx} className={`transition-colors ${aging.bg} hover:brightness-95`}>
                          <td className="px-6 py-4 font-mono text-[10px] text-slate-500 whitespace-nowrap">{row.VIN || '-'}</td>
                          <td className="px-6 py-4 text-slate-700 font-bold whitespace-nowrap">{row.Sucursal}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-black text-slate-900">{row.Modelo || '-'}</span>
                              {row.Anio && (
                                <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded w-fit">
                                  M.Y. {row.Anio}
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-medium text-slate-500 max-w-[200px] truncate" title={row.Versión}>{row.Versión || '-'}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-medium">{row.Color}</td>
                          <td className="px-6 py-4 text-center">{getCategoryBadge(row.Categoría)}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`font-black px-2 py-1 rounded-md border text-xs ${aging.badge}`}>{row.Días} días</span>
                          </td>
                          <td className="px-6 py-4 text-right font-black text-slate-900 whitespace-nowrap">
                            {formatCurrency(row.Costo)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {tableData.length > 150 && (
                <div className="p-4 text-center text-xs font-bold text-slate-500 bg-slate-50 border-t border-slate-100">
                  Mostrando 150 de {tableData.length}. Filtra por categoría o usa el buscador para ver más.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
