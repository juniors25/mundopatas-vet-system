const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('./config');
const db = require('./database-postgres');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'mundo_patas_secret_key_2024';

// Configuración según el modo de la aplicación
const APP_CONFIG = config.APP_MODE === 'demo' ? config.DEMO_CONFIG : config.FULL_CONFIG;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configuración de multer para subir archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Crear directorio uploads si no existe
const fs = require('fs');
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.sendStatus(401);
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Middleware para verificar límites de la versión demo
const checkDemoLimits = (type) => {
    return async (req, res, next) => {
        if (config.APP_MODE !== 'demo') {
            return next();
        }
        
        try {
            let count = 0;
            const veterinario_id = req.user.id;
            
            switch (type) {
                case 'clients':
                    const clientsResult = await new Promise((resolve, reject) => {
                        db.get('SELECT COUNT(*) as count FROM clientes WHERE veterinario_id = ?', [veterinario_id], (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        });
                    });
                    count = clientsResult.count;
                    if (count >= APP_CONFIG.MAX_CLIENTS) {
                        return res.status(403).json({ error: config.MESSAGES.DEMO_LIMIT_REACHED });
                    }
                    break;
                    
                case 'pets':
                    const petsResult = await new Promise((resolve, reject) => {
                        db.get(`SELECT COUNT(*) as count FROM mascotas m 
                                JOIN clientes c ON m.cliente_id = c.id 
                                WHERE c.veterinario_id = ?`, [veterinario_id], (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        });
                    });
                    count = petsResult.count;
                    if (count >= APP_CONFIG.MAX_PETS_PER_CLIENT * APP_CONFIG.MAX_CLIENTS) {
                        return res.status(403).json({ error: config.MESSAGES.DEMO_LIMIT_REACHED });
                    }
                    break;
            }
            
            next();
        } catch (error) {
            res.status(500).json({ error: 'Error verificando límites' });
        }
    };
};

// Sistema de claves de licencia
const VALID_LICENSE_KEYS = {
    'MUNDOPATAS-PREMIUM-2025': {
        plan: 'premium',
        features: ['citas', 'facturacion', 'inventario', 'notificaciones', 'reportes', 'telemedicina', 'multivet'],
        expires: '2025-12-31',
        maxUsers: 5
    },
    'MUNDOPATAS-PRO-2025': {
        plan: 'profesional',
        features: ['citas', 'facturacion', 'inventario', 'notificaciones', 'reportes'],
        expires: '2025-12-31',
        maxUsers: 3
    },
    'MUNDOPATAS-BASIC-2025': {
        plan: 'basico',
        features: ['citas', 'facturacion'],
        expires: '2025-12-31',
        maxUsers: 1
    },
    // Clave especial para el desarrollador
    'GASTON-DEV-MASTER-KEY': {
        plan: 'developer',
        features: ['all'],
        expires: '2030-12-31',
        maxUsers: 999
    }
};

// Endpoint para validar clave de licencia
app.post('/api/validate-license-key', authenticateToken, (req, res) => {
    const { licenseKey } = req.body;
    
    if (!licenseKey) {
        return res.status(400).json({ 
            valid: false, 
            error: 'Clave de licencia requerida' 
        });
    }
    
    const license = VALID_LICENSE_KEYS[licenseKey.toUpperCase()];
    
    if (!license) {
        return res.status(400).json({ 
            valid: false, 
            error: 'Clave de licencia inválida. Contacta al desarrollador para obtener una clave válida.' 
        });
    }
    
    // Verificar si la licencia ha expirado
    const currentDate = new Date();
    const expiryDate = new Date(license.expires);
    
    if (currentDate > expiryDate) {
        return res.status(400).json({ 
            valid: false, 
            error: 'La licencia ha expirado. Contacta al desarrollador para renovarla.' 
        });
    }
    
    // Guardar la licencia activada en la base de datos
    const insertLicense = db.prepare(`
        INSERT OR REPLACE INTO configuraciones (clave, valor, descripcion) 
        VALUES (?, ?, ?)
    `);
    
    insertLicense.run(
        'license_key', 
        licenseKey.toUpperCase(),
        `Licencia ${license.plan} activada`
    );
    
    insertLicense.run(
        'license_plan', 
        license.plan,
        'Plan de licencia activo'
    );
    
    insertLicense.run(
        'license_features', 
        JSON.stringify(license.features),
        'Funcionalidades habilitadas'
    );
    
    res.json({ 
        valid: true, 
        message: `Licencia ${license.plan.toUpperCase()} activada exitosamente`,
        plan: license.plan,
        features: license.features,
        expires: license.expires,
        maxUsers: license.maxUsers
    });
});

// Endpoint para verificar estado de licencia
app.get('/api/license-status', authenticateToken, (req, res) => {
    try {
        const getLicenseKey = db.prepare('SELECT valor FROM configuraciones WHERE clave = ?');
        const getPlan = db.prepare('SELECT valor FROM configuraciones WHERE clave = ?');
        const getFeatures = db.prepare('SELECT valor FROM configuraciones WHERE clave = ?');
        
        const licenseKeyRow = getLicenseKey.get('license_key');
        const planRow = getPlan.get('license_plan');
        const featuresRow = getFeatures.get('license_features');
        
        if (!licenseKeyRow) {
            return res.json({
                active: false,
                plan: 'demo',
                features: [],
                message: 'No hay licencia activada. Funcionando en modo demo.'
            });
        }
        
        const licenseKey = licenseKeyRow.valor;
        const license = VALID_LICENSE_KEYS[licenseKey];
        
        if (!license) {
            return res.json({
                active: false,
                plan: 'demo',
                features: [],
                message: 'Licencia inválida. Contacta al desarrollador.'
            });
        }
        
        // Verificar expiración
        const currentDate = new Date();
        const expiryDate = new Date(license.expires);
        
        if (currentDate > expiryDate) {
            return res.json({
                active: false,
                plan: 'expired',
                features: [],
                message: 'Licencia expirada. Contacta al desarrollador para renovarla.'
            });
        }
        
        res.json({
            active: true,
            plan: license.plan,
            features: license.features,
            expires: license.expires,
            maxUsers: license.maxUsers,
            message: `Licencia ${license.plan.toUpperCase()} activa`
        });
        
    } catch (error) {
        console.error('Error verificando licencia:', error);
        res.status(500).json({ 
            active: false,
            plan: 'error',
            features: [],
            message: 'Error verificando licencia' 
        });
    }
});

// Middleware para verificar funcionalidades premium
function requirePremiumFeature(featureName) {
    return (req, res, next) => {
        try {
            const getFeaturesRow = db.prepare('SELECT valor FROM configuraciones WHERE clave = ?');
            const featuresRow = getFeaturesRow.get('license_features');
            
            if (!featuresRow) {
                return res.status(403).json({ 
                    error: 'Funcionalidad premium no disponible. Activa tu licencia.',
                    feature: featureName,
                    contact: 'Contacta a Gastón Díaz: 2617024193'
                });
            }
            
            const features = JSON.parse(featuresRow.valor);
            
            if (!features.includes(featureName) && !features.includes('all')) {
                return res.status(403).json({ 
                    error: `Funcionalidad '${featureName}' no incluida en tu plan. Actualiza tu licencia.`,
                    feature: featureName,
                    contact: 'Contacta a Gastón Díaz: 2617024193'
                });
            }
            
            next();
        } catch (error) {
            console.error('Error verificando funcionalidad premium:', error);
            res.status(500).json({ error: 'Error verificando permisos' });
        }
    };
}

// Endpoint para validar clave de acceso
app.post('/api/validate-access-key', (req, res) => {
    const { accessKey } = req.body;
    
    console.log('🔑 Validando clave de acceso:', accessKey);
    console.log('🔑 Claves válidas:', config.VALID_ACCESS_KEYS);
    console.log('🔑 ¿Clave válida?:', config.VALID_ACCESS_KEYS.includes(accessKey));
    
    if (config.VALID_ACCESS_KEYS.includes(accessKey)) {
        console.log('✅ Clave de acceso válida');
        res.json({ valid: true, message: 'Clave de acceso válida' });
    } else {
        console.log('❌ Clave de acceso inválida');
        res.status(401).json({ valid: false, error: config.MESSAGES.INVALID_ACCESS_KEY });
    }
});

// Endpoint para obtener configuración de la aplicación
app.get('/api/app-config', (req, res) => {
    res.json({
        mode: config.APP_MODE,
        config: APP_CONFIG,
        watermark: config.APP_MODE === 'demo' ? config.MESSAGES.DEMO_WATERMARK : null
    });
});

// RUTAS DE AUTENTICACIÓN

