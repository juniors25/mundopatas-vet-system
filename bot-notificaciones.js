#!/usr/bin/env node

/**
 * BOT DE NOTIFICACIONES AUTOMÁTICAS
 * 
 * Este script verifica el alimento de todas las mascotas y envía notificaciones
 * automáticas a los clientes cuando el alimento está por terminarse.
 * 
 * Uso:
 * - Ejecución manual: node bot-notificaciones.js
 * - Ejecución programada: Configurar con cron (Linux/Mac) o Task Scheduler (Windows)
 * 
 * Configuración recomendada:
 * - Ejecutar diariamente a las 9:00 AM
 * - Cron: 0 9 * * * node /ruta/al/bot-notificaciones.js
 */

require('dotenv').config();
const { verificarAlimentoMascotas } = require('./services/verificador-alimento');
const { initializeDatabase } = require('./database-postgres');

async function ejecutarBot() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🤖 BOT DE NOTIFICACIONES - MUNDO PATAS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`⏰ Fecha y hora: ${new Date().toLocaleString('es-AR')}`);
    console.log('');

    try {
        // Inicializar base de datos
        console.log('🔌 Conectando a la base de datos...');
        await initializeDatabase();
        console.log('✅ Conexión establecida');
        console.log('');

        // Ejecutar verificación
        console.log('🔍 Iniciando verificación de alimento...');
        console.log('');
        
        const resultado = await verificarAlimentoMascotas();
        
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 RESUMEN DE EJECUCIÓN');
        console.log('═══════════════════════════════════════════════════════════');
        
        if (resultado.success) {
            console.log('✅ Estado: EXITOSO');
            console.log(`📋 Mascotas verificadas: ${resultado.mascotasVerificadas}`);
            console.log(`⚠️  Alertas generadas: ${resultado.alertasGeneradas}`);
            console.log(`📧 Notificaciones enviadas: ${resultado.notificacionesEnviadas}`);
            
            if (resultado.notificacionesEnviadas === 0 && resultado.alertasGeneradas === 0) {
                console.log('');
                console.log('ℹ️  No se encontraron mascotas con alimento bajo.');
                console.log('   Todas las mascotas tienen suficiente alimento.');
            }
        } else {
            console.log('❌ Estado: ERROR');
            console.log(`⚠️  Mensaje: ${resultado.error}`);
        }
        
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
        
        // Cerrar conexión y salir
        process.exit(resultado.success ? 0 : 1);
        
    } catch (error) {
        console.error('');
        console.error('═══════════════════════════════════════════════════════════');
        console.error('❌ ERROR CRÍTICO');
        console.error('═══════════════════════════════════════════════════════════');
        console.error(error);
        console.error('═══════════════════════════════════════════════════════════');
        console.error('');
        process.exit(1);
    }
}

// Ejecutar bot
ejecutarBot();
