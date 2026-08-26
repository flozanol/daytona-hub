import sql from 'mssql';
import { makeConfig } from './db-connection';
import { getInventory } from './db';

export interface VentaRow {
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
  QtyAF: number;
  QtyAP: number;
  Inventario: number;
}

function normalizeRow(row: Record<string, unknown>): VentaRow {
  return {
    CpnyId: String(row['CpnyId'] ?? '').trim(),
    Marca: String(row['Marca'] ?? '').trim(),
    SubMarca: String(row['SubMarca'] ?? '').trim(),
    Version: String(row['Version'] ?? '').trim(),
    Anio: Number(row['Anio'] ?? 0),
    Color: String(row['Color'] ?? '').trim(),
    Periodo_Menos_3: Number(row['Periodo_Menos_3'] ?? 0),
    Periodo_Menos_2: Number(row['Periodo_Menos_2'] ?? 0),
    Periodo_Menos_1: Number(row['Periodo_Menos_1'] ?? 0),
    Periodo_Actual: Number(row['Periodo_Actual'] ?? 0),
    QtyAF: Number(row['QtyAF'] ?? 0),
    QtyAP: Number(row['QtyAP'] ?? 0),
    Inventario: Number(row['Inventario'] ?? 0),
  };
}

/**
 * Normaliza el nombre de modelo para poder cruzar el campo `Modelo`
 * (SubBrandDescr) que entrega getInventory() — el MISMO inventario que usa
 * la Clínica del Inventario — con el campo `SubMarca` de la vista de ventas.
 *
 * Son dos sistemas distintos que nombran el modelo de forma distinta:
 *  - Inventario (Clínica): a veces incluye la versión pegada al modelo,
 *    ej. "CR-V Touring CVT", "Acura ADX A-Spec".
 *  - Ventas: sólo el nombre limpio del modelo, ej. "cr-v", "adx".
 *
 * Estrategia: quitar prefijos de marca conocidos y quedarnos con el primer
 * token (excepciones tipo CR-V/HR-V/BR-V se preservan porque el guion no
 * se separa por espacio).
 */
function normalizeModelo(valor: string): string {
  let s = (valor || '').trim();
  const prefixes = ['Acura ', 'Honda ', 'KIA ', 'Kia ', 'MG ', 'Mg ', 'GWM ', 'Gwm '];
  for (const prefix of prefixes) {
    if (s.toLowerCase().startsWith(prefix.toLowerCase())) {
      s = s.substring(prefix.length).trim();
      break;
    }
  }
  const firstToken = s.split(' ')[0] || '';
  return firstToken.toLowerCase();
}

interface InventarioAgregado {
  QtyAF: number;
  QtyAP: number;
}

/**
 * Reparte `total` unidades enteras entre los elementos de `pesos` de forma
 * proporcional a su peso, garantizando que la suma del reparto sea
 * exactamente `total` (método de "mayor resto" para evitar que el
 * redondeo pierda o duplique unidades).
 *
 * Si ningún elemento tiene peso (todos en 0), reparte lo más parejo
 * posible entre todos.
 */
function distribuirProporcional(total: number, pesos: number[]): number[] {
  if (pesos.length === 0) return [];
  if (total <= 0) return pesos.map(() => 0);

  const sumaPesos = pesos.reduce((a, b) => a + b, 0);

  if (sumaPesos <= 0) {
    const base = Math.floor(total / pesos.length);
    const resto = total - base * pesos.length;
    return pesos.map((_, i) => base + (i < resto ? 1 : 0));
  }

  const exactos = pesos.map(p => (p / sumaPesos) * total);
  const enteros = exactos.map(Math.floor);
  const asignado = enteros.reduce((a, b) => a + b, 0);
  const restante = total - asignado;

  const orden = exactos
    .map((e, i) => ({ i, dec: e - Math.floor(e) }))
    .sort((a, b) => b.dec - a.dec);

  for (let k = 0; k < restante; k++) {
    enteros[orden[k % orden.length].i] += 1;
  }
  return enteros;
}

