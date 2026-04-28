import sql from 'mssql';

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || '',
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '1433'),
    options: {
        encrypt: true, 
        trustServerCertificate: true 
    }
};

export async function getSeminuevos() {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().query(`
            SELECT 
                TRIM(CpnyID) as CpnyID,
                TRIM(BrandDescr) as Marca, 
                TRIM(SubBrandDescr) as Modelo, 
                ModelYr as Anio,
                TRIM(Color) as Color,
                UnitePrice as PrecioVenta, -- Corregido de UnitPrice a UnitePrice
                Cost as Costo,
                DaysOfAntique as Antiguedad,
                VIN,
                TRIM(FinancialStatus) as EstatusFinanciero,
                TRIM(SiteName) as Ubicacion
            FROM InventoryUsed 
            WHERE QtyAS > 0 -- Usando tu columna confirmada QtyAS
        `);
        return result.recordset;
    } catch (err) {
        console.error('Error detallado de SQL:', err);
        throw err;
    }
}