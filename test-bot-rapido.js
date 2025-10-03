#!/usr/bin/env node

/**
 * SCRIPT DE PRUEBA RÁPIDA DEL BOT
 * 
 * Este script verifica que todos los componentes del bot estén funcionando correctamente
 * sin enviar notificaciones reales.
 */

require('dotenv').config();
const { pool, initializeDatabase } = require('./database-postgres');

async function testBot() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧪 PRUEBA RÁPIDA DEL BOT DE NOTIFICACIONES');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    const resultados = {
        database: false,
        mascotas: false,
        configuracion: false,
        email: false,
        whatsapp: false,
        telegram: false
    };

    try {
        // 1. Probar conexión a base de datos
        console.log('1️⃣  Probando conexión a base de datos...');
        await initializeDatabase();
        resultados.database = true;
        console.log('   ✅ Conexión exitosa');
        console.log('');

        // 2. Verificar mascotas con datos de alimento
        console.log('2️⃣  Verificando mascotas con datos de alimento...');
        const mascotasQuery = `
            SELECT COUNT(*) as total
            FROM mascotas
            WHERE peso_bolsa_kg IS NOT NULL 
                AND gramos_diarios IS NOT NULL 
                AND fecha_inicio_bolsa IS NOT NULL
        `;
        const mascotasResult = await pool.query(mascotasQuery);
        const totalMascotas = parseInt(mascotasResult.rows[0].total);
        
        if (totalMascotas > 0) {
            resultados.mascotas = true;
            console.log(`   ✅ Encontradas ${totalMascotas} mascotas con datos de alimento`);
        } else {
            console.log('   ⚠️  No hay mascotas con datos de alimento configurados');
            console.log('   💡 Agrega datos de alimento a una mascota para probar el bot');
        }
        console.log('');

        // 3. Verificar configuración de notificaciones
        console.log('3️⃣  Verificando configuración de notificaciones...');
        const configQuery = 'SELECT COUNT(*) as total FROM notificaciones_config';
        const configResult = await pool.query(configQuery);
        const totalConfig = parseInt(configResult.rows[0].total);
        
        if (totalConfig > 0) {
            resultados.configuracion = true;
            console.log(`   ✅ Encontradas ${totalConfig} configuraciones`);
            
            // Mostrar detalles
            const detailQuery = `
                SELECT 
                    email_habilitado,
                    whatsapp_habilitado,
                    telegram_habilitado,
                    dias_aviso_alimento
                FROM notificaciones_config
                LIMIT 1
            `;
            const detailResult = await pool.query(detailQuery);
            const config = detailResult.rows[0];
            
            console.log(`   📧 Email: ${config.email_habilitado ? '✅ Habilitado' : '❌ Deshabilitado'}`);
            console.log(`   📱 WhatsApp: ${config.whatsapp_habilitado ? '✅ Habilitado' : '❌ Deshabilitado'}`);
            console.log(`   💬 Telegram: ${config.telegram_habilitado ? '✅ Habilitado' : '❌ Deshabilitado'}`);
            console.log(`   ⏰ Días de aviso: ${config.dias_aviso_alimento || 7} días`);
        } else {
            console.log('   ⚠️  No hay configuraciones de notificaciones');
            console.log('   💡 Se creará automáticamente al primer uso');
        }
        console.log('');

        // 4. Verificar configuración de Email
        console.log('4️⃣  Verificando configuración de Email...');
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            resultados.email = true;
            console.log('   ✅ Credenciales de email configuradas');
            console.log(`   📧 Usuario: ${process.env.SMTP_USER}`);
            console.log(`   🔐 Password: ${'*'.repeat(16)}`);
        } else {
            console.log('   ⚠️  Credenciales de email NO configuradas');
            console.log('   💡 Configura SMTP_USER y SMTP_PASS en .env');
        }
        console.log('');

        // 5. Verificar configuración de WhatsApp
        console.log('5️⃣  Verificando configuración de WhatsApp (Twilio)...');
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            resultados.whatsapp = true;
            console.log('   ✅ Credenciales de Twilio configuradas');
            console.log(`   🔑 Account SID: ${process.env.TWILIO_ACCOUNT_SID.substring(0, 10)}...`);
        } else {
            console.log('   ⚠️  Credenciales de Twilio NO configuradas (opcional)');
            console.log('   💡 Configura TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN en .env');
        }
        console.log('');

        // 6. Verificar configuración de Telegram
        console.log('6️⃣  Verificando configuración de Telegram...');
        if (process.env.TELEGRAM_BOT_TOKEN) {
            resultados.telegram = true;
            console.log('   ✅ Token de Telegram configurado');
            console.log(`   🤖 Token: ${process.env.TELEGRAM_BOT_TOKEN.substring(0, 10)}...`);
        } else {
            console.log('   ⚠️  Token de Telegram NO configurado (opcional)');
            console.log('   💡 Configura TELEGRAM_BOT_TOKEN en .env');
        }
        console.log('');

        // 7. Verificar tablas necesarias
        console.log('7️⃣  Verificando estructura de base de datos...');
        const tablas = ['mascotas', 'clientes', 'veterinarios', 'notificaciones_config', 'alertas_alimento', 'notificaciones_enviadas'];
        let todasLasTablas = true;
        
        for (const tabla of tablas) {
            const checkQuery = `
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = $1
                )
            `;
            const checkResult = await pool.query(checkQuery, [tabla]);
            const existe = checkResult.rows[0].exists;
            
            if (existe) {
                console.log(`   ✅ Tabla '${tabla}' existe`);
            } else {
                console.log(`   ❌ Tabla '${tabla}' NO existe`);
                todasLasTablas = false;
            }
        }
        console.log('');

        // Resumen final
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 RESUMEN DE PRUEBAS');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
        
        const componentes = [
            { nombre: 'Base de datos', estado: resultados.database, critico: true },
            { nombre: 'Mascotas con datos', estado: resultados.mascotas, critico: false },
            { nombre: 'Configuración', estado: resultados.configuracion, critico: false },
            { nombre: 'Email (Gmail)', estado: resultados.email, critico: true },
            { nombre: 'WhatsApp (Twilio)', estado: resultados.whatsapp, critico: false },
            { nombre: 'Telegram', estado: resultados.telegram, critico: false },
            { nombre: 'Estructura DB', estado: todasLasTablas, critico: true }
        ];

        let todoOk = true;
        componentes.forEach(comp => {
            const icono = comp.estado ? '✅' : (comp.critico ? '❌' : '⚠️');
            const tipo = comp.critico ? 'CRÍTICO' : 'OPCIONAL';
            console.log(`${icono} ${comp.nombre.padEnd(25)} [${tipo}]`);
            
            if (comp.critico && !comp.estado) {
                todoOk = false;
            }
        });

        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        
        if (todoOk) {
            console.log('');
            console.log('🎉 ¡SISTEMA LISTO PARA FUNCIONAR!');
            console.log('');
            console.log('Puedes ejecutar el bot con:');
            console.log('  node bot-notificaciones.js');
            console.log('');
            console.log('O configurar ejecución automática:');
            console.log('  - Windows: .\\configurar-bot-windows.ps1');
            console.log('  - Cron integrado: ENABLE_AUTO_CRON=true en .env');
            console.log('');
        } else {
            console.log('');
            console.log('⚠️  CONFIGURACIÓN INCOMPLETA');
            console.log('');
            console.log('Componentes críticos faltantes:');
            componentes.forEach(comp => {
                if (comp.critico && !comp.estado) {
                    console.log(`  ❌ ${comp.nombre}`);
                }
            });
            console.log('');
            console.log('Consulta GUIA_COMPLETA_BOT.md para más información');
            console.log('');
        }
        
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');

        process.exit(todoOk ? 0 : 1);

    } catch (error) {
        console.error('');
        console.error('═══════════════════════════════════════════════════════════');
        console.error('❌ ERROR EN PRUEBA');
        console.error('═══════════════════════════════════════════════════════════');
        console.error(error);
        console.error('═══════════════════════════════════════════════════════════');
        console.error('');
        process.exit(1);
    }
}

// Ejecutar prueba
testBot();
