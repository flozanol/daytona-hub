import sql from 'mssql';

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || '',
  database: 'Intranet',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

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
  const anioVal = row['Anio'] ?? row['A\u00f1o'] ?? row['ModelYr'] ?? 0;
  return {
    CpnyId:          String(row['CpnyId']   ?? '').trim(),
    Marca:           String(row['Marca']    ?? '').trim(),
    SubMarca:        String(row['SubMarca'] ?? '').trim(),
    Version:         String(row['Version']  ?? '').trim(),
    Anio:            Number(anioVal),
    Color:           String(row['Color']    ?? '').trim(),
    Periodo_Menos_3: Number(row['Periodo_Menos_3'] ?? 0),
    Periodo_Menos_2: Number(row['Periodo_Menos_2'] ?? 0),
    Periodo_Menos_1: Number(row['Periodo_Menos_1'] ?? 0),
    Periodo_Actual:  Number(row['Periodo_Actual']  ?? 0),
    QtyAF:      Number(row['QtyAF']      ?? 0),
    QtyAP:      Number(row['QtyAP']      ?? 0),
    Inventario: Number(row['Inventario'] ?? 0),
  };
}

export async function getVentasYakimura(): Promise<VentaRow[]> {
  try {
    const pool = await sql.connect(config as sql.config);

    // Detectar nombres reales de columnas en vw_VentasUltimos4Periodos
    const colResult = await pool.request().query(
      'SELECT TOP 1 * FROM dbo.vw_VentasUltimos4Periodos'
    );
    const cols: string[] = colResult.recordset.length > 0
      ? Object.keys(colResult.recordset[0]) : [];

    const find = (candidates: string[]) =>
      candidates.find(c => cols.includes(c)) ??
      candidates.find(c => cols.map(x => x.toLowerCase()).includes(c.toLowerCase())) ??
      candidates[0];

    const anioCol    = find(['A\u00f1o', 'Anio', 'ModelYr', 'ANO']);
    const subMarcaCol = find(['SubMarca', 'SubBrandDescr']);
    const versionCol  = find(['Version', 'VersionDescr', 'Versi\u00f3n']);
    const colorCol    = find(['Color']);
    const marcaCol    = find(['Marca']);
    const cpnyCol     = find(['CpnyId']);

    // PRE-AGREGAR inventario por (CpnyId, SubBrandDescr, VersionDescr, Color, ModelYr)
    // InventoryAN tiene UNA FILA POR VIN — si no agrupamos, el JOIN multiplica ventas.
    // SUM(QtyAF) + SUM(QtyAP) = total unidades físicas en inventario por combinación.
    const result = await pool.request().query(`
      WITH InvAgrupado AS (
        SELECT
          TRIM(CpnyId)        AS CpnyId,
          TRIM(SubBrandDescr) AS SubBrandDescr,
          TRIM(VersionDescr)  AS VersionDescr,
          TRIM(Color)         AS Color,
          ModelYr,
          SUM(ISNULL(QtyAF, 0)) AS QtyAF,
          SUM(ISNULL(QtyAP, 0)) AS QtyAP
        FROM dbo.InventoryAN
        GROUP BY
          TRIM(CpnyId), TRIM(SubBrandDescr), TRIM(VersionDescr),
          TRIM(Color), ModelYr
      )
      SELECT
        TRIM(v.[${cpnyCol}])      AS CpnyId,
        TRIM(v.[${marcaCol}])     AS Marca,
        TRIM(v.[${subMarcaCol}])  AS SubMarca,
        TRIM(v.[${versionCol}])   AS Version,
        v.[${anioCol}]            AS Anio,
        TRIM(v.[${colorCol}])     AS Color,
        ISNULL(v.Periodo_Menos_3, 0) AS Periodo_Menos_3,
        ISNULL(v.Periodo_Menos_2, 0) AS Periodo_Menos_2,
        ISNULL(v.Periodo_Menos_1, 0) AS Periodo_Menos_1,
        ISNULL(v.Periodo_Actual,  0) AS Periodo_Actual,
        ISNULL(inv.QtyAF, 0)                         AS QtyAF,
        ISNULL(inv.QtyAP, 0)                         AS QtyAP,
        ISNULL(inv.QtyAF, 0) + ISNULL(inv.QtyAP, 0) AS Inventario
      FROM dbo.vw_VentasUltimos4Periodos v
      LEFT JOIN InvAgrupado inv
        ON  inv.CpnyId        = TRIM(v.[${cpnyCol}])
        AND inv.SubBrandDescr = TRIM(v.[${subMarcaCol}])
        AND inv.VersionDescr  = TRIM(v.[${versionCol}])
        AND inv.Color         = TRIM(v.[${colorCol}])
        AND inv.ModelYr       = v.[${anioCol}]
      ORDER BY v.[${subMarcaCol}], v.[${versionCol}], v.[${anioCol}], v.[${colorCol}]
    `);

    return (result.recordset as Record<string, unknown>[]).map(normalizeRow);
  } catch (err) {
    console.error('Error al consultar Yakimura:', err);
    throw err;
  }
}
