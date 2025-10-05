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

/**
 * Verificar inventario y generar alertas para el veterinario
 */
async function verificarInventarioVeterinario() {
    console.log('🔍 Iniciando verificación de inventario...');
    
    try {
        // Obtener todos los veterinarios con productos en inventario
        const veterinariosQuery = `
            SELECT DISTINCT v.id, v.nombre_veterinaria, v.nombre_veterinario, 
                   v.email, v.telefono,
                   nc.email_habilitado, nc.whatsapp_habilitado, nc.telegram_habilitado,
                   nc.email_notificaciones, nc.telefono_whatsapp, nc.telegram_chat_id
            FROM veterinarios v
            JOIN inventario_productos ip ON v.id = ip.veterinario_id
            LEFT JOIN notificaciones_config nc ON v.id = nc.veterinario_id
            WHERE ip.activo = true
        `;
        
        const veterinariosResult = await db.query(veterinariosQuery);
        const veterinarios = veterinariosResult.rows;
        
        console.log(`📊 Verificando inventario de ${veterinarios.length} veterinarios`);
        
        let alertasGeneradas = 0;
        let notificacionesEnviadas = 0;
        
        for (const vet of veterinarios) {
            // Obtener productos con stock bajo
            const stockBajoQuery = `
                SELECT * FROM inventario_productos 
                WHERE veterinario_id = $1 
                AND stock_actual <= stock_minimo 
                AND activo = true
                ORDER BY stock_actual ASC
            `;
            
            const stockBajo = await db.query(stockBajoQuery, [vet.id]);
            
            // Obtener productos por vencer (próximos 30 días)
            const porVencerQuery = `
                SELECT * FROM inventario_productos 
                WHERE veterinario_id = $1 
                AND fecha_vencimiento IS NOT NULL
                AND fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days'
                AND fecha_vencimiento >= CURRENT_DATE
                AND activo = true
                ORDER BY fecha_vencimiento ASC
            `;
            
            const porVencer = await db.query(porVencerQuery, [vet.id]);
            
            // Obtener productos vencidos
            const vencidosQuery = `
                SELECT * FROM inventario_productos 
                WHERE veterinario_id = $1 
                AND fecha_vencimiento IS NOT NULL
                AND fecha_vencimiento < CURRENT_DATE
                AND activo = true
                ORDER BY fecha_vencimiento DESC
            `;
            
            const vencidos = await db.query(vencidosQuery, [vet.id]);
            
            const totalAlertas = stockBajo.rows.length + porVencer.rows.length + vencidos.rows.length;
            
            if (totalAlertas > 0) {
                console.log(`⚠️ ${vet.nombre_veterinaria}: ${totalAlertas} alertas de inventario`);
                
                // Verificar si ya se envió notificación hoy
                const checkQuery = `
                    SELECT id FROM notificaciones_enviadas 
                    WHERE veterinario_id = $1 
                        AND tipo_notificacion = 'inventario_alertas'
                        AND fecha_procesado::date = CURRENT_DATE
                    LIMIT 1
                `;
                
                const checkResult = await db.query(checkQuery, [vet.id]);
                
                if (checkResult.rows.length === 0) {
                    // Generar mensaje de alerta
                    const mensaje = generarMensajeInventario(
                        vet,
                        stockBajo.rows,
                        porVencer.rows,
                        vencidos.rows
                    );
                    
                    // Enviar por email si está habilitado
                    if (vet.email_habilitado !== false && (vet.email_notificaciones || vet.email)) {
                        const destinatario = vet.email_notificaciones || vet.email;
                        const resultEmail = await enviarEmail(
                            destinatario,
                            mensaje.asunto,
                            mensaje.texto,
                            mensaje.html
                        );
                        
                        await registrarNotificacionEnviada(
                            vet.id,
                            null,
                            null,
                            'inventario_alertas',
                            'email',
                            destinatario,
                            mensaje.asunto,
                            mensaje.texto,
                            resultEmail.success ? 'enviado' : 'error',
                            resultEmail.error || null
                        );
                        
                        if (resultEmail.success) notificacionesEnviadas++;
                    }
                    
                    // Enviar por WhatsApp si está habilitado
                    if (vet.whatsapp_habilitado && (vet.telefono_whatsapp || vet.telefono)) {
                        const telefono = vet.telefono_whatsapp || vet.telefono;
                        const resultWhatsApp = await enviarWhatsApp(
                            telefono,
                            mensaje.texto
                        );
                        
                        await registrarNotificacionEnviada(
                            vet.id,
                            null,
                            null,
                            'inventario_alertas',
                            'whatsapp',
                            telefono,
                            null,
                            mensaje.texto,
                            resultWhatsApp.success ? 'enviado' : 'error',
                            resultWhatsApp.error || null
                        );
                        
                        if (resultWhatsApp.success) notificacionesEnviadas++;
                    }
                    
                    // Enviar por Telegram si está habilitado
                    if (vet.telegram_habilitado && vet.telegram_chat_id) {
                        const resultTelegram = await enviarTelegram(
                            vet.telegram_chat_id,
                            mensaje.texto
                        );
                        
                        await registrarNotificacionEnviada(
                            vet.id,
                            null,
                            null,
                            'inventario_alertas',
                            'telegram',
                            vet.telegram_chat_id,
                            null,
                            mensaje.texto,
                            resultTelegram.success ? 'enviado' : 'error',
                            resultTelegram.error || null
                        );
                        
                        if (resultTelegram.success) notificacionesEnviadas++;
                    }
                    
                    alertasGeneradas++;
                }
            }
        }
        
        console.log(`✅ Verificación de inventario completada: ${alertasGeneradas} veterinarios notificados, ${notificacionesEnviadas} notificaciones enviadas`);
        
        return {
            success: true,
            veterinariosVerificados: veterinarios.length,
            alertasGeneradas,
            notificacionesEnviadas
        };
        
    } catch (error) {
        console.error('❌ Error verificando inventario:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Generar mensaje de alerta de inventario
 */
function generarMensajeInventario(veterinario, stockBajo, porVencer, vencidos) {
    const asunto = `⚠️ Alertas de Inventario - ${veterinario.nombre_veterinaria}`;
    
    let texto = `Hola ${veterinario.nombre_veterinario},\n\n`;
    texto += `Te informamos sobre el estado de tu inventario:\n\n`;
    
    if (stockBajo.length > 0) {
        texto += `🔴 PRODUCTOS CON STOCK BAJO (${stockBajo.length}):\n`;
        stockBajo.slice(0, 5).forEach(p => {
            texto += `   • ${p.nombre} - Stock: ${p.stock_actual} (Mínimo: ${p.stock_minimo})\n`;
        });
        if (stockBajo.length > 5) {
            texto += `   ... y ${stockBajo.length - 5} productos más\n`;
        }
        texto += `\n`;
    }
    
    if (vencidos.length > 0) {
        texto += `⚫ PRODUCTOS VENCIDOS (${vencidos.length}):\n`;
        vencidos.slice(0, 5).forEach(p => {
            const diasVencido = Math.floor((new Date() - new Date(p.fecha_vencimiento)) / (1000 * 60 * 60 * 24));
            texto += `   • ${p.nombre} - Vencido hace ${diasVencido} días\n`;
        });
        if (vencidos.length > 5) {
            texto += `   ... y ${vencidos.length - 5} productos más\n`;
        }
        texto += `\n`;
    }
    
    if (porVencer.length > 0) {
        texto += `🟡 PRODUCTOS POR VENCER (${porVencer.length}):\n`;
        porVencer.slice(0, 5).forEach(p => {
            const diasRestantes = Math.floor((new Date(p.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24));
            texto += `   • ${p.nombre} - Vence en ${diasRestantes} días\n`;
        });
        if (porVencer.length > 5) {
            texto += `   ... y ${porVencer.length - 5} productos más\n`;
        }
        texto += `\n`;
    }
    
    texto += `\nIngresa al sistema para ver el detalle completo y tomar acción.\n\n`;
    texto += `Saludos,\nSistema MUNDO PATAS`;
    
    // Versión HTML
    let html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545;">⚠️ Alertas de Inventario</h2>
            <p>Hola <strong>${veterinario.nombre_veterinario}</strong>,</p>
            <p>Te informamos sobre el estado de tu inventario:</p>
    `;
    
    if (stockBajo.length > 0) {
        html += `
            <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 15px 0;">
                <h3 style="color: #721c24; margin-top: 0;">🔴 Stock Bajo (${stockBajo.length})</h3>
                <ul>
        `;
        stockBajo.slice(0, 5).forEach(p => {
            html += `<li><strong>${p.nombre}</strong> - Stock: ${p.stock_actual} (Mínimo: ${p.stock_minimo})</li>`;
        });
        if (stockBajo.length > 5) {
            html += `<li><em>... y ${stockBajo.length - 5} productos más</em></li>`;
        }
        html += `</ul></div>`;
    }
    
    if (vencidos.length > 0) {
        html += `
            <div style="background-color: #d6d8d9; border-left: 4px solid #6c757d; padding: 15px; margin: 15px 0;">
                <h3 style="color: #383d41; margin-top: 0;">⚫ Productos Vencidos (${vencidos.length})</h3>
                <ul>
        `;
        vencidos.slice(0, 5).forEach(p => {
            const diasVencido = Math.floor((new Date() - new Date(p.fecha_vencimiento)) / (1000 * 60 * 60 * 24));
            html += `<li><strong>${p.nombre}</strong> - Vencido hace ${diasVencido} días</li>`;
        });
        if (vencidos.length > 5) {
            html += `<li><em>... y ${vencidos.length - 5} productos más</em></li>`;
        }
        html += `</ul></div>`;
    }
    
    if (porVencer.length > 0) {
        html += `
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0;">
                <h3 style="color: #856404; margin-top: 0;">🟡 Por Vencer (${porVencer.length})</h3>
                <ul>
        `;
        porVencer.slice(0, 5).forEach(p => {
            const diasRestantes = Math.floor((new Date(p.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24));
            html += `<li><strong>${p.nombre}</strong> - Vence en ${diasRestantes} días</li>`;
        });
        if (porVencer.length > 5) {
            html += `<li><em>... y ${porVencer.length - 5} productos más</em></li>`;
        }
        html += `</ul></div>`;
    }
    
    html += `
            <p>Ingresa al sistema para ver el detalle completo y tomar acción.</p>
            <p style="color: #6c757d; font-size: 12px; margin-top: 30px;">
                Saludos,<br>
                <strong>Sistema MUNDO PATAS</strong>
            </p>
        </div>
    `;
    
    return { asunto, texto, html };
}

module.exports = {
    verificarAlimentoMascotas,
    verificarInventarioVeterinario,
    calcularDiasRestantes,
    obtenerConfiguracionNotificaciones,
    actualizarConfiguracionNotificaciones,
    registrarNotificacionEnviada
};
