// Configuración global para las pruebas
const { execSync } = require('child_process');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Cargar variables de entorno
require('dotenv').config({ path: '.env.test' });

// Configuración de la base de datos de prueba
const testDbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'mundopatas_test',
  password: 'postgres',
  port: 5432,
};

// Crear una instancia de Pool para la base de datos de prueba
const testPool = new Pool(testDbConfig);

// Función para configurar la base de datos de prueba
const setupTestDatabase = async () => {
  try {
    // Conectar a la base de datos postgres predeterminada para crear la base de datos de prueba
    const adminPool = new Pool({
      ...testDbConfig,
      database: 'postgres' // Conectarse a la base de datos predeterminada
    });

    // Crear la base de datos de prueba si no existe
    await adminPool.query(`DROP DATABASE IF EXISTS ${testDbConfig.database}`);
    await adminPool.query(`CREATE DATABASE ${testDbConfig.database}`);
    
    // Cerrar la conexión de administración
    await adminPool.end();

    // Ejecutar migraciones en la base de datos de prueba
    const { execSync } = require('child_process');
    
    // Ejecutar migraciones
    execSync('npm run migrate', { 
      env: { 
        ...process.env, 
        NODE_ENV: 'test',
        DATABASE_URL: `postgresql://${testDbConfig.user}:${testDbConfig.password}@${testDbConfig.host}:${testDbConfig.port}/${testDbConfig.database}`
      },
      stdio: 'inherit' 
    });

    console.log('✅ Base de datos de prueba configurada correctamente');
  } catch (error) {
    console.error('❌ Error al configurar la base de datos de prueba:', error);
    process.exit(1);
  }
};

// Función para limpiar la base de datos después de las pruebas
const teardownTestDatabase = async () => {
  try {
    // Cerrar todas las conexiones a la base de datos de prueba
    await testPool.end();
    
    // Conectar a la base de datos postgres predeterminada para eliminar la base de datos de prueba
    const adminPool = new Pool({
      ...testDbConfig,
      database: 'postgres' // Conectarse a la base de datos predeterminada
    });

    // Terminar todas las conexiones a la base de datos de prueba
    await adminPool.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${testDbConfig.database}'
      AND pid <> pg_backend_pid();
    `);

    // Eliminar la base de datos de prueba
    await adminPool.query(`DROP DATABASE IF EXISTS ${testDbConfig.database}`);
    await adminPool.end();
    
    console.log('✅ Base de datos de prueba eliminada correctamente');
  } catch (error) {
    console.error('❌ Error al limpiar la base de datos de prueba:', error);
  }
};

// Exportar configuración
module.exports = {
  testPool,
  setupTestDatabase,
  teardownTestDatabase,
  testDbConfig
};
