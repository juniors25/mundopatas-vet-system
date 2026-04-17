const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const Database = require('better-sqlite3');

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
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Base de datos SQLite
let db;

// Inicializar base de datos SQLite
function initializeDatabase() {
    try {
        console.log('🔄 Inicializando base de datos SQLite...');
        
        db = new Database('./veterinaria.db');

        // Crear tablas
        db.exec(`
            CREATE TABLE IF NOT EXISTS veterinarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre_veterinaria TEXT NOT NULL,
                nombre_veterinario TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                telefono TEXT,
                direccion TEXT,
                rol TEXT DEFAULT 'admin',
                cbu_cvu TEXT,
                alias_cbu TEXT,
                titular_cuenta TEXT,
                mercadopago_access_token TEXT,
                mercadopago_public_key TEXT,
                precio_consulta REAL DEFAULT 5000.00,
                acepta_mercadopago INTEGER DEFAULT 0,
                acepta_transferencia INTEGER DEFAULT 1,
                acepta_efectivo INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS clientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                veterinario_id INTEGER,
                nombre TEXT NOT NULL,
                apellido TEXT NOT NULL,
                email TEXT,
                telefono TEXT,
                direccion TEXT,
                password_portal TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS mascotas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                veterinario_id INTEGER,
                cliente_id INTEGER,
                nombre TEXT NOT NULL,
                especie TEXT NOT NULL,
                raza TEXT,
                edad INTEGER,
                peso REAL,
                pelaje TEXT,
                sexo TEXT,
                observaciones TEXT,
                tiene_chip INTEGER DEFAULT 0,
                numero_chip TEXT,
                tipo_alimento TEXT,
                marca_alimento TEXT,
                peso_bolsa_kg REAL,
                fecha_inicio_bolsa DATE,
                gramos_diarios REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS consultas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                veterinario_id INTEGER,
                cliente_id INTEGER,
                mascota_id INTEGER,
                fecha_consulta DATETIME DEFAULT CURRENT_TIMESTAMP,
                motivo TEXT NOT NULL,
                observaciones TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS licencias (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                clave TEXT UNIQUE NOT NULL,
                veterinario_id INTEGER,
                tipo TEXT NOT NULL DEFAULT 'PREMIUM',
                estado TEXT NOT NULL DEFAULT 'disponible',
                fecha_generacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_activacion DATETIME,
                fecha_expiracion DATETIME,
                activa INTEGER DEFAULT 0,
                notas TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Crear usuario admin por defecto si no existe
        const adminExists = db.prepare('SELECT id FROM veterinarios WHERE email = ?').get('admin@mundopatas.com');
        
        if (!adminExists) {
            const hashedPassword = bcrypt.hashSync('Admin123!', 10);
            const stmt = db.prepare(`
                INSERT INTO veterinarios 
                (nombre_veterinaria, nombre_veterinario, email, password, telefono, rol) 
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            stmt.run(['Mundo Patas', 'Administrador', 'admin@mundopatas.com', hashedPassword, '2617024193', 'admin']);
            console.log('👤 Usuario administrador creado:');
            console.log('   Email: admin@mundopatas.com');
            console.log('   Contraseña: Admin123!');
        }

        console.log('✅ Base de datos SQLite inicializada correctamente');
        return true;
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
        throw error;
    }
}

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Acceso no autorizado',
            message: 'Se requiere un token de autenticación',
            requiresAuth: true
        });
    }
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error('❌ Error al verificar token:', err.message);
            return res.status(403).json({
                success: false,
                error: 'Token inválido o expirado',
                message: 'Por favor, inicia sesión nuevamente',
                requiresAuth: true
            });
        }
        
        try {
            // Verificar que el usuario existe en la base de datos
            const user = db.prepare('SELECT id, nombre_veterinaria, nombre_veterinario, email, rol FROM veterinarios WHERE id = ?').get(decoded.userId);
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Usuario no encontrado',
                    message: 'El usuario asociado al token no existe',
                    requiresAuth: true
                });
            }
            
            // Agregar información del usuario a la solicitud
            req.user = user;
            console.log(`🔑 Usuario autenticado: ${req.user.email} (ID: ${req.user.id})`);
            next();
            
        } catch (error) {
            console.error('❌ Error en autenticación:', error);
            return res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                message: 'Error al verificar la autenticación'
            });
        }
    });
};

