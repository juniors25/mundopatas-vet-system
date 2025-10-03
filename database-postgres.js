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
                password_portal TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Agregar columna password_portal si no existe (para bases de datos existentes)
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='clientes' AND column_name='password_portal'
                ) THEN
                    ALTER TABLE clientes ADD COLUMN password_portal TEXT;
                END IF;
            END $$;
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
                pelaje TEXT,
                sexo TEXT,
                observaciones TEXT,
                tiene_chip BOOLEAN DEFAULT false,
                numero_chip TEXT,
                tipo_alimento TEXT,
                marca_alimento TEXT,
                peso_bolsa_kg DECIMAL(5,2),
                fecha_inicio_bolsa DATE,
                gramos_diarios DECIMAL(6,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Migración: Agregar nuevos campos si no existen
        await pool.query(`
            DO $$ 
            BEGIN 
                -- Renombrar color a pelaje si existe
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='mascotas' AND column_name='color'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='mascotas' AND column_name='pelaje'
                ) THEN
                    ALTER TABLE mascotas RENAME COLUMN color TO pelaje;
                END IF;
                
                -- Agregar pelaje si no existe
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='mascotas' AND column_name='pelaje'
                ) THEN
                    ALTER TABLE mascotas ADD COLUMN pelaje TEXT;
                END IF;
                
                -- Agregar tiene_chip si no existe
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='mascotas' AND column_name='tiene_chip'
                ) THEN
                    ALTER TABLE mascotas ADD COLUMN tiene_chip BOOLEAN DEFAULT false;
                END IF;
                
                -- Agregar numero_chip si no existe
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='mascotas' AND column_name='numero_chip'
                ) THEN
                    ALTER TABLE mascotas ADD COLUMN numero_chip TEXT;
                END IF;
                
                -- Agregar tipo_alimento si no existe
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='mascotas' AND column_name='tipo_alimento'
                ) THEN
                    ALTER TABLE mascotas ADD COLUMN tipo_alimento TEXT;
                END IF;
                
                -- Agregar marca_alimento si no existe
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='mascotas' AND column_name='marca_alimento'
                ) THEN
                    ALTER TABLE mascotas ADD COLUMN marca_alimento TEXT;
                END IF;
                
                -- Agregar peso_bolsa_kg si no existe
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='mascotas' AND column_name='peso_bolsa_kg'
                ) THEN
                    ALTER TABLE mascotas ADD COLUMN peso_bolsa_kg DECIMAL(5,2);
                END IF;
                
                -- Agregar fecha_inicio_bolsa si no existe
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='mascotas' AND column_name='fecha_inicio_bolsa'
                ) THEN
                    ALTER TABLE mascotas ADD COLUMN fecha_inicio_bolsa DATE;
                END IF;
                
                -- Agregar gramos_diarios si no existe
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='mascotas' AND column_name='gramos_diarios'
                ) THEN
                    ALTER TABLE mascotas ADD COLUMN gramos_diarios DECIMAL(6,2);
                END IF;
            END $$;
        `);

        // Crear tabla consultas con estructura base
        await pool.query(`
            CREATE TABLE IF NOT EXISTS consultas (
                id SERIAL PRIMARY KEY,
                veterinario_id INTEGER REFERENCES veterinarios(id),
                cliente_id INTEGER REFERENCES clientes(id),
                mascota_id INTEGER REFERENCES mascotas(id),
                fecha_consulta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                motivo TEXT NOT NULL,
                observaciones TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Migrar campos adicionales si no existen (ejecutar migrate-consultas.js para agregar todos los campos)

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

        // Tabla para configuración de notificaciones
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notificaciones_config (
                id SERIAL PRIMARY KEY,
                veterinario_id INTEGER REFERENCES veterinarios(id) UNIQUE,
                email_habilitado BOOLEAN DEFAULT true,
                whatsapp_habilitado BOOLEAN DEFAULT false,
                telegram_habilitado BOOLEAN DEFAULT false,
                dias_aviso_alimento INTEGER DEFAULT 7,
                email_notificaciones TEXT,
                telefono_whatsapp TEXT,
                telegram_chat_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla para historial de notificaciones enviadas
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notificaciones_enviadas (
                id SERIAL PRIMARY KEY,
                veterinario_id INTEGER REFERENCES veterinarios(id),
                cliente_id INTEGER REFERENCES clientes(id),
                mascota_id INTEGER REFERENCES mascotas(id),
                tipo_notificacion TEXT NOT NULL,
                canal TEXT NOT NULL,
                destinatario TEXT NOT NULL,
                asunto TEXT,
                mensaje TEXT NOT NULL,
                estado TEXT DEFAULT 'pendiente',
                error_mensaje TEXT,
                fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fecha_procesado TIMESTAMP
            )
        `);

        // Tabla para alertas de alimento
        await pool.query(`
            CREATE TABLE IF NOT EXISTS alertas_alimento (
                id SERIAL PRIMARY KEY,
                mascota_id INTEGER REFERENCES mascotas(id),
                dias_restantes INTEGER,
                porcentaje_restante INTEGER,
                fecha_alerta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notificacion_enviada BOOLEAN DEFAULT false,
                fecha_notificacion TIMESTAMP
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
