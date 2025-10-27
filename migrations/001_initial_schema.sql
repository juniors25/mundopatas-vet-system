-- Migración 001: Esquema inicial para mejoras en gestión de clientes

-- Tabla de segmentos de clientes
CREATE TABLE IF NOT EXISTS segmentos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    color VARCHAR(20) DEFAULT '#3498db',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Modificar tabla clientes para agregar referidos y segmentación
ALTER TABLE clientes 
    ADD COLUMN IF NOT EXISTS segmento_id INTEGER REFERENCES segmentos(id),
    ADD COLUMN IF NOT EXISTS referido_por INTEGER REFERENCES clientes(id),
    ADD COLUMN IF NOT EXISTS notas TEXT,
    ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
    ADD COLUMN IF NOT EXISTS genero VARCHAR(20),
    ADD COLUMN IF NOT EXISTS direccion_alternativa TEXT,
    ADD COLUMN IF NOT EXISTS es_empresa BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS razon_social VARCHAR(255),
    ADD COLUMN IF NOT EXISTS ruc VARCHAR(20),
    ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS recordatorios_habilitados BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS preferencia_contacto VARCHAR(20) DEFAULT 'whatsapp';

-- Índices para mejorar rendimiento de búsquedas
CREATE INDEX IF NOT EXISTS idx_clientes_nombre_apellido ON clientes (nombre, apellido);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes (email);
CREATE INDEX IF NOT EXISTS idx_clientes_telefono ON clientes (telefono);
CREATE INDEX IF NOT EXISTS idx_clientes_veterinario_id ON clientes (veterinario_id);
CREATE INDEX IF NOT EXISTS idx_clientes_segmento_id ON clientes (segmento_id);
CREATE INDEX IF NOT EXISTS idx_clientes_referido_por ON clientes (referido_por);

-- Tabla para almacenar direcciones adicionales de clientes
CREATE TABLE IF NOT EXISTS direcciones_cliente (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL, -- 'casa', 'trabajo', 'otro'
    direccion TEXT NOT NULL,
    ciudad VARCHAR(100),
    departamento VARCHAR(100),
    pais VARCHAR(100) DEFAULT 'Paraguay',
    referencia TEXT,
    es_principal BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para etiquetas personalizadas de clientes
CREATE TABLE IF NOT EXISTS etiquetas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    color VARCHAR(20) DEFAULT '#95a5a6',
    veterinario_id INTEGER REFERENCES veterinarios(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de relación muchos a muchos entre clientes y etiquetas
CREATE TABLE IF NOT EXISTS cliente_etiquetas (
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    etiqueta_id INTEGER NOT NULL REFERENCES etiquetas(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (cliente_id, etiqueta_id)
);

-- Tabla para registrar interacciones con clientes
CREATE TABLE IF NOT EXISTS interacciones_cliente (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    veterinario_id INTEGER NOT NULL REFERENCES veterinarios(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL, -- 'llamada', 'email', 'whatsapp', 'consulta', 'recordatorio', 'otro'
    descripcion TEXT,
    fecha_hora TIMESTAMP NOT NULL,
    seguimiento_necesario BOOLEAN DEFAULT false,
    fecha_seguimiento TIMESTAMP,
    realizada BOOLEAN DEFAULT false,
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar segmentos por defecto
INSERT INTO segmentos (nombre, descripcion, color) VALUES
    ('Clientes frecuentes', 'Clientes que visitan la clínica regularmente', '#2ecc71'),
    ('Clientes ocasionales', 'Clientes que visitan la clínica ocasionalmente', '#f39c12'),
    ('Clientes inactivos', 'Clientes que no han visitado la clínica en más de 6 meses', '#e74c3c'),
    ('Clientes potenciales', 'Clientes que han mostrado interés pero aún no han realizado una compra', '#3498db'),
    ('Clientes corporativos', 'Empresas o negocios que utilizan nuestros servicios', '#9b59b6')
ON CONFLICT DO NOTHING;
