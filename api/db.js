const { Pool } = require('pg');
require('dotenv').config();

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Manejo de errores de conexión
pool.on('error', (err) => {
  console.error('Error inesperado en el cliente PostgreSQL', err);
  process.exit(-1);
});

// Función para ejecutar consultas SQL
executeQuery = async (query, params = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } catch (error) {
    console.error('Error al ejecutar la consulta:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Función para iniciar una transacción
const beginTransaction = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    return client;
  } catch (error) {
    client.release();
    throw error;
  }
};

// Función para hacer commit de una transacción
const commitTransaction = async (client) => {
  try {
    await client.query('COMMIT');
  } finally {
    client.release();
  }
};

// Función para hacer rollback de una transacción
const rollbackTransaction = async (client) => {
  try {
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  executeQuery,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
  pool
};
