import { NextResponse } from 'next/server';
import sql from 'mssql';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const configIntranet: sql.config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || '',
  database: 'Intranet',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: { encrypt: true, trustServerCertificate: true },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

export async function GET() {
  const pool = new sql.ConnectionPool(configIntranet);
  try {
    await pool.connect();

    // Ver todas las columnas disponibles
    const colResult = await pool.request().query('SELECT TOP 1 * FROM dbo.vw_VentasUltimos4Periodos');
    const cols = colResult.recordset.length > 0 ? Object.keys(colResult.recordset[0]) : [];

    // Detectar columna de marca
    const marcaCol = ['Marca', 'BrandDescr'].find(c => cols.includes(c))
      ?? ['Marca', 'BrandDescr'].find(c => cols.map(x => x.toLowerCase()).includes(c.toLowerCase()))
      ?? 'Marca';

    // Detectar columna de empresa
    const cpnyCol = ['CpnyId', 'CpnyID'].find(c => cols.includes(c)) ?? 'CpnyId';

    // Obtener marcas distintas con su CpnyId y conteo de filas
    const result = await pool.request().query(`
      SELECT
        LTRIM(RTRIM([${cpnyCol}])) AS CpnyId,
        LTRIM(RTRIM([${marcaCol}])) AS Marca,
        COUNT(*) AS TotalFilas
      FROM dbo.vw_VentasUltimos4Periodos
      GROUP BY LTRIM(RTRIM([${cpnyCol}])), LTRIM(RTRIM([${marcaCol}]))
      ORDER BY CpnyId, Marca
    `);

    return NextResponse.json({
      columnas: cols,
      marcaColDetectada: marcaCol,
      cpnyColDetectada: cpnyCol,
      marcas: result.recordset,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    await pool.close().catch(() => {});
  }
}
