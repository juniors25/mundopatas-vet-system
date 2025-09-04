const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Crear base de datos demo en memoria
const db = new sqlite3.Database(':memory:');

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

// Inicializar tablas demo
db.serialize(() => {
    // Tabla de clientes
    db.run(`CREATE TABLE clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL,
        telefono TEXT,
        email TEXT,
        direccion TEXT,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla de mascotas
    db.run(`CREATE TABLE mascotas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        especie TEXT NOT NULL,
        raza TEXT,
        edad INTEGER,
        peso REAL,
        color TEXT,
        sexo TEXT,
        cliente_id INTEGER,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes (id)
    )`);

    // Tabla de consultas
    db.run(`CREATE TABLE consultas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mascota_id INTEGER,
        fecha_consulta DATETIME DEFAULT CURRENT_TIMESTAMP,
        motivo TEXT,
        diagnostico TEXT,
        tratamiento TEXT,
        observaciones TEXT,
        peso_actual REAL,
        temperatura REAL,
        FOREIGN KEY (mascota_id) REFERENCES mascotas (id)
    )`);

    // Tabla de análisis
    db.run(`CREATE TABLE analisis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mascota_id INTEGER,
        tipo_analisis TEXT NOT NULL,
        fecha_analisis DATETIME DEFAULT CURRENT_TIMESTAMP,
        resultados TEXT,
        archivo_adjunto TEXT,
        observaciones TEXT,
        FOREIGN KEY (mascota_id) REFERENCES mascotas (id)
    )`);

    // Tabla de vacunas
    db.run(`CREATE TABLE vacunas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mascota_id INTEGER,
        nombre_vacuna TEXT NOT NULL,
        fecha_aplicacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_proxima DATETIME,
        lote TEXT,
        veterinario TEXT,
        observaciones TEXT,
        FOREIGN KEY (mascota_id) REFERENCES mascotas (id)
    )`);

    // Base de datos limpia para que el comprador cargue sus propios datos
    console.log('📊 Base de datos demo inicializada (vacía para nuevos usuarios)');
});

// Middleware para verificar límites demo
const checkDemoLimits = (type) => {
    return async (req, res, next) => {
        try {
            let count = 0;
            
            switch (type) {
                case 'clients':
                    const clientsResult = await new Promise((resolve, reject) => {
                        db.get('SELECT COUNT(*) as count FROM clientes', (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        });
                    });
                    count = clientsResult.count;
                    if (count >= 3) {
                        return res.status(403).json({ error: 'Límite demo alcanzado: máximo 3 clientes permitidos' });
                    }
                    break;
                    
                case 'pets':
                    const petsResult = await new Promise((resolve, reject) => {
                        db.get('SELECT COUNT(*) as count FROM mascotas', (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        });
                    });
                    count = petsResult.count;
                    if (count >= 6) { // 3 clientes x 2 mascotas máximo
                        return res.status(403).json({ error: 'Límite demo alcanzado: máximo 6 mascotas permitidas' });
                    }
                    break;
            }
            
            next();
        } catch (error) {
            res.status(500).json({ error: 'Error verificando límites' });
        }
    };
};

// RUTAS API SIMPLIFICADAS (SIN AUTENTICACIÓN)

// Obtener configuración de la aplicación
app.get('/api/app-config', (req, res) => {
    res.json({
        mode: 'demo',
        config: {
            MAX_CLIENTS: 3,
            MAX_PETS_PER_CLIENT: 2,
            MAX_CONSULTATIONS: 5,
            MAX_ANALYSIS: 3,
            MAX_VACCINES: 5
        },
        watermark: '🚀 VERSIÓN DEMO - MUNDO PATAS'
    });
});

// RUTAS DE AUTENTICACIÓN DEMO (SIMPLIFICADAS)

// Registro de veterinaria (modo demo - sin contraseña real)
app.post('/api/auth/register', (req, res) => {
    const { nombre_veterinaria, nombre_veterinario, email, telefono, direccion } = req.body;
    
    if (!nombre_veterinaria || !nombre_veterinario || !email) {
        return res.status(400).json({ error: 'Campos obligatorios faltantes' });
    }
    
    // Simular registro exitoso en modo demo
    const demoUser = {
        id: 1,
        nombre_veterinaria,
        nombre_veterinario,
        email,
        telefono,
        direccion,
        rol: 'admin'
    };
    
    // Simular token demo
    const demoToken = 'demo-token-' + Date.now();
    
    res.json({
        token: demoToken,
        user: demoUser,
        message: 'Veterinaria registrada exitosamente en modo demo'
    });
});

// Login demo (simplificado)
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    // Aceptar cualquier credencial en modo demo
    const demoUser = {
        id: 1,
        nombre_veterinaria: 'MUNDO PATAS DEMO',
        nombre_veterinario: 'Dr. Gastón Díaz',
        email: email || 'demo@mundopatas.com',
        rol: 'admin'
    };
    
    const demoToken = 'demo-token-' + Date.now();
    
    res.json({
        token: demoToken,
        user: demoUser
    });
});

// Clientes
app.post('/api/clientes', checkDemoLimits('clients'), (req, res) => {
    const { nombre, apellido, email, telefono, direccion } = req.body;
    
    if (!nombre || !apellido) {
        return res.status(400).json({ error: 'Nombre y apellido son obligatorios' });
    }
    
    const sql = `INSERT INTO clientes (nombre, apellido, email, telefono, direccion) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [nombre, apellido, email, telefono, direccion], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Error al registrar cliente: ' + err.message });
        }
        
        res.json({
            id: this.lastID,
            message: 'Cliente registrado exitosamente'
        });
    });
});

