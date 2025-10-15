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
                -- Configuración de pagos
                cbu_cvu TEXT,
                alias_cbu TEXT,
                titular_cuenta TEXT,
                mercadopago_access_token TEXT,
                mercadopago_public_key TEXT,
                precio_consulta DECIMAL(10,2) DEFAULT 5000.00,
                acepta_mercadopago BOOLEAN DEFAULT false,
                acepta_transferencia BOOLEAN DEFAULT true,
                acepta_efectivo BOOLEAN DEFAULT true,
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
        
        // Agregar columnas si no existen (para bases de datos existentes)
        await pool.query(`
            DO $$ 
            BEGIN 
                -- Columna password_portal en clientes
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='clientes' AND column_name='password_portal'
                ) THEN
                    ALTER TABLE clientes ADD COLUMN password_portal TEXT;
                END IF;
                
                -- Columnas de configuración de pagos en veterinarios
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='veterinarios' AND column_name='cbu_cvu') THEN
                    ALTER TABLE veterinarios ADD COLUMN cbu_cvu TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='veterinarios' AND column_name='alias_cbu') THEN
                    ALTER TABLE veterinarios ADD COLUMN alias_cbu TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='veterinarios' AND column_name='titular_cuenta') THEN
                    ALTER TABLE veterinarios ADD COLUMN titular_cuenta TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='veterinarios' AND column_name='mercadopago_access_token') THEN
                    ALTER TABLE veterinarios ADD COLUMN mercadopago_access_token TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='veterinarios' AND column_name='mercadopago_public_key') THEN
                    ALTER TABLE veterinarios ADD COLUMN mercadopago_public_key TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='veterinarios' AND column_name='precio_consulta') THEN
                    ALTER TABLE veterinarios ADD COLUMN precio_consulta DECIMAL(10,2) DEFAULT 5000.00;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='veterinarios' AND column_name='acepta_mercadopago') THEN
                    ALTER TABLE veterinarios ADD COLUMN acepta_mercadopago BOOLEAN DEFAULT false;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='veterinarios' AND column_name='acepta_transferencia') THEN
                    ALTER TABLE veterinarios ADD COLUMN acepta_transferencia BOOLEAN DEFAULT true;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='veterinarios' AND column_name='acepta_efectivo') THEN
                    ALTER TABLE veterinarios ADD COLUMN acepta_efectivo BOOLEAN DEFAULT true;
                END IF;
                
                -- Columnas para integración con ARCA/AFIP
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='veterinarios' AND column_name='arca_cuit') THEN
                    ALTER TABLE veterinarios ADD COLUMN arca_cuit TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='veterinarios' AND column_name='arca_api_key') THEN
                    ALTER TABLE veterinarios ADD COLUMN arca_api_key TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='veterinarios' AND column_name='arca_punto_venta') THEN
                    ALTER TABLE veterinarios ADD COLUMN arca_punto_venta INTEGER DEFAULT 1;
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
                
                -- Agregar contiene_granos si no existe
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='mascotas' AND column_name='contiene_granos'
                ) THEN
                    ALTER TABLE mascotas ADD COLUMN contiene_granos TEXT;
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
            DO $$ 
            BEGIN 
                -- Agregar proxima_desparasitacion si no existe
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='consultas' AND column_name='proxima_desparasitacion'
                ) THEN
                    ALTER TABLE consultas ADD COLUMN proxima_desparasitacion DATE;
                END IF;
            END $$;
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

        // Tabla de Preguntas Frecuentes (FAQ)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS faq (
                id SERIAL PRIMARY KEY,
                veterinario_id INTEGER REFERENCES veterinarios(id),
                pregunta TEXT NOT NULL,
                respuesta TEXT NOT NULL,
                orden INTEGER DEFAULT 0,
                activo BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de Ubicaciones y Valoraciones
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ubicaciones (
                id SERIAL PRIMARY KEY,
                veterinario_id INTEGER REFERENCES veterinarios(id) UNIQUE,
                latitud DECIMAL(10, 8),
                longitud DECIMAL(11, 8),
                direccion_completa TEXT,
                ciudad TEXT,
                provincia TEXT,
                codigo_postal TEXT,
                zona TEXT,
                visible_en_mapa BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS valoraciones (
                id SERIAL PRIMARY KEY,
                veterinario_id INTEGER REFERENCES veterinarios(id),
                cliente_id INTEGER REFERENCES clientes(id),
                puntuacion INTEGER CHECK (puntuacion >= 1 AND puntuacion <= 5),
                categoria TEXT,
                comentario TEXT,
                aprobado BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de Protocolos de Trabajo
        await pool.query(`
            CREATE TABLE IF NOT EXISTS protocolos_trabajo (
                id SERIAL PRIMARY KEY,
                veterinario_id INTEGER REFERENCES veterinarios(id),
                titulo TEXT NOT NULL,
                descripcion TEXT NOT NULL,
                categoria TEXT,
                contenido TEXT NOT NULL,
                orden INTEGER DEFAULT 0,
                activo BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
                monto DECIMAL(10,2) DEFAULT 0,
                metodo_pago TEXT DEFAULT 'efectivo',
                pago_confirmado BOOLEAN DEFAULT false,
                payment_id TEXT,
                fecha_pago TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Migración: Agregar campos de pago si no existen
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='citas' AND column_name='monto'
                ) THEN
                    ALTER TABLE citas ADD COLUMN monto DECIMAL(10,2) DEFAULT 0;
                END IF;
                
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='citas' AND column_name='metodo_pago'
                ) THEN
                    ALTER TABLE citas ADD COLUMN metodo_pago TEXT DEFAULT 'efectivo';
                END IF;
                
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='citas' AND column_name='pago_confirmado'
                ) THEN
                    ALTER TABLE citas ADD COLUMN pago_confirmado BOOLEAN DEFAULT false;
                END IF;
                
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='citas' AND column_name='payment_id'
                ) THEN
                    ALTER TABLE citas ADD COLUMN payment_id TEXT;
                END IF;
                
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='citas' AND column_name='fecha_pago'
                ) THEN
                    ALTER TABLE citas ADD COLUMN fecha_pago TIMESTAMP;
                END IF;
            END $$;
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
                -- Campos de integración con ARCA/AFIP
                arca_cae TEXT,
                arca_cae_vencimiento DATE,
                arca_tipo_comprobante TEXT,
                arca_punto_venta INTEGER,
                arca_numero_comprobante BIGINT,
                arca_sincronizada BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Agregar columnas ARCA si no existen
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='facturas' AND column_name='arca_cae') THEN
                    ALTER TABLE facturas ADD COLUMN arca_cae TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='facturas' AND column_name='arca_cae_vencimiento') THEN
                    ALTER TABLE facturas ADD COLUMN arca_cae_vencimiento DATE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='facturas' AND column_name='arca_tipo_comprobante') THEN
                    ALTER TABLE facturas ADD COLUMN arca_tipo_comprobante TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='facturas' AND column_name='arca_punto_venta') THEN
                    ALTER TABLE facturas ADD COLUMN arca_punto_venta INTEGER;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='facturas' AND column_name='arca_numero_comprobante') THEN
                    ALTER TABLE facturas ADD COLUMN arca_numero_comprobante BIGINT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='facturas' AND column_name='arca_sincronizada') THEN
                    ALTER TABLE facturas ADD COLUMN arca_sincronizada BOOLEAN DEFAULT false;
                END IF;
            END $$;
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
            CREATE TABLE IF NOT EXISTS inventario_productos (
                id SERIAL PRIMARY KEY,
                veterinario_id INTEGER REFERENCES veterinarios(id),
                codigo_barras TEXT,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                categoria TEXT NOT NULL,
                tipo TEXT NOT NULL,
                marca TEXT,
                presentacion TEXT,
                stock_actual INTEGER NOT NULL DEFAULT 0,
                stock_minimo INTEGER DEFAULT 10,
                stock_maximo INTEGER DEFAULT 100,
                precio_compra DECIMAL(10,2),
                precio_venta DECIMAL(10,2),
                fecha_vencimiento DATE,
                lote TEXT,
                proveedor TEXT,
                ubicacion TEXT,
                imagen_url TEXT,
                activo BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Migración de tabla antigua a nueva
        await pool.query(`
            DO $$ 
            BEGIN 
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='inventario_medicamentos') THEN
                    INSERT INTO inventario_productos (
                        veterinario_id, nombre, descripcion, categoria, tipo,
                        stock_actual, stock_minimo, precio_compra, precio_venta,
                        fecha_vencimiento, proveedor, created_at
                    )
                    SELECT 
                        veterinario_id, nombre, descripcion, categoria, 'medicamento',
                        stock_actual, stock_minimo, precio_compra, precio_venta,
                        fecha_vencimiento, proveedor, created_at
                    FROM inventario_medicamentos
                    WHERE NOT EXISTS (
                        SELECT 1 FROM inventario_productos 
                        WHERE inventario_productos.nombre = inventario_medicamentos.nombre
                        AND inventario_productos.veterinario_id = inventario_medicamentos.veterinario_id
                    );
                END IF;
            END $$;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS movimientos_inventario (
                id SERIAL PRIMARY KEY,
                producto_id INTEGER REFERENCES inventario_productos(id),
                veterinario_id INTEGER REFERENCES veterinarios(id),
                tipo_movimiento TEXT NOT NULL,
                cantidad INTEGER NOT NULL,
                motivo TEXT,
                usuario TEXT,
                stock_anterior INTEGER,
                stock_nuevo INTEGER,
                fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS servicios_veterinaria (
                id SERIAL PRIMARY KEY,
                veterinario_id INTEGER REFERENCES veterinarios(id),
                nombre TEXT NOT NULL,
                descripcion TEXT,
                duracion_minutos INTEGER DEFAULT 30,
                precio DECIMAL(10,2),
                activo BOOLEAN DEFAULT true,
                orden INTEGER DEFAULT 0,
                icono TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

        // Tabla para licencias del sistema
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

        // Índices para mejorar rendimiento
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_licencias_clave ON licencias(clave);
            CREATE INDEX IF NOT EXISTS idx_licencias_veterinario ON licencias(veterinario_id);
            CREATE INDEX IF NOT EXISTS idx_licencias_estado ON licencias(estado);
        `);

        // Agregar columnas de licencia a veterinarios si no existen
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='veterinarios' AND column_name='licencia_activa') THEN
                    ALTER TABLE veterinarios ADD COLUMN licencia_activa BOOLEAN DEFAULT false;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='veterinarios' AND column_name='tipo_cuenta') THEN
                    ALTER TABLE veterinarios ADD COLUMN tipo_cuenta VARCHAR(50) DEFAULT 'DEMO';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='veterinarios' AND column_name='fecha_expiracion_demo') THEN
                    ALTER TABLE veterinarios ADD COLUMN fecha_expiracion_demo TIMESTAMP;
                END IF;
            END $$;
        `);

        // ==================== TABLAS PARA CONTROL PERSONAL DE CLIENTES ====================
        
        // Tabla para registrar clientes y sus pagos (uso personal del administrador)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS mis_clientes_ventas (
                id SERIAL PRIMARY KEY,
                veterinario_id INTEGER REFERENCES veterinarios(id),
                licencia_id INTEGER REFERENCES licencias(id),
                
                -- Datos del cliente
                nombre_completo VARCHAR(200) NOT NULL,
                email VARCHAR(200),
                telefono VARCHAR(50),
                whatsapp VARCHAR(50),
                clinica_nombre VARCHAR(200),
                ciudad VARCHAR(100),
                provincia VARCHAR(100),
                
                -- Datos de pago
                monto_pagado DECIMAL(10,2),
                moneda VARCHAR(10) DEFAULT 'ARS',
                metodo_pago VARCHAR(50),
                fecha_pago DATE,
                comprobante_numero VARCHAR(100),
                comprobante_foto TEXT,
                
                -- Estado de la venta
                estado_venta VARCHAR(50) DEFAULT 'completada',
                tipo_venta VARCHAR(50) DEFAULT 'nueva',
                
                -- Notas personales
                notas TEXT,
                seguimiento TEXT,
                
                -- Timestamps
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla para historial de pagos y renovaciones
        await pool.query(`
            CREATE TABLE IF NOT EXISTS historial_pagos_clientes (
                id SERIAL PRIMARY KEY,
                cliente_venta_id INTEGER REFERENCES mis_clientes_ventas(id),
                veterinario_id INTEGER REFERENCES veterinarios(id),
                
                -- Datos del pago
                monto DECIMAL(10,2) NOT NULL,
                moneda VARCHAR(10) DEFAULT 'ARS',
                metodo_pago VARCHAR(50),
                fecha_pago DATE NOT NULL,
                comprobante_numero VARCHAR(100),
                comprobante_foto TEXT,
                
                -- Tipo de pago
                tipo VARCHAR(50) DEFAULT 'renovacion',
                concepto TEXT,
                
                -- Notas
                notas TEXT,
                
                -- Timestamps
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla para recordatorios de renovación
        await pool.query(`
            CREATE TABLE IF NOT EXISTS recordatorios_renovacion (
                id SERIAL PRIMARY KEY,
                cliente_venta_id INTEGER REFERENCES mis_clientes_ventas(id),
                
                -- Datos del recordatorio
                fecha_recordatorio DATE NOT NULL,
                dias_antes_vencimiento INTEGER,
                mensaje TEXT,
                
                -- Estado
                enviado BOOLEAN DEFAULT false,
                fecha_envio TIMESTAMP,
                metodo_envio VARCHAR(50),
                
                -- Timestamps
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Índices para mejorar rendimiento
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_mis_clientes_veterinario ON mis_clientes_ventas(veterinario_id);
            CREATE INDEX IF NOT EXISTS idx_mis_clientes_licencia ON mis_clientes_ventas(licencia_id);
            CREATE INDEX IF NOT EXISTS idx_historial_pagos_cliente ON historial_pagos_clientes(cliente_venta_id);
            CREATE INDEX IF NOT EXISTS idx_recordatorios_cliente ON recordatorios_renovacion(cliente_venta_id);
        `);

        console.log('✅ Base de datos PostgreSQL inicializada correctamente');
        console.log('✅ Tablas de control personal de clientes creadas');
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
