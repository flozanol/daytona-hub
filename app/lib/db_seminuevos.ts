import sql from 'mssql';
import { makeConfig } from './db-connection';

export async function getSeminuevos() {
  const pool = new sql.ConnectionPool(makeConfig(process.env.DB_NAME ?? 'BSC'));
  try {
    await pool.connect();
    const result = await pool.request().query(`
      SELECT
        TRIM(CpnyId)              AS CpnyID,
        TRIM(BrandDescr)          AS Marca,
        TRIM(SubBrandDescr)       AS Modelo,
        TRIM(VersionDescr)        AS Version,
        ModelYr                   AS Anio,
        TRIM(Color)               AS Color,
        UnitPrice                 AS PrecioVenta,
        Cost                      AS Costo,
        DaysOfAntique             AS Antiguedad,
        VIN,
        TRIM(FinancialStatus)     AS EstatusFinanciero
      FROM InventoryUsed
      WHERE QtyAS > 0
    `);
    return result.recordset;
  } finally {
    await pool.close().catch(() => {});
  }
}
