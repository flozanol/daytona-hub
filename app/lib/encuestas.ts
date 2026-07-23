// Módulo para leer el Google Sheets concentrado de encuestas de satisfacción
// Usa la URL de exportación CSV pública de Google Sheets (sin API key)
// El Sheet debe tener acceso de lectura para "cualquiera con el enlace"

const SHEET_ID = '1Z87H-BSHQqMRDb3GpOMWZ6GDY8W6zSBNAWcPfcWCdZ0';

// Nombres exactos de las pestañas (agencias)
const AGENCIAS = [
  'Honda Cuajimalpa',
  'Honda Interlomas',
  'KIA Interlomas',
  'KIA Iztapalapa',
  'MG Cuajimalpa',
  'MG Interlomas',
  'MG Iztapalapa',
    'Acura Interlomas',
] as const;

export type AgenciaNombre = typeof AGENCIAS[number];

export interface EncuestaRow {
  marcaTemporal: string;    // Col A
  autoActual: string;       // Col E
  leGusta: string;          // Col F
  volveriaComprar: string;  // Col G
  nps: number | null;       // Col I (0-10)
  quiereCambiar: string;    // Col K
  modeloDeseado: string;    // Col L
  tiempoCambio: string;     // Col M
  comentario: string;       // Col N
}

export interface AgenciaResumen {
  nombre: AgenciaNombre;
  totalEncuestas: number;
  npsPromedio: number | null;
  npsDistribucion: { promotores: number; pasivos: number; detractores: number };
  npsScore: number | null; // NPS real = %promotores - %detractores
  quierenCambiar: number;
  noQuierenCambiar: number;
  talvez: number;
  tiempoCambio: Record<string, number>;
  modelosDeseados: Array<{ modelo: string; cantidad: number }>;
  volverianComprar: { si: number; no: number; talvez: number };
  ultimaRespuesta: string | null;
}

export interface ResumenGlobal {
  agencias: AgenciaResumen[];
  totalGeneral: number;
  npsPromedioGlobal: number | null;
  npsScoreGlobal: number | null;
  totalQuierenCambiar: number;
  tiempoCambioGlobal: Record<string, number>;
  modelosTopGlobal: Array<{ modelo: string; cantidad: number }>;
  marcaActualizacion: string;
}

const ORDEN_TIEMPO = [
  'Menos de 1 mes',
  '1 a 3 meses',
  '3 a 6 meses',
  '6 a 12 meses',
  '12 a 18 meses',
  '18 a 24 meses',
  'Dentro de más de 2 años',
];

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

