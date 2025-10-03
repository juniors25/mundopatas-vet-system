#!/usr/bin/env node

/**
 * SCRIPT DE MIGRACIÓN - TABLA CONSULTAS
 * 
 * Este script agrega los nuevos campos a la tabla consultas existente
 * para integrar análisis, vacunas y desparasitación.
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrarConsultas() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔄 MIGRACIÓN DE TABLA CONSULTAS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    try {
        console.log('📡 Conectando a la base de datos...');
        await pool.query('SELECT NOW()');
        console.log('✅ Conexión establecida');
        console.log('');

        console.log('🔍 Verificando campos existentes...');
        
        // Agregar nuevos campos si no existen
        const campos = [
            // Semiología y examen físico
            { nombre: 'estado_corporal', tipo: 'TEXT', descripcion: 'Estado corporal' },
            { nombre: 'manto_piloso', tipo: 'TEXT', descripcion: 'Manto piloso' },
            { nombre: 'tiempo_llenado_capilar', tipo: 'TEXT', descripcion: 'Tiempo llenado capilar' },
            { nombre: 'frecuencia_cardiaca', tipo: 'TEXT', descripcion: 'Frecuencia cardíaca' },
            { nombre: 'frecuencia_respiratoria', tipo: 'TEXT', descripcion: 'Frecuencia respiratoria' },
            { nombre: 'ganglios_linfaticos', tipo: 'TEXT', descripcion: 'Ganglios linfáticos' },
            { nombre: 'tonalidad_mucosa', tipo: 'TEXT', descripcion: 'Tonalidad mucosa' },
            { nombre: 'examen_bucal', tipo: 'TEXT', descripcion: 'Examen bucal' },
            { nombre: 'examen_ocular', tipo: 'TEXT', descripcion: 'Examen ocular' },
            { nombre: 'examen_otico', tipo: 'TEXT', descripcion: 'Examen ótico' },
            { nombre: 'examen_neurologico', tipo: 'TEXT', descripcion: 'Examen neurológico' },
            { nombre: 'examen_aparato_locomotor', tipo: 'TEXT', descripcion: 'Examen aparato locomotor' },
            
            // Estudios complementarios
            { nombre: 'tipo_analisis', tipo: 'TEXT', descripcion: 'Tipo de análisis' },
            { nombre: 'fecha_analisis', tipo: 'DATE', descripcion: 'Fecha análisis' },
            { nombre: 'resultados_analisis', tipo: 'TEXT', descripcion: 'Resultados análisis' },
            { nombre: 'archivo_analisis_url', tipo: 'TEXT', descripcion: 'Archivo análisis URL' },
            { nombre: 'electrocardiograma', tipo: 'TEXT', descripcion: 'Electrocardiograma' },
            { nombre: 'medicion_presion_arterial', tipo: 'TEXT', descripcion: 'Medición presión arterial' },
            { nombre: 'ecocardiograma', tipo: 'TEXT', descripcion: 'Ecocardiograma' },
            
            // Desparasitación
            { nombre: 'desparasitacion', tipo: 'TEXT', descripcion: 'Desparasitación' },
            { nombre: 'fecha_desparasitacion', tipo: 'DATE', descripcion: 'Fecha desparasitación' },
            { nombre: 'producto_desparasitacion', tipo: 'TEXT', descripcion: 'Producto desparasitación' },
            
            // Diagnóstico
            { nombre: 'diagnostico_presuntivo', tipo: 'TEXT', descripcion: 'Diagnóstico presuntivo' },
            { nombre: 'diagnostico_final', tipo: 'TEXT', descripcion: 'Diagnóstico final' },
            
            // Tratamiento
            { nombre: 'medicamento', tipo: 'TEXT', descripcion: 'Medicamento' },
            { nombre: 'dosis', tipo: 'TEXT', descripcion: 'Dosis' },
            { nombre: 'intervalo', tipo: 'TEXT', descripcion: 'Intervalo' },
            { nombre: 'tratamiento_inyectable', tipo: 'TEXT', descripcion: 'Tratamiento inyectable' }
        ];

        let camposAgregados = 0;
        let camposExistentes = 0;

        for (const campo of campos) {
            try {
                // Verificar si el campo existe
                const checkQuery = `
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'consultas' 
                        AND column_name = $1
                `;
                
                const result = await pool.query(checkQuery, [campo.nombre]);
                
                if (result.rows.length === 0) {
                    // Campo no existe, agregarlo
                    const alterQuery = `ALTER TABLE consultas ADD COLUMN ${campo.nombre} ${campo.tipo}`;
                    await pool.query(alterQuery);
                    console.log(`   ✅ Campo agregado: ${campo.nombre} (${campo.descripcion})`);
                    camposAgregados++;
                } else {
                    console.log(`   ℹ️  Campo ya existe: ${campo.nombre}`);
                    camposExistentes++;
                }
            } catch (error) {
                console.error(`   ❌ Error con campo ${campo.nombre}:`, error.message);
            }
        }

        // Renombrar campos antiguos si existen
        console.log('');
        console.log('🔄 Renombrando campos antiguos...');
        
        try {
            // Renombrar peso_actual a peso si existe
            const checkPeso = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'consultas' AND column_name = 'peso_actual'
            `);
            
            if (checkPeso.rows.length > 0) {
                await pool.query('ALTER TABLE consultas RENAME COLUMN peso_actual TO peso');
                console.log('   ✅ Campo peso_actual renombrado a peso');
            }
        } catch (error) {
            console.log('   ℹ️  Campo peso_actual ya fue renombrado o no existe');
        }

        try {
            // Renombrar diagnostico a diagnostico_final si existe y no hay diagnostico_final
            const checkDiag = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'consultas' AND column_name = 'diagnostico'
            `);
            
            const checkDiagFinal = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'consultas' AND column_name = 'diagnostico_final'
            `);
            
            if (checkDiag.rows.length > 0 && checkDiagFinal.rows.length === 0) {
                await pool.query('ALTER TABLE consultas RENAME COLUMN diagnostico TO diagnostico_final');
                console.log('   ✅ Campo diagnostico renombrado a diagnostico_final');
            }
        } catch (error) {
            console.log('   ℹ️  Campo diagnostico ya fue procesado');
        }

        try {
            // Renombrar tratamiento si existe
            const checkTrat = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'consultas' AND column_name = 'tratamiento'
            `);
            
            if (checkTrat.rows.length > 0) {
                // Si existe tratamiento pero no medicamento, copiar datos
                await pool.query(`
                    UPDATE consultas 
                    SET medicamento = tratamiento 
                    WHERE medicamento IS NULL AND tratamiento IS NOT NULL
                `);
                console.log('   ✅ Datos de tratamiento copiados a medicamento');
            }
        } catch (error) {
            console.log('   ℹ️  Campo tratamiento ya fue procesado');
        }

        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 RESUMEN DE MIGRACIÓN');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`✅ Campos agregados: ${camposAgregados}`);
        console.log(`ℹ️  Campos existentes: ${camposExistentes}`);
        console.log(`📝 Total campos procesados: ${campos.length}`);
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
        console.log('🎉 ¡Migración completada exitosamente!');
        console.log('');

        await pool.end();
        process.exit(0);

    } catch (error) {
        console.error('');
        console.error('═══════════════════════════════════════════════════════════');
        console.error('❌ ERROR EN MIGRACIÓN');
        console.error('═══════════════════════════════════════════════════════════');
        console.error(error);
        console.error('═══════════════════════════════════════════════════════════');
        console.error('');
        await pool.end();
        process.exit(1);
    }
}

// Ejecutar migración
migrarConsultas();
