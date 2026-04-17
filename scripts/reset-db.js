const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/veterinaria',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function resetDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Deshabilitar restricciones de clave foránea temporalmente
    await client.query('SET session_replication_role = "replica";');
    
    // Eliminar tablas si existen
    const tables = [
      'consultas', 'analisis', 'vacunas', 'facturas', 'factura_items',
      'citas', 'mascotas', 'clientes', 'veterinarios', 'licencias',
      'inventario_movimientos', 'inventario_productos', 'servicios',
      'notificaciones', 'alertas', 'valoraciones', 'pagos', 'configuraciones'
    ];
    
    for (const table of tables) {
      try {
        await client.query(`DROP TABLE IF EXISTS ${table} CASCADE;`);
        console.log(`✅ Tabla ${table} eliminada`);
      } catch (error) {
        console.error(`❌ Error eliminando tabla ${table}:`, error.message);
      }
    }
    
    // Volver a crear las tablas
    await client.query(`
      CREATE TABLE veterinarios (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        telefono VARCHAR(20),
        direccion TEXT,
        especialidad VARCHAR(100),
        role VARCHAR(20) DEFAULT 'veterinario',
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ultimo_acceso TIMESTAMP,
        activo BOOLEAN DEFAULT true
      );
      
      CREATE TABLE clientes (
        id SERIAL PRIMARY KEY,
        veterinario_id INTEGER REFERENCES veterinarios(id) ON DELETE CASCADE,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        telefono VARCHAR(20) NOT NULL,
        direccion TEXT,
        fecha_nacimiento DATE,
        notas TEXT,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        activo BOOLEAN DEFAULT true
      );
      
      CREATE TABLE mascotas (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
        nombre VARCHAR(100) NOT NULL,
        especie VARCHAR(50) NOT NULL,
        raza VARCHAR(100),
        fecha_nacimiento DATE,
        sexo VARCHAR(20),
        color VARCHAR(50),
        senas_particulares TEXT,
        esterilizado BOOLEAN DEFAULT false,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        activo BOOLEAN DEFAULT true
      );
      
      CREATE TABLE consultas (
        id SERIAL PRIMARY KEY,
        veterinario_id INTEGER NOT NULL REFERENCES veterinarios(id) ON DELETE CASCADE,
        mascota_id INTEGER NOT NULL REFERENCES mascotas(id) ON DELETE CASCADE,
        fecha_consulta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        motivo TEXT NOT NULL,
        diagnostico TEXT,
        tratamiento TEXT,
        observaciones TEXT,
        peso DECIMAL(5,2),
        temperatura DECIMAL(3,1),
        frecuencia_cardiaca INTEGER,
        frecuencia_respiratoria INTEGER,
        proxima_visita DATE,
        estado VARCHAR(20) DEFAULT 'pendiente',
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Crear más tablas según sea necesario...
    `);
    
    // Insertar datos de prueba
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Insertar veterinario de prueba
    const vetResult = await client.query(
      `INSERT INTO veterinarios 
       (nombre, apellido, email, password_hash, telefono, direccion, especialidad, role) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id`,
      ['Admin', 'Sistema', 'admin@sistema.com', hashedPassword, '123456789', 'Dirección de prueba', 'General', 'admin']
    );
    
    const vetId = vetResult.rows[0].id;
    
    // Insertar cliente de prueba
    const clientResult = await client.query(
      `INSERT INTO clientes 
       (veterinario_id, nombre, apellido, email, telefono, direccion) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id`,
      [vetId, 'Cliente', 'Prueba', 'cliente@prueba.com', '987654321', 'Dirección del cliente']
    );
    
    const clientId = clientResult.rows[0].id;
    
    // Insertar mascota de prueba
    const petResult = await client.query(
      `INSERT INTO mascotas 
       (cliente_id, nombre, especie, raza, fecha_nacimiento, sexo) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id`,
      [clientId, 'Firulais', 'Perro', 'Mestizo', '2020-01-01', 'Macho']
    );
    
    await client.query('COMMIT');
    console.log('✅ Base de datos reiniciada exitosamente');
    console.log('🔑 Credenciales de acceso:');
    console.log('   Email: admin@sistema.com');
    console.log('   Contraseña: admin123');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al reiniciar la base de datos:', error);
    throw error;
  } finally {
    // Restaurar restricciones de clave foránea
    await client.query('SET session_replication_role = "origin";');
    client.release();
    await pool.end();
  }
}

resetDatabase().catch(console.error);
