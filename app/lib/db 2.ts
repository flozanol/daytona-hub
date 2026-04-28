import sql from 'mssql';

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || '',
    database: process.env.DB_NAME,
    options: {
        encrypt: true, // Obligatorio para Azure/Nube
        trustServerCertificate: false // Cambia a true si el servidor no tiene SSL válido
    }
};

export async function getInventory() {
    try {
        let pool = await sql.connect(config);
        // Aquí sustituye 'Inventario' por el nombre real de tu tabla o vista
        let result = await pool.request().query('SELECT * FROM Inventario');
        return result.recordset;
    } catch (err) {
        console.error('Error de conexión a SQL Server:', err);
        throw err;
    }
}