const { Pool } = require('pg');
require('dotenv').config();

// Configuración de conexión
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/veterinaria',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testConnection() {
  console.log('🔍 Probando conexión a la base de datos...');
  
  try {
    // Intentar conectar a la base de datos
    const client = await pool.connect();
    console.log('✅ Conexión a PostgreSQL exitosa!');
    
    // Obtener información de la base de datos
    const dbInfo = await client.query('SELECT version(), current_database(), current_user');
    console.log('\n📊 Información de la base de datos:');
    console.log('----------------------------------------');
    console.log(`Versión de PostgreSQL: ${dbInfo.rows[0].version}`);
    console.log(`Base de datos actual: ${dbInfo.rows[0].current_database}`);
    console.log(`Usuario actual: ${dbInfo.rows[0].current_user}`);
    
    // Listar tablas existentes
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('\n📋 Tablas en la base de datos:');
    console.log('----------------------------------------');
    if (tables.rows.length > 0) {
      tables.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.table_name}`);
      });
    } else {
      console.log('No se encontraron tablas en la base de datos.');
      console.log('Ejecuta el script de inicialización: npm run db:init');
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos:');
    console.error(error.message);
    console.log('\n🔧 Solución de problemas:');
    console.log('1. Asegúrate de que el servicio de PostgreSQL esté en ejecución');
    console.log('2. Verifica las credenciales en el archivo .env');
    console.log('3. Intenta ejecutar: npm run db:init');
  } finally {
    // Cerrar el pool de conexiones
    await pool.end();
  }
}

testConnection();
