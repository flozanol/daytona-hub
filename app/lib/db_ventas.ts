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

// Normaliza una fila cruda: maneja Año vs Anio y cualquier variación de nombre
function normalizeRow(row: Record<string, unknown>): VentaRow {
  // Año puede venir como 'Año', 'Anio', 'AÑO', 'ANO', etc.
  const anioVal =
    row['Año'] ?? row['Anio'] ?? row['AÑO'] ?? row['ANO'] ?? row['año'] ?? row['anio'] ?? 0;

  return {
    CpnyId:          String(row['CpnyId']   ?? row['CPNYID']   ?? '').trim(),
    Marca:           String(row['Marca']    ?? row['MARCA']    ?? '').trim(),
    SubMarca:        String(row['SubMarca'] ?? row['SUBMARCA'] ?? row['Submarca'] ?? '').trim(),
    Version:         String(row['Version']  ?? row['VERSION']  ?? row['Versión']  ?? '').trim(),
    Anio:            Number(anioVal),
    Color:           String(row['Color']    ?? row['COLOR']    ?? '').trim(),
    Periodo_Menos_3: Number(row['Periodo_Menos_3'] ?? row['Periodo_menos_3'] ?? 0),
    Periodo_Menos_2: Number(row['Periodo_Menos_2'] ?? row['Periodo_menos_2'] ?? 0),
    Periodo_Menos_1: Number(row['Periodo_Menos_1'] ?? row['Periodo_menos_1'] ?? 0),
    Periodo_Actual:  Number(row['Periodo_Actual']  ?? row['Periodo_actual']  ?? 0),
    QtyAF:      Number(row['QtyAF']      ?? 0),
    QtyAP:      Number(row['QtyAP']      ?? 0),
    Inventario: Number(row['Inventario'] ?? (Number(row['QtyAF'] ?? 0) + Number(row['QtyAP'] ?? 0))),
  };
}

export async function getVentasYakimura(): Promise<VentaRow[]> {
  try {
    const pool = await sql.connect(config as sql.config);

    // Primero obtenemos los nombres reales de columnas de la vista
    const colResult = await pool.request().query(`
      SELECT TOP 1 * FROM dbo.vw_VentasUltimos4Periodos
    `);
    const cols: string[] = colResult.recordset.length > 0
      ? Object.keys(colResult.recordset[0])
      : [];

    // Detectar el nombre real del campo Año/Anio en la vista
    const anioCol =
      cols.find(c => c === 'Año') ??
      cols.find(c => c === 'Anio') ??
      cols.find(c => c.toLowerCase() === 'año') ??
      cols.find(c => c.toLowerCase() === 'anio') ??
      cols.find(c => c.toLowerCase() === 'ano') ??
      'Anio';

    // Construir query con el nombre correcto de columna
    const result = await pool.request().query(`
      SELECT
        TRIM(v.CpnyId)   AS CpnyId,
        TRIM(v.Marca)    AS Marca,
        TRIM(v.SubMarca) AS SubMarca,
        TRIM(v.Version)  AS Version,
        v.[${anioCol}]   AS Anio,
        TRIM(v.Color)    AS Color,
        ISNULL(v.Periodo_Menos_3, 0) AS Periodo_Menos_3,
        ISNULL(v.Periodo_Menos_2, 0) AS Periodo_Menos_2,
        ISNULL(v.Periodo_Menos_1, 0) AS Periodo_Menos_1,
        ISNULL(v.Periodo_Actual,  0) AS Periodo_Actual,
        ISNULL(i.QtyAF, 0)                         AS QtyAF,
        ISNULL(i.QtyAP, 0)                         AS QtyAP,
        ISNULL(i.QtyAF, 0) + ISNULL(i.QtyAP, 0)   AS Inventario
      FROM dbo.vw_VentasUltimos4Periodos v
      LEFT JOIN dbo.InventoryAN i
        ON  TRIM(i.CpnyId)   = TRIM(v.CpnyId)
        AND TRIM(i.SubMarca) = TRIM(v.SubMarca)
        AND TRIM(i.Version)  = TRIM(v.Version)
        AND TRIM(i.Color)    = TRIM(v.Color)
        AND i.[${anioCol}]   = v.[${anioCol}]
      ORDER BY v.SubMarca, v.Version, v.[${anioCol}], v.Color
    `);

    return (result.recordset as Record<string, unknown>[]).map(normalizeRow);
  } catch (err) {
    console.error('Error al consultar Yakimura:', err);
    throw err;
  }
}
