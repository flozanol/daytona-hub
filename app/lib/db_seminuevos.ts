import sql from 'mssql';

const config: sql.config = {
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server:   process.env.DB_SERVER ?? '',
  database: process.env.DB_NAME,
  port:     parseInt(process.env.DB_PORT ?? '1433'),
  options:  { encrypt: true, trustServerCertificate: true },
  connectionTimeout: 30_000,
  requestTimeout:    30_000,
};

export async function getSeminuevos() {
  const pool = new sql.ConnectionPool(config);
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
