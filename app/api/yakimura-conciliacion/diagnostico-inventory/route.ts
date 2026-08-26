import { NextResponse } from 'next/server';
import sql from 'mssql';

const config: sql.config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER ?? '',
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT ?? 1433),
  options: { encrypt: true, trustServerCertificate: true },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

export async function GET() {
  const pool = new sql.ConnectionPool(config);

  try {
    await pool.connect();

    const columns = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Inventory'
      ORDER BY ORDINAL_POSITION
    `);

    const sample = await pool.request().query(`
      SELECT TOP 20
        CpnID, BrandDescr, SubBrandDescr, ModeloYr, Color,
        QtyAD, QtyAF, QtyAP, QtyDP
      FROM Inventory
      ORDER BY CpnID, BrandDescr, SubBrandDescr, ModeloYr, Color
    `);

    return NextResponse.json({
      table: 'Inventory',
      columns: columns.recordset,
      sample: sample.recordset,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Error diagnosticando Inventory',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  } finally {
    await pool.close().catch(() => undefined);
  }
}