// Ruta para registrar clientes (solo por veterinarios autenticados)
app.post('/api/clientes', authenticateToken, checkDemoLimits('clients'), async (req, res) => {
    console.log('📝 Solicitud de registro de cliente recibida:', req.body);
    
    try {
        const { nombre, apellido, email, telefono, direccion } = req.body;
        
        if (!nombre || !apellido) {
            console.log('❌ Campos obligatorios faltantes');
            return res.status(400).json({ error: 'Nombre y apellido son obligatorios' });
        }
        
        const veterinario_id = req.user.id; // ID del veterinario autenticado
        
        console.log('💾 Insertando cliente en base de datos...');
        // Insertar nuevo cliente
        db.run(`INSERT INTO clientes (nombre, apellido, email, telefono, direccion, veterinario_id) 
                VALUES (?, ?, ?, ?, ?, ?)`,
            [nombre, apellido, email, telefono, direccion, veterinario_id],
            function(err) {
                if (err) {
                    console.log('❌ Error al insertar cliente:', err);
                    return res.status(500).json({ error: 'Error al registrar cliente: ' + err.message });
                }
                
                console.log('✅ Cliente registrado con ID:', this.lastID);
                
                res.json({
                    id: this.lastID,
                    message: 'Cliente registrado exitosamente'
                });
            }
        );
    } catch (error) {
        console.log('❌ Error general en registro:', error);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// Registro de veterinaria
app.post('/api/auth/register', async (req, res) => {
    const { nombre_veterinaria, nombre_veterinario, email, password, telefono, direccion } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `INSERT INTO veterinarios (nombre_veterinaria, nombre_veterinario, email, password, telefono, direccion) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
        
        db.query(sql, [nombre_veterinaria, nombre_veterinario, email, hashedPassword, telefono, direccion], (err, result) => {
            if (err) {
                if (err.message.includes('duplicate key') || err.message.includes('unique constraint')) {
                    return res.status(400).json({ error: 'El email ya está registrado' });
                }
                return res.status(500).json({ error: err.message });
            }
            
            const newId = result.rows[0].id;
            const token = jwt.sign({ id: newId, email, rol: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
            res.json({ 
                token, 
                user: { 
                    id: newId, 
                    nombre_veterinaria, 
                    nombre_veterinario, 
                    email, 
                    rol: 'admin' 
                },
                message: 'Veterinaria registrada exitosamente' 
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const sql = `SELECT * FROM veterinarios WHERE email = $1 AND activo = 1`;
    
    db.query(sql, [email], async (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const user = result.rows[0];
        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        try {
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }
            
            const token = jwt.sign({ id: user.id, email: user.email, rol: user.rol }, JWT_SECRET, { expiresIn: '24h' });
            res.json({ 
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
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    });
});

// Login para veterinarios
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const sql = `SELECT * FROM veterinarios WHERE email = ? AND activo = 1`;
    
    db.get(sql, [email], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        try {
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }
            
            const token = jwt.sign({ id: user.id, email: user.email, rol: user.rol }, JWT_SECRET, { expiresIn: '24h' });
            res.json({ 
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
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    });
});

// RUTAS API

// Clientes - Mostrar todos los clientes del veterinario autenticado
app.get('/api/clientes', authenticateToken, (req, res) => {
    const sql = `SELECT * FROM clientes WHERE veterinario_id = ? ORDER BY fecha_registro DESC`;
    
    db.all(sql, [req.user.id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Clientes con sus mascotas - Endpoint optimizado
app.get('/api/clientes-con-mascotas', authenticateToken, (req, res) => {
    const sql = `
        SELECT 
            c.id as cliente_id,
            c.nombre as cliente_nombre,
            c.apellido as cliente_apellido,
            c.telefono as cliente_telefono,
            c.email as cliente_email,
            c.direccion as cliente_direccion,
            c.fecha_registro as cliente_fecha_registro,
            m.id as mascota_id,
            m.nombre as mascota_nombre,
            m.especie,
            m.raza,
            m.edad,
            m.peso,
            m.color,
            m.sexo,
            m.fecha_registro as mascota_fecha_registro
        FROM clientes c
        LEFT JOIN mascotas m ON c.id = m.cliente_id
        WHERE c.veterinario_id = ?
        ORDER BY c.fecha_registro DESC, m.fecha_registro DESC
    `;
    
    db.all(sql, [req.user.id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
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
    });
});

// Mascotas - Registrar mascota para un cliente específico
app.post('/api/mascotas', authenticateToken, checkDemoLimits('pets'), (req, res) => {
    const { nombre, especie, raza, edad, peso, color, sexo, cliente_id } = req.body;
    
    // Verificar que el cliente pertenece al veterinario autenticado
    db.get('SELECT id FROM clientes WHERE id = ? AND veterinario_id = ?', [cliente_id, req.user.id], (err, cliente) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
        
        if (!cliente) {
            return res.status(403).json({ error: 'No tienes permiso para agregar mascotas a este cliente' });
        }
        
        const sql = `INSERT INTO mascotas (nombre, especie, raza, edad, peso, color, sexo, cliente_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        
        db.run(sql, [nombre, especie, raza, edad, peso, color, sexo, cliente_id], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, message: 'Mascota registrada exitosamente' });
        });
    });
});

app.get('/api/mascotas', authenticateToken, (req, res) => {
    const sql = `
        SELECT m.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido 
        FROM mascotas m 
        LEFT JOIN clientes c ON m.cliente_id = c.id 
        WHERE c.veterinario_id = ?
        ORDER BY m.fecha_registro DESC
    `;
    
    db.all(sql, [req.user.id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.get('/api/mascotas/:id', (req, res) => {
    const sql = `
        SELECT m.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido, c.telefono, c.email 
        FROM mascotas m 
        JOIN clientes c ON m.cliente_id = c.id 
        WHERE m.id = ?
    `;
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row);
    });
});

// Consultas - Solo para mascotas de clientes del veterinario autenticado
app.post('/api/consultas', authenticateToken, (req, res) => {
    const { mascota_id, motivo, diagnostico, tratamiento, observaciones, peso_actual, temperatura } = req.body;
    
    // Verificar que la mascota pertenece a un cliente del veterinario autenticado
    db.get(`SELECT m.id FROM mascotas m 
            JOIN clientes c ON m.cliente_id = c.id 
            WHERE m.id = ? AND c.veterinario_id = ?`, [mascota_id, req.user.id], (err, mascota) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
        
        if (!mascota) {
            return res.status(403).json({ error: 'No tienes permiso para agregar consultas a esta mascota' });
        }
        
        const sql = `INSERT INTO consultas (mascota_id, motivo, diagnostico, tratamiento, observaciones, peso_actual, temperatura) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        db.run(sql, [mascota_id, motivo, diagnostico, tratamiento, observaciones, peso_actual, temperatura], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, message: 'Consulta registrada exitosamente' });
        });
    });
});

app.get('/api/consultas/:mascotaId', authenticateToken, (req, res) => {
    // Verificar que la mascota pertenece a un cliente del veterinario autenticado
    db.get('SELECT m.id FROM mascotas m JOIN clientes c ON m.cliente_id = c.id WHERE m.id = ? AND c.veterinario_id = ?', [req.params.mascotaId, req.user.id], (err, mascota) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
        
        if (!mascota) {
            return res.status(403).json({ error: 'No tienes permiso para ver las consultas de esta mascota' });
        }
        
        const sql = `SELECT * FROM consultas WHERE mascota_id = ? ORDER BY fecha_consulta DESC`;
        
        db.all(sql, [req.params.mascotaId], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        });
    });
});

// Análisis - Solo para mascotas del cliente autenticado
app.post('/api/analisis', authenticateToken, upload.single('archivo'), (req, res) => {
    const { mascota_id, tipo_analisis, resultados, observaciones } = req.body;
    const archivo_adjunto = req.file ? req.file.filename : null;
    
    // Verificar que la mascota pertenece a un cliente del veterinario autenticado
    db.get('SELECT m.id FROM mascotas m JOIN clientes c ON m.cliente_id = c.id WHERE m.id = ? AND c.veterinario_id = ?', [mascota_id, req.user.id], (err, mascota) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
        
        if (!mascota) {
            return res.status(403).json({ error: 'No tienes permiso para agregar análisis a esta mascota' });
        }
        
        const sql = `INSERT INTO analisis (mascota_id, tipo_analisis, resultados, archivo_adjunto, observaciones) VALUES (?, ?, ?, ?, ?)`;
        
        db.run(sql, [mascota_id, tipo_analisis, resultados, archivo_adjunto, observaciones], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, message: 'Análisis registrado exitosamente' });
        });
    });
});

app.get('/api/analisis/:mascotaId', authenticateToken, (req, res) => {
    // Verificar que la mascota pertenece a un cliente del veterinario autenticado
    db.get('SELECT m.id FROM mascotas m JOIN clientes c ON m.cliente_id = c.id WHERE m.id = ? AND c.veterinario_id = ?', [req.params.mascotaId, req.user.id], (err, mascota) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
        
        if (!mascota) {
            return res.status(403).json({ error: 'No tienes permiso para ver los análisis de esta mascota' });
        }
        
        const sql = `SELECT * FROM analisis WHERE mascota_id = ? ORDER BY fecha_analisis DESC`;
        
        db.all(sql, [req.params.mascotaId], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        });
    });
});

// Vacunas
app.post('/api/vacunas', authenticateToken, (req, res) => {
    const { mascota_id, nombre_vacuna, fecha_aplicacion, fecha_proxima, lote, veterinario, observaciones } = req.body;
    
    // Verificar que la mascota pertenece a un cliente del veterinario autenticado
    db.get('SELECT m.id FROM mascotas m JOIN clientes c ON m.cliente_id = c.id WHERE m.id = ? AND c.veterinario_id = ?', [mascota_id, req.user.id], (err, mascota) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
        
        if (!mascota) {
            return res.status(403).json({ error: 'No tienes permiso para agregar vacunas a esta mascota' });
        }
        
        const sql = `INSERT INTO vacunas (mascota_id, nombre_vacuna, fecha_aplicacion, fecha_proxima, lote, veterinario, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        db.run(sql, [mascota_id, nombre_vacuna, fecha_aplicacion, fecha_proxima, lote, veterinario, observaciones], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, message: 'Vacuna registrada exitosamente' });
        });
    });
});

app.get('/api/vacunas/:mascota_id', authenticateToken, (req, res) => {
    // Verificar que la mascota pertenece a un cliente del veterinario autenticado
    db.get('SELECT m.id FROM mascotas m JOIN clientes c ON m.cliente_id = c.id WHERE m.id = ? AND c.veterinario_id = ?', [req.params.mascota_id, req.user.id], (err, mascota) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
        
        if (!mascota) {
            return res.status(403).json({ error: 'No tienes permiso para ver las vacunas de esta mascota' });
        }
        
        const sql = `SELECT * FROM vacunas WHERE mascota_id = ? ORDER BY fecha_aplicacion DESC`;
        db.all(sql, [req.params.mascota_id], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        });
    });
});

