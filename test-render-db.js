const { Pool } = require('pg');

// Configuración de conexión a la base de datos de Render
const pool = new Pool({
  connectionString: 'postgresql://mundopatas:V2h8GAdBJXe4rKoCAfnc5DGORMbmbmvb@dpg-d2vmcrer433s73c34ibg-a.oregon-postgres.render.com/mundopatas_e7pv',
  ssl: { rejectUnauthorized: false } // Necesario para Render
});

async function testConnection() {
  console.log('🔍 Probando conexión a la base de datos de Render...');
  
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
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos:');
    console.error(error.message);
    console.log('\n🔧 Solución de problemas:');
    console.log('1. Verifica que la base de datos esté activa en Render');
    console.log('2. Revisa si la URL de conexión es correcta');
    console.log('3. Verifica que las credenciales sean correctas');
  } finally {
    // Cerrar el pool de conexiones
    await pool.end();
  }
}

testConnection();
