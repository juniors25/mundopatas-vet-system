const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const { initializeDatabase, pool } = require('./database-postgres');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'mundo-patas-secret-key';

// Variable para controlar si el cron automático está habilitado
const CRON_ENABLED = process.env.ENABLE_AUTO_CRON === 'true';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Middleware de autenticación
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
}

// Inicializar base de datos
initializeDatabase().catch(console.error);

// RUTA DE CONFIGURACIÓN DE LA APP
app.get('/api/app-config', (req, res) => {
    res.json({
        appName: "MUNDO PATAS",
        version: "2.0.0",
        environment: process.env.NODE_ENV || "development",
        mode: "production",
        features: {
            notifications: true,
            telemedicine: true,
            inventory: true,
            billing: true,
            reports: true
        }
    });
});

// RUTAS DE AUTENTICACIÓN
app.post('/api/auth/register', async (req, res) => {
    const { nombre_veterinaria, nombre_veterinario, email, password, telefono, direccion } = req.body;

    try {
        // Verificar si el email ya existe
        const existingUser = await pool.query('SELECT id FROM veterinarios WHERE email = $1', [email]);
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar nuevo veterinario
        const result = await pool.query(
            'INSERT INTO veterinarios (nombre_veterinaria, nombre_veterinario, email, password, telefono, direccion) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, nombre_veterinario',
            [nombre_veterinaria, nombre_veterinario, email, hashedPassword, telefono, direccion]
        );

        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            message: 'Veterinario registrado exitosamente',
            token,
            user: {
                id: user.id,
                email: user.email,
                nombre: user.nombre_veterinario
            }
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM veterinarios WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                email: user.email,
                nombre: user.nombre_veterinario
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// RUTAS DE CLIENTES
app.post('/api/clientes', authenticateToken, async (req, res) => {
    const { nombre, apellido, email, telefono, direccion } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO clientes (veterinario_id, nombre, apellido, email, telefono, direccion) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [req.user.id, nombre, apellido, email, telefono, direccion]
        );

        res.json({ message: 'Cliente registrado exitosamente', cliente: result.rows[0] });
    } catch (error) {
        console.error('Error registrando cliente:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/api/clientes', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM clientes WHERE veterinario_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo clientes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// RUTAS DE MASCOTAS
app.post('/api/mascotas', authenticateToken, async (req, res) => {
    const { cliente_id, nombre, especie, raza, edad, peso, color, sexo, observaciones } = req.body;

    try {
        // Verificar que el cliente pertenece al veterinario
        const clienteCheck = await pool.query('SELECT id FROM clientes WHERE id = $1 AND veterinario_id = $2', [cliente_id, req.user.id]);
        
        if (clienteCheck.rows.length === 0) {
            return res.status(403).json({ error: 'No tienes permiso para agregar mascotas a este cliente' });
        }

        const result = await pool.query(
            'INSERT INTO mascotas (veterinario_id, cliente_id, nombre, especie, raza, edad, peso, pelaje, sexo, observaciones) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *, pelaje as color',
            [req.user.id, cliente_id, nombre, especie, raza, edad, peso, color, sexo, observaciones]
        );

        res.json({ message: 'Mascota registrada exitosamente', mascota: result.rows[0] });
    } catch (error) {
        console.error('Error registrando mascota:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/api/mascotas', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                m.id, m.veterinario_id, m.cliente_id, m.nombre, m.especie, m.raza, 
                m.edad, m.peso, m.pelaje as color, m.sexo, m.observaciones,
                m.tiene_chip, m.numero_chip, m.tipo_alimento, m.marca_alimento,
                m.peso_bolsa_kg, m.fecha_inicio_bolsa, m.gramos_diarios, m.created_at,
                c.nombre as cliente_nombre, c.apellido as cliente_apellido 
            FROM mascotas m 
            JOIN clientes c ON m.cliente_id = c.id 
            WHERE m.veterinario_id = $1 
            ORDER BY m.created_at DESC
        `, [req.user.id]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo mascotas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// RUTAS DE CONSULTAS
app.post('/api/consultas', authenticateToken, async (req, res) => {
    const { 
        mascota_id, motivo, observaciones,
        // Semiología y examen físico
        estado_corporal, manto_piloso, tiempo_llenado_capilar,
        frecuencia_cardiaca, frecuencia_respiratoria, peso, temperatura,
        ganglios_linfaticos, tonalidad_mucosa, examen_bucal, examen_ocular,
        examen_otico, examen_neurologico, examen_aparato_locomotor,
        // Estudios complementarios
        tipo_analisis, fecha_analisis, resultados_analisis, archivo_analisis_url,
        electrocardiograma, medicion_presion_arterial, ecocardiograma,
        // Desparasitación
        desparasitacion, fecha_desparasitacion, producto_desparasitacion,
        // Diagnóstico
        diagnostico_presuntivo, diagnostico_final,
        // Tratamiento
        medicamento, dosis, intervalo, tratamiento_inyectable
    } = req.body;

    try {
        // Verificar que la mascota pertenece al veterinario
        const mascotaCheck = await pool.query(`
            SELECT m.id, m.cliente_id 
            FROM mascotas m 
            JOIN clientes c ON m.cliente_id = c.id 
            WHERE m.id = $1 AND c.veterinario_id = $2
        `, [mascota_id, req.user.id]);
        
        if (mascotaCheck.rows.length === 0) {
            return res.status(403).json({ error: 'No tienes permiso para agregar consultas a esta mascota' });
        }

        const cliente_id = mascotaCheck.rows[0].cliente_id;

        const result = await pool.query(
            `INSERT INTO consultas (
                veterinario_id, cliente_id, mascota_id, motivo,
                estado_corporal, manto_piloso, tiempo_llenado_capilar,
                frecuencia_cardiaca, frecuencia_respiratoria, peso, temperatura,
                ganglios_linfaticos, tonalidad_mucosa, examen_bucal, examen_ocular,
                examen_otico, examen_neurologico, examen_aparato_locomotor,
                tipo_analisis, fecha_analisis, resultados_analisis, archivo_analisis_url,
                electrocardiograma, medicion_presion_arterial, ecocardiograma,
                desparasitacion, fecha_desparasitacion, producto_desparasitacion,
                diagnostico_presuntivo, diagnostico_final,
                medicamento, dosis, intervalo, tratamiento_inyectable,
                observaciones
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
                $29, $30, $31, $32, $33, $34, $35
            ) RETURNING *`,
            [
                req.user.id, cliente_id, mascota_id, motivo,
                estado_corporal, manto_piloso, tiempo_llenado_capilar,
                frecuencia_cardiaca, frecuencia_respiratoria, peso, temperatura,
                ganglios_linfaticos, tonalidad_mucosa, examen_bucal, examen_ocular,
                examen_otico, examen_neurologico, examen_aparato_locomotor,
                tipo_analisis, fecha_analisis, resultados_analisis, archivo_analisis_url,
                electrocardiograma, medicion_presion_arterial, ecocardiograma,
                desparasitacion, fecha_desparasitacion, producto_desparasitacion,
                diagnostico_presuntivo, diagnostico_final,
                medicamento, dosis, intervalo, tratamiento_inyectable,
                observaciones
            ]
        );

        res.json({ message: 'Consulta registrada exitosamente', consulta: result.rows[0] });
    } catch (error) {
        console.error('Error registrando consulta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/api/consultas/:mascotaId', authenticateToken, async (req, res) => {
    try {
        // Verificar permisos
        const mascotaCheck = await pool.query(`
            SELECT m.id 
            FROM mascotas m 
            JOIN clientes c ON m.cliente_id = c.id 
            WHERE m.id = $1 AND c.veterinario_id = $2
        `, [req.params.mascotaId, req.user.id]);
        
        if (mascotaCheck.rows.length === 0) {
            return res.status(403).json({ error: 'No tienes permiso para ver las consultas de esta mascota' });
        }

        const result = await pool.query('SELECT * FROM consultas WHERE mascota_id = $1 ORDER BY fecha_consulta DESC', [req.params.mascotaId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo consultas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Editar consulta
app.put('/api/consultas/:id', authenticateToken, async (req, res) => {
    const { 
        motivo, observaciones,
        // Semiología y examen físico
        estado_corporal, manto_piloso, tiempo_llenado_capilar,
        frecuencia_cardiaca, frecuencia_respiratoria, peso, temperatura,
        ganglios_linfaticos, tonalidad_mucosa, examen_bucal, examen_ocular,
        examen_otico, examen_neurologico, examen_aparato_locomotor,
        // Estudios complementarios
        tipo_analisis, fecha_analisis, resultados_analisis, archivo_analisis_url,
        electrocardiograma, medicion_presion_arterial, ecocardiograma,
        // Desparasitación
        desparasitacion, fecha_desparasitacion, producto_desparasitacion,
        // Diagnóstico
        diagnostico_presuntivo, diagnostico_final,
        // Tratamiento
        medicamento, dosis, intervalo, tratamiento_inyectable
    } = req.body;

    try {
        // Verificar permisos
        const consultaCheck = await pool.query(`
            SELECT c.id 
            FROM consultas c
            WHERE c.id = $1 AND c.veterinario_id = $2
        `, [req.params.id, req.user.id]);
        
        if (consultaCheck.rows.length === 0) {
            return res.status(403).json({ error: 'No tienes permiso para editar esta consulta' });
        }

        const result = await pool.query(
            `UPDATE consultas SET
                motivo = $1,
                estado_corporal = $2, manto_piloso = $3, tiempo_llenado_capilar = $4,
                frecuencia_cardiaca = $5, frecuencia_respiratoria = $6, peso = $7, temperatura = $8,
                ganglios_linfaticos = $9, tonalidad_mucosa = $10, examen_bucal = $11, examen_ocular = $12,
                examen_otico = $13, examen_neurologico = $14, examen_aparato_locomotor = $15,
                tipo_analisis = $16, fecha_analisis = $17, resultados_analisis = $18, archivo_analisis_url = $19,
                electrocardiograma = $20, medicion_presion_arterial = $21, ecocardiograma = $22,
                desparasitacion = $23, fecha_desparasitacion = $24, producto_desparasitacion = $25,
                diagnostico_presuntivo = $26, diagnostico_final = $27,
                medicamento = $28, dosis = $29, intervalo = $30, tratamiento_inyectable = $31,
                observaciones = $32
            WHERE id = $33
            RETURNING *`,
            [
                motivo,
                estado_corporal, manto_piloso, tiempo_llenado_capilar,
                frecuencia_cardiaca, frecuencia_respiratoria, peso, temperatura,
                ganglios_linfaticos, tonalidad_mucosa, examen_bucal, examen_ocular,
                examen_otico, examen_neurologico, examen_aparato_locomotor,
                tipo_analisis, fecha_analisis, resultados_analisis, archivo_analisis_url,
                electrocardiograma, medicion_presion_arterial, ecocardiograma,
                desparasitacion, fecha_desparasitacion, producto_desparasitacion,
                diagnostico_presuntivo, diagnostico_final,
                medicamento, dosis, intervalo, tratamiento_inyectable,
                observaciones,
                req.params.id
            ]
        );

        res.json({ message: 'Consulta actualizada exitosamente', consulta: result.rows[0] });
    } catch (error) {
        console.error('Error actualizando consulta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// RUTAS DE ANÁLISIS
app.post('/api/analisis', authenticateToken, upload.single('archivo'), async (req, res) => {
    const { mascota_id, tipo_analisis, resultados, observaciones } = req.body;
    const archivo_adjunto = req.file ? req.file.filename : null;

    try {
        // Verificar permisos
        const mascotaCheck = await pool.query(`
            SELECT m.id, m.cliente_id 
            FROM mascotas m 
            JOIN clientes c ON m.cliente_id = c.id 
            WHERE m.id = $1 AND c.veterinario_id = $2
        `, [mascota_id, req.user.id]);
        
        if (mascotaCheck.rows.length === 0) {
            return res.status(403).json({ error: 'No tienes permiso para agregar análisis a esta mascota' });
        }

        const cliente_id = mascotaCheck.rows[0].cliente_id;

        const result = await pool.query(
            'INSERT INTO analisis (veterinario_id, cliente_id, mascota_id, tipo_analisis, fecha_analisis, resultados, archivo_url, observaciones) VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, $7) RETURNING *',
            [req.user.id, cliente_id, mascota_id, tipo_analisis, resultados, archivo_adjunto, observaciones]
        );

        res.json({ message: 'Análisis registrado exitosamente', analisis: result.rows[0] });
    } catch (error) {
        console.error('Error registrando análisis:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/api/analisis/:mascotaId', authenticateToken, async (req, res) => {
    try {
        // Verificar permisos
        const mascotaCheck = await pool.query(`
            SELECT m.id 
            FROM mascotas m 
            JOIN clientes c ON m.cliente_id = c.id 
            WHERE m.id = $1 AND c.veterinario_id = $2
        `, [req.params.mascotaId, req.user.id]);
        
        if (mascotaCheck.rows.length === 0) {
            return res.status(403).json({ error: 'No tienes permiso para ver los análisis de esta mascota' });
        }

        const result = await pool.query('SELECT * FROM analisis WHERE mascota_id = $1 ORDER BY fecha_analisis DESC', [req.params.mascotaId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo análisis:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ==================== ENDPOINT PÚBLICO PARA AGENDAR CITAS (CLIENTES) ====================

// Crear cita pública (sin autenticación - para clientes)
app.post('/api/citas/publica', async (req, res) => {
    const { 
        veterinario_id, cliente_nombre, cliente_email, cliente_telefono,
        mascota_nombre, mascota_especie, fecha_cita, hora_cita,
        motivo, metodo_pago, monto
    } = req.body;
    
    try {
        // Verificar que el veterinario existe
        const vetCheck = await pool.query('SELECT id FROM veterinarios WHERE id = $1', [veterinario_id]);
        if (vetCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Veterinario no encontrado' });
        }

        // Buscar o crear cliente
        let cliente = await pool.query(
            'SELECT id FROM clientes WHERE email = $1 AND veterinario_id = $2',
            [cliente_email, veterinario_id]
        );

        let cliente_id;
        if (cliente.rows.length === 0) {
            // Crear nuevo cliente
            const nombres = cliente_nombre.split(' ');
            const nombre = nombres[0];
            const apellido = nombres.slice(1).join(' ') || '';
            
            const nuevoCliente = await pool.query(
                'INSERT INTO clientes (veterinario_id, nombre, apellido, email, telefono) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [veterinario_id, nombre, apellido, cliente_email, cliente_telefono]
            );
            cliente_id = nuevoCliente.rows[0].id;
        } else {
            cliente_id = cliente.rows[0].id;
        }

        // Buscar o crear mascota
        let mascota = await pool.query(
            'SELECT id FROM mascotas WHERE nombre = $1 AND cliente_id = $2',
            [mascota_nombre, cliente_id]
        );

        let mascota_id;
        if (mascota.rows.length === 0) {
            // Crear nueva mascota
            const nuevaMascota = await pool.query(
                'INSERT INTO mascotas (veterinario_id, cliente_id, nombre, especie) VALUES ($1, $2, $3, $4) RETURNING id',
                [veterinario_id, cliente_id, mascota_nombre, mascota_especie]
            );
            mascota_id = nuevaMascota.rows[0].id;
        } else {
            mascota_id = mascota.rows[0].id;
        }

        // Crear la cita
        const fecha_cita_completa = `${fecha_cita}T${hora_cita}:00`;
        const pago_confirmado = metodo_pago !== 'efectivo';
        
        const result = await pool.query(
            `INSERT INTO citas (veterinario_id, cliente_id, mascota_id, fecha_cita, motivo, estado, monto, metodo_pago, pago_confirmado) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [veterinario_id, cliente_id, mascota_id, fecha_cita_completa, motivo, 'programada', monto, metodo_pago, pago_confirmado]
        );

        res.json({ 
            message: 'Cita agendada exitosamente', 
            cita: result.rows[0],
            cliente_id,
            mascota_id
        });
    } catch (error) {
        console.error('Error creando cita pública:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// RUTAS DE CITAS (VETERINARIO)
app.post('/api/citas', authenticateToken, async (req, res) => {
    const { cliente_id, mascota_id, fecha_cita, motivo, observaciones, monto, metodo_pago } = req.body;
    
    try {
        // Verificar permisos
        const clienteCheck = await pool.query(`
            SELECT id FROM clientes WHERE id = $1 AND veterinario_id = $2
        `, [cliente_id, req.user.id]);
        
        if (clienteCheck.rows.length === 0) {
            return res.status(403).json({ error: 'No tienes permiso para crear citas para este cliente' });
        }

        const result = await pool.query(
            `INSERT INTO citas (veterinario_id, cliente_id, mascota_id, fecha_cita, motivo, observaciones, monto, metodo_pago, estado) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [req.user.id, cliente_id, mascota_id, fecha_cita, motivo, observaciones, monto || 0, metodo_pago || 'efectivo', 'programada']
        );

        res.json({ message: 'Cita creada exitosamente', cita: result.rows[0] });
    } catch (error) {
        console.error('Error creando cita:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/api/citas', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*, 
                   cl.nombre as cliente_nombre, cl.apellido as cliente_apellido,
                   m.nombre as mascota_nombre, m.especie
            FROM citas c
            JOIN clientes cl ON c.cliente_id = cl.id
            LEFT JOIN mascotas m ON c.mascota_id = m.id
            WHERE c.veterinario_id = $1
            ORDER BY c.fecha_cita DESC
        `, [req.user.id]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo citas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.put('/api/citas/:id', authenticateToken, async (req, res) => {
    const { estado, observaciones, pago_confirmado } = req.body;
    
    try {
        // Verificar permisos
        const citaCheck = await pool.query(`
            SELECT id FROM citas WHERE id = $1 AND veterinario_id = $2
        `, [req.params.id, req.user.id]);
        
        if (citaCheck.rows.length === 0) {
            return res.status(403).json({ error: 'No tienes permiso para modificar esta cita' });
        }

        const result = await pool.query(
            `UPDATE citas SET estado = $1, observaciones = $2, pago_confirmado = $3 WHERE id = $4 RETURNING *`,
            [estado, observaciones, pago_confirmado, req.params.id]
        );

        res.json({ message: 'Cita actualizada exitosamente', cita: result.rows[0] });
    } catch (error) {
        console.error('Error actualizando cita:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.delete('/api/citas/:id', authenticateToken, async (req, res) => {
    try {
        // Verificar permisos
        const citaCheck = await pool.query(`
            SELECT id FROM citas WHERE id = $1 AND veterinario_id = $2
        `, [req.params.id, req.user.id]);
        
        if (citaCheck.rows.length === 0) {
            return res.status(403).json({ error: 'No tienes permiso para eliminar esta cita' });
        }

        await pool.query('DELETE FROM citas WHERE id = $1', [req.params.id]);
        res.json({ message: 'Cita eliminada exitosamente' });
    } catch (error) {
        console.error('Error eliminando cita:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ENDPOINT PARA PROCESAR PAGO DE CITA (Mercado Pago)
app.post('/api/citas/:id/pago', authenticateToken, async (req, res) => {
    const { payment_id, status, payment_method } = req.body;
    
    try {
        // Verificar permisos
        const citaCheck = await pool.query(`
            SELECT id, monto FROM citas WHERE id = $1 AND veterinario_id = $2
        `, [req.params.id, req.user.id]);
        
        if (citaCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Cita no encontrada' });
        }

        // Actualizar estado de pago
        const result = await pool.query(
            `UPDATE citas SET 
                pago_confirmado = $1, 
                payment_id = $2, 
                metodo_pago = $3,
                fecha_pago = CURRENT_TIMESTAMP
             WHERE id = $4 RETURNING *`,
            [status === 'approved', payment_id, payment_method, req.params.id]
        );

        res.json({ message: 'Pago procesado exitosamente', cita: result.rows[0] });
    } catch (error) {
        console.error('Error procesando pago:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ==================== ENDPOINTS DE FACTURACIÓN ====================

// Crear factura
app.post('/api/facturas', authenticateToken, async (req, res) => {
    const { cliente_id, items, subtotal, impuestos, total, fecha_factura } = req.body;
    
    try {
        // Verificar que el cliente pertenece al veterinario
        const clienteCheck = await pool.query(
            'SELECT id FROM clientes WHERE id = $1 AND veterinario_id = $2',
            [cliente_id, req.user.id]
        );
        
        if (clienteCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Cliente no encontrado' });
        }

        // Generar número de factura único
        const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
        const countResult = await pool.query(
            'SELECT COUNT(*) as count FROM facturas WHERE veterinario_id = $1 AND numero_factura LIKE $2',
            [req.user.id, `${yearMonth}%`]
        );
        const count = parseInt(countResult.rows[0].count) + 1;
        const numero_factura = `${yearMonth}-${String(count).padStart(4, '0')}`;

        // Insertar factura
        const facturaResult = await pool.query(
            `INSERT INTO facturas (veterinario_id, cliente_id, numero_factura, fecha_factura, subtotal, impuestos, total, estado)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendiente') RETURNING *`,
            [req.user.id, cliente_id, numero_factura, fecha_factura || new Date(), subtotal, impuestos || 0, total]
        );

        const factura = facturaResult.rows[0];

        // Insertar items de la factura
        for (const item of items) {
            await pool.query(
                `INSERT INTO factura_items (factura_id, descripcion, cantidad, precio_unitario, subtotal)
                 VALUES ($1, $2, $3, $4, $5)`,
                [factura.id, item.descripcion, item.cantidad, item.precio_unitario, item.subtotal]
            );
        }

        // Obtener factura completa con items
        const facturaCompleta = await pool.query(
            `SELECT f.*, 
                    c.nombre as cliente_nombre, 
                    c.apellido as cliente_apellido,
                    c.email as cliente_email,
                    c.telefono as cliente_telefono,
                    json_agg(json_build_object(
                        'id', fi.id,
                        'descripcion', fi.descripcion,
                        'cantidad', fi.cantidad,
                        'precio_unitario', fi.precio_unitario,
                        'subtotal', fi.subtotal
                    )) as items
             FROM facturas f
             JOIN clientes c ON f.cliente_id = c.id
             LEFT JOIN factura_items fi ON f.id = fi.factura_id
             WHERE f.id = $1
             GROUP BY f.id, c.nombre, c.apellido, c.email, c.telefono`,
            [factura.id]
        );

        res.json({ message: 'Factura creada exitosamente', factura: facturaCompleta.rows[0] });
    } catch (error) {
        console.error('Error creando factura:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener todas las facturas
app.get('/api/facturas', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT f.*, 
                    c.nombre as cliente_nombre, 
                    c.apellido as cliente_apellido,
                    c.email as cliente_email,
                    c.telefono as cliente_telefono
             FROM facturas f
             JOIN clientes c ON f.cliente_id = c.id
             WHERE f.veterinario_id = $1
             ORDER BY f.fecha_factura DESC, f.created_at DESC`,
            [req.user.id]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo facturas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener factura por ID con items
app.get('/api/facturas/:id', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT f.*, 
                    c.nombre as cliente_nombre, 
                    c.apellido as cliente_apellido,
                    c.email as cliente_email,
                    c.telefono as cliente_telefono,
                    c.direccion as cliente_direccion,
                    json_agg(json_build_object(
                        'id', fi.id,
                        'descripcion', fi.descripcion,
                        'cantidad', fi.cantidad,
                        'precio_unitario', fi.precio_unitario,
                        'subtotal', fi.subtotal
                    )) as items
             FROM facturas f
             JOIN clientes c ON f.cliente_id = c.id
             LEFT JOIN factura_items fi ON f.id = fi.factura_id
             WHERE f.id = $1 AND f.veterinario_id = $2
             GROUP BY f.id, c.nombre, c.apellido, c.email, c.telefono, c.direccion`,
            [req.params.id, req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Factura no encontrada' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error obteniendo factura:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Actualizar estado de factura
app.put('/api/facturas/:id', authenticateToken, async (req, res) => {
    const { estado } = req.body;
    
    try {
        // Verificar permisos
        const facturaCheck = await pool.query(
            'SELECT id FROM facturas WHERE id = $1 AND veterinario_id = $2',
            [req.params.id, req.user.id]
        );
        
        if (facturaCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Factura no encontrada' });
        }

        const result = await pool.query(
            'UPDATE facturas SET estado = $1 WHERE id = $2 RETURNING *',
            [estado, req.params.id]
        );

        res.json({ message: 'Factura actualizada exitosamente', factura: result.rows[0] });
    } catch (error) {
        console.error('Error actualizando factura:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Eliminar factura
app.delete('/api/facturas/:id', authenticateToken, async (req, res) => {
    try {
        // Verificar permisos
        const facturaCheck = await pool.query(
            'SELECT id FROM facturas WHERE id = $1 AND veterinario_id = $2',
            [req.params.id, req.user.id]
        );
        
        if (facturaCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Factura no encontrada' });
        }

        // Eliminar items primero
        await pool.query('DELETE FROM factura_items WHERE factura_id = $1', [req.params.id]);
        
        // Eliminar factura
        await pool.query('DELETE FROM facturas WHERE id = $1', [req.params.id]);

        res.json({ message: 'Factura eliminada exitosamente' });
    } catch (error) {
        console.error('Error eliminando factura:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener estadísticas de facturación
app.get('/api/facturas/stats/resumen', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                COUNT(*) as total_facturas,
                SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
                SUM(CASE WHEN estado = 'pagada' THEN 1 ELSE 0 END) as pagadas,
                SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
                COALESCE(SUM(CASE WHEN estado = 'pagada' THEN total ELSE 0 END), 0) as total_ingresado,
                COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN total ELSE 0 END), 0) as total_pendiente
             FROM facturas
             WHERE veterinario_id = $1`,
            [req.user.id]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// RUTA DE INFORME COMPLETO
app.get('/api/informe/:mascotaId', authenticateToken, async (req, res) => {
    const mascotaId = req.params.mascotaId;
    
    try {
        // Verificar permisos y obtener información de la mascota
        const mascotaResult = await pool.query(`
            SELECT m.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido, c.telefono, c.email
            FROM mascotas m 
            JOIN clientes c ON m.cliente_id = c.id 
            WHERE m.id = $1 AND c.veterinario_id = $2
        `, [mascotaId, req.user.id]);
        
        if (mascotaResult.rows.length === 0) {
            return res.status(404).json({ error: 'Mascota no encontrada' });
        }

        const mascota = mascotaResult.rows[0];

        // Obtener consultas
        const consultasResult = await pool.query('SELECT * FROM consultas WHERE mascota_id = $1 ORDER BY fecha_consulta DESC', [mascotaId]);
        
        // Obtener análisis
        const analisisResult = await pool.query('SELECT * FROM analisis WHERE mascota_id = $1 ORDER BY fecha_analisis DESC', [mascotaId]);
        
        // Obtener vacunas
        const vacunasResult = await pool.query('SELECT * FROM vacunas WHERE mascota_id = $1 ORDER BY fecha_aplicacion DESC', [mascotaId]);

        res.json({
            mascota,
            consultas: consultasResult.rows,
            analisis: analisisResult.rows,
            vacunas: vacunasResult.rows
        });
    } catch (error) {
        console.error('Error generando informe:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ENDPOINTS PARA PORTAL DEL PACIENTE
app.post('/api/paciente/buscar', async (req, res) => {
    try {
        const { nombreCompleto, email } = req.body;
        
        if (!nombreCompleto) {
            return res.status(400).json({ error: 'Nombre completo es requerido' });
        }
        
        const partes = nombreCompleto.trim().split(' ');
        const nombre = partes[0];
        const apellido = partes.slice(1).join(' ') || '';
        
        let query = 'SELECT * FROM clientes WHERE nombre ILIKE $1 AND apellido ILIKE $2';
        let params = [`%${nombre}%`, `%${apellido}%`];
        
        if (email) {
            query += ' AND email = $3';
            params.push(email);
        }
        
        const clientesResult = await pool.query(query, params);
        
        if (clientesResult.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        const cliente = clientesResult.rows[0];
        
        const mascotasResult = await pool.query('SELECT * FROM mascotas WHERE cliente_id = $1 ORDER BY created_at DESC', [cliente.id]);
        
        res.json({
            cliente: cliente,
            mascotas: mascotasResult.rows
        });
    } catch (error) {
        console.error('Error buscando cliente:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/api/paciente/informe/:mascotaId', async (req, res) => {
    const mascotaId = req.params.mascotaId;
    
    try {
        // Obtener información de la mascota y cliente (sin verificar veterinario para portal público)
        const mascotaResult = await pool.query(`
            SELECT m.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido, c.telefono, c.email
            FROM mascotas m 
            JOIN clientes c ON m.cliente_id = c.id 
            WHERE m.id = $1
        `, [mascotaId]);
        
        if (mascotaResult.rows.length === 0) {
            return res.status(404).json({ error: 'Mascota no encontrada' });
        }

        const mascota = mascotaResult.rows[0];

        // Obtener consultas, análisis y vacunas
        const [consultasResult, analisisResult, vacunasResult] = await Promise.all([
            pool.query('SELECT * FROM consultas WHERE mascota_id = $1 ORDER BY fecha_consulta DESC', [mascotaId]),
            pool.query('SELECT * FROM analisis WHERE mascota_id = $1 ORDER BY fecha_analisis DESC', [mascotaId]),
            pool.query('SELECT * FROM vacunas WHERE mascota_id = $1 ORDER BY fecha_aplicacion DESC', [mascotaId])
        ]);

        res.json({
            mascota,
            consultas: consultasResult.rows,
            analisis: analisisResult.rows,
            vacunas: vacunasResult.rows
        });
    } catch (error) {
        console.error('Error generando informe para paciente:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Clientes con sus mascotas - Endpoint optimizado
app.get('/api/clientes-con-mascotas', authenticateToken, async (req, res) => {
    try {
        const sql = `
            SELECT 
                c.id as cliente_id,
                c.nombre as cliente_nombre,
                c.apellido as cliente_apellido,
                c.telefono as cliente_telefono,
                c.email as cliente_email,
                c.direccion as cliente_direccion,
                c.created_at as cliente_fecha_registro,
                m.id as mascota_id,
                m.nombre as mascota_nombre,
                m.especie,
                m.raza,
                m.edad,
                m.peso,
                m.pelaje as color,
                m.sexo,
                m.created_at as mascota_fecha_registro
            FROM clientes c
            LEFT JOIN mascotas m ON c.id = m.cliente_id
            WHERE c.veterinario_id = $1
            ORDER BY c.created_at DESC, m.created_at DESC
        `;
        
        const result = await pool.query(sql, [req.user.id]);
        const rows = result.rows;
        
        // Agrupar resultados por cliente
        const clientesMap = new Map();
        
        rows.forEach(row => {
            if (!clientesMap.has(row.cliente_id)) {
                clientesMap.set(row.cliente_id, {
                    id: row.cliente_id,
                    nombre: row.cliente_nombre,
                    apellido: row.cliente_apellido,
                    telefono: row.cliente_telefono,
                    email: row.cliente_email,
                    direccion: row.cliente_direccion,
                    fecha_registro: row.cliente_fecha_registro,
                    mascotas: []
                });
            }
            
            if (row.mascota_id) {
                clientesMap.get(row.cliente_id).mascotas.push({
                    id: row.mascota_id,
                    nombre: row.mascota_nombre,
                    especie: row.especie,
                    raza: row.raza,
                    edad: row.edad,
                    peso: row.peso,
                    color: row.color,
                    sexo: row.sexo,
                    fecha_registro: row.mascota_fecha_registro
                });
            }
        });
        
        res.json(Array.from(clientesMap.values()));
    } catch (error) {
        console.error('Error obteniendo clientes con mascotas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ENDPOINTS DE NOTIFICACIONES
const { 
    verificarAlimentoMascotas, 
    calcularDiasRestantes,
    obtenerConfiguracionNotificaciones,
    actualizarConfiguracionNotificaciones
} = require('./services/verificador-alimento');

// Verificar alimento manualmente
app.post('/api/notificaciones/verificar-alimento', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Verificación manual de alimento solicitada por:', req.user.email);
        const resultado = await verificarAlimentoMascotas();
        res.json(resultado);
    } catch (error) {
        console.error('Error en verificación manual:', error);
        res.status(500).json({ error: 'Error al verificar alimento' });
    }
});

// Obtener configuración de notificaciones
app.get('/api/notificaciones/config', authenticateToken, async (req, res) => {
    try {
        const config = await obtenerConfiguracionNotificaciones(req.user.id);
        res.json(config);
    } catch (error) {
        console.error('Error obteniendo configuración:', error);
        res.status(500).json({ error: 'Error al obtener configuración' });
    }
});

// Actualizar configuración de notificaciones
app.post('/api/notificaciones/config', authenticateToken, async (req, res) => {
    try {
        const config = await actualizarConfiguracionNotificaciones(req.user.id, req.body);
        res.json({ message: 'Configuración actualizada exitosamente', config });
    } catch (error) {
        console.error('Error actualizando configuración:', error);
        res.status(500).json({ error: 'Error al actualizar configuración' });
    }
});

// Obtener historial de notificaciones
app.get('/api/notificaciones/historial', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                ne.*,
                c.nombre as cliente_nombre,
                c.apellido as cliente_apellido,
                m.nombre as mascota_nombre
            FROM notificaciones_enviadas ne
            LEFT JOIN clientes c ON ne.cliente_id = c.id
            LEFT JOIN mascotas m ON ne.mascota_id = m.id
            WHERE ne.veterinario_id = $1
            ORDER BY ne.fecha_envio DESC
            LIMIT 100
        `;
        
        const result = await pool.query(query, [req.user.id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo historial:', error);
        res.status(500).json({ error: 'Error al obtener historial' });
    }
});

// Obtener alertas activas
app.get('/api/notificaciones/alertas', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                aa.*,
                m.nombre as mascota_nombre,
                m.tipo_alimento,
                m.marca_alimento,
                m.gramos_diarios,
                c.nombre as cliente_nombre,
                c.apellido as cliente_apellido,
                c.email as cliente_email,
                c.telefono as cliente_telefono
            FROM alertas_alimento aa
            JOIN mascotas m ON aa.mascota_id = m.id
            JOIN clientes c ON m.cliente_id = c.id
            WHERE m.veterinario_id = $1
                AND aa.fecha_alerta > NOW() - INTERVAL '7 days'
            ORDER BY aa.dias_restantes ASC, aa.fecha_alerta DESC
        `;
        
        const result = await pool.query(query, [req.user.id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo alertas:', error);
        res.status(500).json({ error: 'Error al obtener alertas' });
    }
});

// Calcular días restantes de alimento para una mascota
app.get('/api/mascotas/:id/alimento-restante', authenticateToken, async (req, res) => {
    try {
        const mascotaQuery = `
            SELECT m.*
            FROM mascotas m
            JOIN clientes c ON m.cliente_id = c.id
            WHERE m.id = $1 AND c.veterinario_id = $2
        `;
        
        const result = await pool.query(mascotaQuery, [req.params.id, req.user.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Mascota no encontrada' });
        }
        
        const mascota = result.rows[0];
        const calculo = calcularDiasRestantes(
            mascota.peso_bolsa_kg,
            mascota.gramos_diarios,
            mascota.fecha_inicio_bolsa
        );
        
        res.json({
            mascota: {
                id: mascota.id,
                nombre: mascota.nombre,
                tipo_alimento: mascota.tipo_alimento,
                marca_alimento: mascota.marca_alimento
            },
            calculo
        });
    } catch (error) {
        console.error('Error calculando alimento restante:', error);
        res.status(500).json({ error: 'Error al calcular alimento restante' });
    }
});

// Servir archivos estáticos
app.use('/uploads', express.static('uploads'));

// ==================== CONFIGURACIÓN DE PAGOS DEL VETERINARIO ====================

// Obtener configuración de pagos
app.get('/api/veterinario/config-pagos', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT cbu_cvu, alias_cbu, titular_cuenta, mercadopago_public_key,
                   precio_consulta, acepta_mercadopago, acepta_transferencia, acepta_efectivo
            FROM veterinarios WHERE id = $1
        `, [req.user.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Veterinario no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error obteniendo configuración de pagos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Actualizar configuración de pagos
app.put('/api/veterinario/config-pagos', authenticateToken, async (req, res) => {
    const {
        cbu_cvu,
        alias_cbu,
        titular_cuenta,
        mercadopago_access_token,
        mercadopago_public_key,
        precio_consulta,
        acepta_mercadopago,
        acepta_transferencia,
        acepta_efectivo
    } = req.body;
    
    try {
        const result = await pool.query(`
            UPDATE veterinarios SET
                cbu_cvu = $1,
                alias_cbu = $2,
                titular_cuenta = $3,
                mercadopago_access_token = $4,
                mercadopago_public_key = $5,
                precio_consulta = $6,
                acepta_mercadopago = $7,
                acepta_transferencia = $8,
                acepta_efectivo = $9
            WHERE id = $10
            RETURNING cbu_cvu, alias_cbu, titular_cuenta, mercadopago_public_key,
                      precio_consulta, acepta_mercadopago, acepta_transferencia, acepta_efectivo
        `, [
            cbu_cvu, alias_cbu, titular_cuenta, mercadopago_access_token,
            mercadopago_public_key, precio_consulta, acepta_mercadopago,
            acepta_transferencia, acepta_efectivo, req.user.id
        ]);
        
        res.json({
            message: 'Configuración de pagos actualizada exitosamente',
            config: result.rows[0]
        });
    } catch (error) {
        console.error('Error actualizando configuración de pagos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener configuración pública de pagos de un veterinario (para clientes)
app.get('/api/veterinario/:id/metodos-pago', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT nombre_veterinaria, nombre_veterinario, cbu_cvu, alias_cbu, titular_cuenta,
                   mercadopago_public_key, precio_consulta, acepta_mercadopago,
                   acepta_transferencia, acepta_efectivo
            FROM veterinarios WHERE id = $1
        `, [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Veterinario no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error obteniendo métodos de pago:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Rutas principales
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/sistema', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sistema.html'));
});

app.get('/paciente', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'paciente.html'));
});

// ==================== BOT DE NOTIFICACIONES AUTOMÁTICO ====================

// Configurar cron job para verificación automática de alimento (si está habilitado)
if (CRON_ENABLED) {
    // Ejecutar todos los días a las 9:00 AM
    cron.schedule('0 9 * * *', async () => {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🤖 CRON: Ejecutando verificación automática de alimento');
        console.log('═══════════════════════════════════════════════════════════');
        
        try {
            const resultado = await verificarAlimentoMascotas();
            console.log('✅ Verificación completada:', resultado);
        } catch (error) {
            console.error('❌ Error en verificación automática:', error);
        }
        
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
    }, {
        timezone: "America/Argentina/Buenos_Aires"
    });
    
    console.log('✅ Bot de notificaciones automático habilitado (9:00 AM diario)');
} else {
    console.log('ℹ️  Bot automático deshabilitado. Usar Task Scheduler o ejecutar manualmente.');
}

// Iniciar servidor
app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🐾 MUNDO PATAS - Sistema Veterinario');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ Servidor PostgreSQL iniciado en puerto ${PORT}`);
    console.log(`📱 Accede a: http://localhost:${PORT}`);
    console.log(`🌐 Landing comercial: http://localhost:${PORT}/landing-comercial.html`);
    console.log(`🤖 Bot automático: ${CRON_ENABLED ? 'HABILITADO (9:00 AM)' : 'DESHABILITADO'}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
});

module.exports = app;
