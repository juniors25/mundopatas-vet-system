const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'mundo-patas-secret-key';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, '../public')));

// CORS para Vercel
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = '/tmp/uploads/';
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

// Configuración PostgreSQL - Railway
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Inicializar base de datos PostgreSQL
async function initializeDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS veterinarios (
                id SERIAL PRIMARY KEY,
                nombre_veterinario VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                telefono VARCHAR(50),
                direccion TEXT,
                licencia_activa BOOLEAN DEFAULT false,
                tipo_cuenta VARCHAR(50) DEFAULT 'DEMO',
                fecha_expiracion_demo TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS licencias (
                id SERIAL PRIMARY KEY,
                clave VARCHAR(100) UNIQUE NOT NULL,
                veterinario_id INTEGER REFERENCES veterinarios(id),
                tipo VARCHAR(50) NOT NULL DEFAULT 'PREMIUM',
                estado VARCHAR(50) NOT NULL DEFAULT 'disponible',
                fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fecha_activacion TIMESTAMP,
                fecha_expiracion TIMESTAMP,
                activa BOOLEAN DEFAULT false,
                notas TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS clientes (
                id SERIAL PRIMARY KEY,
                veterinario_id INTEGER REFERENCES veterinarios(id),
                nombre VARCHAR(255) NOT NULL,
                apellido VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                telefono VARCHAR(50),
                direccion TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS mascotas (
                id SERIAL PRIMARY KEY,
                veterinario_id INTEGER REFERENCES veterinarios(id),
                cliente_id INTEGER REFERENCES clientes(id),
                nombre VARCHAR(255) NOT NULL,
                especie VARCHAR(100),
                raza VARCHAR(100),
                edad INTEGER,
                peso DECIMAL(5,2),
                color VARCHAR(100),
                sexo VARCHAR(20),
                observaciones TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Crear índices para rendimiento
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_licencias_clave ON licencias(clave)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_licencias_veterinario ON licencias(veterinario_id)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_licencias_estado ON licencias(estado)
        `);

        console.log('✅ Base de datos PostgreSQL inicializada correctamente');
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
    }
}

// Inicializar al arrancar
initializeDatabase();

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

// RUTAS DE AUTENTICACIÓN
app.post('/api/register', async (req, res) => {
    const { nombre_veterinario, email, password, telefono, direccion } = req.body;

    try {
        const existingUser = await pool.query('SELECT id FROM veterinarios WHERE email = $1', [email]);
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await pool.query(`
            INSERT INTO veterinarios (nombre_veterinario, email, password, telefono, direccion) 
            VALUES ($1, $2, $3, $4, $5) RETURNING id, email, nombre_veterinario
        `, [nombre_veterinario, email, hashedPassword, telefono, direccion]);

        const newVet = result.rows[0];
        const token = jwt.sign({ id: newVet.id, email: newVet.email }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            message: 'Veterinario registrado exitosamente',
            token,
            user: {
                id: newVet.id,
                email: newVet.email,
                nombre: newVet.nombre_veterinario
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
        const result = await pool.query(`
            INSERT INTO clientes (veterinario_id, nombre, apellido, email, telefono, direccion) 
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
        `, [req.user.id, nombre, apellido, email, telefono, direccion]);

        res.status(201).json({ 
            message: 'Cliente registrado exitosamente', 
            cliente: result.rows[0] 
        });
    } catch (error) {
        console.error('Error registrando cliente:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/api/clientes', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM clientes WHERE veterinario_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo clientes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/api/clientes-con-mascotas', authenticateToken, async (req, res) => {
    try {
        const clientesResult = await pool.query(
            'SELECT * FROM clientes WHERE veterinario_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        
        const clientesConMascotas = [];
        
        for (const cliente of clientesResult.rows) {
            const mascotasResult = await pool.query(
                'SELECT * FROM mascotas WHERE cliente_id = $1 ORDER BY created_at DESC',
                [cliente.id]
            );
            
            clientesConMascotas.push({
                ...cliente,
                mascotas: mascotasResult.rows
            });
        }
        
        res.json(clientesConMascotas);
    } catch (error) {
        console.error('Error obteniendo clientes con mascotas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// RUTAS DE MASCOTAS
app.post('/api/mascotas', authenticateToken, async (req, res) => {
    const { cliente_id, nombre, especie, raza, edad, peso, color, sexo, observaciones } = req.body;

    try {
        // Verificar que el cliente existe y pertenece al veterinario
        const clienteResult = await pool.query(
            'SELECT * FROM clientes WHERE id = $1 AND veterinario_id = $2',
            [cliente_id, req.user.id]
        );
        
        if (clienteResult.rows.length === 0) {
            return res.status(403).json({ error: 'No tienes permiso para agregar mascotas a este cliente' });
        }

        const result = await pool.query(`
            INSERT INTO mascotas (veterinario_id, cliente_id, nombre, especie, raza, edad, peso, color, sexo, observaciones) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
        `, [req.user.id, cliente_id, nombre, especie, raza, edad, peso, color, sexo, observaciones]);

        res.status(201).json({ 
            message: 'Mascota registrada exitosamente', 
            mascota: result.rows[0] 
        });
    } catch (error) {
        console.error('Error registrando mascota:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/api/mascotas', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM mascotas WHERE veterinario_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo mascotas:', error);
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
        
        const clienteResult = await pool.query(query, params);
        
        if (clienteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        const cliente = clienteResult.rows[0];
        const mascotasResult = await pool.query(
            'SELECT * FROM mascotas WHERE cliente_id = $1 ORDER BY created_at DESC',
            [cliente.id]
        );
        
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
    const mascotaId = parseInt(req.params.mascotaId);
    
    try {
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
        
        const [consultasResult, analisisResult, vacunasResult] = await Promise.all([
            pool.query('SELECT * FROM consultas WHERE mascota_id = $1 ORDER BY created_at DESC', [mascotaId]),
            pool.query('SELECT * FROM analisis WHERE mascota_id = $1 ORDER BY created_at DESC', [mascotaId]),
            pool.query('SELECT * FROM vacunas WHERE mascota_id = $1 ORDER BY created_at DESC', [mascotaId])
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

// Endpoint para configuración de la app
app.get('/api/app-config', (req, res) => {
    res.json({
        mode: 'demo',
        config: {
            MAX_CLIENTS: 10,
            MAX_PETS_PER_CLIENT: 5,
            MAX_CONSULTATIONS: 20,
            MAX_ANALYSIS: 10,
            MAX_VACCINES: 15,
            FEATURES_DISABLED: [],
            DEMO_DATA_ENABLED: true,
            WATERMARK_ENABLED: true
        },
        watermark: '🚀 VERSIÓN DEMO - MUNDO PATAS'
    });
});

// Login demo directo - Crear veterinario demo único por sesión
app.post('/api/demo-login', async (req, res) => {
    try {
        const timestamp = Date.now();
        const demoEmail = `demo-${timestamp}@mundopatas.com`;
        const hashedPassword = await bcrypt.hash('demo123', 10);
        
        const newUser = await pool.query(`
            INSERT INTO veterinarios (nombre_veterinario, email, password, telefono, direccion) 
            VALUES ($1, $2, $3, $4, $5) RETURNING *
        `, [`Dr. Demo ${timestamp}`, demoEmail, hashedPassword, '2617024193', 'Clínica MUNDO PATAS - Demo']);

        const user = newUser.rows[0];
        
        await createDemoData(user.id);
        
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            message: 'Acceso demo exitoso - Datos precargados',
            token,
            user: {
                id: user.id,
                email: user.email,
                nombre: user.nombre_veterinario
            }
        });
    } catch (error) {
        console.error('Error en demo login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Función para crear datos demo por veterinario
async function createDemoData(veterinarioId) {
    try {
        const cliente1 = await pool.query(`
            INSERT INTO clientes (veterinario_id, nombre, apellido, email, telefono, direccion) 
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
        `, [veterinarioId, 'María', 'González', 'maria.gonzalez@email.com', '2617123456', 'Av. San Martín 123']);
        
        const cliente2 = await pool.query(`
            INSERT INTO clientes (veterinario_id, nombre, apellido, email, telefono, direccion) 
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
        `, [veterinarioId, 'Carlos', 'Rodríguez', 'carlos.rodriguez@email.com', '2617654321', 'Calle Belgrano 456']);
        
        await pool.query(`
            INSERT INTO mascotas (veterinario_id, cliente_id, nombre, especie, raza, edad, peso, color, sexo) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [veterinarioId, cliente1.rows[0].id, 'Max', 'Perro', 'Labrador', 3, 25.5, 'Dorado', 'Macho']);
        
        await pool.query(`
            INSERT INTO mascotas (veterinario_id, cliente_id, nombre, especie, raza, edad, peso, color, sexo) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [veterinarioId, cliente2.rows[0].id, 'Luna', 'Gato', 'Persa', 2, 4.2, 'Blanco', 'Hembra']);
        
        console.log(`✅ Datos demo creados para veterinario ${veterinarioId}`);
    } catch (error) {
        console.error('Error creando datos demo:', error);
    }
}

// Endpoint para validar clave de acceso
app.post('/api/validate-access-key', (req, res) => {
    const { accessKey } = req.body;
    
    const validKeys = [
        'MUNDOPATAS-2024-PREMIUM-001',
        'MUNDOPATAS-2024-PREMIUM-002',
        'MUNDOPATAS-2024-PREMIUM-003',
        'MUNDOPATAS-2024-PREMIUM-004',
        'MUNDOPATAS-2024-PREMIUM-005'
    ];
    
    if (validKeys.includes(accessKey)) {
        res.json({ valid: true, message: 'Clave de acceso válida' });
    } else {
        res.status(401).json({ valid: false, error: 'Clave de acceso inválida. Contacta al administrador para obtener una clave válida.' });
    }
});

// Middleware de autenticación de admin
function authenticateAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token !== 'admin-mundopatas-2024') {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere autenticación de administrador.' });
    }
    
    next();
}

// Endpoint para generar licencias (ADMIN)
app.post('/api/admin/licencias/generar', authenticateAdmin, async (req, res) => {
    const { tipo = 'PREMIUM', cantidad = 1, notas = '' } = req.body;
    
    if (cantidad < 1 || cantidad > 100) {
        return res.status(400).json({ error: 'La cantidad debe estar entre 1 y 100' });
    }
    
    try {
        const licenciasGeneradas = [];
        
        for (let i = 0; i < cantidad; i++) {
            // Generar clave única
            const year = new Date().getFullYear();
            const random = Math.random().toString(36).substring(2, 10).toUpperCase();
            const timestamp = Date.now().toString(36).toUpperCase();
            const clave = `MUNDOPATAS-${year}-${random}-${timestamp}`;
            
            const result = await pool.query(`
                INSERT INTO licencias (clave, tipo, estado, notas)
                VALUES ($1, $2, 'disponible', $3)
                RETURNING *
            `, [clave, tipo, notas]);
            
            licenciasGeneradas.push(result.rows[0]);
        }
        
        res.json({
            message: `${cantidad} licencia(s) generada(s) exitosamente`,
            licencias: licenciasGeneradas
        });
    } catch (error) {
        console.error('Error generando licencias:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para listar todas las licencias (ADMIN)
app.get('/api/admin/licencias', authenticateAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT l.*, v.nombre_veterinario, v.email
            FROM licencias l
            LEFT JOIN veterinarios v ON l.veterinario_id = v.id
            ORDER BY l.created_at DESC
        `);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo licencias:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para obtener clientes del panel de administración
app.get('/api/admin/clients', authenticateAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                v.id,
                v.nombre_veterinario as veterinario,
                v.email,
                v.telefono,
                v.direccion,
                v.tipo_cuenta as plan,
                v.licencia_activa,
                v.created_at as "fechaInicio",
                CASE 
                    WHEN v.licencia_activa = true THEN 'activo'
                    ELSE 'inactivo'
                END as estado,
                l.clave as "licenseKey",
                l.fecha_expiracion as "fechaVencimiento",
                CASE 
                    WHEN v.tipo_cuenta = 'DEMO' THEN 0
                    WHEN v.tipo_cuenta = 'BASICO' THEN 30000
                    WHEN v.tipo_cuenta = 'PROFESIONAL' THEN 50000
                    WHEN v.tipo_cuenta = 'PREMIUM' THEN 50000
                    ELSE 0
                END as "ingresoMensual",
                'Veterinaria ' || v.nombre_veterinario as veterinaria
            FROM veterinarios v
            LEFT JOIN licencias l ON l.veterinario_id = v.id AND l.activa = true
            WHERE v.tipo_cuenta != 'DEMO'
            ORDER BY v.created_at DESC
        `);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo clientes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para validar y activar licencia
app.post('/api/validate-license-key', authenticateToken, async (req, res) => {
    const { licenseKey } = req.body;
    
    if (!licenseKey) {
        return res.status(400).json({ error: 'Clave de licencia requerida' });
    }
    
    try {
        // Verificar si el veterinario ya tiene una licencia activa
        const vetResult = await pool.query(
            'SELECT licencia_activa, tipo_cuenta FROM veterinarios WHERE id = $1',
            [req.user.id]
        );
        
        if (vetResult.rows.length === 0) {
            return res.status(404).json({ error: 'Veterinario no encontrado' });
        }
        
        const veterinario = vetResult.rows[0];
        
        if (veterinario.licencia_activa) {
            return res.status(400).json({ error: 'Ya tienes una licencia activa' });
        }
        
        // Verificar que la clave existe y está disponible
        const licenciaResult = await pool.query(
            'SELECT * FROM licencias WHERE clave = $1',
            [licenseKey]
        );
        
        if (licenciaResult.rows.length === 0) {
            return res.status(404).json({ error: 'Clave de licencia inválida' });
        }
        
        const licencia = licenciaResult.rows[0];
        
        if (licencia.estado !== 'disponible' || licencia.activa) {
            return res.status(400).json({ error: 'Esta licencia ya ha sido activada' });
        }
        
        // Activar la licencia
        const fechaExpiracion = new Date();
        fechaExpiracion.setFullYear(fechaExpiracion.getFullYear() + 1); // 1 año desde hoy
        
        await pool.query(`
            UPDATE licencias SET
                veterinario_id = $1,
                estado = 'activa',
                fecha_activacion = NOW(),
                fecha_expiracion = $2,
                activa = true,
                updated_at = NOW()
            WHERE clave = $3
        `, [req.user.id, fechaExpiracion, licenseKey]);
        
        // Actualizar el veterinario
        await pool.query(`
            UPDATE veterinarios SET
                licencia_activa = true,
                tipo_cuenta = $1,
                fecha_expiracion_demo = NULL
            WHERE id = $2
        `, [licencia.tipo, req.user.id]);
        
        res.json({
            message: '¡Licencia activada exitosamente!',
            plan: licencia.tipo,
            features: ['Acceso completo', 'Sin límites', 'Soporte prioritario', 'Actualizaciones gratuitas'],
            fecha_expiracion: fechaExpiracion
        });
    } catch (error) {
        console.error('Error activando licencia:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = app;
