const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuración de directorio para archivos subidos
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Crear una nueva entrada en la historia clínica
 */
const crearHistoriaClinica = async (req, res) => {
    const client = await pool.connect();
    
    try {
        const {
            mascota_id,
            tipo_consulta_id,
            motivo_consulta,
            sintomatologia,
            diagnostico,
            tratamiento,
            observaciones,
            peso_kg,
            temperatura_c,
            frecuencia_cardiaca,
            frecuencia_respiratoria,
            tlls_izq,
            tlls_der,
            hidratacion,
            mucosas,
            nivel_dolor,
            estado_general,
            examen_fisico,
            proximo_control,
            requiere_seguimiento = false,
            medicamentos = []
        } = req.body;

        // Validar campos requeridos
        if (!mascota_id || !tipo_consulta_id) {
            return res.status(400).json({
                success: false,
                message: 'Los campos mascota_id y tipo_consulta_id son requeridos'
            });
        }

        await client.query('BEGIN');

        // Insertar la historia clínica
        const { rows: [historia] } = await client.query(
            `INSERT INTO historias_clinicas (
                mascota_id, tipo_consulta_id, motivo_consulta, sintomatologia, 
                diagnostico, tratamiento, observaciones, peso_kg, temperatura_c, 
                frecuencia_cardiaca, frecuencia_respiratoria, tlls_izq, tlls_der, 
                hidratacion, mucosas, nivel_dolor, estado_general, examen_fisico, 
                proximo_control, requiere_seguimiento, veterinario_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
            RETURNING *`,
            [
                mascota_id, tipo_consulta_id, motivo_consulta, sintomatologia,
                diagnostico, tratamiento, observaciones, peso_kg, temperatura_c,
                frecuencia_cardiaca, frecuencia_respiratoria, tlls_izq, tlls_der,
                hidratacion, mucosas, nivel_dolor, estado_general, examen_fisico,
                proximo_control, requiere_seguimiento, req.user.id
            ]
        );

        // Procesar medicamentos recetados
        if (Array.isArray(medicamentos) && medicamentos.length > 0) {
            for (const med of medicamentos) {
                await client.query(
                    `INSERT INTO recetas_medicamentos (
                        historia_clinica_id, medicamento_id, dosis, frecuencia, 
                        duracion_dias, indicaciones
                    ) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        historia.id, med.medicamento_id, med.dosis, med.frecuencia,
                        med.duracion_dias, med.indicaciones
                    ]
                );
            }
        }

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            data: historia,
            message: 'Historia clínica creada exitosamente'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en crearHistoriaClinica:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear la historia clínica',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        client.release();
    }
};

/**
 * Subir archivos adjuntos a una historia clínica
 */
const subirArchivoHistoriaClinica = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No se ha proporcionado ningún archivo'
        });
    }

    const { id } = req.params; // ID de la historia clínica
    const { descripcion } = req.body;
    const file = req.file;

    try {
        // Verificar que la historia clínica existe y pertenece al veterinario
        const { rowCount } = await pool.query(
            'SELECT 1 FROM historias_clinicas WHERE id = $1 AND veterinario_id = $2',
            [id, req.user.id]
        );

        if (rowCount === 0) {
            // Eliminar el archivo subido si la validación falla
            fs.unlinkSync(file.path);
            return res.status(404).json({
                success: false,
                message: 'Historia clínica no encontrada o no tienes permiso para modificarla'
            });
        }

        // Generar un nombre único para el archivo
        const fileExt = path.extname(file.originalname);
        const fileName = `${uuidv4()}${fileExt}`;
        const filePath = path.join('historias_clinicas', id.toString(), fileName);
        const fullPath = path.join(UPLOAD_DIR, filePath);

        // Crear directorio si no existe
        const dirPath = path.dirname(fullPath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        // Mover el archivo a su ubicación final
        fs.renameSync(file.path, fullPath);

        // Guardar registro en la base de datos
        const { rows: [archivo] } = await pool.query(
            `INSERT INTO archivos_adjuntos (
                historia_clinica_id, nombre_archivo, tipo_archivo, tamano_bytes, 
                ruta_archivo, descripcion, veterinario_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
                id,
                file.originalname,
                file.mimetype,
                file.size,
                filePath,
                descripcion || null,
                req.user.id
            ]
        );

        res.status(201).json({
            success: true,
            data: archivo,
            message: 'Archivo subido exitosamente'
        });

    } catch (error) {
        // Eliminar el archivo si hay un error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        console.error('Error en subirArchivoHistoriaClinica:', error);
        res.status(500).json({
            success: false,
            message: 'Error al subir el archivo',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener el historial clínico de una mascota
 */
const obtenerHistorialMascota = async (req, res) => {
    try {
        const { mascota_id } = req.params;
        const { pagina = 1, por_pagina = 10, incluir_archivos = 'false' } = req.query;
        const offset = (pagina - 1) * por_pagina;

        // Obtener historial clínico con paginación
        const { rows: historias } = await pool.query(
            `SELECT 
                hc.*, 
                tc.nombre as tipo_consulta_nombre,
                tc.color as tipo_consulta_color,
                v.nombre_veterinario,
                COUNT(a.id) as total_archivos
            FROM historias_clinicas hc
            JOIN tipos_consulta tc ON hc.tipo_consulta_id = tc.id
            JOIN veterinarios v ON hc.veterinario_id = v.id
            LEFT JOIN archivos_adjuntos a ON a.historia_clinica_id = hc.id
            WHERE hc.mascota_id = $1
            GROUP BY hc.id, tc.nombre, tc.color, v.nombre_veterinario
            ORDER BY hc.fecha_consulta DESC
            LIMIT $2 OFFSET $3`,
            [mascota_id, por_pagina, offset]
        );

        // Obtener total de registros para la paginación
        const { rows: [{ total }] } = await pool.query(
            'SELECT COUNT(*) as total FROM historias_clinicas WHERE mascota_id = $1',
            [mascota_id]
        );

        // Obtener archivos adjuntos si se solicita
        if (incluir_archivos === 'true' && historias.length > 0) {
            const historiaIds = historias.map(h => h.id);
            const { rows: archivos } = await pool.query(
                `SELECT * FROM archivos_adjuntos 
                 WHERE historia_clinica_id = ANY($1)
                 ORDER BY created_at DESC`,
                [historiaIds]
            );

            // Agrupar archivos por historia clínica
            const archivosPorHistoria = archivos.reduce((acc, archivo) => {
                if (!acc[archivo.historia_clinica_id]) {
                    acc[archivo.historia_clinica_id] = [];
                }
                // Construir URL para descargar el archivo
                archivo.url = `/api/historias-clinicas/${archivo.historia_clinica_id}/archivos/${archivo.id}/descargar`;
                acc[archivo.historia_clinica_id].push(archivo);
                return acc;
            }, {});

            // Agregar archivos a cada historia clínica
            historias.forEach(historia => {
                historia.archivos = archivosPorHistoria[historia.id] || [];
            });
        }

        // Obtener medicamentos recetados para cada historia clínica
        if (historias.length > 0) {
            const historiaIds = historias.map(h => h.id);
            const { rows: recetas } = await pool.query(
                `SELECT rm.*, m.nombre_comercial, m.principio_activo, m.presentacion
                 FROM recetas_medicamentos rm
                 JOIN medicamentos m ON rm.medicamento_id = m.id
                 WHERE rm.historia_clinica_id = ANY($1)`,
                [historiaIds]
            );

            // Agrupar medicamentos por historia clínica
            const medicamentosPorHistoria = recetas.reduce((acc, receta) => {
                if (!acc[receta.historia_clinica_id]) {
                    acc[receta.historia_clinica_id] = [];
                }
                acc[receta.historia_clinica_id].push(receta);
                return acc;
            }, {});

            // Agregar medicamentos a cada historia clínica
            historias.forEach(historia => {
                historia.medicamentos = medicamentosPorHistoria[historia.id] || [];
            });
        }

        res.json({
            success: true,
            data: historias,
            paginacion: {
                total: parseInt(total),
                pagina: parseInt(pagina),
                por_pagina: parseInt(por_pagina),
                total_paginas: Math.ceil(total / por_pagina)
            }
        });

    } catch (error) {
        console.error('Error en obtenerHistorialMascota:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el historial clínico',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Descargar un archivo adjunto
 */
const descargarArchivo = async (req, res) => {
    try {
        const { historia_id, archivo_id } = req.params;

        // Obtener información del archivo
        const { rows: [archivo] } = await pool.query(
            `SELECT a.*, hc.veterinario_id 
             FROM archivos_adjuntos a
             JOIN historias_clinicas hc ON a.historia_clinica_id = hc.id
             WHERE a.id = $1 AND a.historia_clinica_id = $2`,
            [archivo_id, historia_id]
        );

        if (!archivo) {
            return res.status(404).json({
                success: false,
                message: 'Archivo no encontrado'
            });
        }

        // Verificar que el usuario tenga permiso (solo el veterinario que lo subió o el dueño)
        const esPropietario = req.user.id === archivo.veterinario_id;
        const esAdmin = req.user.tipo_cuenta === 'ADMIN';
        
        if (!esPropietario && !esAdmin) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para acceder a este archivo'
            });
        }

        const filePath = path.join(UPLOAD_DIR, archivo.ruta_archivo);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'El archivo no existe en el servidor'
            });
        }

        // Configurar encabezados para la descarga
        res.setHeader('Content-Type', archivo.tipo_archivo);
        res.setHeader('Content-Length', archivo.tamano_bytes);
        res.setHeader('Content-Disposition', `attachment; filename="${archivo.nombre_archivo}"`);

        // Enviar el archivo
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Error en descargarArchivo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al descargar el archivo',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener estadísticas de historias clínicas
 */
const obtenerEstadisticas = async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta } = req.query;
        const { id: veterinario_id } = req.user;

        // Construir condiciones de fecha
        const condicionesFecha = [];
        const params = [veterinario_id];
        let paramIndex = 2;

        if (fecha_desde) {
            condicionesFecha.push(`fecha_consulta >= $${paramIndex++}`);
            params.push(fecha_desde);
        }
        
        if (fecha_hasta) {
            condicionesFecha.push(`fecha_consulta <= $${paramIndex++}`);
            params.push(fecha_hasta);
        }

        const whereClause = condicionesFecha.length > 0 
            ? `WHERE veterinario_id = $1 AND ${condicionesFecha.join(' AND ')}` 
            : 'WHERE veterinario_id = $1';

        // Consulta para obtener estadísticas por tipo de consulta
        const { rows: statsPorTipo } = await pool.query(
            `SELECT 
                tc.id as tipo_consulta_id,
                tc.nombre as tipo_consulta,
                tc.color,
                COUNT(*) as total,
                ROUND(AVG(EXTRACT(EPOCH FROM (fecha_cierre - fecha_consulta))/60)::numeric, 1) as duracion_promedio_min
            FROM historias_clinicas hc
            JOIN tipos_consulta tc ON hc.tipo_consulta_id = tc.id
            ${whereClause}
            GROUP BY tc.id, tc.nombre, tc.color
            ORDER BY total DESC`,
            params
        );

        // Consulta para obtener el total de historias clínicas
        const { rows: [{ total_historias }] } = await pool.query(
            `SELECT COUNT(*) as total_historias FROM historias_clinicas ${whereClause}`,
            [veterinario_id, ...(fecha_desde ? [fecha_desde] : []), ...(fecha_hasta ? [fecha_hasta] : [])]
        );

        // Consulta para obtener el historial mensual
        const { rows: historialMensual } = await pool.query(
            `SELECT 
                DATE_TRUNC('month', fecha_consulta) as mes,
                COUNT(*) as total,
                STRING_AGG(tc.nombre, ', ') as tipos_consulta
            FROM historias_clinicas hc
            JOIN tipos_consulta tc ON hc.tipo_consulta_id = tc.id
            ${whereClause}
            GROUP BY mes
            ORDER BY mes DESC
            LIMIT 12`,
            params
        );

        res.json({
            success: true,
            data: {
                total_historias: parseInt(total_historias),
                por_tipo: statsPorTipo,
                historial_mensual: historialMensual.map(item => ({
                    ...item,
                    mes: item.mes.toISOString().split('T')[0]
                }))
            }
        });

    } catch (error) {
        console.error('Error en obtenerEstadisticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    crearHistoriaClinica,
    subirArchivoHistoriaClinica,
    obtenerHistorialMascota,
    descargarArchivo,
    obtenerEstadisticas
};
