// Servicio de Verificación de Alimento
const db = require('../database-postgres').pool;
const { 
    enviarEmail, 
    enviarWhatsApp, 
    enviarTelegram,
    generarMensajeAlimentoBajo 
} = require('./notificaciones');

/**
 * Calcular días restantes de alimento
 */
function calcularDiasRestantes(pesoBolsaKg, gramosDiarios, fechaInicio) {
    if (!pesoBolsaKg || !gramosDiarios || gramosDiarios <= 0) return null;
    
    const pesoTotalGramos = pesoBolsaKg * 1000;
    const diasTotales = Math.floor(pesoTotalGramos / gramosDiarios);
    
    if (!fechaInicio) {
        return { diasTotales, diasRestantes: diasTotales, porcentajeRestante: 100 };
    }
    
    const inicio = new Date(fechaInicio);
    const hoy = new Date();
    const diasTranscurridos = Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24));
    const diasRestantes = Math.max(0, diasTotales - diasTranscurridos);
    const porcentajeRestante = Math.round((diasRestantes / diasTotales) * 100);
    
    return {
        diasTotales,
        diasTranscurridos,
        diasRestantes,
        porcentajeRestante
    };
}

/**
 * Verificar alimento de todas las mascotas y generar alertas
 */
async function verificarAlimentoMascotas() {
    console.log('🔍 Iniciando verificación de alimento de mascotas...');
    
    try {
        // Obtener todas las mascotas con información de alimento
        const query = `
            SELECT 
                m.*,
                c.nombre as cliente_nombre,
                c.apellido as cliente_apellido,
                c.email as cliente_email,
                c.telefono as cliente_telefono,
                v.id as veterinario_id,
                v.nombre_veterinaria,
                v.nombre_veterinario,
                v.email as veterinario_email,
                v.telefono as veterinario_telefono,
                v.direccion as veterinario_direccion,
                nc.email_habilitado,
                nc.whatsapp_habilitado,
                nc.telegram_habilitado,
                nc.dias_aviso_alimento,
                nc.email_notificaciones,
                nc.telefono_whatsapp,
                nc.telegram_chat_id
            FROM mascotas m
            JOIN clientes c ON m.cliente_id = c.id
            JOIN veterinarios v ON m.veterinario_id = v.id
            LEFT JOIN notificaciones_config nc ON v.id = nc.veterinario_id
            WHERE m.peso_bolsa_kg IS NOT NULL 
                AND m.gramos_diarios IS NOT NULL 
                AND m.gramos_diarios > 0
                AND m.fecha_inicio_bolsa IS NOT NULL
        `;
        
        const result = await db.query(query);
        const mascotas = result.rows;
        
        console.log(`📊 Encontradas ${mascotas.length} mascotas con datos de alimento`);
        
        let alertasGeneradas = 0;
        let notificacionesEnviadas = 0;
        
        for (const mascota of mascotas) {
            const calculo = calcularDiasRestantes(
                mascota.peso_bolsa_kg,
                mascota.gramos_diarios,
                mascota.fecha_inicio_bolsa
            );
            
            if (!calculo) continue;
            
            const diasAviso = mascota.dias_aviso_alimento || 7;
            
            // Si quedan menos días que el umbral configurado, generar alerta
            if (calculo.diasRestantes <= diasAviso) {
                console.log(`⚠️ Alerta: ${mascota.nombre} - ${calculo.diasRestantes} días restantes`);
                
                // Verificar si ya se envió notificación recientemente (últimas 24 horas)
                const checkQuery = `
                    SELECT id FROM alertas_alimento 
                    WHERE mascota_id = $1 
                        AND fecha_alerta > NOW() - INTERVAL '24 hours'
                        AND notificacion_enviada = true
                    LIMIT 1
                `;
                
                const checkResult = await db.query(checkQuery, [mascota.id]);
                
                if (checkResult.rows.length === 0) {
                    // Registrar alerta
                    const insertAlerta = `
                        INSERT INTO alertas_alimento (
                            mascota_id, dias_restantes, porcentaje_restante
                        ) VALUES ($1, $2, $3) RETURNING id
                    `;
                    
                    const alertaResult = await db.query(insertAlerta, [
                        mascota.id,
                        calculo.diasRestantes,
                        calculo.porcentajeRestante
                    ]);
                    
                    alertasGeneradas++;
                    
                    // Enviar notificaciones
                    const cliente = {
                        nombre: mascota.cliente_nombre,
                        apellido: mascota.cliente_apellido,
                        email: mascota.cliente_email,
                        telefono: mascota.cliente_telefono
                    };
                    
                    const veterinaria = {
                        nombre_veterinaria: mascota.nombre_veterinaria,
                        nombre_veterinario: mascota.nombre_veterinario,
                        email: mascota.veterinario_email,
                        telefono: mascota.veterinario_telefono,
                        direccion: mascota.veterinario_direccion
                    };
                    
                    const mensaje = generarMensajeAlimentoBajo(
                        mascota,
                        cliente,
                        calculo.diasRestantes,
                        calculo.porcentajeRestante,
                        veterinaria
                    );
                    
                    // Enviar por email si está habilitado
                    if (mascota.email_habilitado !== false && cliente.email) {
                        const resultEmail = await enviarEmail(
                            cliente.email,
                            mensaje.asunto,
                            mensaje.texto,
                            mensaje.html
                        );
                        
                        await registrarNotificacionEnviada(
                            mascota.veterinario_id,
                            mascota.cliente_id,
                            mascota.id,
                            'alimento_bajo',
                            'email',
                            cliente.email,
                            mensaje.asunto,
                            mensaje.texto,
                            resultEmail.success ? 'enviado' : 'error',
                            resultEmail.error || null
                        );
                        
                        if (resultEmail.success) notificacionesEnviadas++;
                    }
                    
                    // Enviar por WhatsApp si está habilitado
                    if (mascota.whatsapp_habilitado && cliente.telefono) {
                        const resultWhatsApp = await enviarWhatsApp(
                            cliente.telefono,
                            mensaje.texto
                        );
                        
                        await registrarNotificacionEnviada(
                            mascota.veterinario_id,
                            mascota.cliente_id,
                            mascota.id,
                            'alimento_bajo',
                            'whatsapp',
                            cliente.telefono,
                            null,
                            mensaje.texto,
                            resultWhatsApp.success ? 'enviado' : 'error',
                            resultWhatsApp.error || null
                        );
                        
                        if (resultWhatsApp.success) notificacionesEnviadas++;
                    }
                    
                    // Enviar por Telegram si está habilitado
                    if (mascota.telegram_habilitado && mascota.telegram_chat_id) {
                        const resultTelegram = await enviarTelegram(
                            mascota.telegram_chat_id,
                            mensaje.texto
                        );
                        
                        await registrarNotificacionEnviada(
                            mascota.veterinario_id,
                            mascota.cliente_id,
                            mascota.id,
                            'alimento_bajo',
                            'telegram',
                            mascota.telegram_chat_id,
                            null,
                            mensaje.texto,
                            resultTelegram.success ? 'enviado' : 'error',
                            resultTelegram.error || null
                        );
                        
                        if (resultTelegram.success) notificacionesEnviadas++;
                    }
                    
                    // Marcar alerta como notificada
                    await db.query(
                        'UPDATE alertas_alimento SET notificacion_enviada = true, fecha_notificacion = NOW() WHERE id = $1',
                        [alertaResult.rows[0].id]
                    );
                }
            }
        }
        
        console.log(`✅ Verificación completada: ${alertasGeneradas} alertas generadas, ${notificacionesEnviadas} notificaciones enviadas`);
        
        return {
            success: true,
            mascotasVerificadas: mascotas.length,
            alertasGeneradas,
            notificacionesEnviadas
        };
        
    } catch (error) {
        console.error('❌ Error verificando alimento:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Registrar notificación enviada en la base de datos
 */
async function registrarNotificacionEnviada(
    veterinarioId, clienteId, mascotaId, tipo, canal, destinatario, 
    asunto, mensaje, estado, errorMensaje
) {
    try {
        const query = `
            INSERT INTO notificaciones_enviadas (
                veterinario_id, cliente_id, mascota_id, tipo_notificacion,
                canal, destinatario, asunto, mensaje, estado, error_mensaje, fecha_procesado
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        `;
        
        await db.query(query, [
            veterinarioId, clienteId, mascotaId, tipo, canal,
            destinatario, asunto, mensaje, estado, errorMensaje
        ]);
    } catch (error) {
        console.error('Error registrando notificación:', error);
    }
}

/**
 * Obtener configuración de notificaciones de un veterinario
 */
async function obtenerConfiguracionNotificaciones(veterinarioId) {
    try {
        const query = 'SELECT * FROM notificaciones_config WHERE veterinario_id = $1';
        const result = await db.query(query, [veterinarioId]);
        
        if (result.rows.length === 0) {
            // Crear configuración por defecto
            const insertQuery = `
                INSERT INTO notificaciones_config (veterinario_id)
                VALUES ($1)
                RETURNING *
            `;
            const insertResult = await db.query(insertQuery, [veterinarioId]);
            return insertResult.rows[0];
        }
        
        return result.rows[0];
    } catch (error) {
        console.error('Error obteniendo configuración:', error);
        return null;
    }
}

/**
 * Actualizar configuración de notificaciones
 */
async function actualizarConfiguracionNotificaciones(veterinarioId, config) {
    try {
        const query = `
            INSERT INTO notificaciones_config (
                veterinario_id, email_habilitado, whatsapp_habilitado, telegram_habilitado,
                dias_aviso_alimento, email_notificaciones, telefono_whatsapp, telegram_chat_id,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            ON CONFLICT (veterinario_id) 
            DO UPDATE SET
                email_habilitado = EXCLUDED.email_habilitado,
                whatsapp_habilitado = EXCLUDED.whatsapp_habilitado,
                telegram_habilitado = EXCLUDED.telegram_habilitado,
                dias_aviso_alimento = EXCLUDED.dias_aviso_alimento,
                email_notificaciones = EXCLUDED.email_notificaciones,
                telefono_whatsapp = EXCLUDED.telefono_whatsapp,
                telegram_chat_id = EXCLUDED.telegram_chat_id,
                updated_at = NOW()
            RETURNING *
        `;
        
        const result = await db.query(query, [
            veterinarioId,
            config.email_habilitado,
            config.whatsapp_habilitado,
            config.telegram_habilitado,
            config.dias_aviso_alimento,
            config.email_notificaciones,
            config.telefono_whatsapp,
            config.telegram_chat_id
        ]);
        
        return result.rows[0];
    } catch (error) {
        console.error('Error actualizando configuración:', error);
        throw error;
    }
}

module.exports = {
    verificarAlimentoMascotas,
    calcularDiasRestantes,
    obtenerConfiguracionNotificaciones,
    actualizarConfiguracionNotificaciones,
    registrarNotificacionEnviada
};
