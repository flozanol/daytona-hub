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

export async function getInventory() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    const result = await pool.request().query(`
      SELECT
        TRIM(CpnyID)         AS CpnyID,
        TRIM(BrandDescr)     AS BrandDescr,
        TRIM(SubBrandDescr)  AS Modelo,
        TRIM(VersionDescr)   AS Version,
        ModelYr              AS Anio,
        TRIM(Color)          AS Color,
        UnitPrice            AS Precio,
        DaysOfAntique        AS Antiguedad,
        VIN,
        CostAD, CostAF, CostAP, CostDP,
        QtyAD, QtyAF, QtyAP, QtyDP,
        TRIM(SiteName)       AS Ubicacion
      FROM Inventory
      WHERE QtyAF > 0 OR QtyDP > 0 OR QtyAP > 0 OR QtyAD > 0
    `);
    return result.recordset;
  } finally {
    await pool.close().catch(() => {});
  }
}
