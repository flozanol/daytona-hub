import { NextResponse } from 'next/server';
import sql from 'mssql';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  const pool = new sql.ConnectionPool(configBSC);
  try {
    await pool.connect();
    // Columnas de Inventory
    const cols = await pool.request().query('SELECT TOP 1 * FROM dbo.Inventory');
    const colNames = cols.recordset.length > 0 ? Object.keys(cols.recordset[0]) : [];
    // CpnyIDs distintos con MG
    const cpnys = await pool.request().query(
      "SELECT DISTINCT LTRIM(RTRIM(CpnyID)) AS CpnyId, LTRIM(RTRIM(SubBrandDescr)) AS SubBrandDescr, ModelYr, SUM(ISNULL(QtyAF,0)) AS QtyAF, SUM(ISNULL(QtyAP,0)) AS QtyAP FROM dbo.Inventory WHERE CpnyID LIKE '%MG%' AND (QtyAF>0 OR QtyAP>0) GROUP BY CpnyID, SubBrandDescr, ModelYr ORDER BY CpnyID, SubBrandDescr"
    );
    return NextResponse.json({
      columns: colNames,
      mg_inventory: cpnys.recordset
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  } finally {
    await pool.close().catch(() => {});
  }
}
