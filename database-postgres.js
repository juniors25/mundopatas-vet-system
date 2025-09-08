const { Pool } = require('pg');
const path = require('path');

// Configuración de la base de datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Función para inicializar la base de datos
async function initializeDatabase() {
    try {
        // Verificar conexión a la base de datos
        console.log('🔄 Conectando a la base de datos...');
        console.log('DATABASE_URL presente:', !!process.env.DATABASE_URL);
        
        // Test de conexión
        await pool.query('SELECT NOW()');
        console.log('✅ Conexión a PostgreSQL establecida');
        
        // Crear tablas si no existen
        await pool.query(`
            CREATE TABLE IF NOT EXISTS veterinarios (
                id SERIAL PRIMARY KEY,
                nombre_veterinaria TEXT NOT NULL,
                nombre_veterinario TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                telefono TEXT,
                direccion TEXT,
                rol TEXT DEFAULT 'admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS clientes (
                id SERIAL PRIMARY KEY,
                veterinario_id INTEGER REFERENCES veterinarios(id),
                nombre TEXT NOT NULL,
                apellido TEXT NOT NULL,
                email TEXT,
                telefono TEXT,
                direccion TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS mascotas (
                id SERIAL PRIMARY KEY,
                veterinario_id INTEGER REFERENCES veterinarios(id),
                cliente_id INTEGER REFERENCES clientes(id),
                nombre TEXT NOT NULL,
                especie TEXT NOT NULL,
                raza TEXT,
                edad INTEGER,
                peso DECIMAL(5,2),
                color TEXT,
                sexo TEXT,
                observaciones TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS consultas (
                id SERIAL PRIMARY KEY,
                veterinario_id INTEGER REFERENCES veterinarios(id),
                cliente_id INTEGER REFERENCES clientes(id),
                mascota_id INTEGER REFERENCES mascotas(id),
                fecha_consulta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                motivo TEXT NOT NULL,
                diagnostico TEXT,
                tratamiento TEXT,
                observaciones TEXT,
                peso_actual DECIMAL(5,2),
                temperatura DECIMAL(4,1),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS analisis (
                id SERIAL PRIMARY KEY,
                veterinario_id INTEGER REFERENCES veterinarios(id),
                cliente_id INTEGER REFERENCES clientes(id),
                mascota_id INTEGER REFERENCES mascotas(id),
                consulta_id INTEGER REFERENCES consultas(id),
                tipo_analisis TEXT NOT NULL,
                fecha_analisis DATE NOT NULL,
                resultados TEXT,
                observaciones TEXT,
                archivo_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS vacunas (
                id SERIAL PRIMARY KEY,
                veterinario_id INTEGER REFERENCES veterinarios(id),
                cliente_id INTEGER REFERENCES clientes(id),
                mascota_id INTEGER REFERENCES mascotas(id),
                nombre_vacuna TEXT NOT NULL,
                fecha_aplicacion DATE NOT NULL,
                fecha_vencimiento DATE,
                lote TEXT,
                observaciones TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Nuevas tablas para funcionalidades premium
        await pool.query(`
            CREATE TABLE IF NOT EXISTS citas (
                id SERIAL PRIMARY KEY,
                veterinario_id INTEGER REFERENCES veterinarios(id),
                cliente_id INTEGER REFERENCES clientes(id),
                mascota_id INTEGER REFERENCES mascotas(id),
                fecha_cita TIMESTAMP NOT NULL,
                motivo TEXT NOT NULL,
                estado TEXT DEFAULT 'programada',
                observaciones TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS facturas (
                id SERIAL PRIMARY KEY,
                veterinario_id INTEGER REFERENCES veterinarios(id),
                cliente_id INTEGER REFERENCES clientes(id),
                numero_factura TEXT UNIQUE NOT NULL,
                fecha_factura DATE NOT NULL,
                subtotal DECIMAL(10,2) NOT NULL,
                impuestos DECIMAL(10,2) DEFAULT 0,
                total DECIMAL(10,2) NOT NULL,
                estado TEXT DEFAULT 'pendiente',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS factura_items (
                id SERIAL PRIMARY KEY,
                factura_id INTEGER REFERENCES facturas(id),
                descripcion TEXT NOT NULL,
                cantidad INTEGER NOT NULL,
                precio_unitario DECIMAL(10,2) NOT NULL,
                subtotal DECIMAL(10,2) NOT NULL
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS pagos (
                id SERIAL PRIMARY KEY,
                factura_id INTEGER REFERENCES facturas(id),
                monto DECIMAL(10,2) NOT NULL,
                metodo_pago TEXT NOT NULL,
                fecha_pago DATE NOT NULL,
                referencia TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS inventario_medicamentos (
                id SERIAL PRIMARY KEY,
                veterinario_id INTEGER REFERENCES veterinarios(id),
                nombre TEXT NOT NULL,
                descripcion TEXT,
                categoria TEXT,
                stock_actual INTEGER NOT NULL DEFAULT 0,
                stock_minimo INTEGER DEFAULT 10,
                precio_compra DECIMAL(10,2),
                precio_venta DECIMAL(10,2),
                fecha_vencimiento DATE,
                proveedor TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS movimientos_inventario (
                id SERIAL PRIMARY KEY,
                medicamento_id INTEGER REFERENCES inventario_medicamentos(id),
                tipo_movimiento TEXT NOT NULL,
                cantidad INTEGER NOT NULL,
                motivo TEXT,
                fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS notificaciones (
                id SERIAL PRIMARY KEY,
                veterinario_id INTEGER REFERENCES veterinarios(id),
                tipo TEXT NOT NULL,
                titulo TEXT NOT NULL,
                mensaje TEXT NOT NULL,
                leida BOOLEAN DEFAULT FALSE,
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                datos_adicionales JSONB
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS configuraciones (
                id SERIAL PRIMARY KEY,
                veterinario_id INTEGER REFERENCES veterinarios(id),
                clave TEXT NOT NULL,
                valor TEXT,
                license_key TEXT,
                license_plan TEXT,
                license_features JSONB,
                license_expires TIMESTAMP,
                license_active BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS telemedicina_sesiones (
                id SERIAL PRIMARY KEY,
                veterinario_id INTEGER REFERENCES veterinarios(id),
                cliente_id INTEGER REFERENCES clientes(id),
                mascota_id INTEGER REFERENCES mascotas(id),
                tipo_sesion TEXT DEFAULT 'chat',
                estado TEXT DEFAULT 'activa',
                fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fecha_fin TIMESTAMP,
                notas TEXT
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS telemedicina_mensajes (
                id SERIAL PRIMARY KEY,
                sesion_id INTEGER REFERENCES telemedicina_sesiones(id),
                remitente_tipo TEXT NOT NULL,
                remitente_id INTEGER NOT NULL,
                mensaje TEXT NOT NULL,
                archivo_adjunto TEXT,
                fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ Base de datos PostgreSQL inicializada correctamente');
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
        throw error;
    }
}

// Función para obtener una conexión
function getConnection() {
    return pool;
}

// Función para cerrar la conexión
async function closeConnection() {
    await pool.end();
}

module.exports = {
    initializeDatabase,
    getConnection,
    closeConnection,
    pool
};
