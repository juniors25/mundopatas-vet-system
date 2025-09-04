const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const fs = require('fs');

// Configuración PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mundopatas',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Función para migrar datos de SQLite a PostgreSQL
async function migrateData() {
    console.log('🔄 Iniciando migración de SQLite a PostgreSQL...');
    
    try {
        // Verificar si existe la base de datos SQLite
        if (!fs.existsSync('./veterinaria.db')) {
            console.log('⚠️  No se encontró base de datos SQLite. Creando base PostgreSQL vacía...');
            return;
        }

        // Conectar a SQLite
        const sqliteDb = new sqlite3.Database('./veterinaria.db');
        
        // Migrar veterinarios
        console.log('📋 Migrando veterinarios...');
        const veterinarios = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM veterinarios', (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        for (const vet of veterinarios) {
            await pool.query(
                'INSERT INTO veterinarios (nombre_veterinaria, nombre_veterinario, email, password, telefono, direccion, rol, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (email) DO NOTHING',
                [vet.nombre_veterinaria, vet.nombre_veterinario, vet.email, vet.password, vet.telefono, vet.direccion, vet.rol || 'admin', vet.fecha_registro || new Date()]
            );
        }
        console.log(`✅ ${veterinarios.length} veterinarios migrados`);

        // Migrar clientes
        console.log('📋 Migrando clientes...');
        const clientes = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM clientes', (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        for (const cliente of clientes) {
            await pool.query(
                'INSERT INTO clientes (veterinario_id, nombre, apellido, email, telefono, direccion, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING',
                [cliente.veterinario_id, cliente.nombre, cliente.apellido, cliente.email, cliente.telefono, cliente.direccion, cliente.fecha_registro || new Date()]
            );
        }
        console.log(`✅ ${clientes.length} clientes migrados`);

        // Migrar mascotas
        console.log('📋 Migrando mascotas...');
        const mascotas = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM mascotas', (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        for (const mascota of mascotas) {
            await pool.query(
                'INSERT INTO mascotas (veterinario_id, cliente_id, nombre, especie, raza, edad, peso, color, sexo, observaciones, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
                [mascota.veterinario_id, mascota.cliente_id, mascota.nombre, mascota.especie, mascota.raza, mascota.edad, mascota.peso, mascota.color, mascota.sexo, mascota.observaciones, mascota.fecha_registro || new Date()]
            );
        }
        console.log(`✅ ${mascotas.length} mascotas migradas`);

        // Migrar consultas
        console.log('📋 Migrando consultas...');
        const consultas = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM consultas', (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        for (const consulta of consultas) {
            await pool.query(
                'INSERT INTO consultas (veterinario_id, cliente_id, mascota_id, fecha_consulta, motivo, diagnostico, tratamiento, observaciones, peso_actual, temperatura, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
                [consulta.veterinario_id, consulta.cliente_id, consulta.mascota_id, consulta.fecha_consulta, consulta.motivo, consulta.diagnostico, consulta.tratamiento, consulta.observaciones, consulta.peso_actual, consulta.temperatura, consulta.fecha_consulta || new Date()]
            );
        }
        console.log(`✅ ${consultas.length} consultas migradas`);

        // Migrar análisis
        console.log('📋 Migrando análisis...');
        const analisis = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM analisis', (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        for (const item of analisis) {
            await pool.query(
                'INSERT INTO analisis (veterinario_id, cliente_id, mascota_id, tipo_analisis, fecha_analisis, resultados, observaciones, archivo_url, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                [item.veterinario_id, item.cliente_id, item.mascota_id, item.tipo_analisis, item.fecha_analisis, item.resultados, item.observaciones, item.archivo_adjunto, item.fecha_analisis || new Date()]
            );
        }
        console.log(`✅ ${analisis.length} análisis migrados`);

        // Migrar vacunas
        console.log('📋 Migrando vacunas...');
        const vacunas = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM vacunas', (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        for (const vacuna of vacunas) {
            await pool.query(
                'INSERT INTO vacunas (veterinario_id, cliente_id, mascota_id, nombre_vacuna, fecha_aplicacion, fecha_vencimiento, lote, observaciones, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                [vacuna.veterinario_id, vacuna.cliente_id, vacuna.mascota_id, vacuna.nombre_vacuna, vacuna.fecha_aplicacion, vacuna.fecha_vencimiento, vacuna.lote, vacuna.observaciones, vacuna.fecha_aplicacion || new Date()]
            );
        }
        console.log(`✅ ${vacunas.length} vacunas migradas`);

        // Cerrar conexión SQLite
        sqliteDb.close();
        
        console.log('🎉 ¡Migración completada exitosamente!');
        console.log('📊 Resumen:');
        console.log(`   - ${veterinarios.length} veterinarios`);
        console.log(`   - ${clientes.length} clientes`);
        console.log(`   - ${mascotas.length} mascotas`);
        console.log(`   - ${consultas.length} consultas`);
        console.log(`   - ${analisis.length} análisis`);
        console.log(`   - ${vacunas.length} vacunas`);
        
    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
    migrateData().catch(console.error);
}

module.exports = { migrateData };
