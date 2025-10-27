-- Migración 002: Mejoras en el módulo de Historia Clínica

-- Tabla de tipos de consulta
CREATE TABLE IF NOT EXISTS tipos_consulta (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    color VARCHAR(20) DEFAULT '#3498db',
    duracion_promedio INTEGER DEFAULT 30, -- en minutos
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de historias clínicas
ALTER TABLE IF EXISTS historias_clinicas
    ADD COLUMN IF NOT EXISTS tipo_consulta_id INTEGER REFERENCES tipos_consulta(id),
    ADD COLUMN IF NOT EXISTS motivo_consulta TEXT,
    ADD COLUMN IF NOT EXISTS sintomatologia TEXT,
    ADD COLUMN IF NOT EXISTS diagnostico TEXT,
    ADD COLUMN IF NOT EXISTS tratamiento TEXT,
    ADD COLUMN IF NOT EXISTS observaciones TEXT,
    ADD COLUMN IF NOT EXISTS peso_kg DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS temperatura_c DECIMAL(4,1),
    ADD COLUMN IF NOT EXISTS frecuencia_cardiaca INTEGER,
    ADD COLUMN IF NOT EXISTS frecuencia_respiratoria INTEGER,
    ADD COLUMN IF NOT EXISTS tlls_izq VARCHAR(20),
    ADD COLUMN IF NOT EXISTS tlls_der VARCHAR(20),
    ADD COLUMN IF NOT EXISTS hidratacion VARCHAR(50),
    ADD COLUMN IF NOT EXISTS mucosas VARCHAR(50),
    ADD COLUMN IF NOT EXISTS nivel_dolor INTEGER, -- Escala del 1 al 10
    ADD COLUMN IF NOT EXISTS estado_general TEXT,
    ADD COLUMN IF NOT EXISTS examen_fisico TEXT,
    ADD COLUMN IF NOT EXISTS proximo_control DATE,
    ADD COLUMN IF NOT EXISTS requiere_seguimiento BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS cerrada BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS fecha_cierre TIMESTAMP;

-- Tabla de archivos adjuntos
CREATE TABLE IF NOT EXISTS archivos_adjuntos (
    id SERIAL PRIMARY KEY,
    historia_clinica_id INTEGER NOT NULL REFERENCES historias_clinicas(id) ON DELETE CASCADE,
    nombre_archivo VARCHAR(255) NOT NULL,
    tipo_archivo VARCHAR(100) NOT NULL,
    tamano_bytes BIGINT NOT NULL,
    ruta_archivo VARCHAR(500) NOT NULL,
    descripcion TEXT,
    veterinario_id INTEGER NOT NULL REFERENCES veterinarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de plantillas de historias clínicas
CREATE TABLE IF NOT EXISTS plantillas_historia_clinica (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    contenido JSONB NOT NULL,
    tipo_consulta_id INTEGER REFERENCES tipos_consulta(id),
    veterinario_id INTEGER REFERENCES veterinarios(id) ON DELETE CASCADE,
    es_publica BOOLEAN DEFAULT false,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de vacunas
CREATE TABLE IF NOT EXISTS vacunas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    tipo_animal VARCHAR(50), -- Perro, Gato, etc.
    edad_recomendada_semanas INTEGER,
    refuerzo_semanas INTEGER,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de vacunas aplicadas
CREATE TABLE IF NOT EXISTS vacunas_aplicadas (
    id SERIAL PRIMARY KEY,
    mascota_id INTEGER NOT NULL REFERENCES mascotas(id) ON DELETE CASCADE,
    vacuna_id INTEGER NOT NULL REFERENCES vacunas(id),
    fecha_aplicacion DATE NOT NULL,
    fecha_proximo_refuerzo DATE,
    lote_vacuna VARCHAR(50),
    veterinario_id INTEGER NOT NULL REFERENCES veterinarios(id),
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de desparasitaciones
CREATE TABLE IF NOT EXISTS desparasitaciones (
    id SERIAL PRIMARY KEY,
    mascota_id INTEGER NOT NULL REFERENCES mascotas(id) ON DELETE CASCADE,
    producto VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- Interno, externo, etc.
    dosis VARCHAR(50),
    fecha_aplicacion DATE NOT NULL,
    fecha_proxima_aplicacion DATE,
    veterinario_id INTEGER NOT NULL REFERENCES veterinarios(id),
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de medicamentos
CREATE TABLE IF NOT EXISTS medicamentos (
    id SERIAL PRIMARY KEY,
    nombre_comercial VARCHAR(100) NOT NULL,
    principio_activo VARCHAR(100) NOT NULL,
    laboratorio VARCHAR(100),
    presentacion VARCHAR(100),
    concentracion VARCHAR(50),
    via_administracion VARCHAR(50),
    contraindicaciones TEXT,
    efectos_secundarios TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de medicamentos recetados
CREATE TABLE IF NOT EXISTS recetas_medicamentos (
    id SERIAL PRIMARY KEY,
    historia_clinica_id INTEGER NOT NULL REFERENCES historias_clinicas(id) ON DELETE CASCADE,
    medicamento_id INTEGER NOT NULL REFERENCES medicamentos(id),
    dosis VARCHAR(100) NOT NULL,
    frecuencia VARCHAR(100) NOT NULL,
    duracion_dias INTEGER NOT NULL,
    indicaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar datos iniciales de tipos de consulta
INSERT INTO tipos_consulta (nombre, descripcion, color, duracion_promedio) VALUES
    ('Consulta General', 'Consulta de rutina o chequeo general', '#3498db', 30),
    ('Urgencia', 'Atención de emergencia', '#e74c3c', 60),
    ('Cirugía', 'Procedimiento quirúrgico', '#9b59b6', 120),
    ('Vacunación', 'Aplicación de vacunas', '#2ecc71', 20),
    ('Peluquería', 'Servicios de aseo y belleza', '#f1c40f', 60),
    ('Control', 'Seguimiento de tratamiento', '#1abc9c', 20),
    ('Odontología', 'Limpieza y tratamiento dental', '#3498db', 45)
ON CONFLICT (nombre) DO NOTHING;

-- Insertar vacunas comunes
INSERT INTO vacunas (nombre, descripcion, tipo_animal, edad_recomendada_semanas, refuerzo_semanas) VALUES
    ('Antirrábica', 'Vacuna contra la rabia', 'Perro', 16, 52),
    ('Antirrábica', 'Vacuna contra la rabia', 'Gato', 16, 52),
    ('Penta/DHPPiL', 'Moquillo, Hepatitis, Parvovirus, Parainfluenza, Leptospirosis', 'Perro', 8, 52),
    ('Tetra/DHPPi', 'Moquillo, Hepatitis, Parvovirus, Parainfluenza', 'Perro', 8, 52),
    ('Triple Felina', 'Panleucopenia, Rinotraqueitis, Calicivirus', 'Gato', 8, 52),
    ('Leucemia Felina', 'Virus de la leucemia felina', 'Gato', 12, 52),
    ('Bordetella', 'Tos de las perreras', 'Perro', 8, 26)
ON CONFLICT (nombre, tipo_animal) DO NOTHING;

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_historia_clinica_mascota ON historias_clinicas(mascota_id);
CREATE INDEX IF NOT EXISTS idx_historia_clinica_fecha ON historias_clinicas(fecha_consulta);
CREATE INDEX IF NOT EXISTS idx_vacunas_aplicadas_mascota ON vacunas_aplicadas(mascota_id);
CREATE INDEX IF NOT EXISTS idx_vacunas_aplicadas_fecha ON vacunas_aplicadas(fecha_aplicacion);
CREATE INDEX IF NOT EXISTS idx_desparasitaciones_mascota ON desparasitaciones(mascota_id);
CREATE INDEX IF NOT EXISTS idx_archivos_adjuntos_historia ON archivos_adjuntos(historia_clinica_id);
CREATE INDEX IF NOT EXISTS idx_recetas_medicamentos_historia ON recetas_medicamentos(historia_clinica_id);