app.get('/api/clientes', (req, res) => {
    const sql = `SELECT * FROM clientes ORDER BY fecha_registro DESC`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Clientes con sus mascotas
app.get('/api/clientes-con-mascotas', (req, res) => {
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
        ORDER BY c.fecha_registro DESC, m.fecha_registro DESC
    `;
    
    db.all(sql, [], (err, rows) => {
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

// Mascotas
app.post('/api/mascotas', checkDemoLimits('pets'), (req, res) => {
    const { nombre, especie, raza, edad, peso, color, sexo, cliente_id } = req.body;
    
    const sql = `INSERT INTO mascotas (nombre, especie, raza, edad, peso, color, sexo, cliente_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [nombre, especie, raza, edad, peso, color, sexo, cliente_id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, message: 'Mascota registrada exitosamente' });
    });
});

app.get('/api/mascotas', (req, res) => {
    const sql = `
        SELECT m.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido 
        FROM mascotas m 
        LEFT JOIN clientes c ON m.cliente_id = c.id 
        ORDER BY m.fecha_registro DESC
    `;
    
    db.all(sql, [], (err, rows) => {
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

// Consultas
app.post('/api/consultas', (req, res) => {
    const { mascota_id, motivo, diagnostico, tratamiento, observaciones, peso_actual, temperatura } = req.body;
    
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

app.get('/api/consultas/:mascotaId', (req, res) => {
    const sql = `SELECT * FROM consultas WHERE mascota_id = ? ORDER BY fecha_consulta DESC`;
    
    db.all(sql, [req.params.mascotaId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Análisis
app.post('/api/analisis', upload.single('archivo'), (req, res) => {
    const { mascota_id, tipo_analisis, resultados, observaciones } = req.body;
    const archivo_adjunto = req.file ? req.file.filename : null;
    
    const sql = `INSERT INTO analisis (mascota_id, tipo_analisis, resultados, archivo_adjunto, observaciones) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [mascota_id, tipo_analisis, resultados, archivo_adjunto, observaciones], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, message: 'Análisis registrado exitosamente' });
    });
});

app.get('/api/analisis/:mascotaId', (req, res) => {
    const sql = `SELECT * FROM analisis WHERE mascota_id = ? ORDER BY fecha_analisis DESC`;
    
    db.all(sql, [req.params.mascotaId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Vacunas
app.post('/api/vacunas', (req, res) => {
    const { mascota_id, nombre_vacuna, fecha_aplicacion, fecha_proxima, lote, veterinario, observaciones } = req.body;
    
    const sql = `INSERT INTO vacunas (mascota_id, nombre_vacuna, fecha_aplicacion, fecha_proxima, lote, veterinario, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [mascota_id, nombre_vacuna, fecha_aplicacion, fecha_proxima, lote, veterinario, observaciones], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, message: 'Vacuna registrada exitosamente' });
    });
});

app.get('/api/vacunas/:mascota_id', (req, res) => {
    const sql = `SELECT * FROM vacunas WHERE mascota_id = ? ORDER BY fecha_aplicacion DESC`;
    db.all(sql, [req.params.mascota_id], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Informe completo
app.get('/api/informe/:mascotaId', async (req, res) => {
    const mascotaId = req.params.mascotaId;
    
    try {
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

// Servir archivos estáticos
app.use('/uploads', express.static('uploads'));

// Rutas principales
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/sistema.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sistema.html'));
});

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

// Ruta de prueba
app.get('/api/test', (req, res) => {
    res.json({ message: 'Servidor demo funcionando correctamente', timestamp: new Date().toISOString() });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🐾 MUNDO PATAS DEMO servidor iniciado en puerto ${PORT}`);
    console.log(`📱 Accede a: http://localhost:${PORT}`);
    console.log(`🚀 MODO DEMO: Máximo 3 clientes, 6 mascotas`);
});
