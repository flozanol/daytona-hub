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
  Inventario: number;
}

export async function getVentasYakimura(): Promise<VentaRow[]> {
  try {
    const pool = await sql.connect(config as sql.config);
    const result = await pool.request().query(`
      SELECT
        TRIM(v.CpnyId)    AS CpnyId,
        TRIM(v.Marca)     AS Marca,
        TRIM(v.SubMarca)  AS SubMarca,
        TRIM(v.Version)   AS Version,
        v.Anio,
        TRIM(v.Color)     AS Color,
        ISNULL(v.Periodo_Menos_3, 0) AS Periodo_Menos_3,
        ISNULL(v.Periodo_Menos_2, 0) AS Periodo_Menos_2,
        ISNULL(v.Periodo_Menos_1, 0) AS Periodo_Menos_1,
        ISNULL(v.Periodo_Actual,  0) AS Periodo_Actual,
        ISNULL(i.Quantity, 0)        AS Inventario
      FROM dbo.vw_VentasUltimos4Periodos v
      LEFT JOIN dbo.InventoryAN i
        ON  TRIM(i.CpnyId)   = TRIM(v.CpnyId)
        AND TRIM(i.SubMarca) = TRIM(v.SubMarca)
        AND TRIM(i.Version)  = TRIM(v.Version)
        AND TRIM(i.Color)    = TRIM(v.Color)
        AND i.Anio           = v.Anio
      ORDER BY v.SubMarca, v.Version, v.Anio, v.Color
    `);
    return result.recordset as VentaRow[];
  } catch (err) {
    console.error('Error al consultar Yakimura:', err);
    throw err;
  }
}
