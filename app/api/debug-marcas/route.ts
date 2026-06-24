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
    const subMarcaCol = ['SubMarca', 'SubBrandDescr'].find(c => cols.includes(c)) ?? 'SubMarca';

    // SubMarcas en Intranet para Acura y Honda
    const submarcasResult = await poolIntranet.request().query(`
      SELECT DISTINCT
        LTRIM(RTRIM([${cpnyCol}])) AS CpnyId,
        LTRIM(RTRIM([${marcaCol}])) AS Marca,
        LTRIM(RTRIM([${subMarcaCol}])) AS SubMarca
      FROM dbo.vw_VentasUltimos4Periodos
      WHERE LTRIM(RTRIM([${cpnyCol}])) IN ('ACUI', 'CUA', 'INT')
      ORDER BY CpnyId, SubMarca
    `);

    // Inventario en BSC para las mismas empresas
    const invResult = await poolBSC.request().query(`
      SELECT
        LTRIM(RTRIM(CpnyID)) AS CpnyId,
        LTRIM(RTRIM(BrandDescr)) AS BrandDescr,
        LTRIM(RTRIM(SubBrandDescr)) AS SubBrandDescr,
        SUM(ISNULL(QtyAF,0)) AS QtyAF,
        SUM(ISNULL(QtyAP,0)) AS QtyAP
      FROM dbo.Inventory
      WHERE LTRIM(RTRIM(CpnyID)) IN ('ACUI', 'CUA', 'INT')
        AND (QtyAF > 0 OR QtyAP > 0 OR QtyDP > 0 OR QtyAD > 0)
      GROUP BY LTRIM(RTRIM(CpnyID)), LTRIM(RTRIM(BrandDescr)), LTRIM(RTRIM(SubBrandDescr))
      ORDER BY CpnyId, SubBrandDescr
    `);

    return NextResponse.json({
      subMarcaColDetectada: subMarcaCol,
      submarcas_ventas_acura_honda: submarcasResult.recordset,
      inventory_acura_honda: invResult.recordset,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    await poolIntranet.close().catch(() => {});
    await poolBSC.close().catch(() => {});
  }
}