export async function getVentasYakimura(): Promise<VentaRow[]> {
  const poolIntranet = new sql.ConnectionPool(makeConfig('Intranet'));
  try {
    await poolIntranet.connect();

    // Detectar nombres reales de columnas en la vista de ventas
    const colResult = await poolIntranet.request().query(
      'SELECT TOP 1 * FROM dbo.vw_VentasUltimos4Periodos'
    );
    const cols: string[] = colResult.recordset.length > 0
      ? Object.keys(colResult.recordset[0])
      : [];
    const find = (candidates: string[]) =>
      candidates.find(c => cols.includes(c))
      ?? candidates.find(c => cols.map(x => x.toLowerCase()).includes(c.toLowerCase()))
      ?? candidates[0];

    const anioCol    = find(['Año', 'Anio', 'ModelYr', 'ANO', 'Áño']);
    const subMarcaCol = find(['SubMarca', 'SubBrandDescr']);
    const versionCol  = find(['Version', 'VersionDescr', 'Versión']);
    const colorCol    = find(['Color']);
    const marcaCol    = find(['Marca', 'BrandDescr']);
    const cpnyCol     = find(['CpnyId', 'CpnyID']);

    // Ventas desde Intranet
    const ventasResult = await poolIntranet.request().query(`
      SELECT
        LTRIM(RTRIM([${cpnyCol}])) AS CpnyId,
        LTRIM(RTRIM([${marcaCol}])) AS Marca,
        LTRIM(RTRIM([${subMarcaCol}])) AS SubMarca,
        LTRIM(RTRIM([${versionCol}])) AS Version,
        [${anioCol}] AS Anio,
        LTRIM(RTRIM([${colorCol}])) AS Color,
        ISNULL(Periodo_Menos_3, 0) AS Periodo_Menos_3,
        ISNULL(Periodo_Menos_2, 0) AS Periodo_Menos_2,
        ISNULL(Periodo_Menos_1, 0) AS Periodo_Menos_1,
        ISNULL(Periodo_Actual,  0) AS Periodo_Actual
      FROM dbo.vw_VentasUltimos4Periodos
      ORDER BY [${subMarcaCol}], [${versionCol}], [${anioCol}], [${colorCol}]
    `);

    // Inventario: EXACTAMENTE la misma fuente que "Clínica del Inventario"
    // (misma tabla, misma consulta, mismos campos — components/nuevos/ClinicaInventarioFinalV4.tsx
    // consume esta misma función a través de /api/inventario). Así garantizamos
    // que Yakimura y la Clínica nunca vuelvan a mostrar números distintos.
    const inventarioReal = await getInventory() as Record<string, unknown>[];

    // Agregamos por CpnyID + modelo normalizado + Año + Color (NO sólo por
    // modelo) para no perder granularidad de año/color.
    const invMap = new Map<string, InventarioAgregado>();
    for (const inv of inventarioReal) {
      // Mismo filtro que aplica la Clínica del Inventario en pantalla.
      if (String(inv['BrandDescr'] ?? '').trim().toUpperCase() === 'OTRO') continue;

      const cpny   = String(inv['CpnyID'] ?? '').trim().toLowerCase();
      const modelo = normalizeModelo(String(inv['Modelo'] ?? ''));
      const anio   = Number(inv['Anio'] ?? 0);
      const color  = String(inv['Color'] ?? '').trim().toLowerCase();
      const key    = `${cpny}|${modelo}|${anio}|${color}`;

      const qtyAF = Number(inv['QtyAF']) || 0;
      const qtyAP = Number(inv['QtyAP']) || 0;

      const existing = invMap.get(key);
      if (existing) {
        existing.QtyAF += qtyAF;
        existing.QtyAP += qtyAP;
      } else {
        invMap.set(key, { QtyAF: qtyAF, QtyAP: qtyAP });
      }
    }

    const ventasRows = ventasResult.recordset as Record<string, unknown>[];

    // IMPORTANTE: como la clave de cruce NO incluye "Versión" (ese campo no
    // se puede comparar de forma confiable entre ventas e inventario),
    // varias filas de venta (distintas versiones del mismo modelo/año/color)
    // pueden compartir la misma clave de inventario. Si a cada una se le
    // asignara el total completo del inventario de esa clave, el mismo
    // stock se contaría varias veces (esto fue exactamente lo que causó
    // que Yakimura mostrara más unidades de las que existen realmente).
    // En vez de eso, agrupamos las filas por clave y repartimos el
    // inventario real entre ellas, proporcional a las ventas de cada una
    // en los últimos 3 meses (o parejo si ninguna vendió).
    const gruposPorKey = new Map<string, number[]>();
    ventasRows.forEach((v, idx) => {
      const cpny   = String(v['CpnyId']  ?? '').trim().toLowerCase();
      const modelo = normalizeModelo(String(v['SubMarca'] ?? ''));
      const anio   = Number(v['Anio'] ?? 0);
      const color  = String(v['Color'] ?? '').trim().toLowerCase();
      const key    = `${cpny}|${modelo}|${anio}|${color}`;
      const lista = gruposPorKey.get(key);
      if (lista) lista.push(idx);
      else gruposPorKey.set(key, [idx]);
    });

    const qtyAFAsignado = new Array(ventasRows.length).fill(0) as number[];
    const qtyAPAsignado = new Array(ventasRows.length).fill(0) as number[];

    for (const [key, indices] of gruposPorKey.entries()) {
      const inv = invMap.get(key);
      if (!inv) continue;

      const pesos = indices.map(i => {
        const v = ventasRows[i];
        return (
          (Number(v['Periodo_Menos_3']) || 0) +
          (Number(v['Periodo_Menos_2']) || 0) +
          (Number(v['Periodo_Menos_1']) || 0)
        );
      });

      const repartoAF = distribuirProporcional(inv.QtyAF, pesos);
      const repartoAP = distribuirProporcional(inv.QtyAP, pesos);

      indices.forEach((i, j) => {
        qtyAFAsignado[i] = repartoAF[j];
        qtyAPAsignado[i] = repartoAP[j];
      });
    }

    const merged = ventasRows.map((v, i) => ({
      ...v,
      QtyAF: qtyAFAsignado[i],
      QtyAP: qtyAPAsignado[i],
      Inventario: qtyAFAsignado[i] + qtyAPAsignado[i],
    }));

    // Unidades que SÍ están en el inventario real pero cuyo modelo/año/color
    // no aparece en absoluto en la vista de ventas (ni una sola versión).
    // Son justo las que hay que marcar como "NO comprar" (estancadas, sin
    // rotación) — si las omitimos, Yakimura nunca las mostraría.
    const extras: Record<string, unknown>[] = [];
    for (const [key, inv] of invMap.entries()) {
      if (gruposPorKey.has(key)) continue;
      const [cpny, modelo, anioStr, color] = key.split('|');
      extras.push({
        CpnyId: cpny.toUpperCase(),
        Marca: '',
        SubMarca: modelo,
        Version: '(sin ventas en 3 meses)',
        Anio: Number(anioStr),
        Color: color,
        Periodo_Menos_3: 0,
        Periodo_Menos_2: 0,
        Periodo_Menos_1: 0,
        Periodo_Actual: 0,
        QtyAF: inv.QtyAF,
        QtyAP: inv.QtyAP,
        Inventario: inv.QtyAF + inv.QtyAP,
      });
    }

    return [...merged, ...extras].map(normalizeRow);
  } finally {
    await poolIntranet.close().catch(() => {});
  }
}
