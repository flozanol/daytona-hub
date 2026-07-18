'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, Database, TrendingUp, Filter, Clock,
  BadgeDollarSign, Car, BarChart3, ShieldAlert,
  Download, Calendar, Skull, FileSpreadsheet, AlertTriangle, Coins,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import * as XLSX from 'xlsx';
import { TASA_ANUAL, CPNY_MAP, getCpnyNombre } from '../../lib/constants';

const fmtMoney = (v: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);

export default function ClinicaSeminuevosSQL() {
  const [data, setData]                     = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading]               = useState(true);
  const [searchTerm, setSearchTerm]         = useState('');
  const [selectedAgencias, setSelectedAgencias] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/seminuevos')
      .then(res => res.json())
      .then((sqlData: Record<string, unknown>[]) => {
        if (Array.isArray(sqlData)) {
          const mapeado = sqlData.map(row => {
            const costo = Number(row['Costo']) || 0;
            const dias  = Number(row['Antiguedad']) || 0;
            const costoFinanciero = (costo * TASA_ANUAL / 360) * dias;
            return {
              ...row,
              Sucursal: getCpnyNombre(String(row['CpnyID'] ?? '')),
              Costo:  costo,
              Días:   dias,
              CostoFinanciero: costoFinanciero,
              InversionTotal: costo + costoFinanciero,
              Margen: (Number(row['PrecioVenta']) || 0) - costo,
            };
          });
          setData(mapeado);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sucursalesOrdenadas = useMemo(() =>
    Array.from(new Set(Object.values(CPNY_MAP).map(v => v.nombre))).sort(),
    []
  );

  const filteredData = useMemo(() => {
    let curr = [...data];
    if (selectedAgencias.length > 0) curr = curr.filter(d => selectedAgencias.includes(d['Sucursal'] as string));
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      curr = curr.filter(d =>
        String(d['Marca'] ?? '').toLowerCase().includes(s) ||
        String(d['Modelo'] ?? '').toLowerCase().includes(s) ||
        String(d['VIN'] ?? '').toLowerCase().includes(s)
      );
    }
    return curr.sort((a, b) => (b['Días'] as number) - (a['Días'] as number));
  }, [data, selectedAgencias, searchTerm]);

  const stats = useMemo(() => {
    const totalCosto     = filteredData.reduce((s, d) => s + (d['Costo'] as number), 0);
    const costHueso      = filteredData.filter(d => (d['Días'] as number) > 90).reduce((s, d) => s + (d['Costo'] as number), 0);
    const totalFinanciero= filteredData.reduce((s, d) => s + (d['CostoFinanciero'] as number), 0);
    return {
      unidades:     filteredData.length,
      costo:        totalCosto,
      riesgo:       costHueso,
      financiero:   totalFinanciero,
      diasPromedio: Math.round(filteredData.reduce((s, d) => s + (d['Días'] as number), 0) / (filteredData.length || 1)),
    };
  }, [filteredData]);

  const donutData = useMemo(() => [
    { name: 'Sano (0-30)',        value: filteredData.filter(d => (d['Días'] as number) <= 30).length,                                       color: '#10b981' },
    { name: 'Precaución (31-60)', value: filteredData.filter(d => (d['Días'] as number) > 30 && (d['Días'] as number) <= 60).length,         color: '#f59e0b' },
    { name: 'Alerta (61-90)',     value: filteredData.filter(d => (d['Días'] as number) > 60 && (d['Días'] as number) <= 90).length,         color: '#f97316' },
    { name: 'Tóxico (>90)',       value: filteredData.filter(d => (d['Días'] as number) > 90).length,                                        color: '#fd0019' },
  ], [filteredData]);

  const marcasToxicas = useMemo(() => {
    const counts: Record<string, { uds: number; monto: number }> = {};
    filteredData.filter(d => (d['Días'] as number) > 90).forEach(d => {
      const key = String(d['Marca'] ?? 'Sin marca');
      if (!counts[key]) counts[key] = { uds: 0, monto: 0 };
      counts[key].uds++;
      counts[key].monto += d['Costo'] as number;
    });
    return Object.entries(counts)
      .map(([name, val]) => ({ name, ...val }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5);
  }, [filteredData]);

  const radiografia = useMemo(() => {
    const sucs: Record<string, { name: string; total: number; sano: number; hueso: number; montoHueso: number }> = {};
    filteredData.forEach(d => {
      const suc = d['Sucursal'] as string;
      if (!sucs[suc]) sucs[suc] = { name: suc, total: 0, sano: 0, hueso: 0, montoHueso: 0 };
      sucs[suc].total++;
      if ((d['Días'] as number) <= 30) sucs[suc].sano++;
      if ((d['Días'] as number) > 90) { sucs[suc].hueso++; sucs[suc].montoHueso += d['Costo'] as number; }
    });
    return Object.values(sucs).sort((a, b) => (b.hueso / b.total) - (a.hueso / a.total));
  }, [filteredData]);

  const getAgeColor = (dias: number) => {
    if (dias <= 30) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (dias <= 60) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (dias <= 90) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  const exportToExcel = (rows: Record<string, unknown>[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-gray-400">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366] mb-4" />
        <p className="text-sm font-bold tracking-widest uppercase">Sincronizando auditoría...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 p-6 md:p-8 font-sans space-y-8">

      {/* HEADER + FILTROS */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Car className="text-[#fd0019]" size={32} /> Clínica de Seminuevos
          </h1>
          <div className="flex flex-wrap gap-2 justify-center">
            {sucursalesOrdenadas.map(suc => (
              <button
                key={suc}
                onClick={() => setSelectedAgencias(p => p.includes(suc) ? p.filter(s => s !== suc) : [...p, suc])}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all ${
                  selectedAgencias.includes(suc)
                    ? 'bg-slate-900 text-white border-black shadow-md'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-400'
                }`}
              >
                {suc}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <KPICard title="Unidades"       value={stats.unidades}               icon={<Car />}         color="text-slate-800" />
          <KPICard title="Inversión"       value={fmtMoney(stats.costo)}       icon={<Database />}    color="text-[#003366]" />
          <KPICard title="Capital Riesgo"  value={fmtMoney(stats.riesgo)}      icon={<AlertTriangle />} color="text-[#fd0019]" subtitle="+90 Días" />
          <KPICard title="Costo Fin."      value={fmtMoney(stats.financiero)}   icon={<Coins />}       color="text-amber-600" subtitle={`Tasa: ${(TASA_ANUAL * 100).toFixed(2)}%`} />
          <KPICard title="Promedio Días"   value={`${stats.diasPromedio} d`}   icon={<Calendar />}    color="text-slate-800" />
        </div>
      </div>

      {/* GRÁFICAS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name}
                </span>
                <span>{d.value} ud.</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 lg:col-span-1">
          <h2 className="text-xs font-black uppercase mb-2 border-b pb-2 text-[#fd0019]">Top Marcas Tóxicas</h2>
          <p className="text-[9px] text-gray-400 font-bold uppercase mb-4 tracking-tighter">Congelado (+90 días)</p>
          <div className="space-y-4">
            {marcasToxicas.map(m => (
              <div key={m.name}>
                <div className="flex justify-between text-[11px] font-black mb-1">
                  <span>{m.name} <span className="text-slate-400 font-normal">({m.uds} ud)</span></span>
                  <span className="text-[#fd0019]">{fmtMoney(m.monto)}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#fd0019] h-full" style={{ width: `${(m.monto / (marcasToxicas[0]?.monto || 1)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 lg:col-span-2 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-xs font-black uppercase tracking-widest">Radiografía por Sucursal</h2>
            <span className="text-[9px] font-black text-slate-400 uppercase">Inventario &gt;90 Días</span>
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-[10px]">
              <thead className="bg-slate-900 text-white sticky top-0 font-black uppercase">
                <tr>
                  {['Sucursal','Unidades','Sano','Hueso','Cost. Congelado'].map(h => (
                    <th key={h} className="p-3">{h}</th>
                  ))}
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

      {/* MURO DE LOS LAMENTOS */}
      <div className="bg-white rounded-3xl shadow-md border-2 border-red-500 overflow-hidden">
        <div className="bg-black p-4 flex justify-between items-center">
          <h2 className="text-white font-black text-sm uppercase flex items-center gap-2">
            <Skull className="text-red-500" size={18} /> Muro de los Lamentos (Pérdida Financiera)
          </h2>
          <button
            onClick={() => exportToExcel(filteredData.filter(d => (d['Días'] as number) > 90), 'Huesos_Financiero')}
            className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-2"
          >
            <FileSpreadsheet size={14} /> Exportar Huesos
          </button>
        </div>
        <div className="overflow-auto max-h-80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 font-black uppercase text-[10px] text-slate-500 border-b">
              <tr>
                {['Días','Vehículo','Sucursal','Costo Auto','Costo Financiero','Inversión Total'].map(h => (
                  <th key={h} className="p-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.filter(d => (d['Días'] as number) > 90).map((auto, i) => (
                <tr key={i} className="hover:bg-red-50 transition-colors font-bold text-[11px]">
                  <td className="p-3 text-center"><span className="bg-red-600 text-white px-2 py-1 rounded-md">{String(auto['Días'])}</span></td>
                  <td className="p-3 text-slate-900">{String(auto['Anio'])} {String(auto['Marca'])} {String(auto['Modelo'])}</td>
                  <td className="p-3 uppercase text-slate-500">{String(auto['Sucursal'])}</td>
                  <td className="p-3 text-right text-slate-400">{fmtMoney(auto['Costo'] as number)}</td>
                  <td className="p-3 text-right text-amber-600">{fmtMoney(auto['CostoFinanciero'] as number)}</td>
                  <td className="p-3 text-right text-red-600 font-black">{fmtMoney(auto['InversionTotal'] as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* INVENTARIO COMPLETO */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-slate-900 font-black text-lg">Inventario Total</h2>
          <div className="flex gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="Buscar modelo, VIN..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-slate-50 pl-4 pr-4 py-2 rounded-xl text-xs font-bold outline-none border border-slate-200 shadow-inner"
            />
            <button
              onClick={() => exportToExcel(filteredData, 'Inventario_Completo')}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase shadow-md"
            >
              Exportar Todo
            </button>
          </div>
        </div>
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 sticky top-0 font-black uppercase text-[10px] text-slate-500 border-b z-10">
              <tr>
                {['Sucursal','Vehículo','VIN','Días','Costo','Costo Fin.','Inversión Total'].map(h => (
                  <th key={h} className="p-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 font-medium transition-colors">
                  <td className="p-3 font-bold text-slate-600">{String(row['Sucursal'])}</td>
                  <td className="p-3 font-black text-slate-900">{String(row['Anio'])} {String(row['Marca'])} {String(row['Modelo'])}</td>
                  <td className="p-3 font-mono text-[9px] text-slate-400">{String(row['VIN'] ?? '')}</td>
                  <td className="p-3 text-center">
                    <span className={`px-3 py-1 rounded-full border font-black text-[10px] ${getAgeColor(row['Días'] as number)}`}>
                      {String(row['Días'])} días
                    </span>
                  </td>
                  <td className="p-3 text-right text-slate-500">{fmtMoney(row['Costo'] as number)}</td>
                  <td className="p-3 text-right text-amber-600">{fmtMoney(row['CostoFinanciero'] as number)}</td>
                  <td className="p-3 text-right font-black text-slate-900 bg-slate-50/50">{fmtMoney(row['InversionTotal'] as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, color, subtitle }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 relative overflow-hidden group">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <h3 className={`text-xl font-black ${color} tracking-tighter`}>{value}</h3>
      {subtitle && <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase">{subtitle}</p>}
      <div className="absolute -bottom-2 -right-2 opacity-5 text-5xl group-hover:scale-110 transition-transform">{icon}</div>
    </div>
  );
}
