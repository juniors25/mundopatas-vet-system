const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, checkRole } = require('../middleware/authMiddleware');
const {
    crearHistoriaClinica,
    subirArchivoHistoriaClinica,
    obtenerHistorialMascota,
    descargarArchivo,
    obtenerEstadisticas
} = require('../controllers/historiaClinicaController');

// Configuración de multer para la subida de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
        const subDir = path.join('historias_clinicas', req.params.id || 'temp');
        const uploadPath = path.join(dir, subDir);
        
        // Crear directorio si no existe
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Usar el nombre original del archivo con un timestamp para evitar colisiones
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Filtro para aceptar solo ciertos tipos de archivos
const fileFilter = (req, file, cb) => {
    // Tipos MIME permitidos
    const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido'), false);
    }
};

// Configurar multer con opciones
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // Límite de 10MB por archivo
        files: 5 // Máximo 5 archivos por petición
    }
});

// Middleware para manejar errores de multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Error de multer (ej: límite de tamaño excedido)
        return res.status(400).json({
            success: false,
            message: `Error al subir archivo: ${err.message}`
        });
    } else if (err) {
        // Otros errores
        return res.status(400).json({
            success: false,
            message: err.message || 'Error al procesar el archivo'
        });
    }
    next();
};

// Rutas para historias clínicas
router.post('/', authenticateToken, crearHistoriaClinica);
router.get('/mascota/:mascota_id', authenticateToken, obtenerHistorialMascota);
router.get('/estadisticas', authenticateToken, obtenerEstadisticas);

// Ruta para subir archivos a una historia clínica específica
router.post(
    '/:id/archivos', 
    authenticateToken, 
    upload.single('archivo'), 
    handleMulterError,
    subirArchivoHistoriaClinica
);

// Ruta para descargar archivos adjuntos
router.get(
    '/:historia_id/archivos/:archivo_id/descargar', 
    authenticateToken, 
    descargarArchivo
);

