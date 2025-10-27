const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuración de la base de datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Interfaz para leer desde la consola
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Función para preguntar al usuario
const question = (query) => {
    return new Promise(resolve => rl.question(query, resolve));
};

// Función para leer archivos SQL
const readSQLFile = (filePath) => {
    const fullPath = path.join(__dirname, '..', filePath);
    return fs.readFileSync(fullPath, 'utf8');
};

// Función para ejecutar consultas SQL
const executeQuery = async (client, query) => {
    try {
        console.log('Ejecutando consulta...');
        await client.query(query);
    } catch (error) {
        console.error('Error ejecutando consulta:', error.message);
        throw error;
    }
};

// Función principal
const resetDatabase = async () => {
    // Verificar que no estemos en producción
    if (process.env.NODE_ENV === 'production') {
        console.error('¡ERROR! No se puede reiniciar la base de datos en producción.');
        process.exit(1);
    }

    console.log('¡ADVERTENCIA! Esto eliminará todos los datos de la base de datos.');
    console.log('Esta acción no se puede deshacer.\n');

    const confirm = await question('¿Estás seguro de que deseas continuar? (sí/no): ');
    
    if (!['s', 'si', 'sí', 'y', 'yes'].includes(confirm.toLowerCase())) {
        console.log('Operación cancelada.');
        rl.close();
        return;
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        console.log('\n🔧 Iniciando reinicio de la base de datos...');

        // 1. Eliminar tablas si existen
        console.log('\n🗑️  Eliminando tablas existentes...');
        await client.query(`
            DROP TABLE IF EXISTS interacciones_cliente CASCADE;
            DROP TABLE IF EXISTS cliente_etiquetas CASCADE;
            DROP TABLE IF EXISTS etiquetas CASCADE;
            DROP TABLE IF EXISTS direcciones_cliente CASCADE;
            DROP TABLE IF EXISTS segmentos CASCADE;
            DROP TABLE IF EXISTS clientes CASCADE;
            DROP TABLE IF EXISTS mascotas CASCADE;
            DROP TABLE IF EXISTS licencias CASCADE;
            DROP TABLE IF EXISTS veterinarios CASCADE;
            DROP TABLE IF EXISTS schema_migrations CASCADE;
        `);

        // 2. Volver a crear la estructura inicial
        console.log('\n🏗️  Creando estructura de la base de datos...');
        
        // Ejecutar migraciones iniciales
        const migrationsDir = path.join(__dirname, '../migrations');
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();

        for (const file of migrationFiles) {
            console.log(`\n🔄 Aplicando migración: ${file}`);
            const migrationSQL = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            const statements = migrationSQL.split(';')
                .map(statement => statement.trim())
                .filter(statement => statement.length > 0);

            for (const statement of statements) {
                if (statement.trim() !== '') {
                    await client.query(statement);
                }
            }
            
            // Registrar migración
            await client.query(
                'INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING',
                [file]
            );
        }

        // 3. Insertar datos iniciales
        console.log('\n📝 Insertando datos iniciales...');
        
        // Insertar segmentos por defecto
        await client.query(`
            INSERT INTO segmentos (nombre, descripcion, color) VALUES
                ('Clientes frecuentes', 'Clientes que visitan la clínica regularmente', '#2ecc71'),
                ('Clientes ocasionales', 'Clientes que visitan la clínica ocasionalmente', '#f39c12'),
                ('Clientes inactivos', 'Clientes que no han visitado la clínica en más de 6 meses', '#e74c3c'),
                ('Clientes potenciales', 'Clientes que han mostrado interés pero aún no han realizado una compra', '#3498db'),
                ('Clientes corporativos', 'Empresas o negocios que utilizan nuestros servicios', '#9b59b6')
            ON CONFLICT DO NOTHING;
        `);

        await client.query('COMMIT');
        console.log('\n✅ Base de datos reiniciada exitosamente!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Error al reiniciar la base de datos:', error);
        process.exit(1);
    } finally {
        client.release();
        rl.close();
    }
};

// Ejecutar el script
resetDatabase().catch(err => {
    console.error('Error inesperado:', err);
    process.exit(1);
});