// Endpoint para inicio de sesión
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = db.prepare('SELECT * FROM veterinarios WHERE email = ?').get(email);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas',
                message: 'El email o la contraseña son incorrectos'
            });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas',
                message: 'El email o la contraseña son incorrectos'
            });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, rol: user.rol },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            token,
            user: {
                id: user.id,
                nombre_veterinaria: user.nombre_veterinaria,
                nombre_veterinario: user.nombre_veterinario,
                email: user.email,
                rol: user.rol
            }
        });

    } catch (error) {
        console.error('❌ Error en inicio de sesión:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: 'Ocurrió un error al intentar iniciar sesión'
        });
    }
});

// Endpoint para obtener clientes
app.get('/api/clientes', authenticateToken, (req, res) => {
    try {
        const clientes = db.prepare('SELECT * FROM clientes WHERE veterinario_id = ? ORDER BY created_at DESC').all(req.user.id);
        res.json(clientes);
    } catch (error) {
        console.error('❌ Error al obtener clientes:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los clientes',
            message: 'Ocurrió un error al intentar recuperar los clientes'
        });
    }
});

// Endpoint para crear cliente
app.post('/api/clientes', authenticateToken, (req, res) => {
    const { nombre, apellido, email, telefono, direccion } = req.body;

    try {
        const stmt = db.prepare(`
            INSERT INTO clientes (veterinario_id, nombre, apellido, email, telefono, direccion) 
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(req.user.id, nombre, apellido, email, telefono, direccion);

        const newClient = db.prepare('SELECT * FROM clientes WHERE id = ?').get(result.lastID);
        
        res.status(201).json({
            success: true,
            message: 'Cliente creado exitosamente',
            cliente: newClient
        });

    } catch (error) {
        console.error('❌ Error al crear cliente:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear el cliente',
            message: 'Ocurrió un error al intentar crear el cliente'
        });
    }
});

// Endpoint para obtener mascotas
app.get('/api/mascotas', authenticateToken, (req, res) => {
    try {
        const mascotas = db.prepare(`
            SELECT m.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido 
            FROM mascotas m 
            LEFT JOIN clientes c ON m.cliente_id = c.id 
            WHERE m.veterinario_id = ? 
            ORDER BY m.created_at DESC
        `).all(req.user.id);
        res.json(mascotas);
    } catch (error) {
        console.error('❌ Error al obtener mascotas:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener las mascotas',
            message: 'Ocurrió un error al intentar recuperar las mascotas'
        });
    }
});

// Endpoint para crear mascota
app.post('/api/mascotas', authenticateToken, (req, res) => {
    const { cliente_id, nombre, especie, raza, edad, peso, pelaje, sexo, observaciones } = req.body;

    try {
        const stmt = db.prepare(`
            INSERT INTO mascotas (veterinario_id, cliente_id, nombre, especie, raza, edad, peso, pelaje, sexo, observaciones) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(req.user.id, cliente_id, nombre, especie, raza, edad, peso, pelaje, sexo, observaciones);

        const newPet = db.prepare('SELECT * FROM mascotas WHERE id = ?').get(result.lastID);
        
        res.status(201).json({
            success: true,
            message: 'Mascota creada exitosamente',
            mascota: newPet
        });

    } catch (error) {
        console.error('❌ Error al crear mascota:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear la mascota',
            message: 'Ocurrió un error al intentar crear la mascota'
        });
    }
});

// Endpoint para obtener consultas
app.get('/api/consultas', authenticateToken, (req, res) => {
    try {
        const consultas = db.prepare(`
            SELECT c.*, 
                   cl.nombre as cliente_nombre, cl.apellido as cliente_apellido,
                   m.nombre as mascota_nombre, m.especie as mascota_especie
            FROM consultas c
            LEFT JOIN clientes cl ON c.cliente_id = cl.id
            LEFT JOIN mascotas m ON c.mascota_id = m.id
            WHERE c.veterinario_id = ?
            ORDER BY c.fecha_consulta DESC
        `).all(req.user.id);
        
        res.json({
            success: true,
            count: consultas.length,
            consultas: consultas
        });
        
    } catch (error) {
        console.error('❌ Error al obtener consultas:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener las consultas',
            message: 'Ocurrió un error al intentar recuperar las consultas'
        });
    }
});

