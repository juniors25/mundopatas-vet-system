const { pool } = require('../api/db');
const { enviarNotificacion } = require('../services/notificaciones');

/**
 * Obtener todas las citas de un veterinario
 */
async function getCitasPorVeterinario(req, res) {
    const { id_veterinario } = req.params;
    const { fecha_inicio, fecha_fin } = req.query;

    try {
        let query = `
            SELECT c.*, 
                   cl.nombre as nombre_cliente,
                   cl.email as email_cliente,
                   cl.telefono as telefono_cliente,
                   m.nombre as nombre_mascota,
                   m.especie,
                   m.raza,
                   s.nombre as nombre_servicio,
                   s.duracion_minutos,
                   s.color_calendario
            FROM citas c
            LEFT JOIN clientes cl ON c.id_cliente = cl.id
            LEFT JOIN mascotas m ON c.id_mascota = m.id
            LEFT JOIN servicios_veterinaria s ON c.id_servicio = s.id
            WHERE c.id_veterinario = $1
        `;

        const params = [id_veterinario];
        let paramIndex = 2;

        if (fecha_inicio && fecha_fin) {
            query += ` AND c.fecha_hora BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            params.push(fecha_inicio, fecha_fin);
            paramIndex += 2;
        } else if (fecha_inicio) {
            query += ` AND c.fecha_hora >= $${paramIndex}`;
            params.push(fecha_inicio);
            paramIndex += 1;
        } else if (fecha_fin) {
            query += ` AND c.fecha_hora <= $${paramIndex}`;
            params.push(fecha_fin);
            paramIndex += 1;
        }

        query += ' ORDER BY c.fecha_hora ASC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener citas:', error);
        res.status(500).json({ error: 'Error al obtener las citas' });
    }
}

/**
 * Crear una nueva cita
 */
async function crearCita(req, res) {
    const { id_veterinario, id_cliente, id_mascota, id_servicio, fecha_hora, motivo, duracion_minutos } = req.body;
    const usuario_id = req.user.id;

    try {
        // Verificar disponibilidad
        const disponibilidad = await verificarDisponibilidad(id_veterinario, fecha_hora, duracion_minutos || 30);
        
        if (!disponibilidad.disponible) {
            return res.status(400).json({ 
                error: 'El horario no está disponible',
                detalles: disponibilidad.mensaje
            });
        }

        // Crear la cita
        const result = await pool.query(
            `INSERT INTO citas 
             (id_veterinario, id_cliente, id_mascota, id_servicio, fecha_hora, motivo, duracion_minutos, creado_por)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [id_veterinario, id_cliente, id_mascota, id_servicio, fecha_hora, motivo, duracion_minutos || 30, usuario_id]
        );

        // Enviar notificación de confirmación
        await enviarNotificacionCita(result.rows[0], 'confirmacion');

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error al crear cita:', error);
        res.status(500).json({ 
            error: 'Error al crear la cita',
            detalles: error.message 
        });
    }
}

/**
 * Actualizar una cita existente
 */
