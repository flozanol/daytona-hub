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
    // modelo como antes) para no perder la granularidad de versión/color y
    // para no atribuirle todo el inventario de un modelo a una sola fila de
    // ventas mientras el resto queda en cero.
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

    const keysUsadas = new Set<string>();
    const ventasRows = ventasResult.recordset as Record<string, unknown>[];

    const merged = ventasRows.map(v => {
      const cpny   = String(v['CpnyId']  ?? '').trim().toLowerCase();
      const modelo = normalizeModelo(String(v['SubMarca'] ?? ''));
      const anio   = Number(v['Anio'] ?? 0);
      const color  = String(v['Color'] ?? '').trim().toLowerCase();
      const key    = `${cpny}|${modelo}|${anio}|${color}`;
      const inv    = invMap.get(key);
      keysUsadas.add(key);
      if (inv) {
        return {
          ...v,
          QtyAF: inv.QtyAF,
          QtyAP: inv.QtyAP,
          Inventario: inv.QtyAF + inv.QtyAP,
        };
      }
      return {
        ...v,
        QtyAF: 0,
        QtyAP: 0,
        Inventario: 0,
      };
    });

    // Unidades que SÍ están en el inventario real pero NO tuvieron venta en
    // los últimos 3 periodos. Son justo las que hay que marcar como "NO
    // comprar" (estancadas, sin rotación) — si las omitimos, Yakimura nunca
    // las mostraría y el usuario no vería ese riesgo.
    const extras: Record<string, unknown>[] = [];
    for (const [key, inv] of invMap.entries()) {
      if (keysUsadas.has(key)) continue;
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
