const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración de la base de datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

console.log('🔍 Configuración de base de datos:');
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Definida' : 'No definida');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'development');

async function runMigration() {
    console.log('\n🚀 Iniciando migración...');
    
    const client = await pool.connect().catch(err => {
        console.error('❌ Error al conectar a la base de datos:', err.message);
        console.log('\n🔧 Verifica que:');
        console.log('1. La base de datos esté en ejecución');
        console.log('2. La cadena de conexión sea correcta');
        console.log('3. Las credenciales sean válidas');
        process.exit(1);
    });
    
    try {
        console.log('✅ Conexión a la base de datos establecida');
        
        // Verificar si la tabla consultas existe
        const tableExists = await client.query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'consultas')"
        );
        
        if (!tableExists.rows[0].exists) {
            throw new Error('La tabla "consultas" no existe en la base de datos');
        }
        
        await client.query('BEGIN');
        console.log('\n🔄 Agregando columnas a la tabla consultas...');

        // Lista de columnas a agregar
        const columns = [
            'estado_corporal TEXT',
            'manto_piloso TEXT',
            'tiempo_llenado_capilar TEXT',
            'frecuencia_cardiaca TEXT',
            'frecuencia_respiratoria TEXT',
            'peso TEXT',
            'temperatura TEXT',
            'ganglios_linfaticos TEXT',
            'tonalidad_mucosa TEXT',
            'examen_bucal TEXT',
            'examen_ocular TEXT',
            'examen_otico TEXT',
            'examen_neurologico TEXT',
            'examen_aparato_locomotor TEXT',
            'tipo_analisis TEXT',
            'fecha_analisis DATE',
            'resultados_analisis TEXT',
            'archivo_analisis_url TEXT',
            'electrocardiograma TEXT',
            'medicion_presion_arterial TEXT',
            'ecocardiograma TEXT',
            'desparasitacion TEXT',
            'fecha_desparasitacion DATE',
            'producto_desparasitacion TEXT',
            'diagnostico_presuntivo TEXT',
            'diagnostico_final TEXT',
            'medicamento TEXT',
            'dosis TEXT',
            'intervalo TEXT',
            'tratamiento_inyectable TEXT'
        ];

        let columnsAdded = 0;
        let columnsSkipped = 0;

        // Agregar cada columna si no existe
        for (const column of columns) {
            const columnName = column.split(' ')[0];
            
            try {
                // Verificar si la columna ya existe
                const checkQuery = `
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'consultas' AND column_name = $1
                `;
                
                const result = await client.query(checkQuery, [columnName]);
                
                if (result.rows.length === 0) {
                    console.log(`   ➕ Agregando columna: ${columnName}`);
                    await client.query(`ALTER TABLE consultas ADD COLUMN ${column}`);
                    columnsAdded++;
                } else {
                    console.log(`   ⏭️  La columna ${columnName} ya existe`);
                    columnsSkipped++;
                }
            } catch (error) {
                console.error(`   ❌ Error al procesar la columna ${columnName}:`, error.message);
                throw error;
            }
        }

        await client.query('COMMIT');
        console.log('\n✅ Migración completada exitosamente');
        console.log(`📊 Resumen:`);
        console.log(`   - Columnas agregadas: ${columnsAdded}`);
        console.log(`   - Columnas que ya existían: ${columnsSkipped}`);
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Error en la migración:', error.message);
        console.error('   Detalles técnicos:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
        console.log('\n🔒 Conexión a la base de datos cerrada');
    }
}

// Ejecutar la migración
console.log('\n🔄 Iniciando proceso de migración...');
runMigration()
    .then(() => {
        console.log('\n✨ ¡Migración completada con éxito!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ La migración ha fallado');
        console.error('   Razón:', error.message);
        console.log('\n🔧 Solución de problemas:');
        console.log('1. Verifica que la base de datos esté en ejecución');
        console.log('2. Comprueba la configuración de conexión en Render');
        console.log('3. Asegúrate de que la tabla "consultas" exista');
        console.log('4. Verifica los logs de Render para más detalles');
        process.exit(1);
    });
