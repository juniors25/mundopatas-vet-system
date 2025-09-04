const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Crear conexión a la base de datos
const dbPath = path.join(__dirname, 'veterinaria.db');
const db = new sqlite3.Database(dbPath);

// Inicializar tablas
db.serialize(() => {
    // Eliminar y recrear tabla de clientes con nueva estructura
    db.run(`DROP TABLE IF EXISTS clientes`);
    
    // Tabla de clientes (sin password - son registrados por veterinarios)
    db.run(`CREATE TABLE clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL,
        telefono TEXT,
        email TEXT,
        direccion TEXT,
        veterinario_id INTEGER,
        activo INTEGER DEFAULT 1,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (veterinario_id) REFERENCES veterinarios (id)
    )`);

    // Tabla de mascotas
    db.run(`CREATE TABLE IF NOT EXISTS mascotas (
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

    // Tabla de consultas/controles
    db.run(`CREATE TABLE IF NOT EXISTS consultas (
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

    // Tabla de análisis y estudios
    db.run(`CREATE TABLE IF NOT EXISTS analisis (
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
    db.run(`CREATE TABLE IF NOT EXISTS vacunas (
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

    // Tabla de veterinarios/usuarios
    db.run(`CREATE TABLE IF NOT EXISTS veterinarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_veterinaria TEXT NOT NULL,
        nombre_veterinario TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        telefono TEXT,
        direccion TEXT,
        rol TEXT DEFAULT 'admin',
        activo INTEGER DEFAULT 1,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla de citas/agenda
    db.run(`CREATE TABLE IF NOT EXISTS citas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mascota_id INTEGER,
        veterinario_id INTEGER,
        fecha_cita DATETIME NOT NULL,
        hora_inicio TIME NOT NULL,
        hora_fin TIME NOT NULL,
        motivo TEXT,
        estado TEXT DEFAULT 'programada',
        observaciones TEXT,
        recordatorio_enviado INTEGER DEFAULT 0,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mascota_id) REFERENCES mascotas (id),
        FOREIGN KEY (veterinario_id) REFERENCES veterinarios (id)
    )`);

    // Tabla de facturación
    db.run(`CREATE TABLE IF NOT EXISTS facturas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        veterinario_id INTEGER,
        numero_factura TEXT UNIQUE NOT NULL,
        fecha_factura DATETIME DEFAULT CURRENT_TIMESTAMP,
        subtotal REAL NOT NULL,
        impuestos REAL DEFAULT 0,
        total REAL NOT NULL,
        estado TEXT DEFAULT 'pendiente',
        fecha_vencimiento DATETIME,
        observaciones TEXT,
        FOREIGN KEY (cliente_id) REFERENCES clientes (id),
        FOREIGN KEY (veterinario_id) REFERENCES veterinarios (id)
    )`);

    // Tabla de items de factura
    db.run(`CREATE TABLE IF NOT EXISTS factura_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        factura_id INTEGER,
        descripcion TEXT NOT NULL,
        cantidad INTEGER DEFAULT 1,
        precio_unitario REAL NOT NULL,
        total_item REAL NOT NULL,
        FOREIGN KEY (factura_id) REFERENCES facturas (id)
    )`);

    // Tabla de pagos
    db.run(`CREATE TABLE IF NOT EXISTS pagos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        factura_id INTEGER,
        monto REAL NOT NULL,
        metodo_pago TEXT NOT NULL,
        fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
        referencia TEXT,
        observaciones TEXT,
        FOREIGN KEY (factura_id) REFERENCES facturas (id)
    )`);

    // Tabla de inventario de medicamentos
    db.run(`CREATE TABLE IF NOT EXISTS medicamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        principio_activo TEXT,
        presentacion TEXT,
        concentracion TEXT,
        laboratorio TEXT,
        codigo_barras TEXT,
        precio_compra REAL,
        precio_venta REAL,
        stock_actual INTEGER DEFAULT 0,
        stock_minimo INTEGER DEFAULT 5,
        fecha_vencimiento DATE,
        activo INTEGER DEFAULT 1,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla de movimientos de inventario
    db.run(`CREATE TABLE IF NOT EXISTS inventario_movimientos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        medicamento_id INTEGER,
        tipo_movimiento TEXT NOT NULL,
        cantidad INTEGER NOT NULL,
        precio_unitario REAL,
        motivo TEXT,
        referencia TEXT,
        fecha_movimiento DATETIME DEFAULT CURRENT_TIMESTAMP,
        usuario_id INTEGER,
        FOREIGN KEY (medicamento_id) REFERENCES medicamentos (id),
        FOREIGN KEY (usuario_id) REFERENCES veterinarios (id)
    )`);

    // Tabla de notificaciones
    db.run(`CREATE TABLE IF NOT EXISTS notificaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        destinatario_id INTEGER,
        tipo TEXT NOT NULL,
        titulo TEXT NOT NULL,
        mensaje TEXT NOT NULL,
        leida INTEGER DEFAULT 0,
        fecha_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_lectura DATETIME,
        datos_adicionales TEXT,
        FOREIGN KEY (destinatario_id) REFERENCES veterinarios (id)
    )`);

    // Tabla de configuraciones del sistema
    db.run(`CREATE TABLE IF NOT EXISTS configuraciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clave TEXT UNIQUE NOT NULL,
        valor TEXT,
        descripcion TEXT,
        tipo TEXT DEFAULT 'string',
        fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla de sesiones de telemedicina
    db.run(`CREATE TABLE IF NOT EXISTS telemedicina_sesiones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        veterinario_id INTEGER,
        mascota_id INTEGER,
        tipo_sesion TEXT DEFAULT 'chat',
        estado TEXT DEFAULT 'activa',
        fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_fin DATETIME,
        resumen TEXT,
        FOREIGN KEY (cliente_id) REFERENCES clientes (id),
        FOREIGN KEY (veterinario_id) REFERENCES veterinarios (id),
        FOREIGN KEY (mascota_id) REFERENCES mascotas (id)
    )`);

    // Tabla de mensajes de telemedicina
    db.run(`CREATE TABLE IF NOT EXISTS telemedicina_mensajes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sesion_id INTEGER,
        remitente_tipo TEXT NOT NULL,
        remitente_id INTEGER NOT NULL,
        mensaje TEXT NOT NULL,
        tipo_mensaje TEXT DEFAULT 'texto',
        archivo_adjunto TEXT,
        fecha_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
        leido INTEGER DEFAULT 0,
        FOREIGN KEY (sesion_id) REFERENCES telemedicina_sesiones (id)
    )`);
});

module.exports = db;
