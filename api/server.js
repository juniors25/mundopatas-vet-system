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

// Base de datos SQLite para funcionamiento estable
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Crear conexión a la base de datos SQLite
const dbPath = path.join('/tmp', 'veterinaria.db');
const db = new sqlite3.Database(dbPath);

// Inicializar base de datos SQLite
function initializeDatabase() {
    db.serialize(() => {
        // Tabla de veterinarios
        db.run(`CREATE TABLE IF NOT EXISTS veterinarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_veterinario TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            telefono TEXT,
            direccion TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Tabla de clientes
        db.run(`CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            veterinario_id INTEGER,
            nombre TEXT NOT NULL,
            apellido TEXT NOT NULL,
            email TEXT,
            telefono TEXT,
            direccion TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (veterinario_id) REFERENCES veterinarios (id)
        )`);

        // Tabla de mascotas
        db.run(`CREATE TABLE IF NOT EXISTS mascotas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            veterinario_id INTEGER,
            cliente_id INTEGER,
            nombre TEXT NOT NULL,
            especie TEXT,
            raza TEXT,
            edad INTEGER,
            peso REAL,
            color TEXT,
            sexo TEXT,
            observaciones TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (veterinario_id) REFERENCES veterinarios (id),
            FOREIGN KEY (cliente_id) REFERENCES clientes (id)
        )`);

        console.log('✅ Base de datos SQLite inicializada correctamente');
    });
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
        // Verificar si el email ya existe
        db.get('SELECT id FROM veterinarios WHERE email = ?', [email], async (err, existingUser) => {
            if (err) {
                return res.status(500).json({ error: 'Error en la base de datos' });
            }
            
            if (existingUser) {
                return res.status(400).json({ error: 'El email ya está registrado' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            
            db.run(`INSERT INTO veterinarios (nombre_veterinario, email, password, telefono, direccion) 
                    VALUES (?, ?, ?, ?, ?)`,
                [nombre_veterinario, email, hashedPassword, telefono, direccion],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Error registrando veterinario' });
                    }

                    const token = jwt.sign({ id: this.lastID, email }, JWT_SECRET, { expiresIn: '24h' });

                    res.json({
                        message: 'Veterinario registrado exitosamente',
                        token,
                        user: {
                            id: this.lastID,
                            email,
                            nombre: nombre_veterinario
                        }
                    });
                }
            );
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        db.get('SELECT * FROM veterinarios WHERE email = ?', [email], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Error en la base de datos' });
            }
            
            if (!user) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

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
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// RUTAS DE CLIENTES
app.post('/api/clientes', authenticateToken, (req, res) => {
    const { nombre, apellido, email, telefono, direccion } = req.body;

    if (!nombre || !apellido) {
        return res.status(400).json({ error: 'Nombre y apellido son obligatorios' });
    }

    db.run(`INSERT INTO clientes (veterinario_id, nombre, apellido, email, telefono, direccion) 
            VALUES (?, ?, ?, ?, ?, ?)`,
        [req.user.id, nombre, apellido, email, telefono, direccion],
        function(err) {
            if (err) {
                console.error('Error registrando cliente:', err);
                return res.status(500).json({ error: 'Error registrando cliente' });
            }

            res.status(201).json({ 
                message: 'Cliente registrado exitosamente', 
                id: this.lastID
            });
        }
    );
});

app.get('/api/clientes', authenticateToken, (req, res) => {
    db.all('SELECT * FROM clientes WHERE veterinario_id = ? ORDER BY created_at DESC', 
        [req.user.id], 
        (err, rows) => {
            if (err) {
                console.error('Error obteniendo clientes:', err);
                return res.status(500).json({ error: 'Error obteniendo clientes' });
            }
            res.json(rows);
        }
    );
});

app.get('/api/clientes-con-mascotas', authenticateToken, (req, res) => {
    db.all(`SELECT 
                c.id, c.nombre, c.apellido, c.email, c.telefono, c.direccion, c.created_at,
                m.id as mascota_id, m.nombre as mascota_nombre, m.especie, m.raza, m.edad, m.peso, m.color, m.sexo
            FROM clientes c
            LEFT JOIN mascotas m ON c.id = m.cliente_id
            WHERE c.veterinario_id = ?
            ORDER BY c.created_at DESC`, 
        [req.user.id], 
        (err, rows) => {
            if (err) {
                console.error('Error obteniendo clientes con mascotas:', err);
                return res.status(500).json({ error: 'Error obteniendo clientes' });
            }
            
            // Agrupar resultados por cliente
            const clientesMap = new Map();
            
            rows.forEach(row => {
                if (!clientesMap.has(row.id)) {
                    clientesMap.set(row.id, {
                        id: row.id,
                        nombre: row.nombre,
                        apellido: row.apellido,
                        email: row.email,
                        telefono: row.telefono,
                        direccion: row.direccion,
                        created_at: row.created_at,
                        mascotas: []
                    });
                }
                
                if (row.mascota_id) {
                    clientesMap.get(row.id).mascotas.push({
                        id: row.mascota_id,
                        nombre: row.mascota_nombre,
                        especie: row.especie,
                        raza: row.raza,
                        edad: row.edad,
                        peso: row.peso,
                        color: row.color,
                        sexo: row.sexo
                    });
                }
            });
            
            res.json(Array.from(clientesMap.values()));
        }
    );
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
        // Crear veterinario demo único con timestamp
        const timestamp = Date.now();
        const demoEmail = `demo-${timestamp}@mundopatas.com`;
        const hashedPassword = await bcrypt.hash('demo123', 10);
        
        db.run(`INSERT INTO veterinarios (nombre_veterinario, email, password, telefono, direccion) 
                VALUES (?, ?, ?, ?, ?)`,
            [`Dr. Demo ${timestamp}`, demoEmail, hashedPassword, '2617024193', 'Clínica MUNDO PATAS - Demo'],
            function(err) {
                if (err) {
                    console.error('Error creando veterinario demo:', err);
                    return res.status(500).json({ error: 'Error interno del servidor' });
                }

                const veterinarioId = this.lastID;
                
                // Crear datos demo para este veterinario
                createDemoData(veterinarioId, () => {
                    const token = jwt.sign({ id: veterinarioId, email: demoEmail }, JWT_SECRET, { expiresIn: '24h' });

                    res.json({
                        message: 'Acceso demo exitoso - Datos precargados',
                        token,
                        user: {
                            id: veterinarioId,
                            email: demoEmail,
                            nombre: `Dr. Demo ${timestamp}`
                        }
                    });
                });
            }
        );
    } catch (error) {
        console.error('Error en demo login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Función para crear datos demo por veterinario
function createDemoData(veterinarioId, callback) {
    // Crear clientes demo
    db.run(`INSERT INTO clientes (veterinario_id, nombre, apellido, email, telefono, direccion) 
            VALUES (?, ?, ?, ?, ?, ?)`,
        [veterinarioId, 'María', 'González', 'maria.gonzalez@email.com', '2617123456', 'Av. San Martín 123'],
        function(err) {
            if (err) {
                console.error('Error creando cliente demo 1:', err);
                return callback();
            }
            
            const cliente1Id = this.lastID;
            
            db.run(`INSERT INTO clientes (veterinario_id, nombre, apellido, email, telefono, direccion) 
                    VALUES (?, ?, ?, ?, ?, ?)`,
                [veterinarioId, 'Carlos', 'Rodríguez', 'carlos.rodriguez@email.com', '2617654321', 'Calle Belgrano 456'],
                function(err) {
                    if (err) {
                        console.error('Error creando cliente demo 2:', err);
                        return callback();
                    }
                    
                    const cliente2Id = this.lastID;
                    
                    // Crear mascotas demo
                    db.run(`INSERT INTO mascotas (veterinario_id, cliente_id, nombre, especie, raza, edad, peso, color, sexo) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [veterinarioId, cliente1Id, 'Max', 'Perro', 'Labrador', 3, 25.5, 'Dorado', 'Macho'],
                        function(err) {
                            if (err) console.error('Error creando mascota demo 1:', err);
                            
                            db.run(`INSERT INTO mascotas (veterinario_id, cliente_id, nombre, especie, raza, edad, peso, color, sexo) 
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                [veterinarioId, cliente2Id, 'Luna', 'Gato', 'Persa', 2, 4.2, 'Blanco', 'Hembra'],
                                function(err) {
                                    if (err) console.error('Error creando mascota demo 2:', err);
                                    console.log(`✅ Datos demo creados para veterinario ${veterinarioId}`);
                                    callback();
                                }
                            );
                        }
                    );
                }
            );
        }
    );
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

module.exports = app;
