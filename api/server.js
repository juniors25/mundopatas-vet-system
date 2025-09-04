const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'mundo-patas-secret-key';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Base de datos en memoria para demo (en producción usar PostgreSQL)
let veterinarios = [];
let clientes = [];
let mascotas = [];
let consultas = [];
let analisis = [];
let vacunas = [];

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
app.post('/api/auth/register', async (req, res) => {
    const { nombre_veterinaria, nombre_veterinario, email, password, telefono, direccion } = req.body;

    try {
        // Verificar si el email ya existe
        const existingUser = veterinarios.find(v => v.email === email);
        
        if (existingUser) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear nuevo veterinario
        const newVet = {
            id: veterinarios.length + 1,
            nombre_veterinaria,
            nombre_veterinario,
            email,
            password: hashedPassword,
            telefono,
            direccion,
            created_at: new Date()
        };

        veterinarios.push(newVet);

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
        const user = veterinarios.find(v => v.email === email);
        
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
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// RUTAS DE CLIENTES
app.post('/api/clientes', authenticateToken, async (req, res) => {
    const { nombre, apellido, email, telefono, direccion } = req.body;

    try {
        const newCliente = {
            id: clientes.length + 1,
            veterinario_id: req.user.id,
            nombre,
            apellido,
            email,
            telefono,
            direccion,
            created_at: new Date()
        };

        clientes.push(newCliente);
        res.json({ message: 'Cliente registrado exitosamente', cliente: newCliente });
    } catch (error) {
        console.error('Error registrando cliente:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/api/clientes', authenticateToken, async (req, res) => {
    try {
        const clientesVet = clientes.filter(c => c.veterinario_id === req.user.id);
        res.json(clientesVet);
    } catch (error) {
        console.error('Error obteniendo clientes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// RUTAS DE MASCOTAS
app.post('/api/mascotas', authenticateToken, async (req, res) => {
    const { cliente_id, nombre, especie, raza, edad, peso, color, sexo, observaciones } = req.body;

    try {
        const cliente = clientes.find(c => c.id == cliente_id && c.veterinario_id === req.user.id);
        
        if (!cliente) {
            return res.status(403).json({ error: 'No tienes permiso para agregar mascotas a este cliente' });
        }

        const newMascota = {
            id: mascotas.length + 1,
            veterinario_id: req.user.id,
            cliente_id: parseInt(cliente_id),
            nombre,
            especie,
            raza,
            edad,
            peso,
            color,
            sexo,
            observaciones,
            created_at: new Date()
        };

        mascotas.push(newMascota);
        res.json({ message: 'Mascota registrada exitosamente', mascota: newMascota });
    } catch (error) {
        console.error('Error registrando mascota:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/api/mascotas', authenticateToken, async (req, res) => {
    try {
        const mascotasVet = mascotas.filter(m => m.veterinario_id === req.user.id).map(m => {
            const cliente = clientes.find(c => c.id === m.cliente_id);
            return {
                ...m,
                cliente_nombre: cliente?.nombre || '',
                cliente_apellido: cliente?.apellido || ''
            };
        });
        res.json(mascotasVet);
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
        
        let cliente = clientes.find(c => 
            c.nombre.toLowerCase().includes(nombre.toLowerCase()) && 
            c.apellido.toLowerCase().includes(apellido.toLowerCase())
        );
        
        if (email) {
            cliente = clientes.find(c => c.email === email);
        }
        
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        const mascotasCliente = mascotas.filter(m => m.cliente_id === cliente.id);
        
        res.json({
            cliente: cliente,
            mascotas: mascotasCliente
        });
    } catch (error) {
        console.error('Error buscando cliente:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/api/paciente/informe/:mascotaId', async (req, res) => {
    const mascotaId = parseInt(req.params.mascotaId);
    
    try {
        const mascota = mascotas.find(m => m.id === mascotaId);
        
        if (!mascota) {
            return res.status(404).json({ error: 'Mascota no encontrada' });
        }

        const cliente = clientes.find(c => c.id === mascota.cliente_id);
        const consultasMascota = consultas.filter(c => c.mascota_id === mascotaId);
        const analisisMascota = analisis.filter(a => a.mascota_id === mascotaId);
        const vacunasMascota = vacunas.filter(v => v.mascota_id === mascotaId);

        res.json({
            mascota: {
                ...mascota,
                cliente_nombre: cliente?.nombre || '',
                cliente_apellido: cliente?.apellido || '',
                telefono: cliente?.telefono || '',
                email: cliente?.email || ''
            },
            consultas: consultasMascota,
            analisis: analisisMascota,
            vacunas: vacunasMascota
        });
    } catch (error) {
        console.error('Error generando informe para paciente:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = app;
