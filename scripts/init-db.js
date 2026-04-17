const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/veterinaria',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔧 Inicializando base de datos...');
    
    // Crear tabla de veterinarios si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS veterinarios (
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
    `);
    
    // Crear tabla de clientes
    await client.query(`
      CREATE TABLE IF NOT EXISTS clientes (
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
    `);
    
    // Crear tabla de mascotas
    await client.query(`
      CREATE TABLE IF NOT EXISTS mascotas (
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
    `);
    
    // Crear tabla de consultas
    await client.query(`
      CREATE TABLE IF NOT EXISTS consultas (
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
    `);
    
    // Verificar si ya existe el usuario admin
    const adminExists = await client.query(
      'SELECT id FROM veterinarios WHERE email = $1', 
      ['admin@mundopatas.com']
    );
    
    if (adminExists.rows.length === 0) {
      // Crear usuario administrador por defecto
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      
      const adminResult = await client.query(
        `INSERT INTO veterinarios 
         (nombre, apellido, email, password_hash, telefono, role) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id`,
        ['Admin', 'Sistema', 'admin@mundopatas.com', hashedPassword, '123456789', 'admin']
      );
      
      console.log('👤 Usuario administrador creado:');
      console.log('   Email: admin@mundopatas.com');
      console.log('   Contraseña: Admin123!');
      
      const adminId = adminResult.rows[0].id;
      
      // Crear cliente de ejemplo
      const clienteResult = await client.query(
        `INSERT INTO clientes 
         (veterinario_id, nombre, apellido, email, telefono) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id`,
        [adminId, 'Juan', 'Pérez', 'cliente@ejemplo.com', '987654321']
      );
      
      const clienteId = clienteResult.rows[0].id;
      
      // Crear mascota de ejemplo
      await client.query(
        `INSERT INTO mascotas 
         (cliente_id, nombre, especie, raza, fecha_nacimiento, sexo) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [clienteId, 'Firulais', 'Perro', 'Labrador', '2020-01-01', 'Macho']
      );
      
      console.log('✅ Datos de prueba creados exitosamente');
    } else {
      console.log('ℹ️  El usuario administrador ya existe en la base de datos');
    }
    
    await client.query('COMMIT');
    console.log('✅ Base de datos inicializada correctamente');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al inicializar la base de datos:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase().catch(console.error);
