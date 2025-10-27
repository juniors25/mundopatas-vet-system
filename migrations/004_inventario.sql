-- Migración 004: Sistema de Inventario Completo

-- Tabla de categorías de productos
CREATE TABLE IF NOT EXISTS categorias_inventario (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    color VARCHAR(20) DEFAULT '#95a5a6',
    veterinario_id INTEGER REFERENCES veterinarios(id) ON DELETE CASCADE,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de proveedores
CREATE TABLE IF NOT EXISTS proveedores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    ruc VARCHAR(20),
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion TEXT,
    contacto_nombre VARCHAR(200),
    contacto_telefono VARCHAR(20),
    notas TEXT,
    veterinario_id INTEGER REFERENCES veterinarios(id) ON DELETE CASCADE,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de productos
CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    codigo_barras VARCHAR(100) UNIQUE,
    codigo_interno VARCHAR(50),
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    categoria_id INTEGER REFERENCES categorias_inventario(id) ON DELETE SET NULL,
    proveedor_id INTEGER REFERENCES proveedores(id) ON DELETE SET NULL,
    tipo_producto VARCHAR(50) NOT NULL, -- 'medicamento', 'alimento', 'accesorio', 'insumo', 'servicio'
    precio_compra DECIMAL(12, 2) NOT NULL DEFAULT 0,
    precio_venta DECIMAL(12, 2) NOT NULL DEFAULT 0,
    iva_porcentaje DECIMAL(5, 2) DEFAULT 10, -- 10% por defecto
    stock_actual DECIMAL(10, 3) NOT NULL DEFAULT 0,
    stock_minimo DECIMAL(10, 3) DEFAULT 5,
    stock_maximo DECIMAL(10, 3),
    unidad_medida VARCHAR(20) NOT NULL, -- 'unidad', 'mg', 'ml', 'kg', 'l', 'caja', 'blister', etc.
    requiere_receta BOOLEAN DEFAULT false,
    controlado BOOLEAN DEFAULT false,
    lote_control BOOLEAN DEFAULT false,
    fecha_vencimiento_control BOOLEAN DEFAULT false,
    imagen_url VARCHAR(500),
    veterinario_id INTEGER REFERENCES veterinarios(id) ON DELETE CASCADE,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de lotes (opcional, para productos con control de lote)
CREATE TABLE IF NOT EXISTS lotes (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    numero_lote VARCHAR(100) NOT NULL,
    fecha_vencimiento DATE,
    fecha_fabricacion DATE,
    cantidad_inicial DECIMAL(10, 3) NOT NULL,
    cantidad_actual DECIMAL(10, 3) NOT NULL,
    precio_compra DECIMAL(12, 2) NOT NULL,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(producto_id, numero_lote)
);

-- Tabla de movimientos de inventario
CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id SERIAL PRIMARY KEY,
    tipo_movimiento VARCHAR(50) NOT NULL, -- 'entrada', 'salida', 'ajuste', 'venta', 'compra', 'vencimiento', 'daño', 'devolucion'
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    lote_id INTEGER REFERENCES lotes(id) ON DELETE SET NULL,
    cantidad DECIMAL(10, 3) NOT NULL,
    cantidad_anterior DECIMAL(10, 3) NOT NULL,
    cantidad_nueva DECIMAL(10, 3) NOT NULL,
    costo_unitario DECIMAL(12, 2) NOT NULL,
    costo_total DECIMAL(12, 2) GENERATED ALWAYS AS (cantidad * costo_unitario) STORED,
    motivo TEXT,
    referencia_id INTEGER, -- ID de la referencia (venta_id, compra_id, etc.)
    referencia_tipo VARCHAR(50), -- 'venta', 'compra', 'ajuste', etc.
    veterinario_id INTEGER REFERENCES veterinarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de compras
CREATE TABLE IF NOT EXISTS compras (
    id SERIAL PRIMARY KEY,
    numero_factura VARCHAR(100),
    proveedor_id INTEGER REFERENCES proveedores(id) ON DELETE SET NULL,
    fecha_compra DATE NOT NULL,
    fecha_recibido DATE,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    iva DECIMAL(12, 2) NOT NULL DEFAULT 0,
    descuento DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    estado VARCHAR(20) NOT NULL, -- 'pendiente', 'recibido', 'cancelado', 'parcial'
    notas TEXT,
    veterinario_id INTEGER REFERENCES veterinarios(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de detalles de compra
CREATE TABLE IF NOT EXISTS compra_detalles (
    id SERIAL PRIMARY KEY,
    compra_id INTEGER NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    lote_id INTEGER REFERENCES lotes(id) ON DELETE SET NULL,
    cantidad DECIMAL(10, 3) NOT NULL,
    costo_unitario DECIMAL(12, 2) NOT NULL,
    iva_porcentaje DECIMAL(5, 2) NOT NULL,
    descuento_porcentaje DECIMAL(5, 2) DEFAULT 0,
    subtotal DECIMAL(12, 2) GENERATED ALWAYS AS (cantidad * costo_unitario * (1 - COALESCE(descuento_porcentaje, 0) / 100)) STORED,
    iva_monto DECIMAL(12, 2) GENERATED ALWAYS AS (cantidad * costo_unitario * (1 - COALESCE(descuento_porcentaje, 0) / 100) * (COALESCE(iva_porcentaje, 0) / 100)) STORED,
    total DECIMAL(12, 2) GENERATED ALWAYS AS (cantidad * costo_unitario * (1 - COALESCE(descuento_porcentaje, 0) / 100) * (1 + COALESCE(iva_porcentaje, 0) / 100)) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de ajustes de inventario
CREATE TABLE IF NOT EXISTS ajustes_inventario (
    id SERIAL PRIMARY KEY,
    fecha_ajuste TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    motivo VARCHAR(200) NOT NULL,
    notas TEXT,
    estado VARCHAR(20) NOT NULL, -- 'pendiente', 'aprobado', 'rechazado'
    aprobado_por INTEGER REFERENCES veterinarios(id) ON DELETE SET NULL,
    fecha_aprobacion TIMESTAMP,
    veterinario_id INTEGER REFERENCES veterinarios(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de detalles de ajuste de inventario
CREATE TABLE IF NOT EXISTS ajuste_detalles (
    id SERIAL PRIMARY KEY,
    ajuste_id INTEGER NOT NULL REFERENCES ajustes_inventario(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    lote_id INTEGER REFERENCES lotes(id) ON DELETE SET NULL,
    cantidad_anterior DECIMAL(10, 3) NOT NULL,
    cantidad_ajuste DECIMAL(10, 3) NOT NULL,
    cantidad_nueva DECIMAL(10, 3) GENERATED ALWAYS AS (cantidad_anterior + cantidad_ajuste) STORED,
    costo_promedio DECIMAL(12, 2) NOT NULL,
    motivo_ajuste TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de alertas de inventario
CREATE TABLE IF NOT EXISTS alertas_inventario (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    tipo_alerta VARCHAR(50) NOT NULL, -- 'stock_minimo', 'stock_agotado', 'vencimiento_proximo', 'sin_movimiento'
    mensaje TEXT NOT NULL,
    nivel_gravedad VARCHAR(20) NOT NULL, -- 'bajo', 'medio', 'alto', 'critico'
    fecha_alerta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    leida BOOLEAN DEFAULT false,
    fecha_lectura TIMESTAMP,
    resuelta BOOLEAN DEFAULT false,
    fecha_resolucion TIMESTAMP,
    notas_resolucion TEXT,
    veterinario_id INTEGER REFERENCES veterinarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de inventario físico (para conteos físicos)
CREATE TABLE IF NOT EXISTS conteos_fisicos (
    id SERIAL PRIMARY KEY,
    fecha_conteo DATE NOT NULL,
    nombre_conteo VARCHAR(200) NOT NULL,
    notas TEXT,
    estado VARCHAR(20) NOT NULL, -- 'en_progreso', 'finalizado', 'cancelado'
    finalizado_por INTEGER REFERENCES veterinarios(id) ON DELETE SET NULL,
    fecha_finalizacion TIMESTAMP,
    veterinario_id INTEGER REFERENCES veterinarios(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de detalles de conteo físico
CREATE TABLE IF NOT EXISTS conteo_fisico_detalles (
    id SERIAL PRIMARY KEY,
    conteo_id INTEGER NOT NULL REFERENCES conteos_fisicos(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    lote_id INTEGER REFERENCES lotes(id) ON DELETE SET NULL,
    cantidad_sistema DECIMAL(10, 3) NOT NULL,
    cantidad_fisica DECIMAL(10, 3) NOT NULL,
    diferencia DECIMAL(10, 3) GENERATED ALWAYS AS (cantidad_fisica - cantidad_sistema) STORED,
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_proveedor ON productos(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos_inventario(producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos_inventario(created_at);
CREATE INDEX IF NOT EXISTS idx_compras_proveedor ON compras(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_fecha ON compras(fecha_compura);
CREATE INDEX IF NOT EXISTS idx_ajustes_estado ON ajustes_inventario(estado);
CREATE INDEX IF NOT EXISTS idx_alertas_leida ON alertas_inventario(leida);
CREATE INDEX IF NOT EXISTS idx_alertas_resuelta ON alertas_inventario(resuelta);

-- Insertar categorías de inventario por defecto
INSERT INTO categorias_inventario (nombre, descripcion, color, veterinario_id) VALUES 
    ('Medicamentos', 'Productos farmacéuticos y medicamentos', '#3498db', NULL),
    ('Alimentos', 'Alimentos para mascotas', '#2ecc71', NULL),
    ('Accesorios', 'Correas, collares, juguetes, etc.', '#9b59b6', NULL),
    ('Higiene', 'Productos de higiene y aseo', '#1abc9c', NULL),
    ('Insumos Médicos', 'Material de curación, jeringas, etc.', '#e74c3c', NULL),
    ('Suplementos', 'Vitaminas y suplementos nutricionales', '#f39c12', NULL)
ON CONFLICT (nombre, COALESCE(veterinario_id, -1)) DO NOTHING;

-- Función para actualizar el stock de un producto
CREATE OR REPLACE FUNCTION actualizar_stock_producto()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar stock del producto
    UPDATE productos 
    SET stock_actual = stock_actual + 
        CASE 
            WHEN NEW.tipo_movimiento IN ('entrada', 'devolucion_venta', 'ajuste_entrada') THEN NEW.cantidad
            WHEN NEW.tipo_movimiento IN ('salida', 'venta', 'vencimiento', 'daño', 'ajuste_salida') THEN -NEW.cantidad
            ELSE 0
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.producto_id;
    
    -- Si hay un lote asociado, actualizar su cantidad
    IF NEW.lote_id IS NOT NULL THEN
        UPDATE lotes 
        SET cantidad_actual = cantidad_actual + 
            CASE 
                WHEN NEW.tipo_movimiento IN ('entrada', 'devolucion_venta', 'ajuste_entrada') THEN NEW.cantidad
                WHEN NEW.tipo_movimiento IN ('salida', 'venta', 'vencimiento', 'daño', 'ajuste_salida') THEN -NEW.cantidad
                ELSE 0
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.lote_id;
    END IF;
    
    -- Verificar si se debe generar una alerta de stock mínimo
    IF EXISTS (
        SELECT 1 FROM productos 
        WHERE id = NEW.producto_id 
        AND stock_actual <= stock_minimo 
        AND stock_minimo IS NOT NULL
    ) THEN
        INSERT INTO alertas_inventario (
            producto_id, 
            tipo_alerta, 
            mensaje, 
            nivel_gravedad, 
            veterinario_id
        ) VALUES (
            NEW.producto_id,
            'stock_minimo',
            'El producto ' || (SELECT nombre FROM productos WHERE id = NEW.producto_id) || 
            ' está por debajo del stock mínimo. Stock actual: ' || 
            (SELECT stock_actual FROM productos WHERE id = NEW.producto_id) || 
            ', Mínimo: ' || (SELECT stock_minimo FROM productos WHERE id = NEW.producto_id),
            CASE 
                WHEN (SELECT stock_actual / NULLIF(stock_minimo, 0) FROM productos WHERE id = NEW.producto_id) <= 0.3 THEN 'critico'
                WHEN (SELECT stock_actual / NULLIF(stock_minimo, 0) FROM productos WHERE id = NEW.producto_id) <= 0.5 THEN 'alto'
                ELSE 'medio'
            END,
            NEW.veterinario_id
        );
    END IF;
    
    -- Verificar si el producto se ha agotado
    IF (SELECT stock_actual FROM productos WHERE id = NEW.producto_id) <= 0 THEN
        INSERT INTO alertas_inventario (
            producto_id, 
            tipo_alerta, 
            mensaje, 
            nivel_gravedad, 
            veterinario_id
        ) VALUES (
            NEW.producto_id,
            'stock_agotado',
            'El producto ' || (SELECT nombre FROM productos WHERE id = NEW.producto_id) || ' se ha agotado.',
            'critico',
            NEW.veterinario_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar el stock después de insertar un movimiento
CREATE TRIGGER tr_actualizar_stock_despues_movimiento
AFTER INSERT ON movimientos_inventario
FOR EACH ROW
EXECUTE FUNCTION actualizar_stock_producto();

-- Función para verificar vencimientos próximos
CREATE OR REPLACE FUNCTION verificar_vencimientos()
RETURNS VOID AS $$
BEGIN
    -- Insertar alertas para lotes que vencerán en los próximos 30 días
    INSERT INTO alertas_inventario (
        producto_id,
        tipo_alerta,
        mensaje,
        nivel_gravedad,
        fecha_alerta,
        veterinario_id
    )
    SELECT 
        p.id,
        'vencimiento_proximo',
        'El lote ' || l.numero_lote || ' del producto ' || p.nombre || ' vence el ' || 
        TO_CHAR(l.fecha_vencimiento, 'DD/MM/YYYY') || '. Cantidad: ' || l.cantidad_actual,
        CASE 
            WHEN l.fecha_vencimiento - CURRENT_DATE <= 7 THEN 'critico'
            WHEN l.fecha_vencimiento - CURRENT_DATE <= 15 THEN 'alto'
            ELSE 'medio'
        END,
        CURRENT_TIMESTAMP,
        p.veterinario_id
    FROM 
        lotes l
        JOIN productos p ON l.producto_id = p.id
    WHERE 
        l.fecha_vencimiento BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
        AND l.cantidad_actual > 0
        AND NOT EXISTS (
            SELECT 1 
            FROM alertas_inventario 
            WHERE 
                producto_id = p.id 
                AND tipo_alerta = 'vencimiento_proximo' 
                AND (resuelta = false OR fecha_alerta > CURRENT_DATE - INTERVAL '7 days')
        );
END;
$$ LANGUAGE plpgsql;

-- Función para verificar productos sin movimiento
CREATE OR REPLACE FUNCTION verificar_sin_movimiento()
RETURNS VOID AS $$
BEGIN
    -- Insertar alertas para productos sin movimiento en los últimos 90 días
    INSERT INTO alertas_inventario (
        producto_id,
        tipo_alerta,
        mensaje,
        nivel_gravedad,
        fecha_alerta,
        veterinario_id
    )
    SELECT 
        p.id,
        'sin_movimiento',
        'El producto ' || p.nombre || ' no ha tenido movimientos en los últimos 90 días. Stock actual: ' || p.stock_actual,
        'bajo',
        CURRENT_TIMESTAMP,
        p.veterinario_id
    FROM 
        productos p
    WHERE 
        p.activo = true
        AND p.stock_actual > 0
        AND NOT EXISTS (
            SELECT 1 
            FROM movimientos_inventario mi 
            WHERE 
                mi.producto_id = p.id 
                AND mi.created_at > CURRENT_DATE - INTERVAL '90 days'
        )
        AND NOT EXISTS (
            SELECT 1 
            FROM alertas_inventario 
            WHERE 
                producto_id = p.id 
                AND tipo_alerta = 'sin_movimiento' 
                AND (resuelta = false OR fecha_alerta > CURRENT_DATE - INTERVAL '30 days')
        );
END;
$$ LANGUAGE plpgsql;

-- Programar tareas para verificar vencimientos y productos sin movimiento
-- Esta tarea se debe programar para ejecutarse diariamente
-- SELECT cron.schedule('0 1 * * *', 'SELECT verificar_vencimientos()');
-- SELECT cron.schedule('0 2 * * 0', 'SELECT verificar_sin_movimiento()');

-- Comentarios para documentación
COMMENT ON TABLE categorias_inventario IS 'Categorías para organizar los productos del inventario';
COMMENT ON TABLE proveedores IS 'Proveedores de productos para el inventario';
COMMENT ON TABLE productos IS 'Productos del inventario con información de stock y precios';
COMMENT ON TABLE lotes IS 'Lotes de productos con fechas de vencimiento';
COMMENT ON TABLE movimientos_inventario IS 'Registro de todos los movimientos de inventario';
COMMENT ON TABLE compras IS 'Registro de compras a proveedores';
COMMENT ON TABLE compra_detalles IS 'Detalle de productos en cada compra';
COMMENT ON TABLE ajustes_inventario IS 'Ajustes de inventario (conteos físicos, correcciones)';
COMMENT ON TABLE ajuste_detalles IS 'Detalle de productos en cada ajuste de inventario';
COMMENT ON TABLE alertas_inventario IS 'Alertas generadas por el sistema de inventario';
COMMENT ON TABLE conteos_fisicos IS 'Registro de conteos físicos de inventario';
COMMENT ON TABLE conteo_fisico_detalles IS 'Detalle de productos en cada conteo físico';

-- Permisos para el usuario de la aplicación
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
