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

const configBSC: sql.config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || '',
  database: process.env.DB_NAME || 'BSC',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: { encrypt: true, trustServerCertificate: true },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

export async function GET() {
  const poolIntranet = new sql.ConnectionPool(configIntranet);
  const poolBSC = new sql.ConnectionPool(configBSC);
  try {
    await poolIntranet.connect();
    await poolBSC.connect();

    // Detectar columnas
    const colResult = await poolIntranet.request().query('SELECT TOP 1 * FROM dbo.vw_VentasUltimos4Periodos');
    const cols = colResult.recordset.length > 0 ? Object.keys(colResult.recordset[0]) : [];
    const marcaCol = ['Marca', 'BrandDescr'].find(c => cols.includes(c)) ?? 'Marca';
    const cpnyCol = ['CpnyId', 'CpnyID'].find(c => cols.includes(c)) ?? 'CpnyId';

    // Marcas en Intranet
    const ventasResult = await poolIntranet.request().query(`
      SELECT
        LTRIM(RTRIM([${cpnyCol}])) AS CpnyId,
        LTRIM(RTRIM([${marcaCol}])) AS Marca,
        COUNT(*) AS TotalFilas
      FROM dbo.vw_VentasUltimos4Periodos
      GROUP BY LTRIM(RTRIM([${cpnyCol}])), LTRIM(RTRIM([${marcaCol}]))
      ORDER BY CpnyId, Marca
    `);

    // Inventario en BSC para empresas de Acura y Honda
    const invResult = await poolBSC.request().query(`
      SELECT
        LTRIM(RTRIM(CpnyID)) AS CpnyId,
        LTRIM(RTRIM(BrandDescr)) AS BrandDescr,
        LTRIM(RTRIM(SubBrandDescr)) AS SubBrandDescr,
        SUM(ISNULL(QtyAF,0)) AS QtyAF,
        SUM(ISNULL(QtyAP,0)) AS QtyAP,
        SUM(ISNULL(QtyDP,0)) AS QtyDP,
        SUM(ISNULL(QtyAD,0)) AS QtyAD,
        COUNT(*) AS TotalFilas
      FROM dbo.Inventory
      WHERE LTRIM(RTRIM(CpnyID)) IN ('ACUI', 'CUA', 'INT', '001', '002')
      GROUP BY LTRIM(RTRIM(CpnyID)), LTRIM(RTRIM(BrandDescr)), LTRIM(RTRIM(SubBrandDescr))
      ORDER BY CpnyId, SubBrandDescr
    `);

    // Columnas disponibles en Inventory
    const invColResult = await poolBSC.request().query('SELECT TOP 1 * FROM dbo.Inventory');
    const invCols = invColResult.recordset.length > 0 ? Object.keys(invColResult.recordset[0]) : [];

    return NextResponse.json({
      columnas_ventas: cols,
      marcaColDetectada: marcaCol,
      cpnyColDetectada: cpnyCol,
      marcas_intranet: ventasResult.recordset,
      columnas_inventory: invCols,
      inventory_por_empresa: invResult.recordset,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    await poolIntranet.close().catch(() => {});
    await poolBSC.close().catch(() => {});
  }
}
