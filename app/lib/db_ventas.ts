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
  const anioVal =
    row['Año'] ?? row['Anio'] ?? row['ModelYr'] ?? row['modelyr'] ?? 0;

  return {
    CpnyId:          String(row['CpnyId']   ?? '').trim(),
    Marca:           String(row['Marca']    ?? '').trim(),
    SubMarca:        String(row['SubMarca'] ?? row['SubBrandDescr'] ?? '').trim(),
    Version:         String(row['Version']  ?? row['VersionDescr'] ?? row['Versión'] ?? '').trim(),
    Anio:            Number(anioVal),
    Color:           String(row['Color']    ?? '').trim(),
    Periodo_Menos_3: Number(row['Periodo_Menos_3'] ?? 0),
    Periodo_Menos_2: Number(row['Periodo_Menos_2'] ?? 0),
    Periodo_Menos_1: Number(row['Periodo_Menos_1'] ?? 0),
    Periodo_Actual:  Number(row['Periodo_Actual']  ?? 0),
    QtyAF:      Number(row['QtyAF']      ?? 0),
    QtyAP:      Number(row['QtyAP']      ?? 0),
    Inventario: Number(row['Inventario'] ?? (Number(row['QtyAF'] ?? 0) + Number(row['QtyAP'] ?? 0))),
  };
}

export async function getVentasYakimura(): Promise<VentaRow[]> {
  try {
    const pool = await sql.connect(config as sql.config);

    // Detectar nombre real de columna año en vw_VentasUltimos4Periodos
    const colResult = await pool.request().query(
      'SELECT TOP 1 * FROM dbo.vw_VentasUltimos4Periodos'
    );
    const cols: string[] = colResult.recordset.length > 0
      ? Object.keys(colResult.recordset[0])
      : [];

    // Buscar la columna de año por orden de prioridad
    const anioColVentas =
      cols.find(c => c === 'Año') ??
      cols.find(c => c === 'Anio') ??
      cols.find(c => c === 'ModelYr') ??
      cols.find(c => c.toLowerCase() === 'año') ??
      cols.find(c => c.toLowerCase() === 'anio') ??
      cols.find(c => c.toLowerCase() === 'modelyr') ??
      cols.find(c => c.toLowerCase().includes('a') && c.toLowerCase().includes('o') && c.length <= 5) ??
      'Año';

    // Detectar nombre real de columna SubMarca en vw_VentasUltimos4Periodos
    const subMarcaCol =
      cols.find(c => c === 'SubMarca') ??
      cols.find(c => c === 'SubBrandDescr') ??
      cols.find(c => c.toLowerCase() === 'submarca') ??
      cols.find(c => c.toLowerCase() === 'subbranddescr') ??
      'SubMarca';

    // Detectar nombre real de columna Version en vw_VentasUltimos4Periodos
    const versionCol =
      cols.find(c => c === 'Version') ??
      cols.find(c => c === 'VersionDescr') ??
      cols.find(c => c === 'Versión') ??
      cols.find(c => c.toLowerCase() === 'version') ??
      cols.find(c => c.toLowerCase() === 'versiondescr') ??
      'Version';

    // Detectar columna Color
    const colorCol =
      cols.find(c => c === 'Color') ??
      cols.find(c => c.toLowerCase() === 'color') ??
      'Color';

    const result = await pool.request().query(`
      SELECT
        TRIM(v.CpnyId)              AS CpnyId,
        TRIM(v.Marca)               AS Marca,
        TRIM(v.[${subMarcaCol}])    AS SubMarca,
        TRIM(v.[${versionCol}])     AS Version,
        v.[${anioColVentas}]        AS Anio,
        TRIM(v.[${colorCol}])       AS Color,
        ISNULL(v.Periodo_Menos_3, 0) AS Periodo_Menos_3,
        ISNULL(v.Periodo_Menos_2, 0) AS Periodo_Menos_2,
        ISNULL(v.Periodo_Menos_1, 0) AS Periodo_Menos_1,
        ISNULL(v.Periodo_Actual,  0) AS Periodo_Actual,
        ISNULL(i.QtyAF, 0)                        AS QtyAF,
        ISNULL(i.QtyAP, 0)                        AS QtyAP,
        ISNULL(i.QtyAF, 0) + ISNULL(i.QtyAP, 0)  AS Inventario
      FROM dbo.vw_VentasUltimos4Periodos v
      LEFT JOIN dbo.InventoryAN i
        ON  TRIM(i.CpnyId)          = TRIM(v.CpnyId)
        AND TRIM(i.SubBrandDescr)   = TRIM(v.[${subMarcaCol}])
        AND TRIM(i.VersionDescr)    = TRIM(v.[${versionCol}])
        AND TRIM(i.Color)           = TRIM(v.[${colorCol}])
        AND i.ModelYr               = v.[${anioColVentas}]
      ORDER BY v.[${subMarcaCol}], v.[${versionCol}], v.[${anioColVentas}], v.[${colorCol}]
    `);

    return (result.recordset as Record<string, unknown>[]).map(normalizeRow);
  } catch (err) {
    console.error('Error al consultar Yakimura:', err);
    throw err;
  }
}
