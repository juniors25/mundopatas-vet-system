const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { initializeDatabase, pool } = require('./database-postgres');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'mundo-patas-secret-key';

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
            'INSERT INTO mascotas (veterinario_id, cliente_id, nombre, especie, raza, edad, peso, color, sexo, observaciones) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
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
            SELECT m.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido 
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
    const { mascota_id, motivo, diagnostico, tratamiento, observaciones, peso_actual, temperatura } = req.body;

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
            'INSERT INTO consultas (veterinario_id, cliente_id, mascota_id, motivo, diagnostico, tratamiento, observaciones, peso_actual, temperatura) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [req.user.id, cliente_id, mascota_id, motivo, diagnostico, tratamiento, observaciones, peso_actual, temperatura]
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

// Servir archivos estáticos
app.use('/uploads', express.static('uploads'));

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

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🐾 MUNDO PATAS servidor PostgreSQL iniciado en puerto ${PORT}`);
    console.log(`📱 Accede a: http://localhost:${PORT}`);
    console.log(`🌐 Landing comercial: http://localhost:${PORT}/landing-comercial.html`);
});

module.exports = app;
