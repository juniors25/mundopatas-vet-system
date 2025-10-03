// Servicio de Notificaciones para Mundo Patas
const nodemailer = require('nodemailer');

// ==================== CONFIGURACIÓN DE EMAIL ====================

// Configurar transporter de email (usar variables de entorno en producción)
let emailTransporter = null;

function configurarEmail() {
    try {
        emailTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false, // true para 465, false para otros puertos
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        console.log('✅ Servicio de email configurado');
    } catch (error) {
        console.error('❌ Error configurando email:', error);
    }
}

// Inicializar configuración
configurarEmail();

// ==================== FUNCIONES DE ENVÍO ====================

/**
 * Enviar notificación por email
 */
async function enviarEmail(destinatario, asunto, mensaje, html = null) {
    if (!emailTransporter) {
        console.log('⚠️ Email transporter no configurado. Simulando envío...');
        return {
            success: true,
            mensaje: 'Email simulado (configurar SMTP_USER y SMTP_PASS)',
            simulado: true
        };
    }

    try {
        const mailOptions = {
            from: `"Mundo Patas Veterinaria" <${process.env.SMTP_USER}>`,
            to: destinatario,
            subject: asunto,
            text: mensaje,
            html: html || `<p>${mensaje}</p>`
        };

        const info = await emailTransporter.sendMail(mailOptions);
        console.log('✅ Email enviado:', info.messageId);
        
        return {
            success: true,
            messageId: info.messageId,
            mensaje: 'Email enviado exitosamente'
        };
    } catch (error) {
        console.error('❌ Error enviando email:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Enviar notificación por WhatsApp (usando Twilio)
 * Nota: Requiere cuenta de Twilio y WhatsApp Business API
 */
async function enviarWhatsApp(telefono, mensaje) {
    // Verificar si Twilio está configurado
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        console.log('⚠️ Twilio no configurado. Simulando envío de WhatsApp...');
        return {
            success: true,
            mensaje: 'WhatsApp simulado (configurar Twilio)',
            simulado: true
        };
    }

    try {
        const twilio = require('twilio');
        const client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );

        const result = await client.messages.create({
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${telefono}`,
            body: mensaje
        });

        console.log('✅ WhatsApp enviado:', result.sid);
        
        return {
            success: true,
            sid: result.sid,
            mensaje: 'WhatsApp enviado exitosamente'
        };
    } catch (error) {
        console.error('❌ Error enviando WhatsApp:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Enviar notificación por Telegram
 */
async function enviarTelegram(chatId, mensaje) {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
        console.log('⚠️ Telegram no configurado. Simulando envío...');
        return {
            success: true,
            mensaje: 'Telegram simulado (configurar TELEGRAM_BOT_TOKEN)',
            simulado: true
        };
    }

    try {
        const axios = require('axios');
        const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        const response = await axios.post(url, {
            chat_id: chatId,
            text: mensaje,
            parse_mode: 'HTML'
        });

        console.log('✅ Telegram enviado');
        
        return {
            success: true,
            messageId: response.data.result.message_id,
            mensaje: 'Telegram enviado exitosamente'
        };
    } catch (error) {
        console.error('❌ Error enviando Telegram:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ==================== TEMPLATES DE MENSAJES ====================

/**
 * Generar mensaje de alerta de alimento bajo
 */
function generarMensajeAlimentoBajo(mascota, cliente, diasRestantes, porcentaje, veterinaria) {
    const urgencia = diasRestantes <= 3 ? '🚨 URGENTE' : diasRestantes <= 7 ? '⚠️ IMPORTANTE' : 'ℹ️ AVISO';
    
    const mensajeTexto = `
${urgencia} - Alimento por Terminarse

Hola ${cliente.nombre} ${cliente.apellido},

Le informamos que el alimento de su mascota ${mascota.nombre} está por terminarse.

📊 Estado actual:
• Días restantes: ${diasRestantes} días
• Porcentaje restante: ${porcentaje}%
• Tipo de alimento: ${mascota.tipo_alimento || 'No especificado'}
• Marca: ${mascota.marca_alimento || 'No especificada'}
• Consumo diario: ${mascota.gramos_diarios || 0}g

${diasRestantes <= 3 ? '⚠️ Le recomendamos comprar alimento lo antes posible para evitar que su mascota se quede sin comida.' : ''}

Para cualquier consulta, no dude en contactarnos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏥 ${veterinaria.nombre_veterinaria || 'Veterinaria'}
👨‍⚕️ ${veterinaria.nombre_veterinario || ''}
📞 ${veterinaria.telefono || 'Sin teléfono'}
📧 ${veterinaria.email || 'Sin email'}
📍 ${veterinaria.direccion || 'Sin dirección'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Saludos,
${veterinaria.nombre_veterinaria || 'Mundo Patas Veterinaria'} 🐾
    `.trim();

    const mensajeHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <div style="background: ${diasRestantes <= 3 ? '#dc3545' : diasRestantes <= 7 ? '#ffc107' : '#17a2b8'}; color: white; padding: 15px; border-radius: 5px; text-align: center;">
                <h2 style="margin: 0;">${urgencia}</h2>
                <p style="margin: 5px 0;">Alimento por Terminarse</p>
            </div>
            
            <div style="padding: 20px;">
                <p>Hola <strong>${cliente.nombre} ${cliente.apellido}</strong>,</p>
                
                <p>Le informamos que el alimento de su mascota <strong>${mascota.nombre}</strong> está por terminarse.</p>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h3 style="margin-top: 0; color: #333;">📊 Estado actual:</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li>🕐 <strong>Días restantes:</strong> ${diasRestantes} días</li>
                        <li>📈 <strong>Porcentaje restante:</strong> ${porcentaje}%</li>
                        <li>🍖 <strong>Tipo de alimento:</strong> ${mascota.tipo_alimento || 'No especificado'}</li>
                        <li>🏷️ <strong>Marca:</strong> ${mascota.marca_alimento || 'No especificada'}</li>
                        <li>⚖️ <strong>Consumo diario:</strong> ${mascota.gramos_diarios || 0}g</li>
                    </ul>
                </div>
                
                ${diasRestantes <= 3 ? `
                <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0;">
                    <strong>⚠️ Recomendación:</strong> Le sugerimos comprar alimento lo antes posible para evitar que su mascota se quede sin comida.
                </div>
                ` : ''}
                
                <p>Para cualquier consulta, no dude en contactarnos.</p>
                
                <div style="background: #e9ecef; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h4 style="margin-top: 0; color: #495057; border-bottom: 2px solid #17a2b8; padding-bottom: 10px;">
                        🏥 Información de Contacto
                    </h4>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0;"><strong>🏥 Veterinaria:</strong></td>
                            <td style="padding: 8px 0;">${veterinaria.nombre_veterinaria || 'No especificado'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>👨‍⚕️ Veterinario:</strong></td>
                            <td style="padding: 8px 0;">${veterinaria.nombre_veterinario || 'No especificado'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>📞 Teléfono:</strong></td>
                            <td style="padding: 8px 0;">${veterinaria.telefono || 'Sin teléfono'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>📧 Email:</strong></td>
                            <td style="padding: 8px 0;">${veterinaria.email || 'Sin email'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>📍 Dirección:</strong></td>
                            <td style="padding: 8px 0;">${veterinaria.direccion || 'Sin dirección'}</td>
                        </tr>
                    </table>
                </div>
                
                <p style="margin-top: 30px;">
                    Saludos,<br>
                    <strong>${veterinaria.nombre_veterinaria || 'Mundo Patas Veterinaria'} 🐾</strong>
                </p>
            </div>
            
            <div style="background: #f8f9fa; padding: 10px; text-align: center; font-size: 12px; color: #666; border-radius: 5px;">
                Este es un mensaje automático del sistema de gestión veterinaria Mundo Patas
            </div>
        </div>
    `;

    return {
        texto: mensajeTexto,
        html: mensajeHTML,
        asunto: `${urgencia} - Alimento de ${mascota.nombre} por terminarse`
    };
}

/**
 * Generar mensaje de recordatorio de vacuna
 */
function generarMensajeRecordatorioVacuna(mascota, cliente, vacuna, diasRestantes) {
    const mensajeTexto = `
🏥 Recordatorio de Vacunación

Hola ${cliente.nombre} ${cliente.apellido},

Le recordamos que su mascota ${mascota.nombre} tiene una vacuna próxima:

💉 Vacuna: ${vacuna.nombre_vacuna}
📅 Fecha programada: ${new Date(vacuna.fecha_proxima).toLocaleDateString()}
⏰ Días restantes: ${diasRestantes} días

Por favor, agende su cita con anticipación.

Saludos,
Mundo Patas Veterinaria 🐾
    `.trim();

    return {
        texto: mensajeTexto,
        asunto: `Recordatorio: Vacuna de ${mascota.nombre}`
    };
}

module.exports = {
    enviarEmail,
    enviarWhatsApp,
    enviarTelegram,
    generarMensajeAlimentoBajo,
    generarMensajeRecordatorioVacuna,
    configurarEmail
};
