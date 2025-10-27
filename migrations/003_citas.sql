-- Migración 003: Sistema de Citas
-- Fecha: 2025-10-27
-- Autor: Sistema Mundo Patas

-- Tabla de configuración de horarios de atención
CREATE TABLE IF NOT EXISTS configuracion_horarios (
    id SERIAL PRIMARY KEY,
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0: Domingo, 1: Lunes, ..., 6: Sábado
    hora_apertura TIME NOT NULL,
    hora_cierre TIME NOT NULL,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de citas
CREATE TABLE IF NOT EXISTS citas (
    id SERIAL PRIMARY KEY,
    id_veterinario INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    id_cliente INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    id_mascota INTEGER REFERENCES mascotas(id) ON DELETE SET NULL,
    id_servicio INTEGER REFERENCES servicios_veterinaria(id) ON DELETE SET NULL,
    fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    duracion_minutos INTEGER NOT NULL DEFAULT 30,
    motivo TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'en_curso', 'completada', 'cancelada', 'no_asistio')),
    notas TEXT,
    recordatorio_enviado BOOLEAN DEFAULT false,
    recordatorio_fecha_hora TIMESTAMP WITH TIME ZONE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX idx_citas_fecha_hora ON citas(fecha_hora);
CREATE INDEX idx_citas_estado ON citas(estado);
CREATE INDEX idx_citas_veterinario ON citas(id_veterinario);
CREATE INDEX idx_citas_cliente ON citas(id_cliente);

-- Tabla de disponibilidad de los veterinarios
CREATE TABLE IF NOT EXISTS disponibilidad_veterinarios (
    id SERIAL PRIMARY KEY,
    id_veterinario INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    disponible BOOLEAN DEFAULT true,
    motivo_no_disponible TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_veterinario, fecha, hora_inicio)
);

-- Tabla de tipos de servicio
CREATE TABLE IF NOT EXISTS tipos_servicio (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    duracion_minutos INTEGER NOT NULL DEFAULT 30,
    color_calendario VARCHAR(7) DEFAULT '#3B82F6',
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de recordatorios de citas
CREATE TABLE IF NOT EXISTS recordatorios_citas (
    id SERIAL PRIMARY KEY,
    id_cita INTEGER NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
    tipo_recordatorio VARCHAR(20) NOT NULL CHECK (tipo_recordatorio IN ('email', 'sms', 'whatsapp')),
    fecha_envio TIMESTAMP WITH TIME ZONE,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'enviado', 'fallido')),
    error TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de plantillas de recordatorios
CREATE TABLE IF NOT EXISTS plantillas_recordatorios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    asunto VARCHAR(200) NOT NULL,
    contenido TEXT NOT NULL,
    tipo_recordatorio VARCHAR(20) NOT NULL CHECK (tipo_recordatorio IN ('email', 'sms', 'whatsapp')),
    horas_antes INTEGER NOT NULL DEFAULT 24,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insertar horarios por defecto (Lunes a Viernes de 9:00 a 18:00)
INSERT INTO configuracion_horarios (dia_semana, hora_apertura, hora_cierre, activo)
VALUES 
    (1, '09:00:00', '18:00:00', true),  -- Lunes
    (2, '09:00:00', '18:00:00', true),  -- Martes
    (3, '09:00:00', '18:00:00', true),  -- Miércoles
    (4, '09:00:00', '18:00:00', true),  -- Jueves
    (5, '09:00:00', '18:00:00', true),  -- Viernes
    (6, '09:00:00', '13:00:00', true);  -- Sábado

-- Insertar tipos de servicio por defecto
INSERT INTO tipos_servicio (nombre, descripcion, duracion_minutos, color_calendario, activo)
VALUES 
    ('Consulta General', 'Consulta veterinaria general', 30, '#3B82F6', true),
    ('Vacunación', 'Aplicación de vacunas', 30, '#10B981', true),
    ('Peluquería', 'Servicio de peluquería canina/felina', 60, '#F59E0B', true),
    ('Cirugía', 'Procedimiento quirúrgico', 120, '#EF4444', true),
    ('Desparasitación', 'Aplicación de desparasitante', 20, '#8B5CF6', true),
    ('Control', 'Control de seguimiento', 20, '#EC4899', true);

-- Insertar plantillas de recordatorios por defecto
INSERT INTO plantillas_recordatorios (nombre, asunto, contenido, tipo_recordatorio, horas_antes, activo)
VALUES 
    ('Recordatorio de Cita - Email', 'Recordatorio de cita en {{nombre_veterinaria}}', 
    'Hola {{nombre_cliente}},\n\nEste es un recordatorio de su cita programada para el {{fecha_cita}} a las {{hora_cita}} con {{nombre_veterinario}}.\n\nMotivo: {{motivo_cita}}\nMascota: {{nombre_mascota}}\n\nPor favor, llegue 10 minutos antes.\n\nSi necesita reprogramar, contáctenos al {{telefono_veterinaria}}.\n\n¡Gracias por confiar en {{nombre_veterinaria}}!', 
    'email', 24, true),
    
    ('Recordatorio de Cita - SMS', 'Recordatorio de cita', 
    'Recuerde su cita el {{fecha_cita}} a las {{hora_cita}} en {{nombre_veterinaria}}. Mascota: {{nombre_mascota}}. Para reagendar: {{telefono_veterinaria}}', 
    'sms', 3, true),
    
    ('Recordatorio de Cita - WhatsApp', 'Recordatorio de cita', 
    '🐾 *Recordatorio de Cita* 🐾\n\n*Fecha:* {{fecha_cita}}\n*Hora:* {{hora_cita}}\n*Veterinario:* {{nombre_veterinario}}\n*Mascota:* {{nombre_mascota}}\n\n¡Gracias por confiar en {{nombre_veterinaria}}! 🏥❤️', 
    'whatsapp', 3, true);