async function actualizarCita(req, res) {
    const { id } = req.params;
    const { id_veterinario, id_cliente, id_mascota, id_servicio, fecha_hora, motivo, estado, duracion_minutos } = req.body;
    
    try {
        // Verificar disponibilidad si se está cambiando la fecha/hora o duración
        if (fecha_hora || duracion_minutos) {
            const citaActual = await pool.query('SELECT * FROM citas WHERE id = $1', [id]);
            
            if (citaActual.rows.length === 0) {
                return res.status(404).json({ error: 'Cita no encontrada' });
            }

            const fechaHora = fecha_hora || citaActual.rows[0].fecha_hora;
            const duracion = duracion_minutos || citaActual.rows[0].duracion_minutos;
            const idVet = id_veterinario || citaActual.rows[0].id_veterinario;
            
            // Verificar disponibilidad, excluyendo la cita actual
            const disponibilidad = await verificarDisponibilidad(
                idVet, 
                fechaHora, 
                duracion,
                id // Excluir esta cita de la verificación
            );
            
            if (!disponibilidad.disponible) {
                return res.status(400).json({ 
                    error: 'El horario no está disponible',
                    detalles: disponibilidad.mensaje
                });
            }
        }

        // Construir la consulta dinámicamente
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (id_veterinario !== undefined) {
            updates.push(`id_veterinario = $${paramIndex++}`);
            values.push(id_veterinario);
        }
        if (id_cliente !== undefined) {
            updates.push(`id_cliente = $${paramIndex++}`);
            values.push(id_cliente);
        }
        if (id_mascota !== undefined) {
            updates.push(`id_mascota = $${paramIndex++}`);
            values.push(id_mascota);
        }
        if (id_servicio !== undefined) {
            updates.push(`id_servicio = $${paramIndex++}`);
            values.push(id_servicio);
        }
        if (fecha_hora !== undefined) {
            updates.push(`fecha_hora = $${paramIndex++}`);
            values.push(fecha_hora);
        }
        if (motivo !== undefined) {
            updates.push(`motivo = $${paramIndex++}`);
            values.push(motivo);
        }
        if (estado !== undefined) {
            updates.push(`estado = $${paramIndex++}`);
            values.push(estado);
        }
        if (duracion_minutos !== undefined) {
            updates.push(`duracion_minutos = $${paramIndex++}`);
            values.push(duracion_minutos);
        }

        // Agregar marca de tiempo de actualización
        updates.push(`actualizado_en = NOW()`);

        // Agregar ID a los parámetros
        values.push(id);

        const query = `
            UPDATE citas 
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cita no encontrada' });
        }

        // Si se cambió el estado, enviar notificación
        if (estado) {
            await enviarNotificacionCita(result.rows[0], estado);
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al actualizar cita:', error);
        res.status(500).json({ 
            error: 'Error al actualizar la cita',
            detalles: error.message 
        });
    }
}

/**
 * Eliminar una cita
 */
async function eliminarCita(req, res) {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM citas WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cita no encontrada' });
        }

        // Enviar notificación de cancelación
        await enviarNotificacionCita(result.rows[0], 'cancelada');

        res.json({ mensaje: 'Cita eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar cita:', error);
        res.status(500).json({ error: 'Error al eliminar la cita' });
    }
}

/**
 * Obtener horarios disponibles para un veterinario
 */
async function getHorariosDisponibles(req, res) {
    const { id_veterinario } = req.params;
    let { fecha_inicio, fecha_fin } = req.query;

    try {
        // Validar fechas
        if (!fecha_inicio || !fecha_fin) {
            const hoy = new Date();
            fecha_inicio = hoy.toISOString().split('T')[0];
            fecha_fin = new Date(hoy.setDate(hoy.getDate() + 7)).toISOString().split('T')[0];
        }

        // Obtener configuraciones de horario
        const horarios = await pool.query(
            'SELECT * FROM configuracion_horarios WHERE activo = true ORDER BY dia_semana'
        );

        // Obtener citas existentes
        const citas = await pool.query(
            'SELECT * FROM citas WHERE id_veterinario = $1 AND fecha_hora BETWEEN $2 AND $3 AND estado NOT IN ($4, $5) ORDER BY fecha_hora',
            [id_veterinario, fecha_inicio, fecha_fin, 'cancelada', 'no_asistio']
        );

        // Generar slots disponibles
        const slotsDisponibles = await generarSlotsDisponibles(
            id_veterinario,
            new Date(fecha_inicio),
            new Date(fecha_fin),
            horarios.rows,
            citas.rows
        );

        res.json(slotsDisponibles);
    } catch (error) {
        console.error('Error al obtener horarios disponibles:', error);
        res.status(500).json({ 
            error: 'Error al obtener horarios disponibles',
            detalles: error.message 
        });
    }
}

/**
 * Verificar disponibilidad de un horario
 */
async function verificarDisponibilidadCita(req, res) {
    const { id_veterinario, fecha_hora, duracion_minutos = 30 } = req.body;

    try {
        const disponibilidad = await verificarDisponibilidad(
            id_veterinario, 
            fecha_hora, 
            duracion_minutos
        );

        res.json(disponibilidad);
    } catch (error) {
        console.error('Error al verificar disponibilidad:', error);
        res.status(500).json({ 
            error: 'Error al verificar disponibilidad',
            detalles: error.message 
        });
    }
}

/**
 * Función auxiliar para verificar disponibilidad de un horario
 */
async function verificarDisponibilidad(id_veterinario, fecha_hora, duracion_minutos = 30, excluir_cita_id = null) {
    const fecha = new Date(fecha_hora);
    const dia_semana = fecha.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
    const hora_inicio = fecha.toTimeString().substring(0, 8); // Formato HH:MM:SS
    
    // Calcular hora de finalización
    const hora_fin = new Date(fecha.getTime() + duracion_minutos * 60000).toTimeString().substring(0, 8);
    
    // Verificar si está dentro del horario de atención
    const horario = await pool.query(
        'SELECT * FROM configuracion_horarios WHERE dia_semana = $1 AND activo = true',
        [dia_semana]
    );

    if (horario.rows.length === 0) {
        return { 
            disponible: false, 
            mensaje: 'El establecimiento no atiende en este horario' 
        };
    }

    const { hora_apertura, hora_cierre } = horario.rows[0];
    
    if (hora_inicio < hora_apertura || hora_fin > hora_cierre) {
        return { 
            disponible: false, 
            mensaje: `El horario de atención es de ${hora_apertura} a ${hora_cierre}` 
        };
    }

    // Verificar colisiones con otras citas
    let query = `
        SELECT * 
        FROM citas 
        WHERE id_veterinario = $1 
        AND estado NOT IN ('cancelada', 'no_asistio')
        AND (
            ($2, $2 + ($3 * INTERVAL '1 minute')) 
            OVERLAPS 
            (fecha_hora, fecha_hora + (duracion_minutos * INTERVAL '1 minute'))
        )
    `;

    const params = [id_veterinario, fecha, duracion_minutos];
    
    if (excluir_cita_id) {
        query += ' AND id != $4';
        params.push(excluir_cita_id);
    }

    const citasEnConflicto = await pool.query(query, params);

    if (citasEnConflicto.rows.length > 0) {
        return { 
            disponible: false, 
            mensaje: 'El horario está ocupado',
            conflicto: citasEnConflicto.rows[0]
        };
    }

    return { disponible: true, mensaje: 'Horario disponible' };
}

/**
 * Función auxiliar para generar slots disponibles
 */
async function generarSlotsDisponibles(id_veterinario, fecha_inicio, fecha_fin, horarios, citas) {
    const slots = [];
    const duracionSlot = 30; // minutos
    
    // Recorrer cada día en el rango de fechas
    for (let fecha = new Date(fecha_inicio); fecha <= fecha_fin; fecha.setDate(fecha.getDate() + 1)) {
        const diaSemana = fecha.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
        const horarioDia = horarios.find(h => h.dia_semana === diaSemana);
        
        if (!horarioDia || !horarioDia.activo) continue;
        
        // Convertir horas de apertura y cierre a minutos desde medianoche
        const [horaApertura, minutoApertura] = horarioDia.hora_apertura.split(':').map(Number);
        const [horaCierre, minutoCierre] = horarioDia.hora_cierre.split(':').map(Number);
        
        const inicioMinutos = horaApertura * 60 + minutoApertura;
        const finMinutos = horaCierre * 60 + minutoCierre;
        
        // Generar slots para este día
        for (let minutos = inicioMinutos; minutos + duracionSlot <= finMinutos; minutos += duracionSlot) {
            const horaInicio = new Date(fecha);
            horaInicio.setHours(Math.floor(minutos / 60), minutos % 60, 0, 0);
            
            const horaFin = new Date(horaInicio);
            horaFin.setMinutes(horaFin.getMinutes() + duracionSlot);
            
            // Verificar si hay alguna cita en este horario
            const tieneConflicto = citas.some(cita => {
                const inicioCita = new Date(cita.fecha_hora);
                const finCita = new Date(inicioCita.getTime() + cita.duracion_minutos * 60000);
                
                return !(horaFin <= inicioCita || horaInicio >= finCita);
            });
            
            if (!tieneConflicto) {
                slots.push({
                    fecha_hora: horaInicio.toISOString(),
                    disponible: true
                });
            }
        }
    }
    
    return slots;
}

/**
 * Función auxiliar para enviar notificaciones de cita
 */
async function enviarNotificacionCita(cita, tipoNotificacion) {
    try {
        // Obtener información del cliente y la mascota
        const query = `
            SELECT 
                c.nombre as nombre_cliente,
                c.email as email_cliente,
                c.telefono as telefono_cliente,
                m.nombre as nombre_mascota,
                v.nombre as nombre_veterinario,
                v.email as email_veterinario,
                v.telefono as telefono_veterinario,
                s.nombre as nombre_servicio
            FROM citas ct
            LEFT JOIN clientes c ON ct.id_cliente = c.id
            LEFT JOIN mascotas m ON ct.id_mascota = m.id
            LEFT JOIN usuarios v ON ct.id_veterinario = v.id
            LEFT JOIN servicios_veterinaria s ON ct.id_servicio = s.id
            WHERE ct.id = $1
        `;
        
        const result = await pool.query(query, [cita.id]);
        
        if (result.rows.length === 0) {
            console.error('No se encontró información para la cita:', cita.id);
            return;
        }
        
        const datosCita = result.rows[0];
        const fechaHora = new Date(cita.fecha_hora);
        
        // Plantilla de mensaje
        let asunto = '';
        let mensaje = '';
        
        switch (tipoNotificacion) {
            case 'confirmacion':
                asunto = 'Confirmación de cita';
                mensaje = `Hola ${datosCita.nombre_cliente},\n\n`;
                mensaje += `Tu cita ha sido confirmada para el ${fechaHora.toLocaleDateString()} a las ${fechaHora.toLocaleTimeString()}.\n\n`;
                mensaje += `Detalles de la cita:\n`;
                mensaje += `- Mascota: ${datosCita.nombre_mascota}\n`;
                mensaje += `- Servicio: ${datosCita.nombre_servicio || 'No especificado'}\n`;
                mensaje += `- Veterinario: ${datosCita.nombre_veterinario}\n\n`;
                mensaje += `Por favor, llega 10 minutos antes.\n\n`;
                mensaje += `Si necesitas reprogramar o cancelar, contáctanos al ${datosCita.telefono_veterinario}.\n\n`;
                mensaje += `¡Gracias por confiar en nosotros!`;
                break;
                
            case 'cancelada':
                asunto = 'Cancelación de cita';
                mensaje = `Hola ${datosCita.nombre_cliente},\n\n`;
                mensaje += `Tu cita programada para el ${fechaHora.toLocaleDateString()} a las ${fechaHora.toLocaleTimeString()} ha sido cancelada.\n\n`;
                mensaje += `Si tienes alguna pregunta o deseas reagendar, no dudes en contactarnos.\n\n`;
                mensaje += `Gracias.`;
                break;
                
            case 'recordatorio':
                asunto = 'Recordatorio de cita';
                mensaje = `Hola ${datosCita.nombre_cliente},\n\n`;
                mensaje += `Este es un recordatorio de tu cita programada para mañana, ${fechaHora.toLocaleDateString()} a las ${fechaHora.toLocaleTimeString()}.\n\n`;
                mensaje += `Detalles de la cita:\n`;
                mensaje += `- Mascota: ${datosCita.nombre_mascota}\n`;
                mensaje += `- Servicio: ${datosCita.nombre_servicio || 'No especificado'}\n`;
                mensaje += `- Veterinario: ${datosCita.nombre_veterinario}\n\n`;
                mensaje += `Por favor, confirma tu asistencia respondiendo a este mensaje.\n\n`;
                mensaje += `¡Te esperamos!`;
                break;
                
            default:
                asunto = 'Actualización de cita';
                mensaje = `Hola ${datosCita.nombre_cliente},\n\n`;
                mensaje += `Los detalles de tu cita han sido actualizados.\n\n`;
                mensaje += `Nuevos detalles:\n`;
                mensaje += `- Fecha y hora: ${fechaHora.toLocaleString()}\n`;
                mensaje += `- Mascota: ${datosCita.nombre_mascota}\n`;
                mensaje += `- Servicio: ${datosCita.nombre_servicio || 'No especificado'}\n`;
                mensaje += `- Veterinario: ${datosCita.nombre_veterinario}\n\n`;
                mensaje += `Si tienes alguna pregunta, no dudes en contactarnos.`;
        }
        
        // Enviar notificación por correo electrónico
        if (datosCita.email_cliente) {
            await enviarNotificacion({
                tipo: 'email',
                destinatario: datosCita.email_cliente,
                asunto,
                mensaje
            });
        }
        
        // Enviar notificación por SMS si hay teléfono
        if (datosCita.telefono_cliente) {
            await enviarNotificacion({
                tipo: 'sms',
                destinatario: datosCita.telefono_cliente,
                mensaje: asunto + ': ' + mensaje.replace(/\n/g, ' ').substring(0, 140)
            });
        }
        
        // Registrar el recordatorio en la base de datos
        await pool.query(
            'INSERT INTO recordatorios_citas (id_cita, tipo_recordatorio, estado) VALUES ($1, $2, $3)',
            [cita.id, 'email', 'enviado']
        );
        
    } catch (error) {
        console.error('Error al enviar notificación de cita:', error);
        
        // Registrar el error en la base de datos
        try {
            await pool.query(
                'INSERT INTO recordatorios_citas (id_cita, tipo_recordatorio, estado, error) VALUES ($1, $2, $3, $4)',
                [cita.id, 'email', 'fallido', error.message]
            );
        } catch (dbError) {
            console.error('Error al registrar fallo de notificación:', dbError);
        }
    }
}

module.exports = {
    getCitasPorVeterinario,
    crearCita,
    actualizarCita,
    eliminarCita,
    getHorariosDisponibles,
    verificarDisponibilidadCita,
    verificarDisponibilidad
};
