// Configuración global para las pruebas
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.UPLOAD_DIR = './test-uploads';

// Configuración de la base de datos de prueba
process.env.TEST_DB_NAME = 'mundopatas_test';
process.env.TEST_DB_USER = 'postgres';
process.env.TEST_DB_PASSWORD = 'postgres';
process.env.TEST_DB_HOST = 'localhost';
process.env.TEST_DB_PORT = '5432';

// Configurar variables de entorno para la base de datos de prueba
process.env.DATABASE_URL = `postgres://${process.env.TEST_DB_USER}:${process.env.TEST_DB_PASSWORD}@${process.env.TEST_DB_HOST}:${process.env.TEST_DB_PORT}/${process.env.TEST_DB_NAME}`;

// Limpiar cualquier configuración de base de datos existente
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Función para limpiar la base de datos de prueba
const cleanDatabase = async () => {
    try {
        // Obtener todas las tablas de la base de datos
        const { rows } = await pool.query(`
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename != 'spatial_ref_sys'
        `);
        
        // Truncar todas las tablas (excepto las de migraciones)
        for (const row of rows) {
            if (!row.tablename.startsWith('knex_') && row.tablename !== 'migrations') {
                await pool.query(`TRUNCATE TABLE "${row.tablename}" CASCADE`);
            }
        }
        
        // Reiniciar las secuencias
        await pool.query(`
            SELECT setval(pg_get_serial_sequence('veterinarios', 'id'), 1, false);
            SELECT setval(pg_get_serial_sequence('clientes', 'id'), 1, false);
            SELECT setval(pg_get_serial_sequence('mascotas', 'id'), 1, false);
            SELECT setval(pg_get_serial_sequence('historias_clinicas', 'id'), 1, false);
            SELECT setval(pg_get_serial_sequence('tipos_consulta', 'id'), 1, false);
            SELECT setval(pg_get_serial_sequence('medicamentos', 'id'), 1, false);
        `);
        
        console.log('✅ Base de datos de prueba limpiada');
    } catch (error) {
        console.error('Error limpiando la base de datos de prueba:', error);
        throw error;
    }
};

// Antes de todas las pruebas
beforeAll(async () => {
    // Limpiar la base de datos
    await cleanDatabase();
    
    // Crear directorio de subidas de prueba si no existe
    const fs = require('fs');
    const path = require('path');
    const uploadDir = path.join(__dirname, '..', 'test-uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
});

// Después de todas las pruebas
afterAll(async () => {
    // Cerrar la conexión a la base de datos
    await pool.end();
    
    // Limpiar archivos de prueba
    const fs = require('fs');
    const path = require('path');
    const uploadDir = path.join(__dirname, '..', 'test-uploads');
    if (fs.existsSync(uploadDir)) {
        fs.rmSync(uploadDir, { recursive: true, force: true });
    }
});

// Exportar la configuración
module.exports = {
    cleanDatabase,
    pool
};
