const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración de la base de datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Tabla para control de migraciones
const MIGRATIONS_TABLE = 'schema_migrations';
const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

async function createMigrationsTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

async function getExecutedMigrations() {
    const result = await pool.query(`SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY name`);
    return result.rows.map(row => row.name);
}

async function markMigrationAsExecuted(migrationName, client) {
    await client.query(
        `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1) ON CONFLICT DO NOTHING`,
        [migrationName]
    );
}

async function runMigrations() {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Crear tabla de migraciones si no existe
        await client.query(`
            CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Obtener migraciones ya ejecutadas
        const executedMigrations = (await client.query(
            `SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY name`
        )).rows.map(row => row.name);
        
        // Leer archivos de migración
        const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
            .filter(file => file.endsWith('.sql'))
            .sort();
        
        // Ejecutar migraciones pendientes
        for (const file of migrationFiles) {
            if (!executedMigrations.includes(file)) {
                console.log(`Ejecutando migración: ${file}`);
                const migrationSQL = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
                
                // Ejecutar cada sentencia SQL por separado
                const statements = migrationSQL.split(';')
                    .map(statement => statement.trim())
                    .filter(statement => statement.length > 0);
                
                for (const statement of statements) {
                    if (statement.trim() !== '') {
                        try {
                            await client.query(statement);
                        } catch (error) {
                            console.error(`Error ejecutando sentencia en ${file}:`, error);
                            throw error;
                        }
                    }
                }
                
                // Marcar migración como ejecutada
                await client.query(
                    `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1) ON CONFLICT DO NOTHING`,
                    [file]
                );
                
                console.log(`Migración completada: ${file}`);
            }
        }
        
        await client.query('COMMIT');
        console.log('Todas las migraciones se han ejecutado correctamente');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error ejecutando migraciones:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Ejecutar migraciones
runMigrations().catch(err => {
    console.error('Error en la ejecución de migraciones:', err);
    process.exit(1);
});
