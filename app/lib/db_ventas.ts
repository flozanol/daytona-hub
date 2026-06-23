import sql from 'mssql';

// Conexión al servidor dedicado (mismo que usa db.ts para Inventory)
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || '',
  database: process.env.DB_NAME || 'Intranet',
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
  return {
    CpnyId:          String(row['CpnyId']   ?? '').trim(),
    Marca:           String(row['Marca']    ?? '').trim(),
    SubMarca:        String(row['SubMarca'] ?? '').trim(),
    Version:         String(row['Version']  ?? '').trim(),
    Anio:            Number(row['Anio']     ?? 0),
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

    const anioCol     = find(['A\u00f1o', 'Anio', 'ModelYr', 'ANO']);
    const subMarcaCol = find(['SubMarca', 'SubBrandDescr']);
    const versionCol  = find(['Version', 'VersionDescr', 'Versi\u00f3n']);
    const colorCol    = find(['Color']);
    const marcaCol    = find(['Marca', 'BrandDescr']);
    const cpnyCol     = find(['CpnyId', 'CpnyID']);

    const result = await pool.request().query(`
      WITH InvAgrupado AS (
        SELECT
          TRIM(CpnyID)        AS CpnyId,
          TRIM(BrandDescr)    AS Marca,
          TRIM(SubBrandDescr) AS SubMarca,
          TRIM(VersionDescr)  AS Version,
          ModelYr             AS Anio,
          TRIM(Color)         AS Color,
          SUM(ISNULL(QtyAF, 0)) AS QtyAF,
          SUM(ISNULL(QtyAP, 0)) AS QtyAP
        FROM dbo.Inventory
        WHERE QtyAF > 0 OR QtyAP > 0 OR QtyDP > 0 OR QtyAD > 0
        GROUP BY
          TRIM(CpnyID), TRIM(BrandDescr), TRIM(SubBrandDescr),
          TRIM(VersionDescr), ModelYr, TRIM(Color)
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
        ON  inv.CpnyId   = TRIM(v.[${cpnyCol}])
        AND inv.SubMarca = TRIM(v.[${subMarcaCol}])
        AND inv.Version  = TRIM(v.[${versionCol}])
        AND inv.Color    = TRIM(v.[${colorCol}])
        AND inv.Anio     = v.[${anioCol}]
      ORDER BY v.[${subMarcaCol}], v.[${versionCol}], v.[${anioCol}], v.[${colorCol}]
    `);

    return (result.recordset as Record<string, unknown>[]).map(normalizeRow);
  } catch (err) {
    console.error('Error al consultar Yakimura:', err);
    throw err;
  }
}