// Endpoint para generar informe completo
app.get('/api/informe/:mascotaId', authenticateToken, async (req, res) => {
    const mascotaId = req.params.mascotaId;
    
    try {
        // Verificar que la mascota pertenece a un cliente del veterinario autenticado
        const mascotaQuery = `
            SELECT m.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido, c.telefono, c.email
            FROM mascotas m 
            JOIN clientes c ON m.cliente_id = c.id 
            WHERE m.id = ? AND c.veterinario_id = ?
        `;
        
        db.get(mascotaQuery, [mascotaId, req.user.id], (err, mascota) => {
            if (err) {
                return res.status(500).json({ error: 'Error en la base de datos' });
            }
            
            if (!mascota) {
                return res.status(403).json({ error: 'No tienes permiso para ver esta mascota' });
            }
            
            // Obtener consultas
            db.all('SELECT * FROM consultas WHERE mascota_id = ? ORDER BY fecha_consulta DESC', [mascotaId], (err, consultas) => {
                if (err) {
                    return res.status(500).json({ error: 'Error obteniendo consultas' });
                }
                
                // Obtener análisis
                db.all('SELECT * FROM analisis WHERE mascota_id = ? ORDER BY fecha_analisis DESC', [mascotaId], (err, analisis) => {
                    if (err) {
                        return res.status(500).json({ error: 'Error obteniendo análisis' });
                    }
                    
                    // Obtener vacunas
                    db.all('SELECT * FROM vacunas WHERE mascota_id = ? ORDER BY fecha_aplicacion DESC', [mascotaId], (err, vacunas) => {
                        if (err) {
                            return res.status(500).json({ error: 'Error obteniendo vacunas' });
                        }
                        
                        res.json({
                            mascota,
                            consultas,
                            analisis,
                            vacunas
                        });
                    });
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Servir archivos estáticos
app.use('/uploads', express.static('uploads'));

// ENDPOINTS PARA PORTAL DEL PACIENTE

// Buscar cliente y sus mascotas por nombre
app.post('/api/paciente/buscar', async (req, res) => {
    try {
        const { nombreCompleto, email } = req.body;
        
        if (!nombreCompleto) {
            return res.status(400).json({ error: 'Nombre completo es requerido' });
        }
        
        // Dividir nombre completo en nombre y apellido
        const partes = nombreCompleto.trim().split(' ');
        const nombre = partes[0];
        const apellido = partes.slice(1).join(' ') || '';
        
        // Buscar cliente por nombre y apellido (y opcionalmente email)
        let sql = `SELECT * FROM clientes WHERE nombre LIKE ? AND apellido LIKE ?`;
        let params = [`%${nombre}%`, `%${apellido}%`];
        
        if (email) {
            sql += ` AND email = ?`;
            params.push(email);
        }
        
        db.all(sql, params, (err, clientes) => {
            if (err) {
                return res.status(500).json({ error: 'Error en la base de datos' });
            }
            
            if (clientes.length === 0) {
                return res.status(404).json({ error: 'Cliente no encontrado' });
            }
            
            // Si hay múltiples clientes, tomar el primero
            const cliente = clientes[0];
            
            // Buscar mascotas del cliente
            const mascotasSql = `SELECT * FROM mascotas WHERE cliente_id = ? ORDER BY fecha_registro DESC`;
            
            db.all(mascotasSql, [cliente.id], (err, mascotas) => {
                if (err) {
                    return res.status(500).json({ error: 'Error obteniendo mascotas' });
                }
                
                res.json({
                    cliente: cliente,
                    mascotas: mascotas
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener informe completo de mascota para pacientes
app.get('/api/paciente/informe/:mascotaId', async (req, res) => {
    const mascotaId = req.params.mascotaId;
    
    try {
        // Obtener información de la mascota y cliente
        const mascotaQuery = `
            SELECT m.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido, c.telefono, c.email
            FROM mascotas m 
            JOIN clientes c ON m.cliente_id = c.id 
            WHERE m.id = ?
        `;
        
        db.get(mascotaQuery, [mascotaId], (err, mascota) => {
            if (err) {
                return res.status(500).json({ error: 'Error en la base de datos' });
            }
            
            if (!mascota) {
                return res.status(404).json({ error: 'Mascota no encontrada' });
            }
            
            // Obtener consultas
            db.all('SELECT * FROM consultas WHERE mascota_id = ? ORDER BY fecha_consulta DESC', [mascotaId], (err, consultas) => {
                if (err) {
                    return res.status(500).json({ error: 'Error obteniendo consultas' });
                }
                
                // Obtener análisis
                db.all('SELECT * FROM analisis WHERE mascota_id = ? ORDER BY fecha_analisis DESC', [mascotaId], (err, analisis) => {
                    if (err) {
                        return res.status(500).json({ error: 'Error obteniendo análisis' });
                    }
                    
                    // Obtener vacunas
                    db.all('SELECT * FROM vacunas WHERE mascota_id = ? ORDER BY fecha_aplicacion DESC', [mascotaId], (err, vacunas) => {
                        if (err) {
                            return res.status(500).json({ error: 'Error obteniendo vacunas' });
                        }
                        
                        res.json({
                            mascota,
                            consultas,
                            analisis,
                            vacunas
                        });
                    });
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ==================== SISTEMA DE CITAS/AGENDA ====================

// Crear nueva cita
app.post('/api/citas', authenticateToken, (req, res) => {
    const { mascota_id, fecha_cita, hora_inicio, hora_fin, motivo, observaciones } = req.body;
    
    // Verificar que la mascota pertenece a un cliente del veterinario autenticado
    db.get('SELECT m.id FROM mascotas m JOIN clientes c ON m.cliente_id = c.id WHERE m.id = ? AND c.veterinario_id = ?', 
           [mascota_id, req.user.id], (err, mascota) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
        
        if (!mascota) {
            return res.status(403).json({ error: 'No tienes permiso para agendar citas para esta mascota' });
        }
        
        // Verificar disponibilidad del horario
        const checkSql = `SELECT id FROM citas WHERE veterinario_id = ? AND fecha_cita = ? 
                         AND ((hora_inicio <= ? AND hora_fin > ?) OR (hora_inicio < ? AND hora_fin >= ?))
                         AND estado != 'cancelada'`;
        
        db.get(checkSql, [req.user.id, fecha_cita, hora_inicio, hora_inicio, hora_fin, hora_fin], (err, conflicto) => {
            if (err) {
                return res.status(500).json({ error: 'Error verificando disponibilidad' });
            }
            
            if (conflicto) {
                return res.status(400).json({ error: 'Ya existe una cita en ese horario' });
            }
            
            const sql = `INSERT INTO citas (mascota_id, veterinario_id, fecha_cita, hora_inicio, hora_fin, motivo, observaciones) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)`;
            
            db.run(sql, [mascota_id, req.user.id, fecha_cita, hora_inicio, hora_fin, motivo, observaciones], function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ id: this.lastID, message: 'Cita agendada exitosamente' });
            });
        });
    });
});

// Obtener citas del veterinario
app.get('/api/citas', authenticateToken, (req, res) => {
    const { fecha_inicio, fecha_fin, estado } = req.query;
    
    let sql = `SELECT c.*, m.nombre as mascota_nombre, m.especie, m.raza, 
               cl.nombre as cliente_nombre, cl.apellido as cliente_apellido, cl.telefono
               FROM citas c
               JOIN mascotas m ON c.mascota_id = m.id
               JOIN clientes cl ON m.cliente_id = cl.id
               WHERE c.veterinario_id = ?`;
    
    let params = [req.user.id];
    
    if (fecha_inicio && fecha_fin) {
        sql += ` AND c.fecha_cita BETWEEN ? AND ?`;
        params.push(fecha_inicio, fecha_fin);
    }
    
    if (estado) {
        sql += ` AND c.estado = ?`;
        params.push(estado);
    }
    
    sql += ` ORDER BY c.fecha_cita, c.hora_inicio`;
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Actualizar estado de cita
app.put('/api/citas/:id', authenticateToken, (req, res) => {
    const { estado, observaciones } = req.body;
    const citaId = req.params.id;
    
    // Verificar que la cita pertenece al veterinario autenticado
    db.get('SELECT id FROM citas WHERE id = ? AND veterinario_id = ?', [citaId, req.user.id], (err, cita) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
        
        if (!cita) {
            return res.status(403).json({ error: 'No tienes permiso para modificar esta cita' });
        }
        
        const sql = `UPDATE citas SET estado = ?, observaciones = ? WHERE id = ?`;
        
        db.run(sql, [estado, observaciones, citaId], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Cita actualizada exitosamente' });
        });
    });
});

// ==================== GESTIÓN FINANCIERA ====================

// Crear nueva factura
app.post('/api/facturas', authenticateToken, (req, res) => {
    const { cliente_id, items, observaciones } = req.body;
    
    // Verificar que el cliente pertenece al veterinario autenticado
    db.get('SELECT id FROM clientes WHERE id = ? AND veterinario_id = ?', [cliente_id, req.user.id], (err, cliente) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
        
        if (!cliente) {
            return res.status(403).json({ error: 'No tienes permiso para facturar a este cliente' });
        }
        
        // Generar número de factura
        const numero_factura = `FAC-${Date.now()}`;
        
        // Calcular totales
        let subtotal = 0;
        items.forEach(item => {
            subtotal += item.cantidad * item.precio_unitario;
        });
        
        const impuestos = subtotal * 0.21; // 21% IVA
        const total = subtotal + impuestos;
        
        // Crear factura
        const facturaSQL = `INSERT INTO facturas (cliente_id, veterinario_id, numero_factura, subtotal, impuestos, total, observaciones) 
                           VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        db.run(facturaSQL, [cliente_id, req.user.id, numero_factura, subtotal, impuestos, total, observaciones], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            const facturaId = this.lastID;
            
            // Insertar items de factura
            const itemPromises = items.map(item => {
                return new Promise((resolve, reject) => {
                    const itemSQL = `INSERT INTO factura_items (factura_id, descripcion, cantidad, precio_unitario, total_item) 
                                    VALUES (?, ?, ?, ?, ?)`;
                    const total_item = item.cantidad * item.precio_unitario;
                    
                    db.run(itemSQL, [facturaId, item.descripcion, item.cantidad, item.precio_unitario, total_item], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            });
            
            Promise.all(itemPromises)
                .then(() => {
                    res.json({ 
                        id: facturaId, 
                        numero_factura,
                        total,
                        message: 'Factura creada exitosamente' 
                    });
                })
                .catch(err => {
                    res.status(500).json({ error: 'Error creando items de factura' });
                });
        });
    });
});

// Obtener facturas del veterinario
app.get('/api/facturas', authenticateToken, (req, res) => {
    const { estado, fecha_inicio, fecha_fin } = req.query;
    
    let sql = `SELECT f.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido
               FROM facturas f
               JOIN clientes c ON f.cliente_id = c.id
               WHERE f.veterinario_id = ?`;
    
    let params = [req.user.id];
    
    if (estado) {
        sql += ` AND f.estado = ?`;
        params.push(estado);
    }
    
    if (fecha_inicio && fecha_fin) {
        sql += ` AND f.fecha_factura BETWEEN ? AND ?`;
        params.push(fecha_inicio, fecha_fin);
    }
    
    sql += ` ORDER BY f.fecha_factura DESC`;
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Obtener detalle de factura con items
app.get('/api/facturas/:id', authenticateToken, (req, res) => {
    const facturaId = req.params.id;
    
    // Verificar que la factura pertenece al veterinario autenticado
    db.get('SELECT f.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido, c.email, c.telefono, c.direccion FROM facturas f JOIN clientes c ON f.cliente_id = c.id WHERE f.id = ? AND f.veterinario_id = ?', 
           [facturaId, req.user.id], (err, factura) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
        
        if (!factura) {
            return res.status(403).json({ error: 'No tienes permiso para ver esta factura' });
        }
        
        // Obtener items de la factura
        db.all('SELECT * FROM factura_items WHERE factura_id = ?', [facturaId], (err, items) => {
            if (err) {
                return res.status(500).json({ error: 'Error obteniendo items' });
            }
            
            // Obtener pagos de la factura
            db.all('SELECT * FROM pagos WHERE factura_id = ? ORDER BY fecha_pago DESC', [facturaId], (err, pagos) => {
                if (err) {
                    return res.status(500).json({ error: 'Error obteniendo pagos' });
                }
                
                res.json({
                    ...factura,
                    items,
                    pagos
                });
            });
        });
    });
});

// Registrar pago
app.post('/api/pagos', authenticateToken, (req, res) => {
    const { factura_id, monto, metodo_pago, referencia, observaciones } = req.body;
    
    // Verificar que la factura pertenece al veterinario autenticado
    db.get('SELECT id, total, estado FROM facturas WHERE id = ? AND veterinario_id = ?', [factura_id, req.user.id], (err, factura) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
        
        if (!factura) {
            return res.status(403).json({ error: 'No tienes permiso para registrar pagos en esta factura' });
        }
        
        // Verificar que el monto no exceda el saldo pendiente
        db.get('SELECT COALESCE(SUM(monto), 0) as total_pagado FROM pagos WHERE factura_id = ?', [factura_id], (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Error calculando saldo' });
            }
            
            const saldo_pendiente = factura.total - result.total_pagado;
            
            if (monto > saldo_pendiente) {
                return res.status(400).json({ error: 'El monto excede el saldo pendiente' });
            }
            
            // Registrar pago
            const pagoSQL = `INSERT INTO pagos (factura_id, monto, metodo_pago, referencia, observaciones) 
                            VALUES (?, ?, ?, ?, ?)`;
            
            db.run(pagoSQL, [factura_id, monto, metodo_pago, referencia, observaciones], function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                // Actualizar estado de factura si está completamente pagada
                const nuevo_total_pagado = result.total_pagado + monto;
                let nuevo_estado = factura.estado;
                
                if (nuevo_total_pagado >= factura.total) {
                    nuevo_estado = 'pagada';
                } else if (nuevo_total_pagado > 0) {
                    nuevo_estado = 'parcial';
                }
                
                db.run('UPDATE facturas SET estado = ? WHERE id = ?', [nuevo_estado, factura_id], (err) => {
                    if (err) {
                        console.error('Error actualizando estado de factura:', err);
                    }
                });
                
                res.json({ 
                    id: this.lastID, 
                    saldo_pendiente: factura.total - nuevo_total_pagado,
                    message: 'Pago registrado exitosamente' 
                });
            });
        });
    });
});

// ==================== INVENTARIO DE MEDICAMENTOS ====================

// Crear nuevo medicamento
app.post('/api/medicamentos', authenticateToken, (req, res) => {
    const { nombre, principio_activo, presentacion, concentracion, laboratorio, codigo_barras, precio_compra, precio_venta, stock_inicial, stock_minimo, fecha_vencimiento } = req.body;
    
    const sql = `INSERT INTO medicamentos (nombre, principio_activo, presentacion, concentracion, laboratorio, codigo_barras, precio_compra, precio_venta, stock_actual, stock_minimo, fecha_vencimiento) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [nombre, principio_activo, presentacion, concentracion, laboratorio, codigo_barras, precio_compra, precio_venta, stock_inicial || 0, stock_minimo || 5, fecha_vencimiento], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // Registrar movimiento inicial si hay stock
        if (stock_inicial > 0) {
            const movimientoSQL = `INSERT INTO inventario_movimientos (medicamento_id, tipo_movimiento, cantidad, precio_unitario, motivo, usuario_id) 
                                  VALUES (?, 'entrada', ?, ?, 'Stock inicial', ?)`;
            
            db.run(movimientoSQL, [this.lastID, stock_inicial, precio_compra, req.user.id], (err) => {
                if (err) {
                    console.error('Error registrando movimiento inicial:', err);
                }
            });
        }
        
        res.json({ id: this.lastID, message: 'Medicamento registrado exitosamente' });
    });
});

// Obtener medicamentos
app.get('/api/medicamentos', authenticateToken, (req, res) => {
    const { activo, vencimiento_proximo, stock_bajo } = req.query;
    
    let sql = `SELECT * FROM medicamentos WHERE 1=1`;
    let params = [];
    
    if (activo !== undefined) {
        sql += ` AND activo = ?`;
        params.push(activo);
    }
    
    if (vencimiento_proximo === 'true') {
        sql += ` AND fecha_vencimiento <= date('now', '+30 days')`;
    }
    
    if (stock_bajo === 'true') {
        sql += ` AND stock_actual <= stock_minimo`;
    }
    
    sql += ` ORDER BY nombre`;
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Actualizar stock de medicamento
app.post('/api/medicamentos/:id/movimiento', authenticateToken, (req, res) => {
    const { tipo_movimiento, cantidad, precio_unitario, motivo, referencia } = req.body;
    const medicamentoId = req.params.id;
    
    // Verificar que el medicamento existe
    db.get('SELECT * FROM medicamentos WHERE id = ?', [medicamentoId], (err, medicamento) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
        
        if (!medicamento) {
            return res.status(404).json({ error: 'Medicamento no encontrado' });
        }
        
        // Verificar stock suficiente para salidas
        if (tipo_movimiento === 'salida' && medicamento.stock_actual < cantidad) {
            return res.status(400).json({ error: 'Stock insuficiente' });
        }
        
        // Registrar movimiento
        const movimientoSQL = `INSERT INTO inventario_movimientos (medicamento_id, tipo_movimiento, cantidad, precio_unitario, motivo, referencia, usuario_id) 
                              VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        db.run(movimientoSQL, [medicamentoId, tipo_movimiento, cantidad, precio_unitario, motivo, referencia, req.user.id], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            // Actualizar stock
            const factor = tipo_movimiento === 'entrada' ? 1 : -1;
            const nuevoStock = medicamento.stock_actual + (cantidad * factor);
            
            db.run('UPDATE medicamentos SET stock_actual = ? WHERE id = ?', [nuevoStock, medicamentoId], (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Error actualizando stock' });
                }
                
                res.json({ 
                    id: this.lastID, 
                    nuevo_stock: nuevoStock,
                    message: 'Movimiento registrado exitosamente' 
                });
            });
        });
    });
});

// Obtener movimientos de inventario
app.get('/api/inventario/movimientos', authenticateToken, (req, res) => {
    const { medicamento_id, tipo_movimiento, fecha_inicio, fecha_fin } = req.query;
    
    let sql = `SELECT m.*, med.nombre as medicamento_nombre, v.nombre_veterinario
               FROM inventario_movimientos m
               JOIN medicamentos med ON m.medicamento_id = med.id
               LEFT JOIN veterinarios v ON m.usuario_id = v.id
               WHERE 1=1`;
    
    let params = [];
    
    if (medicamento_id) {
        sql += ` AND m.medicamento_id = ?`;
        params.push(medicamento_id);
    }
    
    if (tipo_movimiento) {
        sql += ` AND m.tipo_movimiento = ?`;
        params.push(tipo_movimiento);
    }
    
    if (fecha_inicio && fecha_fin) {
        sql += ` AND m.fecha_movimiento BETWEEN ? AND ?`;
        params.push(fecha_inicio, fecha_fin);
    }
    
    sql += ` ORDER BY m.fecha_movimiento DESC`;
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// ==================== SISTEMA DE NOTIFICACIONES ====================

// Crear notificación
app.post('/api/notificaciones', authenticateToken, (req, res) => {
    const { destinatario_id, tipo, titulo, mensaje, datos_adicionales } = req.body;
    
    const sql = `INSERT INTO notificaciones (destinatario_id, tipo, titulo, mensaje, datos_adicionales) 
                VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [destinatario_id || req.user.id, tipo, titulo, mensaje, JSON.stringify(datos_adicionales)], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, message: 'Notificación creada exitosamente' });
    });
});

// Obtener notificaciones del usuario
app.get('/api/notificaciones', authenticateToken, (req, res) => {
    const { leida, tipo, limite } = req.query;
    
    let sql = `SELECT * FROM notificaciones WHERE destinatario_id = ?`;
    let params = [req.user.id];
    
    if (leida !== undefined) {
        sql += ` AND leida = ?`;
        params.push(leida);
    }
    
    if (tipo) {
        sql += ` AND tipo = ?`;
        params.push(tipo);
    }
    
    sql += ` ORDER BY fecha_envio DESC`;
    
    if (limite) {
        sql += ` LIMIT ?`;
        params.push(parseInt(limite));
    }
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // Parsear datos adicionales
        const notificaciones = rows.map(notif => ({
            ...notif,
            datos_adicionales: notif.datos_adicionales ? JSON.parse(notif.datos_adicionales) : null
        }));
        
        res.json(notificaciones);
    });
});

// Marcar notificación como leída
app.put('/api/notificaciones/:id/leer', authenticateToken, (req, res) => {
    const notifId = req.params.id;
    
    const sql = `UPDATE notificaciones SET leida = 1, fecha_lectura = CURRENT_TIMESTAMP 
                WHERE id = ? AND destinatario_id = ?`;
    
    db.run(sql, [notifId, req.user.id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }
        
        res.json({ message: 'Notificación marcada como leída' });
    });
});

// Función para generar notificaciones automáticas
const generarNotificacionesAutomaticas = async () => {
    try {
        console.log('🔔 Generando notificaciones automáticas...');
        
        // Verificar si las tablas existen antes de hacer consultas
        const tablesExist = await new Promise((resolve) => {
            db.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('vacunas', 'notificaciones', 'medicamentos', 'citas')`, (err, result) => {
                if (err) {
                    console.log('⚠️ Error verificando tablas, saltando notificaciones:', err.message);
                    resolve(false);
                } else {
                    resolve(result.rows.length >= 2); // Al menos vacunas y notificaciones
                }
            });
        });
        
        if (!tablesExist) {
            console.log('⚠️ Tablas de notificaciones no existen aún, saltando...');
            return;
        }
        
        // Notificaciones de vacunas próximas a vencer
        const vacunasProximas = await new Promise((resolve, reject) => {
            const sql = `SELECT v.*, m.nombre as mascota_nombre, c.nombre as cliente_nombre, c.apellido as cliente_apellido, c.veterinario_id
                        FROM vacunas v
                        JOIN mascotas m ON v.mascota_id = m.id
                        JOIN clientes c ON m.cliente_id = c.id
                        WHERE v.fecha_proxima <= CURRENT_DATE + INTERVAL '7 days' AND v.fecha_proxima > CURRENT_DATE`;
            
            db.query(sql, (err, result) => {
                if (err) {
                    console.log('⚠️ Error en consulta de vacunas, saltando:', err.message);
                    resolve([]);
                } else {
                    resolve(result.rows || []);
                }
            });
        });
        
        for (const vacuna of vacunasProximas) {
            const titulo = `Vacuna próxima a vencer`;
            const mensaje = `La vacuna ${vacuna.nombre_vacuna} de ${vacuna.mascota_nombre} (${vacuna.cliente_nombre} ${vacuna.cliente_apellido}) vence el ${vacuna.fecha_proxima}`;
            
            // Verificar si ya existe esta notificación
            const existeNotif = await new Promise((resolve, reject) => {
                db.query(`SELECT id FROM notificaciones WHERE tipo = 'vacuna_vencimiento' AND datos_adicionales LIKE $1 AND fecha_envio > CURRENT_DATE - INTERVAL '1 day'`, 
                       [`%"vacuna_id":${vacuna.id}%`], (err, result) => {
                    if (err) reject(err);
                    else resolve(result.rows[0]);
                });
            });
            
            if (!existeNotif) {
                const datos = { vacuna_id: vacuna.id, mascota_id: vacuna.mascota_id, fecha_vencimiento: vacuna.fecha_proxima };
                
                db.query(`INSERT INTO notificaciones (destinatario_id, tipo, titulo, mensaje, datos_adicionales) VALUES ($1, 'vacuna_vencimiento', $2, $3, $4)`,
                       [vacuna.veterinario_id, titulo, mensaje, JSON.stringify(datos)], (err) => {
                    if (err) console.error('Error creando notificación de vacuna:', err);
                });
            }
        }
        
        // Notificaciones de medicamentos con stock bajo
        const medicamentosStockBajo = await new Promise((resolve, reject) => {
            db.query(`SELECT * FROM medicamentos WHERE stock_actual <= stock_minimo AND activo = 1`, (err, result) => {
                if (err) {
                    console.log('⚠️ Error en consulta de medicamentos, saltando:', err.message);
                    resolve([]);
                } else {
                    resolve(result.rows || []);
                }
            });
        });
        
        for (const medicamento of medicamentosStockBajo) {
            const titulo = `Stock bajo de medicamento`;
            const mensaje = `El medicamento ${medicamento.nombre} tiene stock bajo (${medicamento.stock_actual} unidades). Stock mínimo: ${medicamento.stock_minimo}`;
            
            // Verificar si ya existe esta notificación reciente
            const existeNotif = await new Promise((resolve, reject) => {
                db.query(`SELECT id FROM notificaciones WHERE tipo = 'stock_bajo' AND datos_adicionales LIKE $1 AND fecha_envio > CURRENT_DATE - INTERVAL '3 days'`, 
                       [`%"medicamento_id":${medicamento.id}%`], (err, result) => {
                    if (err) reject(err);
                    else resolve(result.rows[0]);
                });
            });
            
            if (!existeNotif) {
                const datos = { medicamento_id: medicamento.id, stock_actual: medicamento.stock_actual, stock_minimo: medicamento.stock_minimo };
                
                // Enviar a todos los veterinarios activos
                db.query(`SELECT id FROM veterinarios WHERE activo = 1`, (err, result) => {
                    if (!err) {
                        result.rows.forEach(vet => {
                            db.query(`INSERT INTO notificaciones (destinatario_id, tipo, titulo, mensaje, datos_adicionales) VALUES ($1, 'stock_bajo', $2, $3, $4)`,
                                   [vet.id, titulo, mensaje, JSON.stringify(datos)], (err) => {
                                if (err) console.error('Error creando notificación de stock:', err);
                            });
                        });
                    }
                });
            }
        }
        
        // Notificaciones de citas del día
        const citasHoy = await new Promise((resolve, reject) => {
            db.query(`SELECT c.*, m.nombre as mascota_nombre, cl.nombre as cliente_nombre, cl.apellido as cliente_apellido, cl.veterinario_id
                   FROM citas c
                   JOIN mascotas m ON c.mascota_id = m.id
                   JOIN clientes cl ON m.cliente_id = cl.id
                   WHERE DATE(c.fecha_hora) = CURRENT_DATE AND c.estado = 'programada'`, (err, result) => {
                if (err) {
                    console.log('⚠️ Error en consulta de citas, saltando:', err.message);
                    resolve([]);
                } else {
                    resolve(result.rows || []);
                }
            });
        });
        
        for (const cita of citasHoy) {
            const titulo = `Cita programada para hoy`;
            const mensaje = `Cita con ${cita.mascota_nombre} (${cita.cliente_nombre} ${cita.cliente_apellido}) a las ${cita.hora_inicio}`;
            
            // Verificar si ya existe esta notificación
            const existeNotif = await new Promise((resolve, reject) => {
                db.query(`SELECT id FROM notificaciones WHERE tipo = 'cita_hoy' AND datos_adicionales LIKE $1 AND fecha_envio > CURRENT_DATE`, 
                       [`%"cita_id":${cita.id}%`], (err, result) => {
                    if (err) reject(err);
                    else resolve(result.rows[0]);
                });
            });
            
            if (!existeNotif) {
                const datos = { cita_id: cita.id, mascota_id: cita.mascota_id, fecha_hora: cita.fecha_hora };
                
                db.query(`INSERT INTO notificaciones (destinatario_id, tipo, titulo, mensaje, datos_adicionales) VALUES ($1, 'cita_hoy', $2, $3, $4)`,
                       [cita.veterinario_id, titulo, mensaje, JSON.stringify(datos)], (err) => {
                    if (err) console.error('Error creando notificación de cita:', err);
                });
            }
        }
        
        console.log('✅ Notificaciones automáticas procesadas correctamente');
        
    } catch (error) {
        console.error('⚠️ Error generando notificaciones automáticas:', error.message);
        // No lanzar el error para evitar que crashee el servidor
    }
};

// TEMPORALMENTE DESHABILITADO PARA DEPLOYMENT
// setInterval(generarNotificacionesAutomaticas, 5 * 60 * 1000);

// TEMPORALMENTE DESHABILITADO PARA DEPLOYMENT
// setTimeout(generarNotificacionesAutomaticas, 5000);

// ==================== REPORTES Y ESTADÍSTICAS ====================

// Dashboard principal con métricas
app.get('/api/dashboard', authenticateToken, (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;
    const veterinarioId = req.user.id;
    
    const fechaInicio = fecha_inicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const fechaFin = fecha_fin || new Date().toISOString().split('T')[0];
    
    const queries = {
        // Total de clientes
        totalClientes: `SELECT COUNT(*) as total FROM clientes WHERE veterinario_id = ? AND activo = 1`,
        
        // Total de mascotas
        totalMascotas: `SELECT COUNT(*) as total FROM mascotas m 
                       JOIN clientes c ON m.cliente_id = c.id 
                       WHERE c.veterinario_id = ?`,
        
        // Consultas del período
        consultasPeriodo: `SELECT COUNT(*) as total FROM consultas co
                          JOIN mascotas m ON co.mascota_id = m.id
                          JOIN clientes c ON m.cliente_id = c.id
                          WHERE c.veterinario_id = ? AND date(co.fecha_consulta) BETWEEN ? AND ?`,
        
        // Ingresos del período
        ingresosPeriodo: `SELECT COALESCE(SUM(f.total), 0) as total FROM facturas f
                         WHERE f.veterinario_id = ? AND f.estado = 'pagada' 
                         AND date(f.fecha_factura) BETWEEN ? AND ?`,
        
        // Citas programadas
        citasProgramadas: `SELECT COUNT(*) as total FROM citas c
                          JOIN mascotas m ON c.mascota_id = m.id
                          JOIN clientes cl ON m.cliente_id = cl.id
                          WHERE cl.veterinario_id = ? AND c.estado = 'programada' 
                          AND date(c.fecha_cita) >= date('now')`,
        
        // Facturas pendientes
        facturasPendientes: `SELECT COUNT(*) as total, COALESCE(SUM(total), 0) as monto_total 
                            FROM facturas WHERE veterinario_id = ? AND estado = 'pendiente'`,
        
        // Medicamentos con stock bajo
        medicamentosStockBajo: `SELECT COUNT(*) as total FROM medicamentos 
                               WHERE stock_actual <= stock_minimo AND activo = 1`,
        
        // Vacunas próximas a vencer
        vacunasProximas: `SELECT COUNT(*) as total FROM vacunas v
                         JOIN mascotas m ON v.mascota_id = m.id
                         JOIN clientes c ON m.cliente_id = c.id
                         WHERE c.veterinario_id = ? AND v.fecha_proxima BETWEEN date('now') AND date('now', '+30 days')`
    };
    
    const resultados = {};
    const promesas = [];
    
    // Ejecutar todas las consultas
    Object.keys(queries).forEach(key => {
        const promesa = new Promise((resolve, reject) => {
            let params = [veterinarioId];
            
            if (key === 'consultasPeriodo' || key === 'ingresosPeriodo') {
                params.push(fechaInicio, fechaFin);
            }
            
            if (key === 'medicamentosStockBajo') {
                params = []; // No necesita veterinario_id
            }
            
            db.get(queries[key], params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resultados[key] = row;
                    resolve();
                }
            });
        });
        promesas.push(promesa);
    });
    
    Promise.all(promesas)
        .then(() => {
            res.json({
                periodo: { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
                metricas: resultados
            });
        })
        .catch(err => {
            res.status(500).json({ error: 'Error obteniendo métricas del dashboard' });
        });
});

// Reporte de ingresos
app.get('/api/reportes/ingresos', authenticateToken, (req, res) => {
    const { fecha_inicio, fecha_fin, agrupacion } = req.query;
    const veterinarioId = req.user.id;
    
    let sql = '';
    let params = [veterinarioId];
    
    if (agrupacion === 'mensual') {
        sql = `SELECT 
                strftime('%Y-%m', fecha_factura) as periodo,
                COUNT(*) as total_facturas,
                SUM(total) as total_ingresos,
                SUM(CASE WHEN estado = 'pagada' THEN total ELSE 0 END) as ingresos_cobrados,
                SUM(CASE WHEN estado = 'pendiente' THEN total ELSE 0 END) as ingresos_pendientes
               FROM facturas 
               WHERE veterinario_id = ?`;
    } else {
        sql = `SELECT 
                date(fecha_factura) as periodo,
                COUNT(*) as total_facturas,
                SUM(total) as total_ingresos,
                SUM(CASE WHEN estado = 'pagada' THEN total ELSE 0 END) as ingresos_cobrados,
                SUM(CASE WHEN estado = 'pendiente' THEN total ELSE 0 END) as ingresos_pendientes
               FROM facturas 
               WHERE veterinario_id = ?`;
    }
    
    if (fecha_inicio && fecha_fin) {
        sql += ` AND date(fecha_factura) BETWEEN ? AND ?`;
        params.push(fecha_inicio, fecha_fin);
    }
    
    sql += ` GROUP BY periodo ORDER BY periodo DESC`;
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Reporte de consultas por tipo
app.get('/api/reportes/consultas', authenticateToken, (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;
    const veterinarioId = req.user.id;
    
    let sql = `SELECT 
                motivo,
                COUNT(*) as total_consultas,
                COUNT(DISTINCT co.mascota_id) as mascotas_diferentes
               FROM consultas co
               JOIN mascotas m ON co.mascota_id = m.id
               JOIN clientes c ON m.cliente_id = c.id
               WHERE c.veterinario_id = ?`;
    
    let params = [veterinarioId];
    
    if (fecha_inicio && fecha_fin) {
        sql += ` AND date(co.fecha_consulta) BETWEEN ? AND ?`;
        params.push(fecha_inicio, fecha_fin);
    }
    
    sql += ` GROUP BY motivo ORDER BY total_consultas DESC`;
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Reporte de clientes más frecuentes
app.get('/api/reportes/clientes-frecuentes', authenticateToken, (req, res) => {
    const { fecha_inicio, fecha_fin, limite } = req.query;
    const veterinarioId = req.user.id;
    
    let sql = `SELECT 
                c.id,
                c.nombre,
                c.apellido,
                c.telefono,
                c.email,
                COUNT(co.id) as total_consultas,
                COUNT(DISTINCT m.id) as total_mascotas,
                MAX(co.fecha_consulta) as ultima_consulta
               FROM clientes c
               LEFT JOIN mascotas m ON c.id = m.cliente_id
               LEFT JOIN consultas co ON m.id = co.mascota_id
               WHERE c.veterinario_id = ?`;
    
    let params = [veterinarioId];
    
    if (fecha_inicio && fecha_fin) {
        sql += ` AND date(co.fecha_consulta) BETWEEN ? AND ?`;
        params.push(fecha_inicio, fecha_fin);
    }
    
    sql += ` GROUP BY c.id ORDER BY total_consultas DESC`;
    
    if (limite) {
        sql += ` LIMIT ?`;
        params.push(parseInt(limite));
    }
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Reporte de inventario
app.get('/api/reportes/inventario', authenticateToken, (req, res) => {
    const sql = `SELECT 
                    m.*,
                    CASE 
                        WHEN m.stock_actual <= 0 THEN 'sin_stock'
                        WHEN m.stock_actual <= m.stock_minimo THEN 'stock_bajo'
                        ELSE 'stock_normal'
                    END as estado_stock,
                    CASE 
                        WHEN m.fecha_vencimiento <= date('now') THEN 'vencido'
                        WHEN m.fecha_vencimiento <= date('now', '+30 days') THEN 'proximo_vencer'
                        ELSE 'vigente'
                    END as estado_vencimiento,
                    (m.stock_actual * m.precio_venta) as valor_inventario
                 FROM medicamentos m
                 WHERE m.activo = 1
                 ORDER BY m.nombre`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // Calcular totales
        const resumen = {
            total_medicamentos: rows.length,
            valor_total_inventario: rows.reduce((sum, med) => sum + (med.valor_inventario || 0), 0),
            medicamentos_sin_stock: rows.filter(m => m.estado_stock === 'sin_stock').length,
            medicamentos_stock_bajo: rows.filter(m => m.estado_stock === 'stock_bajo').length,
            medicamentos_vencidos: rows.filter(m => m.estado_vencimiento === 'vencido').length,
            medicamentos_proximo_vencer: rows.filter(m => m.estado_vencimiento === 'proximo_vencer').length
        };
        
        res.json({
            resumen,
            medicamentos: rows
        });
    });
});

// ==================== SISTEMA MULTI-VETERINARIO ====================

// Middleware para verificar rol de administrador (multi-vet)
const requireAdminRole = (req, res, next) => {
    if (req.user.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }
    next();
};

// Crear nuevo veterinario (solo admin)
app.post('/api/veterinarios', authenticateToken, requireAdminRole, async (req, res) => {
    const { nombre_veterinaria, nombre_veterinario, email, password, telefono, direccion, rol } = req.body;
    
    try {
        // Verificar que el email no esté en uso
        const existeEmail = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM veterinarios WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (existeEmail) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }
        
        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const sql = `INSERT INTO veterinarios (nombre_veterinaria, nombre_veterinario, email, password, telefono, direccion, rol) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        db.run(sql, [nombre_veterinaria, nombre_veterinario, email, hashedPassword, telefono, direccion, rol || 'veterinario'], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            res.json({ 
                id: this.lastID, 
                message: 'Veterinario registrado exitosamente',
                veterinario: {
                    id: this.lastID,
                    nombre_veterinaria,
                    nombre_veterinario,
                    email,
                    rol: rol || 'veterinario'
                }
            });
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener lista de veterinarios (solo admin)
app.get('/api/veterinarios', authenticateToken, requireAdminRole, (req, res) => {
    const { activo, rol } = req.query;
    
    let sql = `SELECT id, nombre_veterinaria, nombre_veterinario, email, telefono, direccion, rol, activo, fecha_registro 
               FROM veterinarios WHERE 1=1`;
    let params = [];
    
    if (activo !== undefined) {
        sql += ` AND activo = ?`;
        params.push(activo);
    }
    
    if (rol) {
        sql += ` AND rol = ?`;
        params.push(rol);
    }
    
    sql += ` ORDER BY nombre_veterinario`;
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Actualizar veterinario (solo admin)
app.put('/api/veterinarios/:id', authenticateToken, requireAdminRole, async (req, res) => {
    const { nombre_veterinaria, nombre_veterinario, email, telefono, direccion, rol, activo } = req.body;
    const veterinarioId = req.params.id;
    
    try {
        // Verificar que el veterinario existe
        const veterinario = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM veterinarios WHERE id = ?', [veterinarioId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!veterinario) {
            return res.status(404).json({ error: 'Veterinario no encontrado' });
        }
        
        // Verificar email único si se está cambiando
        if (email && email !== veterinario.email) {
            const existeEmail = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM veterinarios WHERE email = ? AND id != ?', [email, veterinarioId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            
            if (existeEmail) {
                return res.status(400).json({ error: 'El email ya está registrado por otro veterinario' });
            }
        }
        
        const sql = `UPDATE veterinarios SET 
                    nombre_veterinaria = ?, nombre_veterinario = ?, email = ?, 
                    telefono = ?, direccion = ?, rol = ?, activo = ?
                    WHERE id = ?`;
        
        db.run(sql, [
            nombre_veterinaria || veterinario.nombre_veterinaria,
            nombre_veterinario || veterinario.nombre_veterinario,
            email || veterinario.email,
            telefono || veterinario.telefono,
            direccion || veterinario.direccion,
            rol || veterinario.rol,
            activo !== undefined ? activo : veterinario.activo,
            veterinarioId
        ], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            res.json({ message: 'Veterinario actualizado exitosamente' });
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Cambiar contraseña de veterinario
app.put('/api/veterinarios/:id/password', authenticateToken, async (req, res) => {
    const { password_actual, password_nueva } = req.body;
    const veterinarioId = req.params.id;
    
    // Solo admin puede cambiar password de otros, o el propio usuario
    if (req.user.rol !== 'admin' && req.user.id != veterinarioId) {
        return res.status(403).json({ error: 'No tienes permiso para cambiar esta contraseña' });
    }
    
    try {
        const veterinario = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM veterinarios WHERE id = ?', [veterinarioId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!veterinario) {
            return res.status(404).json({ error: 'Veterinario no encontrado' });
        }
        
        // Si no es admin, verificar contraseña actual
        if (req.user.rol !== 'admin') {
            const passwordValida = await bcrypt.compare(password_actual, veterinario.password);
            if (!passwordValida) {
                return res.status(400).json({ error: 'Contraseña actual incorrecta' });
            }
        }
        
        // Encriptar nueva contraseña
        const hashedPassword = await bcrypt.hash(password_nueva, 10);
        
        db.run('UPDATE veterinarios SET password = ? WHERE id = ?', [hashedPassword, veterinarioId], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            res.json({ message: 'Contraseña actualizada exitosamente' });
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener perfil del veterinario actual
app.get('/api/perfil', authenticateToken, (req, res) => {
    const sql = `SELECT id, nombre_veterinaria, nombre_veterinario, email, telefono, direccion, rol, activo, fecha_registro 
                FROM veterinarios WHERE id = ?`;
    
    db.get(sql, [req.user.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!row) {
            return res.status(404).json({ error: 'Perfil no encontrado' });
        }
        
        res.json(row);
    });
});

// Actualizar perfil propio
app.put('/api/perfil', authenticateToken, async (req, res) => {
    const { nombre_veterinaria, nombre_veterinario, telefono, direccion } = req.body;
    
    const sql = `UPDATE veterinarios SET 
                nombre_veterinaria = ?, nombre_veterinario = ?, telefono = ?, direccion = ?
                WHERE id = ?`;
    
    db.run(sql, [nombre_veterinaria, nombre_veterinario, telefono, direccion, req.user.id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({ message: 'Perfil actualizado exitosamente' });
    });
});

// Asignar clientes a veterinario (solo admin)
app.put('/api/clientes/:id/asignar', authenticateToken, requireAdminRole, (req, res) => {
    const { veterinario_id } = req.body;
    const clienteId = req.params.id;
    
    // Verificar que el veterinario existe
    db.get('SELECT id FROM veterinarios WHERE id = ? AND activo = 1', [veterinario_id], (err, veterinario) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
        
        if (!veterinario) {
            return res.status(404).json({ error: 'Veterinario no encontrado o inactivo' });
        }
        
        db.run('UPDATE clientes SET veterinario_id = ? WHERE id = ?', [veterinario_id, clienteId], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Cliente no encontrado' });
            }
            
            res.json({ message: 'Cliente asignado exitosamente' });
        });
    });
});

// ==================== TELEMEDICINA ====================

// Iniciar sesión de telemedicina
app.post('/api/telemedicina/sesiones', authenticateToken, (req, res) => {
    const { cliente_id, mascota_id, tipo_sesion } = req.body;
    
    // Verificar que el cliente y mascota pertenecen al veterinario autenticado
    db.get(`SELECT c.id, m.id as mascota_id FROM clientes c 
            LEFT JOIN mascotas m ON c.id = m.cliente_id 
            WHERE c.id = ? AND c.veterinario_id = ? AND (m.id = ? OR ? IS NULL)`, 
           [cliente_id, req.user.id, mascota_id, mascota_id], (err, cliente) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
        
        if (!cliente) {
            return res.status(403).json({ error: 'No tienes permiso para crear sesiones con este cliente/mascota' });
        }
        
        const sql = `INSERT INTO telemedicina_sesiones (cliente_id, veterinario_id, mascota_id, tipo_sesion) 
                    VALUES (?, ?, ?, ?)`;
        
        db.run(sql, [cliente_id, req.user.id, mascota_id, tipo_sesion || 'chat'], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            res.json({ 
                id: this.lastID, 
                message: 'Sesión de telemedicina iniciada exitosamente',
                sesion_id: this.lastID
            });
        });
    });
});

// Obtener sesiones de telemedicina
app.get('/api/telemedicina/sesiones', authenticateToken, (req, res) => {
    const { estado, cliente_id, fecha_inicio, fecha_fin } = req.query;
    
    let sql = `SELECT s.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido,
               m.nombre as mascota_nombre, m.especie, v.nombre_veterinario
               FROM telemedicina_sesiones s
               JOIN clientes c ON s.cliente_id = c.id
               LEFT JOIN mascotas m ON s.mascota_id = m.id
               JOIN veterinarios v ON s.veterinario_id = v.id
               WHERE s.veterinario_id = ?`;
    
    let params = [req.user.id];
    
    if (estado) {
        sql += ` AND s.estado = ?`;
        params.push(estado);
    }
    
    if (cliente_id) {
        sql += ` AND s.cliente_id = ?`;
        params.push(cliente_id);
    }
    
    if (fecha_inicio && fecha_fin) {
        sql += ` AND date(s.fecha_inicio) BETWEEN ? AND ?`;
        params.push(fecha_inicio, fecha_fin);
    }
    
    sql += ` ORDER BY s.fecha_inicio DESC`;
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Finalizar sesión de telemedicina
app.put('/api/telemedicina/sesiones/:id/finalizar', authenticateToken, (req, res) => {
    const { resumen } = req.body;
    const sesionId = req.params.id;
    
    // Verificar que la sesión pertenece al veterinario autenticado
    db.get('SELECT id FROM telemedicina_sesiones WHERE id = ? AND veterinario_id = ?', [sesionId, req.user.id], (err, sesion) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
        
        if (!sesion) {
            return res.status(403).json({ error: 'No tienes permiso para finalizar esta sesión' });
        }
        
        const sql = `UPDATE telemedicina_sesiones SET estado = 'finalizada', fecha_fin = CURRENT_TIMESTAMP, resumen = ? 
                    WHERE id = ?`;
        
        db.run(sql, [resumen, sesionId], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            res.json({ message: 'Sesión finalizada exitosamente' });
        });
    });
});

// Enviar mensaje en sesión de telemedicina
app.post('/api/telemedicina/mensajes', authenticateToken, upload.single('archivo'), (req, res) => {
    const { sesion_id, mensaje, tipo_mensaje } = req.body;
    const archivo_adjunto = req.file ? req.file.filename : null;
    
    // Verificar que la sesión existe y pertenece al veterinario autenticado
    db.get('SELECT id, estado FROM telemedicina_sesiones WHERE id = ? AND veterinario_id = ?', [sesion_id, req.user.id], (err, sesion) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
        
        if (!sesion) {
            return res.status(403).json({ error: 'No tienes permiso para enviar mensajes en esta sesión' });
        }
        
        if (sesion.estado === 'finalizada') {
            return res.status(400).json({ error: 'No se pueden enviar mensajes en una sesión finalizada' });
        }
        
        const sql = `INSERT INTO telemedicina_mensajes (sesion_id, remitente_tipo, remitente_id, mensaje, tipo_mensaje, archivo_adjunto) 
                    VALUES (?, 'veterinario', ?, ?, ?, ?)`;
        
        db.run(sql, [sesion_id, req.user.id, mensaje, tipo_mensaje || 'texto', archivo_adjunto], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            res.json({ 
                id: this.lastID, 
                message: 'Mensaje enviado exitosamente',
                mensaje_id: this.lastID
            });
        });
    });
});

// Obtener mensajes de una sesión
app.get('/api/telemedicina/sesiones/:id/mensajes', authenticateToken, (req, res) => {
    const sesionId = req.params.id;
    const { limite, offset } = req.query;
    
    // Verificar que la sesión pertenece al veterinario autenticado
    db.get('SELECT id FROM telemedicina_sesiones WHERE id = ? AND veterinario_id = ?', [sesionId, req.user.id], (err, sesion) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos' });
        }
        
        if (!sesion) {
            return res.status(403).json({ error: 'No tienes permiso para ver los mensajes de esta sesión' });
        }
        
        let sql = `SELECT m.*, 
                   CASE 
                       WHEN m.remitente_tipo = 'veterinario' THEN v.nombre_veterinario
                       WHEN m.remitente_tipo = 'cliente' THEN c.nombre || ' ' || c.apellido
                   END as remitente_nombre
                   FROM telemedicina_mensajes m
                   LEFT JOIN veterinarios v ON m.remitente_tipo = 'veterinario' AND m.remitente_id = v.id
                   LEFT JOIN clientes c ON m.remitente_tipo = 'cliente' AND m.remitente_id = c.id
                   WHERE m.sesion_id = ?
                   ORDER BY m.fecha_envio ASC`;
        
        let params = [sesionId];
        
        if (limite) {
            sql += ` LIMIT ?`;
            params.push(parseInt(limite));
            
            if (offset) {
                sql += ` OFFSET ?`;
                params.push(parseInt(offset));
            }
        }
        
        db.all(sql, params, (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            // Marcar mensajes como leídos
            db.run('UPDATE telemedicina_mensajes SET leido = 1 WHERE sesion_id = ? AND remitente_tipo != "veterinario"', 
                   [sesionId], (err) => {
                if (err) {
                    console.error('Error marcando mensajes como leídos:', err);
                }
            });
            
            res.json(rows);
        });
    });
});

// Obtener sesiones activas con mensajes no leídos
app.get('/api/telemedicina/mensajes-pendientes', authenticateToken, (req, res) => {
    const sql = `SELECT s.id as sesion_id, s.tipo_sesion, s.fecha_inicio,
                 c.nombre as cliente_nombre, c.apellido as cliente_apellido,
                 m.nombre as mascota_nombre,
                 COUNT(msg.id) as mensajes_no_leidos,
                 MAX(msg.fecha_envio) as ultimo_mensaje
                 FROM telemedicina_sesiones s
                 JOIN clientes c ON s.cliente_id = c.id
                 LEFT JOIN mascotas m ON s.mascota_id = m.id
                 JOIN telemedicina_mensajes msg ON s.id = msg.sesion_id
                 WHERE s.veterinario_id = ? AND s.estado = 'activa' 
                 AND msg.leido = 0 AND msg.remitente_tipo = 'cliente'
                 GROUP BY s.id
                 ORDER BY ultimo_mensaje DESC`;
    
    db.all(sql, [req.user.id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Ruta de prueba
app.get('/api/test', (req, res) => {
    console.log('🧪 Endpoint de prueba accedido');
    res.json({ message: 'Servidor funcionando correctamente', timestamp: new Date().toISOString() });
});

// Rutas principales
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/sistema.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sistema.html'));
});

// ==================== PANEL DE ADMINISTRACIÓN ====================

// Middleware para verificar acceso de administrador
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.email !== 'jjvserviciosinformaticos@gmail.com') {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
    }
    next();
};

// Obtener todos los clientes para el panel admin
app.get('/api/admin/clients', authenticateToken, requireAdmin, (req, res) => {
    const sql = `SELECT v.*, c.license_key, c.license_plan, c.license_expires, c.license_features,
                 CASE 
                    WHEN c.license_expires > datetime('now') THEN 'activo'
                    ELSE 'inactivo'
                 END as estado
                 FROM veterinarios v
                 LEFT JOIN configuraciones c ON v.id = c.veterinario_id
                 ORDER BY v.created_at DESC`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const clients = rows.map(row => ({
            id: row.id,
            veterinaria: row.nombre_veterinaria,
            veterinario: row.nombre_veterinario,
            email: row.email,
            telefono: row.telefono,
            direccion: row.direccion,
            plan: row.license_plan || 'sin_plan',
            licenseKey: row.license_key,
            fechaInicio: row.created_at,
            fechaVencimiento: row.license_expires,
            estado: row.estado,
            ingresoMensual: getPlanPrice(row.license_plan)
        }));
        
        res.json(clients);
    });
});

// Agregar nuevo cliente desde panel admin
app.post('/api/admin/clients', authenticateToken, requireAdmin, (req, res) => {
    const { veterinaria, veterinario, email, telefono, direccion, plan, fechaInicio } = req.body;
    
    if (!veterinaria || !veterinario || !email || !plan) {
        return res.status(400).json({ error: 'Campos obligatorios faltantes' });
    }
    
    // Generar clave de licencia
    const licenseKey = generateLicenseKeyForClient(plan, veterinaria);
    
    // Hash de contraseña temporal
    const tempPassword = Math.random().toString(36).substr(2, 8);
    const hashedPassword = bcrypt.hashSync(tempPassword, 10);
    
    // Insertar veterinario
    const sqlVet = `INSERT INTO veterinarios (nombre_veterinaria, nombre_veterinario, email, telefono, direccion, password) 
                    VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.run(sqlVet, [veterinaria, veterinario, email, telefono, direccion, hashedPassword], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const veterinarioId = this.lastID;
        
        // Configurar licencia
        const features = getLicenseFeatures(plan);
        const expirationDate = new Date();
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
        
        const sqlConfig = `INSERT INTO configuraciones (veterinario_id, license_key, license_plan, license_features, license_expires, license_active) 
                          VALUES (?, ?, ?, ?, ?, 1)`;
        
        db.run(sqlConfig, [veterinarioId, licenseKey, plan, JSON.stringify(features), expirationDate.toISOString()], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            res.json({
                id: veterinarioId,
                licenseKey: licenseKey,
                tempPassword: tempPassword,
                message: 'Cliente agregado exitosamente'
            });
        });
    });
});

// Renovar licencia de cliente
app.put('/api/admin/clients/:id/renew', authenticateToken, requireAdmin, (req, res) => {
    const clientId = req.params.id;
    const { months = 12 } = req.body;
    
    const newExpiration = new Date();
    newExpiration.setMonth(newExpiration.getMonth() + months);
    
    const sql = `UPDATE configuraciones 
                 SET license_expires = ?, license_active = 1 
                 WHERE veterinario_id = ?`;
    
    db.run(sql, [newExpiration.toISOString(), clientId], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({ message: 'Licencia renovada exitosamente', newExpiration: newExpiration.toISOString() });
    });
});

// Desactivar cliente
app.put('/api/admin/clients/:id/deactivate', authenticateToken, requireAdmin, (req, res) => {
    const clientId = req.params.id;
    
    const sql = `UPDATE configuraciones 
                 SET license_active = 0 
                 WHERE veterinario_id = ?`;
    
    db.run(sql, [clientId], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({ message: 'Cliente desactivado exitosamente' });
    });
});

// Estadísticas del panel admin
app.get('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => {
    const queries = [
        // Total clientes activos
        `SELECT COUNT(*) as total FROM configuraciones WHERE license_active = 1 AND license_expires > datetime('now')`,
        // Ingresos mensuales
        `SELECT SUM(
            CASE 
                WHEN license_plan = 'basico' THEN 15000
                WHEN license_plan = 'profesional' THEN 30000
                WHEN license_plan = 'premium' THEN 50000
                ELSE 0
            END
        ) as ingresos FROM configuraciones WHERE license_active = 1 AND license_expires > datetime('now')`,
        // Licencias por vencer (próximos 30 días)
        `SELECT COUNT(*) as expiring FROM configuraciones 
         WHERE license_active = 1 AND license_expires BETWEEN datetime('now') AND datetime('now', '+30 days')`
    ];
    
    Promise.all(queries.map(query => 
        new Promise((resolve, reject) => {
            db.get(query, [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        })
    )).then(results => {
        res.json({
            totalClients: results[0].total || 0,
            monthlyRevenue: results[1].ingresos || 0,
            activeLicenses: results[0].total || 0,
            expiringSoon: results[2].expiring || 0
        });
    }).catch(err => {
        res.status(500).json({ error: err.message });
    });
});

// Funciones auxiliares para el panel admin
function generateLicenseKeyForClient(plan, veterinaria) {
    const planPrefix = {
        'basico': 'BASIC',
        'profesional': 'PRO', 
        'premium': 'PREMIUM'
    };
    
    const vetName = veterinaria.replace(/\s+/g, '').substring(0, 8).toUpperCase();
    const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `MUNDOPATAS-${planPrefix[plan]}-${vetName}-${randomSuffix}`;
}

function getLicenseFeatures(plan) {
    const features = {
        'basico': ['citas', 'facturacion'],
        'profesional': ['citas', 'facturacion', 'inventario', 'notificaciones', 'reportes'],
        'premium': ['citas', 'facturacion', 'inventario', 'notificaciones', 'reportes', 'telemedicina', 'multivet']
    };
    return features[plan] || [];
}

function getPlanPrice(plan) {
    const prices = {
        'basico': 15000,
        'profesional': 30000,
        'premium': 50000
    };
    return prices[plan] || 0;
}

// ==================== FIN PANEL DE ADMINISTRACIÓN ====================

// Inicializar base de datos y iniciar servidor
async function startServer() {
    try {
        await db.initializeDatabase();
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en puerto ${PORT}`);
            console.log(`Accede a: http://localhost:${PORT}`);
            console.log(`Panel Admin: http://localhost:${PORT}/admin-panel.html`);
        });
    } catch (error) {
        console.error('Error iniciando servidor:', error);
        process.exit(1);
    }
}

startServer();
