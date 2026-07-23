'use client';

import { useState, useMemo } from 'react';
import { useEncuestasData } from '../../hooks/useEncuestasData';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { ErrorState } from '../shared/ErrorState';
import type { AgenciaResumen } from '../../app/lib/encuestas';

// ─── Colores por marca ───────────────────────────────────────────
const MARCA_COLOR: Record<string, string> = {
  Honda: '#E40521',
  KIA:   '#05141F',
  MG:    '#9A1B2E',
};

function getMarcaColor(nombre: string): string {
  for (const [marca, color] of Object.entries(MARCA_COLOR)) {
    if (nombre.toLowerCase().includes(marca.toLowerCase())) return color;
  }
  return '#003366';
}

// ─── NPS Score badge ─────────────────────────────────────────────
function NpsBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-300 font-bold">—</span>;
  const color =
    score >= 50  ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
    score >= 0   ? 'bg-amber-100 text-amber-700 border-amber-300' :
                   'bg-red-100 text-red-700 border-red-300';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-black border ${color}`}>
      {score > 0 ? '+' : ''}{score}
    </span>
  );
}

// ─── Barra de progreso mini ───────────────────────────────────────
function MiniBar({ value, max, color = 'bg-[#003366]' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-600 w-6 text-right">{value}</span>
    </div>
  );
}

// ─── Tarjeta resumen por agencia ──────────────────────────────────
function AgenciaCard({ a, maxEncuestas }: { a: AgenciaResumen; maxEncuestas: number }) {
  const color   = getMarcaColor(a.nombre);
  const total   = a.totalEncuestas;

  const tiempoEntries = Object.entries(a.tiempoCambio)
    .filter(([, v]) => v > 0)
    .sort(([ka], [kb]) => {
      const ORDEN = [
        'Menos de 1 mes','1 a 3 meses','3 a 6 meses',
        '6 a 12 meses','12 a 18 meses','18 a 24 meses','Dentro de más de 2 años',
      ];
      return ORDEN.indexOf(ka) - ORDEN.indexOf(kb);
    });

  const maxTiempo = Math.max(...tiempoEntries.map(([, v]) => v), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header agencia */}
      <div className="px-5 py-3.5 flex items-center justify-between" style={{ backgroundColor: color }}>
        <div>
          <h3 className="text-white font-black text-sm">{a.nombre}</h3>
          <p className="text-white/70 text-xs mt-0.5">
            {total === 0 ? 'Sin encuestas aún' : `${total} encuesta${total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-white/60 text-[10px] uppercase tracking-widest font-bold">NPS Score</p>
          <NpsBadge score={a.npsScore} />
        </div>
      </div>

      {total === 0 ? (
        <div className="px-5 py-8 text-center text-gray-300 text-sm">Sin datos todavía</div>
      ) : (
        <div className="px-5 py-4 space-y-4">

          {/* KPIs rápidos */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded-xl p-2.5">
              <div className="text-xl font-black text-[#003366]">
                {a.npsPromedio !== null ? a.npsPromedio.toFixed(1) : '—'}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">Prom. satisfacción</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-2.5">
              <div className="text-xl font-black text-emerald-600">{a.quierenCambiar}</div>
              <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">Quieren cambiar</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-2.5">
              <div className="text-xl font-black text-amber-600">
                {total > 0 ? Math.round((a.quierenCambiar / total) * 100) : 0}%
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">Intención cambio</div>
            </div>
          </div>

          {/* Distribución NPS */}
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Distribución NPS</p>
            <div className="flex rounded-lg overflow-hidden h-3">
              {(() => {
                const tot = a.npsDistribucion.promotores + a.npsDistribucion.pasivos + a.npsDistribucion.detractores;
                if (tot === 0) return <div className="flex-1 bg-gray-100" />;
                return (
                  <>
                    <div title={`Promotores: ${a.npsDistribucion.promotores}`}
                      className="bg-emerald-500 transition-all"
                      style={{ width: `${(a.npsDistribucion.promotores / tot) * 100}%` }} />
                    <div title={`Pasivos: ${a.npsDistribucion.pasivos}`}
                      className="bg-amber-400 transition-all"
                      style={{ width: `${(a.npsDistribucion.pasivos / tot) * 100}%` }} />
                    <div title={`Detractores: ${a.npsDistribucion.detractores}`}
                      className="bg-red-400 transition-all"
                      style={{ width: `${(a.npsDistribucion.detractores / tot) * 100}%` }} />
                  </>
                );
              })()}
            </div>
            <div className="flex justify-between text-[9px] text-gray-400 mt-1">
              <span className="text-emerald-600 font-bold">● Prom. {a.npsDistribucion.promotores}</span>
              <span className="text-amber-500 font-bold">● Pasivo {a.npsDistribucion.pasivos}</span>
              <span className="text-red-500 font-bold">● Det. {a.npsDistribucion.detractores}</span>
            </div>
          </div>

          {/* Tiempo de cambio */}
          {tiempoEntries.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                ¿Cuándo cambiarían?
              </p>
              <div className="space-y-1.5">
                {tiempoEntries.map(([label, val]) => (
                  <div key={label}>
                    <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                      <span>{label}</span>
                    </div>
                    <MiniBar value={val} max={maxTiempo} color="bg-[#003366]" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top modelos deseados */}
          {a.modelosDeseados.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                Modelos de interés
              </p>
              <div className="flex flex-wrap gap-1.5">
                {a.modelosDeseados.slice(0, 5).map(({ modelo, cantidad }) => (
                  <span key={modelo}
                    className="inline-flex items-center gap-1 bg-[#003366]/8 text-[#003366] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#003366]/15"
                  >
                    {modelo}
                    <span className="bg-[#003366] text-white rounded-full w-3.5 h-3.5 flex items-center justify-center" style={{ fontSize: '8px' }}>{cantidad}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Volvería a comprar */}
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
              ¿Volvería a comprar la marca?
            </p>
            <div className="flex gap-2">
              {[
                { label: 'Sí', val: a.volverianComprar.si,     color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                { label: 'Tal vez', val: a.volverianComprar.talvez, color: 'text-amber-700 bg-amber-50 border-amber-200' },
                { label: 'No', val: a.volverianComprar.no,     color: 'text-red-700 bg-red-50 border-red-200' },
              ].map(({ label, val, color }) => (
                <div key={label} className={`flex-1 text-center rounded-lg px-2 py-1.5 border ${color}`}>
                  <div className="font-black text-base">{val}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wide">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {a.ultimaRespuesta && (
            <p className="text-[9px] text-gray-300">
              Última respuesta: {a.ultimaRespuesta}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Vista principal ──────────────────────────────────────────────
export function EncuestasView() {
  const { data, loading, error } = useEncuestasData();
  const [tabActivo, setTabActivo] = useState<'resumen' | 'agencias' | 'cambio'>('resumen');

  const maxEncuestas = useMemo(() =>
    data ? Math.max(...data.agencias.map(a => a.totalEncuestas), 1) : 1,
    [data]
  );

  if (loading) return <LoadingSpinner label="Cargando encuestas de satisfacción..." />;
  if (error)   return <ErrorState title="Error al cargar encuestas" message={error} />;
  if (!data)   return null;

  const ORDEN_TIEMPO = [
    'Menos de 1 mes','1 a 3 meses','3 a 6 meses',
    '6 a 12 meses','12 a 18 meses','18 a 24 meses','Dentro de más de 2 años',
  ];

  const tiempoGlobalEntries = ORDEN_TIEMPO
    .map(k => ({ label: k, val: data.tiempoCambioGlobal[k] ?? 0 }))
    .filter(e => e.val > 0);

  const maxTiempoGlobal = Math.max(...tiempoGlobalEntries.map(e => e.val), 1);

  const colorTiempo = (label: string): string => {
    const idx = ORDEN_TIEMPO.indexOf(label);
    const colors = [
      'bg-red-500','bg-orange-500','bg-amber-500','bg-yellow-500',
      'bg-lime-500','bg-emerald-500','bg-teal-600',
    ];
    return colors[idx] ?? 'bg-[#003366]';
  };

  return (
    <div className="p-6 md:p-8 max-w-screen-xl mx-auto">

      {/* Título */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#003366] flex items-center gap-2">
          📋 Encuestas de Satisfacción
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Resumen ejecutivo · {data.totalGeneral} encuestas en {data.agencias.filter(a => a.totalEncuestas > 0).length} agencia{data.agencias.filter(a => a.totalEncuestas > 0).length !== 1 ? 's' : ''}
          &nbsp;·&nbsp;
          <span className="text-xs text-gray-300">
            Actualizado: {new Date(data.marcaActualizacion).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </p>
      </div>

      {/* KPIs globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Total encuestas',
            value: data.totalGeneral,
            sub: `${data.agencias.filter(a => a.totalEncuestas > 0).length} agencias activas`,
            color: 'text-[#003366]',
          },
          {
            label: 'NPS Score Global',
            value: data.npsScoreGlobal !== null ? `${data.npsScoreGlobal > 0 ? '+' : ''}${data.npsScoreGlobal}` : '—',
            sub: 'Promotores − Detractores',
            color: data.npsScoreGlobal !== null
              ? data.npsScoreGlobal >= 50 ? 'text-emerald-600'
              : data.npsScoreGlobal >= 0  ? 'text-amber-600'
              : 'text-red-600'
              : 'text-gray-300',
          },
          {
            label: 'Prom. satisfacción',
            value: data.npsPromedioGlobal !== null ? `${data.npsPromedioGlobal.toFixed(1)} / 10` : '—',
            sub: 'Escala 0-10',
            color: 'text-indigo-600',
          },
          {
            label: 'Quieren cambiar auto',
            value: data.totalQuierenCambiar,
            sub: data.totalGeneral > 0
              ? `${Math.round((data.totalQuierenCambiar / data.totalGeneral) * 100)}% del total`
              : '0% del total',
            color: 'text-amber-600',
          },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl px-5 py-3.5 shadow-sm">
            <div className={`text-2xl font-black ${color}`}>{value}</div>
            <div className="text-xs text-gray-500 font-semibold mt-0.5">{label}</div>
            <div className="text-[10px] text-gray-300 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs internos */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
        {([
          { id: 'resumen',  label: '📊 Por agencia'   },
          { id: 'cambio',   label: '🕐 Intención de compra' },
          { id: 'agencias', label: '🏆 Ranking'       },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTabActivo(id)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              tabActivo === id
                ? 'bg-white text-[#003366] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Por agencia ─────────────────────────────────────── */}
      {tabActivo === 'resumen' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {data.agencias.map(a => (
            <AgenciaCard key={a.nombre} a={a} maxEncuestas={maxEncuestas} />
          ))}
        </div>
      )}

      {/* ── Tab: Intención de compra ──────────────────────────────── */}
      {tabActivo === 'cambio' && (
        <div className="space-y-6">
          {/* Gráfica de barras horizontal — tiempo global */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-black text-[#003366] mb-4">⏱ ¿En cuánto tiempo cambiarían? (Grupo)</h2>
            {tiempoGlobalEntries.length === 0 ? (
              <p className="text-gray-300 text-sm text-center py-8">Sin datos de intención de cambio</p>
            ) : (
              <div className="space-y-3">
                {tiempoGlobalEntries.map(({ label, val }) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold text-gray-700">{label}</span>
                      <span className="font-black text-[#003366]">{val}</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${colorTiempo(label)}`}
                        style={{ width: `${(val / maxTiempoGlobal) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tabla por agencia de intención de cambio */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-black text-[#003366]">📋 Detalle de intención por agencia</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#003366] text-white">
                    <th className="px-4 py-3 text-left font-bold">Agencia</th>
                    <th className="px-4 py-3 text-center font-bold">Encuestas</th>
                    <th className="px-4 py-3 text-center font-bold">Sí cambian</th>
                    <th className="px-4 py-3 text-center font-bold">% cambio</th>
                    {ORDEN_TIEMPO.map(t => (
                      <th key={t} className="px-2 py-3 text-center font-bold text-xs whitespace-nowrap">{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.agencias.map((a, i) => (
                    <tr key={a.nombre} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-indigo-50 transition-colors`}>
                      <td className="px-4 py-3 font-bold" style={{ color: getMarcaColor(a.nombre) }}>{a.nombre}</td>
                      <td className="px-4 py-3 text-center font-black text-[#003366]">{a.totalEncuestas}</td>
                      <td className="px-4 py-3 text-center font-black text-emerald-600">{a.quierenCambiar}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block bg-amber-100 text-amber-700 font-black text-xs px-2 py-0.5 rounded-full">
                          {a.totalEncuestas > 0 ? Math.round((a.quierenCambiar / a.totalEncuestas) * 100) : 0}%
                        </span>
                      </td>
                      {ORDEN_TIEMPO.map(t => (
                        <td key={t} className="px-2 py-3 text-center text-xs">
                          {a.tiempoCambio[t] > 0
                            ? <span className="font-black text-[#003366]">{a.tiempoCambio[t]}</span>
                            : <span className="text-gray-200">—</span>
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top modelos globales */}
          {data.modelosTopGlobal.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-black text-[#003366] mb-4">🚗 Modelos más deseados (Grupo)</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {data.modelosTopGlobal.map(({ modelo, cantidad }, i) => (
                  <div key={modelo} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                    <div className="text-2xl font-black text-[#003366]">{cantidad}</div>
                    <div className="text-xs font-bold text-gray-600 mt-0.5 truncate" title={modelo}>{modelo}</div>
                    <div className="text-[9px] text-gray-300 mt-0.5">#{i + 1} más pedido</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Ranking ──────────────────────────────────────────── */}
      {tabActivo === 'agencias' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-black text-[#003366]">🏆 Ranking de agencias por NPS Score</h2>
            <p className="text-xs text-gray-400 mt-0.5">NPS Score = % Promotores (9-10) − % Detractores (0-6)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-black text-gray-400 text-xs uppercase tracking-wide">#</th>
                  <th className="px-4 py-3 text-left font-black text-gray-400 text-xs uppercase tracking-wide">Agencia</th>
                  <th className="px-4 py-3 text-center font-black text-gray-400 text-xs uppercase tracking-wide">Encuestas</th>
                  <th className="px-4 py-3 text-center font-black text-gray-400 text-xs uppercase tracking-wide">NPS Score</th>
                  <th className="px-4 py-3 text-center font-black text-gray-400 text-xs uppercase tracking-wide">Prom. satisf.</th>
                  <th className="px-4 py-3 text-center font-black text-gray-400 text-xs uppercase tracking-wide">Promotores</th>
                  <th className="px-4 py-3 text-center font-black text-gray-400 text-xs uppercase tracking-wide">Pasivos</th>
                  <th className="px-4 py-3 text-center font-black text-gray-400 text-xs uppercase tracking-wide">Detractores</th>
                  <th className="px-4 py-3 text-center font-black text-gray-400 text-xs uppercase tracking-wide">Quieren cambiar</th>
                  <th className="px-4 py-3 text-center font-black text-gray-400 text-xs uppercase tracking-wide">Volverían comprar</th>
                </tr>
              </thead>
              <tbody>
                {data.agencias
                  .slice()
                  .sort((a, b) => {
                    if (a.npsScore === null && b.npsScore === null) return b.totalEncuestas - a.totalEncuestas;
                    if (a.npsScore === null) return 1;
                    if (b.npsScore === null) return -1;
                    return b.npsScore - a.npsScore;
                  })
                  .map((a, i) => (
                    <tr key={a.nombre} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-indigo-50 transition-colors`}>
                      <td className="px-4 py-3">
                        <span className={`font-black text-base ${
                          i === 0 ? 'text-amber-500' :
                          i === 1 ? 'text-gray-400' :
                          i === 2 ? 'text-amber-700' : 'text-gray-300'
                        }`}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold" style={{ color: getMarcaColor(a.nombre) }}>{a.nombre}</td>
                      <td className="px-4 py-3 text-center font-black text-[#003366]">{a.totalEncuestas}</td>
                      <td className="px-4 py-3 text-center"><NpsBadge score={a.npsScore} /></td>
                      <td className="px-4 py-3 text-center font-black text-indigo-700">
                        {a.npsPromedio !== null ? a.npsPromedio.toFixed(1) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center font-black text-emerald-600">{a.npsDistribucion.promotores}</td>
                      <td className="px-4 py-3 text-center font-black text-amber-500">{a.npsDistribucion.pasivos}</td>
                      <td className="px-4 py-3 text-center font-black text-red-500">{a.npsDistribucion.detractores}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block font-black text-[#003366]">{a.quierenCambiar}</span>
                        {a.totalEncuestas > 0 && (
                          <span className="text-gray-400 text-xs ml-1">({Math.round((a.quierenCambiar / a.totalEncuestas) * 100)}%)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-emerald-600 font-bold">{a.volverianComprar.si}</span>
                        <span className="text-gray-300 mx-1">/</span>
                        <span className="text-red-500 font-bold">{a.volverianComprar.no}</span>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-gray-300">
        Datos en tiempo real · Google Sheets concentrado · Sin datos personales de clientes
      </p>
    </div>
  );
}
