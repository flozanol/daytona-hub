import sql from 'mssql';

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || '',
    database: process.env.DB_NAME,
    options: {
        encrypt: true, // Obligatorio para Azure/Nube
        trustServerCertificate: true // Cambia a true si el servidor no tiene SSL válido
    }
};

// export async function getInventory() {
//    try {
//        let pool = await sql.connect(config);
//        // Aquí sustituye 'Inventario' por el nombre real de tu tabla o vista
//        let result = await pool.request().query('SELECT * FROM Inventory');
//        return result.recordset;
//    } catch (err) {
//        console.error('Error de conexión a SQL Server:', err);
//        throw err;
//    }
// }
export async function getInventory() {
    try {
        let pool = await sql.connect(config);
        
        // Esta es la consulta "profesional" para tu clínica
        let result = await pool.request().query(`
            SELECT 
                TRIM(CpnyID) as CpnyID,
                TRIM(BrandDescr) as Marca, 
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
                TRIM(SiteName) as Ubicacion,
                QtyAF,
                QtyDP
            FROM Inventory 
            WHERE QtyAF > 0 OR QtyDP > 0
        `);
        
        return result.recordset;
    } catch (err) {
        console.error('Error de conexión a SQL Server:', err);
        throw err;
    }
}