-- Función para actualizar automáticamente el campo actualizado_en
CREATE OR REPLACE FUNCTION actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar automáticamente los timestamps
CREATE TRIGGER actualizar_timestamp_citas
BEFORE UPDATE ON citas
FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

CREATE TRIGGER actualizar_timestamp_disponibilidad
BEFORE UPDATE ON disponibilidad_veterinarios
FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

-- Función para verificar disponibilidad de horario
CREATE OR REPLACE FUNCTION verificar_disponibilidad_cita()
RETURNS TRIGGER AS $$
DECLARE
    existe_solapamiento BOOLEAN;
    horario_valido BOOLEAN;
    dia_semana_cita INTEGER;
    hora_inicio_cita TIME;
    hora_fin_cita TIME;
    duracion_interval INTERVAL;
BEGIN
    -- Obtener el día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)
    dia_semana_cita := EXTRACT(DOW FROM NEW.fecha_hora);
    
    -- Convertir la hora de la cita a tipo TIME
    hora_inicio_cita := NEW.fecha_hora::TIME;
    
    -- Calcular la hora de finalización basada en la duración
    duracion_interval := (NEW.duracion_minutos || ' minutes')::INTERVAL;
    hora_fin_cita := (NEW.fecha_hora + duracion_interval)::TIME;
    
    -- Verificar si el horario está dentro del horario de atención
    SELECT EXISTS (
        SELECT 1 
        FROM configuracion_horarios
        WHERE dia_semana = dia_semana_cita
        AND hora_apertura <= hora_inicio_cita
        AND hora_cierre >= hora_fin_cita
        AND activo = true
    ) INTO horario_valido;
    
    IF NOT horario_valido THEN
        RAISE EXCEPTION 'El horario de la cita está fuera del horario de atención';
    END IF;
    
    -- Verificar si hay solapamiento con otras citas
    SELECT EXISTS (
        SELECT 1 
        FROM citas c
        WHERE c.id_veterinario = NEW.id_veterinario
        AND c.id != COALESCE(NEW.id, -1)  -- Para permitir actualizaciones
        AND c.estado NOT IN ('cancelada', 'no_asistio')
        AND (
            (NEW.fecha_hora, NEW.fecha_hora + duracion_interval) 
            OVERLAPS 
            (c.fecha_hora, c.fecha_hora + (c.duracion_minutos * INTERVAL '1 minute'))
        )
    ) INTO existe_solapamiento;
    
    IF existe_solapamiento THEN
        RAISE EXCEPTION 'Existe un conflicto de horario con otra cita';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar el trigger a la tabla de citas
CREATE TRIGGER trigger_verificar_disponibilidad
BEFORE INSERT OR UPDATE ON citas
FOR EACH ROW EXECUTE FUNCTION verificar_disponibilidad_cita();

-- Función para generar los slots de disponibilidad
CREATE OR REPLACE FUNCTION generar_slots_disponibilidad(
    p_fecha_inicio DATE,
    p_fecha_fin DATE,
    p_id_veterinario INTEGER
)
RETURNS TABLE (
    fecha_hora TIMESTAMP WITH TIME ZONE,
    disponible BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE fechas AS (
        SELECT p_fecha_inicio AS fecha
        UNION ALL
        SELECT fecha + INTERVAL '1 day'
        FROM fechas
        WHERE fecha < p_fecha_fin
    ),
    horarios AS (
        SELECT 
            f.fecha + (h.hora_apertura::TEXT)::TIME AS fecha_hora_inicio,
            f.fecha + (h.hora_cierre::TEXT)::TIME AS fecha_hora_fin,
            (h.hora_cierre - h.hora_apertura) * 2 AS total_slots  -- 30 minutos por slot
        FROM fechas f
        JOIN configuracion_horarios h ON EXTRACT(DOW FROM f.fecha) = h.dia_semana
        WHERE h.activo = true
    ),
    slots AS (
        SELECT 
            h.fecha_hora_inicio + (n * INTERVAL '30 minutes') AS slot_hora
        FROM 
            horarios h,
            generate_series(0, h.total_slots - 1) AS n
        WHERE 
            h.fecha_hora_inicio + (n * INTERVAL '30 minutes') < h.fecha_hora_fin
    )
    SELECT 
        s.slot_hora,
        NOT EXISTS (
            SELECT 1 
            FROM citas c
            WHERE c.id_veterinario = p_id_veterinario
            AND c.estado NOT IN ('cancelada', 'no_asistio')
            AND s.slot_hora >= c.fecha_hora
            AND s.slot_hora < (c.fecha_hora + (c.duracion_minutes * INTERVAL '1 minute'))
        ) AS disponible
    FROM slots s
    ORDER BY s.slot_hora;
END;
$$ LANGUAGE plpgsql;
