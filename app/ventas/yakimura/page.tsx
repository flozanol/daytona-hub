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
}

interface ColorRow {
  Color: string;
  p3: number;
  p2: number;
  p1: number;
  ventas3m: number;
  promedio: number;
}

interface VersionGroup {
  key: string;
  SubMarca: string;
  Version: string;
  Anio: number;
  p3: number;
  p2: number;
  p1: number;
  totalVentas: number;
  promedio: number;
  colores: ColorRow[];
}

const badge = (n: number) => {
  if (n > 0)
    return (
      <span style={{ background: '#15803d', color: '#fff', borderRadius: 6, padding: '2px 10px', fontWeight: 700, fontSize: 12 }}>
        +{n} COMPRAR
      </span>
    );
  if (n < 0)
    return (
      <span style={{ background: '#b91c1c', color: '#fff', borderRadius: 6, padding: '2px 10px', fontWeight: 700, fontSize: 12 }}>
        {n} SOBRA
      </span>
    );
  return (
    <span style={{ background: '#6b7280', color: '#fff', borderRadius: 6, padding: '2px 10px', fontSize: 12 }}>
      ✔ OK
    </span>
  );
};

export default function YakimuraPage() {
  const [data, setData] = useState<VentaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mesOptimo, setMesOptimo] = useState(1.5);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [soloComprar, setSoloComprar] = useState(false);

  useEffect(() => {
    fetch('/api/yakimura')
      .then((r) => r.json())
      .then((d) => {
        setData(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => {
        setError('No se pudo conectar al servidor SQL');
        setLoading(false);
      });
  }, []);

  const grupos = useMemo<VersionGroup[]>(() => {
    const map: Record<string, VersionGroup> = {};
    data.forEach((row) => {
      const key = `${row.SubMarca}||${row.Version}||${row.Anio}`;
      if (!map[key]) {
        map[key] = {
          key,
          SubMarca: row.SubMarca,
          Version: row.Version,
          Anio: row.Anio,
          p3: 0, p2: 0, p1: 0,
          totalVentas: 0,
          promedio: 0,
          colores: [],
        };
      }
      const ventas3m = (row.Periodo_Menos_3 ?? 0) + (row.Periodo_Menos_2 ?? 0) + (row.Periodo_Menos_1 ?? 0);
      map[key].p3 += row.Periodo_Menos_3 ?? 0;
      map[key].p2 += row.Periodo_Menos_2 ?? 0;
      map[key].p1 += row.Periodo_Menos_1 ?? 0;
      map[key].totalVentas += ventas3m;
      map[key].colores.push({
        Color: row.Color,
        p3: row.Periodo_Menos_3 ?? 0,
        p2: row.Periodo_Menos_2 ?? 0,
        p1: row.Periodo_Menos_1 ?? 0,
        ventas3m,
        promedio: ventas3m / 3,
      });
    });
    return Object.values(map).map((g) => ({ ...g, promedio: g.totalVentas / 3 }));
  }, [data]);

  const calcComprar = (promedio: number) => Math.ceil(promedio * mesOptimo);

  const filtrados = grupos
    .filter((g) => `${g.SubMarca} ${g.Version}`.toLowerCase().includes(busqueda.toLowerCase()))
    .filter((g) => !soloComprar || calcComprar(g.promedio) > 0)
    .sort((a, b) => calcComprar(b.promedio) - calcComprar(a.promedio));

  const totalComprar = grupos.reduce((s, g) => s + Math.max(0, calcComprar(g.promedio)), 0);

  if (loading)
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#6b7280', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        <p>Cargando datos de ventas...</p>
      </div>
    );

  if (error)
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#b91c1c', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
        <p>{error}</p>
      </div>
    );

  return (
    <div style={{ padding: '24px 32px', fontFamily: 'system-ui, sans-serif', maxWidth: 1200, margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: '#1e3a5f' }}>
          🏭 Yakimura
        </h1>
        <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: 14 }}>
          Pedido a planta &mdash; ventas últimos 3 meses vs. inventario actual
        </p>
      </div>

      {/* KPIs rápidos */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Versiones analizadas', value: grupos.length, color: '#1e3a5f' },
          { label: 'Total a pedir (inv=0)', value: totalComprar, color: '#15803d' },
          { label: 'Mes óptimo actual', value: `×${mesOptimo}`, color: '#7c3aed' },
        ].map((k) => (
          <div key={k.label} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 20px', minWidth: 160 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* CONTROLES */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f3f4f6', padding: '8px 14px', borderRadius: 8 }}>
          <label style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>Mes óptimo:</label>
          <input
            type="number" step="0.5" min="0.5" max="6"
            value={mesOptimo}
            onChange={(e) => setMesOptimo(parseFloat(e.target.value) || 1)}
            style={{ width: 60, padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 15, fontWeight: 700, textAlign: 'center' }}
          />
        </div>
        <input
          type="text"
          placeholder="🔍 Buscar modelo o versión..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, minWidth: 250 }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={soloComprar} onChange={(e) => setSoloComprar(e.target.checked)} />
          Solo mostrar los que hay que comprar
        </label>
        <span style={{ color: '#9ca3af', fontSize: 12, marginLeft: 'auto' }}>{filtrados.length} versiones</span>
      </div>

      {/* TABLA */}
      <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#1e3a5f', color: '#fff' }}>
              {['Modelo', 'Versión', 'Año', 'Mes -3', 'Mes -2', 'Mes -1', 'Promedio/mes', 'Pedir (inv=0)', 'Desglose color'].map((h) => (
                <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Modelo' || h === 'Versión' ? 'left' : 'center', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  No hay resultados para tu búsqueda.
                </td>
              </tr>
            )}
            {filtrados.map((g, i) => {
              const comprar = calcComprar(g.promedio);
              const isOpen = expandido === g.key;
              return (
                <>
                  <tr
                    key={g.key}
                    style={{
                      background: isOpen ? '#eef2ff' : i % 2 === 0 ? '#f9fafb' : '#fff',
                      borderBottom: '1px solid #e5e7eb',
                      transition: 'background 0.15s',
                    }}
                  >
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1e3a5f' }}>{g.SubMarca}</td>
                    <td style={{ padding: '10px 12px', color: '#374151', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={g.Version}>{g.Version}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center', color: '#6b7280' }}>{g.Anio}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>{g.p3}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>{g.p2}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>{g.p1}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700 }}>{g.promedio.toFixed(1)}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>{badge(comprar)}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <button
                        onClick={() => setExpandido(isOpen ? null : g.key)}
                        style={{
                          background: isOpen ? '#4f46e5' : '#1e3a5f',
                          color: '#fff', border: 'none', borderRadius: 6,
                          padding: '4px 12px', cursor: 'pointer', fontSize: 12,
                          transition: 'background 0.15s',
                        }}
                      >
                        {isOpen ? '▲ Ocultar' : '▼ Ver colores'}
                      </button>
                    </td>
                  </tr>

                  {/* DETALLE POR COLOR */}
                  {isOpen && (
                    <tr key={`${g.key}-color`}>
                      <td colSpan={9} style={{ background: '#eef2ff', padding: '0 16px 16px 32px' }}>
                        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginTop: 8 }}>
                          <thead>
                            <tr style={{ color: '#4338ca', borderBottom: '2px solid #c7d2fe' }}>
                              {['🎨 Color', 'Mes -3', 'Mes -2', 'Mes -1', 'Total 3M', 'Promedio/mes', '% del modelo', 'Pedir (inv=0)'].map((h) => (
                                <th key={h} style={{ padding: '6px 8px', textAlign: h.includes('Color') ? 'left' : 'center', fontWeight: 700 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {g.colores
                              .slice()
                              .sort((a, b) => b.ventas3m - a.ventas3m)
                              .map((c) => {
                                const pct = g.totalVentas > 0 ? Math.round((c.ventas3m / g.totalVentas) * 100) : 0;
                                const comprarColor = calcComprar(c.promedio);
                                return (
                                  <tr key={c.Color} style={{ borderBottom: '1px solid #e0e7ff' }}>
                                    <td style={{ padding: '7px 8px', fontWeight: 600, color: '#1e3a5f' }}>{c.Color || '(sin color)'}</td>
                                    <td style={{ padding: '7px 8px', textAlign: 'center', color: '#6b7280' }}>{c.p3}</td>
                                    <td style={{ padding: '7px 8px', textAlign: 'center', color: '#6b7280' }}>{c.p2}</td>
                                    <td style={{ padding: '7px 8px', textAlign: 'center', color: '#6b7280' }}>{c.p1}</td>
                                    <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 700 }}>{c.ventas3m}</td>
                                    <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 700 }}>{c.promedio.toFixed(1)}</td>
                                    <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                                        <div style={{ background: '#c7d2fe', borderRadius: 4, height: 6, width: 70, overflow: 'hidden' }}>
                                          <div style={{ background: '#4f46e5', height: '100%', width: `${pct}%` }} />
                                        </div>
                                        <span style={{ minWidth: 28 }}>{pct}%</span>
                                      </div>
                                    </td>
                                    <td style={{ padding: '7px 8px', textAlign: 'center' }}>{badge(comprarColor)}</td>
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

      <p style={{ marginTop: 12, color: '#9ca3af', fontSize: 11 }}>
        Datos en tiempo real desde SQL Server &middot; Base: Intranet &middot; Vista: vw_VentasUltimos4Periodos
      </p>
    </div>
  );
}