// Endpoint para crear consulta
app.post('/api/consultas', authenticateToken, (req, res) => {
    const { cliente_id, mascota_id, motivo, observaciones } = req.body;

    try {
        const stmt = db.prepare(`
            INSERT INTO consultas (veterinario_id, cliente_id, mascota_id, motivo, observaciones) 
            VALUES (?, ?, ?, ?, ?)
        `);
        const result = stmt.run(req.user.id, cliente_id, mascota_id, motivo, observaciones);

        const newConsulta = db.prepare('SELECT * FROM consultas WHERE id = ?').get(result.lastID);
        
        res.status(201).json({
            success: true,
            message: 'Consulta creada exitosamente',
            consulta: newConsulta
        });

    } catch (error) {
        console.error('❌ Error al crear consulta:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear la consulta',
            message: 'Ocurrió un error al intentar crear la consulta'
        });
    }
});

// Endpoint de login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            error: 'Email y contraseña son requeridos'
        });
    }

    try {
        // Buscar veterinario por email
        const stmt = db.prepare('SELECT * FROM veterinarios WHERE email = ?');
        const veterinario = stmt.get(email);

        if (!veterinario) {
            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas'
            });
        }

        // Verificar contraseña
        const validPassword = bcrypt.compareSync(password, veterinario.password);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas'
            });
        }

        // Generar token JWT
        const token = jwt.sign(
            { 
                id: veterinario.id, 
                email: veterinario.email,
                nombre_veterinaria: veterinario.nombre_veterinaria 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login exitoso',
            token,
            user: {
                id: veterinario.id,
                email: veterinario.email,
                nombre_veterinaria: veterinario.nombre_veterinaria,
                nombre_veterinario: veterinario.nombre_veterinario
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            error: 'Error en el servidor'
        });
    }
});

// Endpoint de registro
app.post('/api/auth/register', (req, res) => {
    const { nombre_veterinaria, nombre_veterinario, email, password, telefono, direccion } = req.body;

    if (!nombre_veterinaria || !nombre_veterinario || !email || !password) {
        return res.status(400).json({
            success: false,
            error: 'Todos los campos son requeridos'
        });
    }

    try {
        // Verificar si el email ya existe
        const stmt = db.prepare('SELECT id FROM veterinarios WHERE email = ?');
        const existing = stmt.get(email);

        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'El email ya está registrado'
            });
        }

        // Hashear contraseña
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Insertar nuevo veterinario
        const insertStmt = db.prepare(`
            INSERT INTO veterinarios (nombre_veterinaria, nombre_veterinario, email, password, telefono, direccion)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        const result = insertStmt.run(nombre_veterinaria, nombre_veterinario, email, hashedPassword, telefono, direccion);

        // Generar token JWT
        const token = jwt.sign(
            { 
                id: result.lastInsertRowid, 
                email,
                nombre_veterinaria 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            message: 'Registro exitoso',
            token,
            user: {
                id: result.lastInsertRowid,
                email,
                nombre_veterinaria,
                nombre_veterinario
            }
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({
            success: false,
            error: 'Error en el servidor'
        });
    }
});

// Endpoint de configuración de la aplicación
app.get('/api/app-config', (req, res) => {
    res.json({
        mode: 'production', // o 'demo' según corresponda
        version: '1.0.1',
        features: {
            licencias: true,
            notificaciones: true,
            multi_veterinario: true,
            portal_paciente: true
        },
        limits: {
            max_clientes: 1000,
            max_mascotas: 5000,
            max_consultas: 10000
        }
    });
});

// Endpoint de salud
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Mundo Patas API funcionando correctamente',
        timestamp: new Date().toISOString(),
        version: '1.0.1'
    });
});

// Inicializar base de datos y iniciar servidor
try {
    initializeDatabase();
    app.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
        console.log(`🌐 Frontend disponible en: http://localhost:${PORT}`);
        console.log(`📊 Panel de administración: http://localhost:${PORT}/admin-panel.html`);
        console.log(`🔑 Usuario admin: admin@mundopatas.com / Admin123!`);
        
        if (CRON_ENABLED) {
            console.log('🤖 Bot automático: HABILITADO');
        } else {
            console.log('🤖 Bot automático: DESHABILITADO');
        }
    });
} catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
}
