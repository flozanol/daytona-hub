import sql from 'mssql';

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || '',
    database: process.env.DB_NAME,
    // Agregamos el puerto explícitamente
    port: parseInt(process.env.DB_PORT || '1433'),
    options: {
        encrypt: true, 
        trustServerCertificate: true 
    },
    // Recomendado para conexiones desde la nube
    connectionTimeout: 30000,
    requestTimeout: 30000
};

export async function getInventory() {
    try {
        let pool = await sql.connect(config);
        
        let result = await pool.request().query(`
            SELECT 
                TRIM(CpnyID) as CpnyID,
                TRIM(BrandDescr) as BrandDescr, 
                TRIM(SubBrandDescr) as Modelo, 
                TRIM(VersionDescr) as Version,
                ModelYr as Anio,
                TRIM(Color) as Color,
                UnitPrice as Precio,
                DaysOfAntique as Antiguedad,
                VIN,
                CostAD,
                CostAF,
                CostAP,
                CostDP,
                -- Traemos todas las columnas de cantidad para la lógica del frontend
                QtyAD,
                QtyAF,
                QtyAP,
                QtyDP,
                TRIM(SiteName) as Ubicacion
            FROM Inventory 
            -- Ajustamos el filtro para incluir CUALQUIER auto que tenga existencia
            WHERE QtyAF > 0 OR QtyDP > 0 OR QtyAP > 0 OR QtyAD > 0
        `);
        
        return result.recordset;
    } catch (err) {
        console.error('Error de conexión a SQL Server:', err);
        throw err;
    }
}