// Ruta para obtener todos los tipos de consulta
router.get('/tipos-consulta', authenticateToken, async (req, res) => {
    try {
        const { rows } = await req.db.query(
            'SELECT * FROM tipos_consulta ORDER BY nombre'
        );
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Error al obtener tipos de consulta:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los tipos de consulta',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Ruta para obtener todos los medicamentos
router.get('/medicamentos', authenticateToken, async (req, res) => {
    try {
        const { rows } = await req.db.query(
            `SELECT 
                id, 
                nombre_comercial, 
                principio_activo, 
                presentacion, 
                concentracion,
                stock_actual
             FROM medicamentos 
             WHERE stock_actual > 0 
             ORDER BY nombre_comercial`
        );
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Error al obtener medicamentos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los medicamentos',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Ruta para obtener plantillas de historias clínicas
router.get('/plantillas', authenticateToken, async (req, res) => {
    try {
        const { rows } = await req.db.query(
            `SELECT 
                id, 
                nombre, 
                descripcion, 
                contenido,
                tipo_consulta_id,
                es_predeterminada,
                created_at
             FROM plantillas_historia_clinica
             WHERE veterinario_id = $1 OR es_publica = true
             ORDER BY es_predeterminada DESC, nombre`,
            [req.user.id]
        );
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Error al obtener plantillas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las plantillas',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Ruta para obtener vacunas aplicadas a una mascota
router.get('/mascota/:mascota_id/vacunas', authenticateToken, async (req, res) => {
    try {
        const { mascota_id } = req.params;
        
        // Verificar que la mascota pertenece a un cliente del veterinario
        const { rowCount } = await req.db.query(
            `SELECT 1 FROM mascotas m
             JOIN clientes c ON m.cliente_id = c.id
             WHERE m.id = $1 AND c.veterinario_id = $2`,
            [mascota_id, req.user.id]
        );
        
        if (rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Mascota no encontrada o no tienes permiso para ver sus vacunas'
            });
        }
        
        // Obtener vacunas aplicadas a la mascota
        const { rows } = await req.db.query(
            `SELECT 
                va.id,
                va.fecha_aplicacion,
                va.fecha_proxima_dosis,
                va.lote,
                va.veterinario_aplico,
                v.nombre as vacuna_nombre,
                v.tipo as vacuna_tipo,
                v.descripcion as vacuna_descripcion,
                v.frecuencia_meses as vacuna_frecuencia_meses
             FROM vacunas_aplicadas va
             JOIN vacunas v ON va.vacuna_id = v.id
             WHERE va.mascota_id = $1
             ORDER BY va.fecha_aplicacion DESC`,
            [mascota_id]
        );
        
        res.json({
            success: true,
            data: rows
        });
        
    } catch (error) {
        console.error('Error al obtener vacunas de la mascota:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las vacunas de la mascota',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Ruta para registrar una nueva vacuna aplicada
router.post('/mascota/:mascota_id/vacunas', authenticateToken, async (req, res) => {
    const client = await req.db.connect();
    
    try {
        const { mascota_id } = req.params;
        const { 
            vacuna_id, 
            fecha_aplicacion = new Date(), 
            lote, 
            fecha_proxima_dosis,
            notas 
        } = req.body;
        
        // Validar campos requeridos
        if (!vacuna_id) {
            return res.status(400).json({
                success: false,
                message: 'El ID de la vacuna es requerido'
            });
        }
        
        await client.query('BEGIN');
        
        // Verificar que la mascota pertenece a un cliente del veterinario
        const { rows: [mascota] } = await client.query(
            `SELECT m.*, c.veterinario_id 
             FROM mascotas m
             JOIN clientes c ON m.cliente_id = c.id
             WHERE m.id = $1`,
            [mascota_id]
        );
        
        if (!mascota || mascota.veterinario_id !== req.user.id) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Mascota no encontrada o no tienes permiso para modificar sus registros'
            });
        }
        
        // Obtener información de la vacuna
        const { rows: [vacuna] } = await client.query(
            'SELECT * FROM vacunas WHERE id = $1',
            [vacuna_id]
        );
        
        if (!vacuna) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Vacuna no encontrada'
            });
        }
        
        // Calcular fecha de próxima dosis si no se proporciona
        let proximaDosis = fecha_proxima_dosis;
        if (!proximaDosis && vacuna.frecuencia_meses) {
            const fecha = new Date(fecha_aplicacion);
            fecha.setMonth(fecha.getMonth() + vacuna.frecuencia_meses);
            proximaDosis = fecha.toISOString().split('T')[0];
        }
        
        // Registrar la vacuna aplicada
        const { rows: [vacunaAplicada] } = await client.query(
            `INSERT INTO vacunas_aplicadas (
                mascota_id, vacuna_id, fecha_aplicacion, 
                fecha_proxima_dosis, lote, notas, veterinario_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
                mascota_id, 
                vacuna_id, 
                fecha_aplicacion,
                proximaDosis,
                lote || null,
                notas || null,
                req.user.id
            ]
        );
        
        // Registrar en el historial clínico
        await client.query(
            `INSERT INTO historias_clinicas (
                mascota_id, 
                tipo_consulta_id, 
                motivo_consulta, 
                tratamiento,
                observaciones,
                veterinario_id
            ) VALUES ($1, 1, 'Aplicación de vacuna', $2, $3, $4)`,
            [
                mascota_id,
                `Vacuna aplicada: ${vacuna.nombre} (Lote: ${lote || 'N/A'})`,
                notas || `Próxima dosis recomendada: ${proximaDosis || 'No especificada'}`,
                req.user.id
            ]
        );
        
        await client.query('COMMIT');
        
        res.status(201).json({
            success: true,
            data: vacunaAplicada,
            message: 'Vacuna registrada exitosamente'
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al registrar vacuna:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar la vacuna',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        client.release();
    }
});

// Ruta para registrar una desparasitación
router.post('/mascota/:mascota_id/desparasitaciones', authenticateToken, async (req, res) => {
    const client = await req.db.connect();
    
    try {
        const { mascota_id } = req.params;
        const { 
            producto, 
            fecha_aplicacion = new Date(), 
            dosis, 
            lote, 
            proxima_desparasitacion,
            notas 
        } = req.body;
        
        // Validar campos requeridos
        if (!producto) {
            return res.status(400).json({
                success: false,
                message: 'El nombre del producto es requerido'
            });
        }
        
        await client.query('BEGIN');
        
        // Verificar que la mascota pertenece a un cliente del veterinario
        const { rows: [mascota] } = await client.query(
            `SELECT m.*, c.veterinario_id 
             FROM mascotas m
             JOIN clientes c ON m.cliente_id = c.id
             WHERE m.id = $1`,
            [mascota_id]
        );
        
        if (!mascota || mascota.veterinario_id !== req.user.id) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Mascota no encontrada o no tienes permiso para modificar sus registros'
            });
        }
        
        // Registrar la desparasitación
        const { rows: [desparasitacion] } = await client.query(
            `INSERT INTO desparasitaciones (
                mascota_id, 
                producto, 
                fecha_aplicacion, 
                dosis, 
                lote, 
                proxima_desparasitacion,
                notas,
                veterinario_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [
                mascota_id,
                producto,
                fecha_aplicacion,
                dosis || null,
                lote || null,
                proxima_desparasitacion || null,
                notas || null,
                req.user.id
            ]
        );
        
        // Registrar en el historial clínico
        await client.query(
            `INSERT INTO historias_clinicas (
                mascota_id, 
                tipo_consulta_id, 
                motivo_consulta, 
                tratamiento,
                observaciones,
                veterinario_id
            ) VALUES ($1, 2, 'Desparasitación', $2, $3, $4)`,
            [
                mascota_id,
                `Producto: ${producto}${dosis ? ` (${dosis})` : ''}${lote ? ` - Lote: ${lote}` : ''}`,
                notas || `Próxima desparasitación recomendada: ${proxima_desparasitacion || 'No especificada'}`,
                req.user.id
            ]
        );
        
        await client.query('COMMIT');
        
        res.status(201).json({
            success: true,
            data: desparasitacion,
            message: 'Desparasitación registrada exitosamente'
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al registrar desparasitación:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar la desparasitación',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        client.release();
    }
});

module.exports = router;