async function fetchSheetCSV(sheetName: string): Promise<EncuestaRow[]> {
  // Construir URL de exportación CSV con el nombre de la hoja
  const encodedName = encodeURIComponent(sheetName);
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodedName}`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`No se pudo obtener la hoja "${sheetName}": HTTP ${res.status}`);
  }

  const text = await res.text();
  const lines = text.split('\n').filter(l => l.trim().length > 0);

  if (lines.length < 2) return []; // Sin datos (solo encabezado o vacío)

  // Omitir fila de encabezado (fila 0)
  const rows: EncuestaRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    // Columnas: A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8, J=9, K=10, L=11, M=12, N=13
    const npsRaw = cols[8]?.replace(/[^0-9.]/g, '');
    const nps = npsRaw ? parseFloat(npsRaw) : null;
    rows.push({
      marcaTemporal: cols[0] ?? '',
      autoActual:    cols[4] ?? '',
      leGusta:       cols[5] ?? '',
      volveriaComprar: cols[6] ?? '',
      nps:           !isNaN(nps as number) && nps !== null ? nps : null,
      quiereCambiar: cols[10] ?? '',
      modeloDeseado: cols[11] ?? '',
      tiempoCambio:  cols[12] ?? '',
      comentario:    cols[13] ?? '',
    });
  }
  return rows.filter(r => r.marcaTemporal.length > 0); // Filtrar filas vacías
}

function buildResumen(nombre: AgenciaNombre, rows: EncuestaRow[]): AgenciaResumen {
  const total = rows.length;

  // NPS
  const conNps = rows.filter(r => r.nps !== null && !isNaN(r.nps as number));
  const npsPromedio = conNps.length > 0
    ? Math.round((conNps.reduce((s, r) => s + (r.nps as number), 0) / conNps.length) * 10) / 10
    : null;

  const promotores   = conNps.filter(r => (r.nps as number) >= 9).length;
  const pasivos      = conNps.filter(r => (r.nps as number) >= 7 && (r.nps as number) <= 8).length;
  const detractores  = conNps.filter(r => (r.nps as number) <= 6).length;
  const npsScore = conNps.length > 0
    ? Math.round(((promotores - detractores) / conNps.length) * 100)
    : null;

  // Quieren cambiar
  const quierenCambiar   = rows.filter(r => r.quiereCambiar.toLowerCase().startsWith('sí') || r.quiereCambiar.toLowerCase().startsWith('si')).length;
  const noQuierenCambiar = rows.filter(r => r.quiereCambiar.toLowerCase().startsWith('no')).length;
  const talvez           = total - quierenCambiar - noQuierenCambiar;

  // Tiempo de cambio
  const tiempoCambio: Record<string, number> = {};
  for (const t of ORDEN_TIEMPO) tiempoCambio[t] = 0;
  for (const r of rows) {
    if (r.tiempoCambio && tiempoCambio[r.tiempoCambio] !== undefined) {
      tiempoCambio[r.tiempoCambio]++;
    }
  }

  // Modelos deseados (top 10)
  const modeloMap: Record<string, number> = {};
  for (const r of rows) {
    const m = r.modeloDeseado.trim();
    if (m) modeloMap[m] = (modeloMap[m] ?? 0) + 1;
  }
  const modelosDeseados = Object.entries(modeloMap)
    .map(([modelo, cantidad]) => ({ modelo, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 10);

  // Volverían a comprar
  const volverianComprar = {
    si:     rows.filter(r => r.volveriaComprar.toLowerCase().startsWith('sí') || r.volveriaComprar.toLowerCase().startsWith('si')).length,
    no:     rows.filter(r => r.volveriaComprar.toLowerCase().startsWith('no')).length,
    talvez: rows.filter(r => r.volveriaComprar.toLowerCase().includes('tal') || r.volveriaComprar.toLowerCase().includes('quiz')).length,
  };

  // Última respuesta
  const fechas = rows.map(r => r.marcaTemporal).filter(Boolean);
  const ultimaRespuesta = fechas.length > 0 ? fechas[fechas.length - 1] : null;

  return {
    nombre, totalEncuestas: total, npsPromedio,
    npsDistribucion: { promotores, pasivos, detractores },
    npsScore, quierenCambiar, noQuierenCambiar, talvez,
    tiempoCambio, modelosDeseados, volverianComprar, ultimaRespuesta,
  };
}

export async function getEncuestasResumen(): Promise<ResumenGlobal> {
  // Obtener todas las agencias en paralelo
  const resultados = await Promise.allSettled(
    AGENCIAS.map(async (nombre) => {
      const rows = await fetchSheetCSV(nombre);
      return buildResumen(nombre, rows);
    })
  );

  const agencias: AgenciaResumen[] = resultados.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    // Si falla una agencia, devolver resumen vacío
    console.error(`Error en agencia ${AGENCIAS[i]}:`, r.reason);
    return {
      nombre: AGENCIAS[i], totalEncuestas: 0, npsPromedio: null,
      npsDistribucion: { promotores: 0, pasivos: 0, detractores: 0 },
      npsScore: null, quierenCambiar: 0, noQuierenCambiar: 0, talvez: 0,
      tiempoCambio: Object.fromEntries(ORDEN_TIEMPO.map(t => [t, 0])),
      modelosDeseados: [], volverianComprar: { si: 0, no: 0, talvez: 0 },
      ultimaRespuesta: null,
    } satisfies AgenciaResumen;
  });

  const totalGeneral = agencias.reduce((s, a) => s + a.totalEncuestas, 0);

  // NPS global
  const conNpsAgencias = agencias.filter(a => a.npsPromedio !== null);
  const npsPromedioGlobal = conNpsAgencias.length > 0
    ? Math.round((conNpsAgencias.reduce((s, a) => s + (a.npsPromedio as number), 0) / conNpsAgencias.length) * 10) / 10
    : null;

  // NPS Score global
  const totalPromotores  = agencias.reduce((s, a) => s + a.npsDistribucion.promotores, 0);
  const totalDetractores = agencias.reduce((s, a) => s + a.npsDistribucion.detractores, 0);
  const totalConNps      = agencias.reduce((s, a) => s + a.npsDistribucion.promotores + a.npsDistribucion.pasivos + a.npsDistribucion.detractores, 0);
  const npsScoreGlobal   = totalConNps > 0 ? Math.round(((totalPromotores - totalDetractores) / totalConNps) * 100) : null;

  const totalQuierenCambiar = agencias.reduce((s, a) => s + a.quierenCambiar, 0);

  // Tiempo de cambio global
  const tiempoCambioGlobal: Record<string, number> = Object.fromEntries(ORDEN_TIEMPO.map(t => [t, 0]));
  for (const a of agencias) {
    for (const [k, v] of Object.entries(a.tiempoCambio)) {
      tiempoCambioGlobal[k] = (tiempoCambioGlobal[k] ?? 0) + v;
    }
  }

  // Modelos top global
  const modeloMapGlobal: Record<string, number> = {};
  for (const a of agencias) {
    for (const { modelo, cantidad } of a.modelosDeseados) {
      modeloMapGlobal[modelo] = (modeloMapGlobal[modelo] ?? 0) + cantidad;
    }
  }
  const modelosTopGlobal = Object.entries(modeloMapGlobal)
    .map(([modelo, cantidad]) => ({ modelo, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 10);

  return {
    agencias,
    totalGeneral,
    npsPromedioGlobal,
    npsScoreGlobal,
    totalQuierenCambiar,
    tiempoCambioGlobal,
    modelosTopGlobal,
    marcaActualizacion: new Date().toISOString(),
  };
}
