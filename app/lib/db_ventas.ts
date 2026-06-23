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
}

export async function getVentasYakimura(): Promise<VentaRow[]> {
  try {
    const pool = await sql.connect(config as sql.config);
    const result = await pool.request().query(`
      SELECT
        TRIM(CpnyId)    AS CpnyId,
        TRIM(Marca)     AS Marca,
        TRIM(SubMarca)  AS SubMarca,
        TRIM(Version)   AS Version,
        Anio,
        TRIM(Color)     AS Color,
        ISNULL(Periodo_Menos_3, 0) AS Periodo_Menos_3,
        ISNULL(Periodo_Menos_2, 0) AS Periodo_Menos_2,
        ISNULL(Periodo_Menos_1, 0) AS Periodo_Menos_1,
        ISNULL(Periodo_Actual,  0) AS Periodo_Actual
      FROM dbo.vw_VentasUltimos4Periodos
      ORDER BY SubMarca, Version, Anio, Color
    `);
    return result.recordset as VentaRow[];
  } catch (err) {
    console.error('Error al consultar vw_VentasUltimos4Periodos:', err);
    throw err;
  }
}
