const { Pool } = require('pg');
const pool = require('../database-postgres');

// Configuración de paginación por defecto
const DEFAULT_LIMIT = 10;
const DEFAULT_OFFSET = 0;

// Obtener todos los productos con paginación y filtros
const obtenerProductos = async (req, res) => {
    try {
        const { 
            pagina = 1, 
            por_pagina = DEFAULT_LIMIT, 
            categoria_id, 
            proveedor_id, 
            tipo_producto, 
            buscar,
            ordenar_por = 'nombre',
            orden = 'ASC',
            con_stock_bajo = false
        } = req.query;

        const offset = (pagina - 1) * por_pagina;
        
        // Construir la consulta SQL con filtros opcionales
        let query = `
            SELECT p.*, c.nombre as categoria_nombre, pr.nombre as proveedor_nombre,
                   (p.stock_actual <= p.stock_minimo) as bajo_stock
            FROM productos p
            LEFT JOIN categorias_inventario c ON p.categoria_id = c.id
            LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
            WHERE p.activo = true
        `;
        
        const queryParams = [];
        let paramIndex = 1;
        
        // Aplicar filtros
        if (categoria_id) {
            query += ` AND p.categoria_id = $${paramIndex++}`;
            queryParams.push(categoria_id);
        }
        
        if (proveedor_id) {
            query += ` AND p.proveedor_id = $${paramIndex++}`;
            queryParams.push(proveedor_id);
        }
        
        if (tipo_producto) {
            query += ` AND p.tipo_producto = $${paramIndex++}`;
            queryParams.push(tipo_producto);
        }
        
        if (buscar) {
            query += ` AND (p.nombre ILIKE $${paramIndex} OR p.descripcion ILIKE $${paramIndex} OR p.codigo_barras = $${paramIndex + 1})`;
            queryParams.push(`%${buscar}%`, buscar);
            paramIndex += 2;
        }
        
        if (con_stock_bajo === 'true') {
            query += ` AND p.stock_actual <= p.stock_minimo`;
        }
        
        // Ordenar resultados
        const ordenValido = ['nombre', 'stock_actual', 'precio_venta', 'precio_compra'].includes(ordenar_por.toLowerCase());
        const direccionOrden = orden.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        
        query += ` ORDER BY ${ordenValido ? ordenar_por : 'nombre'} ${direccionOrden}`;
        
        // Aplicar paginación
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        queryParams.push(parseInt(por_pagina), parseInt(offset));
        
        // Obtener el total de registros para la paginación
        const countQuery = `
            SELECT COUNT(*) 
            FROM productos p
            WHERE p.activo = true
            ${categoria_id ? 'AND p.categoria_id = $1' : ''}
            ${proveedor_id ? `AND p.proveedor_id = $${categoria_id ? '2' : '1'}` : ''}
            ${tipo_producto ? `AND p.tipo_producto = $${categoria_id || proveedor_id ? '3' : '1'}` : ''}
            ${buscar ? `AND (p.nombre ILIKE $1 OR p.descripcion ILIKE $1 OR p.codigo_barras = $2)` : ''}
            ${con_stock_bajo === 'true' ? 'AND p.stock_actual <= p.stock_minimo' : ''}
        `;
        
        const countParams = [];
        if (categoria_id) countParams.push(categoria_id);
        if (proveedor_id) countParams.push(proveedor_id);
        if (tipo_producto) countParams.push(tipo_producto);
        if (buscar) {
            countParams.push(`%${buscar}%`, buscar);
        }
        
        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);
        
        // Ejecutar consulta principal
        const result = await pool.query(query, queryParams);
        
        // Calcular metadatos de paginación
        const paginas_totales = Math.ceil(total / por_pagina);
        
        res.json({
            success: true,
            data: result.rows,
            paginacion: {
                pagina_actual: parseInt(pagina),
                por_pagina: parseInt(por_pagina),
                total_registros: total,
                paginas_totales,
                tiene_siguiente: pagina < paginas_totales,
                tiene_anterior: pagina > 1
            }
        });
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener los productos',
            error: error.message 
        });
    }
};

// Obtener un producto por ID
const obtenerProductoPorId = async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT p.*, c.nombre as categoria_nombre, pr.nombre as proveedor_nombre
            FROM productos p
            LEFT JOIN categorias_inventario c ON p.categoria_id = c.id
            LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
            WHERE p.id = $1 AND p.activo = true
        `;
        
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Producto no encontrado' 
            });
        }
        
        // Obtener lotes del producto si aplica
        if (result.rows[0].lote_control) {
            const lotesQuery = `
                SELECT * FROM lotes 
                WHERE producto_id = $1 AND activo = true
                ORDER BY fecha_vencimiento ASC
            `;
            
            const lotesResult = await pool.query(lotesQuery, [id]);
            result.rows[0].lotes = lotesResult.rows;
        }
        
        res.json({ 
            success: true, 
            data: result.rows[0] 
        });
    } catch (error) {
        console.error('Error al obtener el producto:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener el producto',
            error: error.message 
        });
    }
};

// Crear un nuevo producto
const crearProducto = async (req, res) => {
    const client = await pool.connect();
    
    try {
        const {
            codigo_barras,
            codigo_interno,
            nombre,
            descripcion,
            categoria_id,
            proveedor_id,
            tipo_producto,
            precio_compra,
            precio_venta,
            iva_porcentaje,
            stock_actual = 0,
            stock_minimo,
            stock_maximo,
            unidad_medida,
            requiere_receta = false,
            controlado = false,
            lote_control = false,
            fecha_vencimiento_control = false,
            imagen_url
        } = req.body;
        
        // Validaciones básicas
        if (!nombre) {
            return res.status(400).json({ 
                success: false, 
                message: 'El nombre del producto es obligatorio' 
            });
        }
        
        if (isNaN(parseFloat(precio_compra)) || parseFloat(precio_compra) < 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'El precio de compra debe ser un número positivo' 
            });
        }
        
        if (isNaN(parseFloat(precio_venta)) || parseFloat(precio_venta) < 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'El precio de venta debe ser un número positivo' 
            });
        }
        
        // Iniciar transacción
        await client.query('BEGIN');
        
        // Insertar el producto
        const insertQuery = `
            INSERT INTO productos (
                codigo_barras, codigo_interno, nombre, descripcion, categoria_id, 
                proveedor_id, tipo_producto, precio_compra, precio_venta, iva_porcentaje,
                stock_actual, stock_minimo, stock_maximo, unidad_medida, requiere_receta,
                controlado, lote_control, fecha_vencimiento_control, imagen_url, veterinario_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING *
        `;
        
        const insertParams = [
            codigo_barras || null,
            codigo_interno || null,
            nombre,
            descripcion || null,
            categoria_id || null,
            proveedor_id || null,
            tipo_producto || 'insumo',
            parseFloat(precio_compra),
            parseFloat(precio_venta),
            iva_porcentaje ? parseFloat(iva_porcentaje) : 10, // 10% por defecto
            parseFloat(stock_actual),
            stock_minimo ? parseFloat(stock_minimo) : null,
            stock_maximo ? parseFloat(stock_maximo) : null,
            unidad_medida || 'unidad',
            Boolean(requiere_receta),
            Boolean(controlado),
            Boolean(lote_control),
            Boolean(fecha_vencimiento_control),
            imagen_url || null,
            req.veterinarioId // Asignar al veterinario que crea el producto
        ];
        
        const result = await client.query(insertQuery, insertParams);
        const producto = result.rows[0];
        
        // Si hay stock inicial, crear un movimiento de entrada
        if (parseFloat(stock_actual) > 0) {
            const movimientoQuery = `
                INSERT INTO movimientos_inventario (
                    tipo_movimiento, producto_id, cantidad, cantidad_anterior,
                    cantidad_nueva, costo_unitario, motivo, veterinario_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `;
            
            await client.query(movimientoQuery, [
                'entrada',
                producto.id,
                parseFloat(stock_actual),
                0,
                parseFloat(stock_actual),
                parseFloat(precio_compra),
                'Stock inicial',
                req.veterinarioId
            ]);
        }
        
        // Confirmar transacción
        await client.query('COMMIT');
        
        res.status(201).json({ 
            success: true, 
            message: 'Producto creado exitosamente',
            data: producto
        });
    } catch (error) {
        // Revertir transacción en caso de error
        await client.query('ROLLBACK');
        
        console.error('Error al crear el producto:', error);
        
        // Manejar error de clave duplicada
        if (error.code === '23505') {
            const detail = error.detail || '';
            let field = 'código de barras';
            
            if (detail.includes('codigo_interno')) {
                field = 'código interno';
            }
            
            return res.status(400).json({ 
                success: false, 
                message: `Ya existe un producto con el mismo ${field}`
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Error al crear el producto',
            error: error.message 
        });
    } finally {
        // Liberar el cliente de la conexión
        client.release();
    }
};

// Actualizar un producto existente
const actualizarProducto = async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { id } = req.params;
        const {
            codigo_barras,
            codigo_interno,
            nombre,
            descripcion,
            categoria_id,
            proveedor_id,
            tipo_producto,
            precio_compra,
            precio_venta,
            iva_porcentaje,
            stock_minimo,
            stock_maximo,
            unidad_medida,
            requiere_receta,
            controlado,
            lote_control,
            fecha_vencimiento_control,
            imagen_url,
            activo
        } = req.body;
        
        // Verificar si el producto existe
        const checkQuery = 'SELECT * FROM productos WHERE id = $1';
        const checkResult = await client.query(checkQuery, [id]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Producto no encontrado' 
            });
        }
        
        const productoActual = checkResult.rows[0];
        
        // Iniciar transacción
        await client.query('BEGIN');
        
        // Actualizar el producto
        const updateQuery = `
            UPDATE productos SET
                codigo_barras = COALESCE($1, codigo_barras),
                codigo_interno = COALESCE($2, codigo_interno),
                nombre = COALESCE($3, nombre),
                descripcion = COALESCE($4, descripcion),
                categoria_id = COALESCE($5, categoria_id),
                proveedor_id = COALESCE($6, proveedor_id),
                tipo_producto = COALESCE($7, tipo_producto),
                precio_compra = COALESCE($8, precio_compra),
                precio_venta = COALESCE($9, precio_venta),
                iva_porcentaje = COALESCE($10, iva_porcentaje),
                stock_minimo = COALESCE($11, stock_minimo),
                stock_maximo = COALESCE($12, stock_maximo),
                unidad_medida = COALESCE($13, unidad_medida),
                requiere_receta = COALESCE($14, requiere_receta),
                controlado = COALESCE($15, controlado),
                lote_control = COALESCE($16, lote_control),
                fecha_vencimiento_control = COALESCE($17, fecha_vencimiento_control),
                imagen_url = COALESCE($18, imagen_url),
                activo = COALESCE($19, activo),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $20
            RETURNING *
        `;
        
        const updateParams = [
            codigo_barras !== undefined ? codigo_barras : null,
            codigo_interno !== undefined ? codigo_interno : null,
            nombre || productoActual.nombre,
            descripcion !== undefined ? descripcion : productoActual.descripcion,
            categoria_id !== undefined ? categoria_id : productoActual.categoria_id,
            proveedor_id !== undefined ? proveedor_id : productoActual.proveedor_id,
            tipo_producto || productoActual.tipo_producto,
            precio_compra !== undefined ? parseFloat(precio_compra) : productoActual.precio_compra,
            precio_venta !== undefined ? parseFloat(precio_venta) : productoActual.precio_venta,
            iva_porcentaje !== undefined ? parseFloat(iva_porcentaje) : productoActual.iva_porcentaje,
            stock_minimo !== undefined ? parseFloat(stock_minimo) : productoActual.stock_minimo,
            stock_maximo !== undefined ? parseFloat(stock_maximo) : productoActual.stock_maximo,
            unidad_medida || productoActual.unidad_medida,
            requiere_receta !== undefined ? Boolean(requiere_receta) : productoActual.requiere_receta,
            controlado !== undefined ? Boolean(controlado) : productoActual.controlado,
            lote_control !== undefined ? Boolean(lote_control) : productoActual.lote_control,
            fecha_vencimiento_control !== undefined ? Boolean(fecha_vencimiento_control) : productoActual.fecha_vencimiento_control,
            imagen_url !== undefined ? imagen_url : productoActual.imagen_url,
            activo !== undefined ? Boolean(activo) : productoActual.activo,
            id
        ];
        
        const result = await client.query(updateQuery, updateParams);
        
        // Verificar si se actualizó correctamente
        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                success: false, 
                message: 'No se pudo actualizar el producto' 
            });
        }
        
        // Confirmar transacción
        await client.query('COMMIT');
        
        res.json({ 
            success: true, 
            message: 'Producto actualizado exitosamente',
            data: result.rows[0]
        });
    } catch (error) {
        // Revertir transacción en caso de error
        await client.query('ROLLBACK');
        
        console.error('Error al actualizar el producto:', error);
        
        // Manejar error de clave duplicada
        if (error.code === '23505') {
            const detail = error.detail || '';
            let field = 'código de barras';
            
            if (detail.includes('codigo_interno')) {
                field = 'código interno';
            }
            
            return res.status(400).json({ 
                success: false, 
                message: `Ya existe un producto con el mismo ${field}`
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Error al actualizar el producto',
            error: error.message 
        });
    } finally {
        // Liberar el cliente de la conexión
        client.release();
    }
};

// Eliminar un producto (borrado lógico)
const eliminarProducto = async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { id } = req.params;
        
        // Verificar si el producto existe
        const checkQuery = 'SELECT * FROM productos WHERE id = $1';
        const checkResult = await client.query(checkQuery, [id]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Producto no encontrado' 
            });
        }
        
        // Verificar si el producto tiene stock
        if (checkResult.rows[0].stock_actual > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'No se puede eliminar un producto con stock disponible' 
            });
        }
        
        // Iniciar transacción
        await client.query('BEGIN');
        
        // Actualizar el estado a inactivo (borrado lógico)
        const updateQuery = `
            UPDATE productos 
            SET activo = false, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $1 
            RETURNING *
        `;
        
        const result = await client.query(updateQuery, [id]);
        
        // Verificar si se actualizó correctamente
        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                success: false, 
                message: 'No se pudo eliminar el producto' 
            });
        }
        
        // Confirmar transacción
        await client.query('COMMIT');
        
        res.json({ 
            success: true, 
            message: 'Producto eliminado exitosamente',
            data: result.rows[0]
        });
    } catch (error) {
        // Revertir transacción en caso de error
        await client.query('ROLLBACK');
        
        console.error('Error al eliminar el producto:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al eliminar el producto',
            error: error.message 
        });
    } finally {
        // Liberar el cliente de la conexión
        client.release();
    }
};

// Obtener categorías de inventario
const obtenerCategorias = async (req, res) => {
    try {
        const { veterinario_id } = req.query;
        
        let query = 'SELECT * FROM categorias_inventario WHERE activa = true';
        const queryParams = [];
        
        if (veterinario_id) {
            query += ' AND (veterinario_id = $1 OR veterinario_id IS NULL)';
            queryParams.push(veterinario_id);
        } else {
            query += ' AND veterinario_id IS NULL';
        }
        
        query += ' ORDER BY nombre';
        
        const result = await pool.query(query, queryParams);
        
        res.json({ 
            success: true, 
            data: result.rows 
        });
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener las categorías',
            error: error.message 
        });
    }
};

// Crear una nueva categoría
const crearCategoria = async (req, res) => {
    try {
        const { nombre, descripcion, color } = req.body;
        
        // Validaciones
        if (!nombre) {
            return res.status(400).json({ 
                success: false, 
                message: 'El nombre de la categoría es obligatorio' 
            });
        }
        
        const query = `
            INSERT INTO categorias_inventario 
                (nombre, descripcion, color, veterinario_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            nombre,
            descripcion || null,
            color || '#95a5a6',
            req.veterinarioId
        ]);
        
        res.status(201).json({ 
            success: true, 
            message: 'Categoría creada exitosamente',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error al crear la categoría:', error);
        
        // Manejar error de categoría duplicada
        if (error.code === '23505') {
            return res.status(400).json({ 
                success: false, 
                message: 'Ya existe una categoría con el mismo nombre para este veterinario'
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Error al crear la categoría',
            error: error.message 
        });
    }
};

// Actualizar una categoría existente
const actualizarCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, color, activa } = req.body;
        
        // Verificar si la categoría existe y pertenece al veterinario
        const checkQuery = `
            SELECT * FROM categorias_inventario 
            WHERE id = $1 AND (veterinario_id = $2 OR veterinario_id IS NULL)
        `;
        
        const checkResult = await pool.query(checkQuery, [id, req.veterinarioId]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Categoría no encontrada o no tienes permiso para modificarla' 
            });
        }
        
        // No permitir modificar categorías del sistema (sin veterinario_id)
        if (!checkResult.rows[0].veterinario_id && req.veterinarioId) {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes permiso para modificar categorías del sistema' 
            });
        }
        
        // Actualizar la categoría
        const updateQuery = `
            UPDATE categorias_inventario SET
                nombre = COALESCE($1, nombre),
                descripcion = COALESCE($2, descripcion),
                color = COALESCE($3, color),
                activa = COALESCE($4, activa),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING *
        `;
        
        const result = await pool.query(updateQuery, [
            nombre || undefined,
            descripcion !== undefined ? descripcion : undefined,
            color || undefined,
            activa !== undefined ? activa : undefined,
            id
        ]);
        
        res.json({ 
            success: true, 
            message: 'Categoría actualizada exitosamente',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error al actualizar la categoría:', error);
        
        // Manejar error de categoría duplicada
        if (error.code === '23505') {
            return res.status(400).json({ 
                success: false, 
                message: 'Ya existe una categoría con el mismo nombre para este veterinario'
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Error al actualizar la categoría',
            error: error.message 
        });
    }
};

// Eliminar una categoría (borrado lógico)
const eliminarCategoria = async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { id } = req.params;
        
        // Iniciar transacción
        await client.query('BEGIN');
        
        // Verificar si la categoría existe y pertenece al veterinario
        const checkQuery = `
            SELECT * FROM categorias_inventario 
            WHERE id = $1 AND (veterinario_id = $2 OR veterinario_id IS NULL)
        `;
        
        const checkResult = await client.query(checkQuery, [id, req.veterinarioId]);
        
        if (checkResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                success: false, 
                message: 'Categoría no encontrada o no tienes permiso para eliminarla' 
            });
        }
        
        // No permitir eliminar categorías del sistema (sin veterinario_id)
        if (!checkResult.rows[0].veterinario_id) {
            await client.query('ROLLBACK');
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes permiso para eliminar categorías del sistema' 
            });
        }
        
        // Verificar si hay productos asociados a esta categoría
        const productosQuery = 'SELECT COUNT(*) FROM productos WHERE categoria_id = $1 AND activo = true';
        const productosResult = await client.query(productosQuery, [id]);
        const productosCount = parseInt(productosResult.rows[0].count);
        
        if (productosCount > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                success: false, 
                message: `No se puede eliminar la categoría porque tiene ${productosCount} productos asociados`
            });
        }
        
        // Eliminar la categoría (borrado lógico)
        const deleteQuery = `
            UPDATE categorias_inventario 
            SET activa = false, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $1 
            RETURNING *
        `;
        
        const result = await client.query(deleteQuery, [id]);
        
        // Confirmar transacción
        await client.query('COMMIT');
        
        res.json({ 
            success: true, 
            message: 'Categoría eliminada exitosamente',
            data: result.rows[0]
        });
    } catch (error) {
        // Revertir transacción en caso de error
        await client.query('ROLLBACK');
        
        console.error('Error al eliminar la categoría:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al eliminar la categoría',
            error: error.message 
        });
    } finally {
        // Liberar el cliente de la conexión
        client.release();
    }
};

// Obtener proveedores
const obtenerProveedores = async (req, res) => {
    try {
        const { buscar, activo = 'true' } = req.query;
        
        let query = 'SELECT * FROM proveedores WHERE 1=1';
        const queryParams = [];
        
        // Filtrar por veterinario (solo los del veterinario o los globales)
        query += ' AND (veterinario_id = $1 OR veterinario_id IS NULL)';
        queryParams.push(req.veterinarioId);
        
        // Filtrar por estado activo/inactivo
        if (activo === 'true') {
            query += ' AND activo = true';
        } else if (activo === 'false') {
            query += ' AND activo = false';
        }
        
        // Búsqueda por nombre o RUC
        if (buscar) {
            query += ' AND (nombre ILIKE $2 OR ruc = $3)';
            queryParams.push(`%${buscar}%`, buscar);
        }
        
        query += ' ORDER BY nombre';
        
        const result = await pool.query(query, queryParams);
        
        res.json({ 
            success: true, 
            data: result.rows 
        });
    } catch (error) {
        console.error('Error al obtener proveedores:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener los proveedores',
            error: error.message 
        });
    }
};

// Crear un nuevo proveedor
const crearProveedor = async (req, res) => {
    try {
        const {
            nombre,
            ruc,
            telefono,
            email,
            direccion,
            contacto_nombre,
            contacto_telefono,
            notas
        } = req.body;
        
        // Validaciones
        if (!nombre) {
            return res.status(400).json({ 
                success: false, 
                message: 'El nombre del proveedor es obligatorio' 
            });
        }
        
        const query = `
            INSERT INTO proveedores 
                (nombre, ruc, telefono, email, direccion, contacto_nombre, 
                 contacto_telefono, notas, veterinario_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            nombre,
            ruc || null,
            telefono || null,
            email || null,
            direccion || null,
            contacto_nombre || null,
            contacto_telefono || null,
            notas || null,
            req.veterinarioId
        ]);
        
        res.status(201).json({ 
            success: true, 
            message: 'Proveedor creado exitosamente',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error al crear el proveedor:', error);
        
        // Manejar error de RUC duplicado
        if (error.code === '23505' && error.detail && error.detail.includes('ruc')) {
            return res.status(400).json({ 
                success: false, 
                message: 'Ya existe un proveedor con el mismo RUC'
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Error al crear el proveedor',
            error: error.message 
        });
    }
};

// Actualizar un proveedor existente
const actualizarProveedor = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nombre,
            ruc,
            telefono,
            email,
            direccion,
            contacto_nombre,
            contacto_telefono,
            notas,
            activo
        } = req.body;
        
        // Verificar si el proveedor existe y pertenece al veterinario
        const checkQuery = `
            SELECT * FROM proveedores 
            WHERE id = $1 AND (veterinario_id = $2 OR veterinario_id IS NULL)
        `;
        
        const checkResult = await pool.query(checkQuery, [id, req.veterinarioId]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Proveedor no encontrado o no tienes permiso para modificarlo' 
            });
        }
        
        // No permitir modificar proveedores globales (sin veterinario_id)
        if (!checkResult.rows[0].veterinario_id && req.veterinarioId) {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes permiso para modificar proveedores del sistema' 
            });
        }
        
        // Actualizar el proveedor
        const updateQuery = `
            UPDATE proveedores SET
                nombre = COALESCE($1, nombre),
                ruc = COALESCE($2, ruc),
                telefono = COALESCE($3, telefono),
                email = COALESCE($4, email),
                direccion = COALESCE($5, direccion),
                contacto_nombre = COALESCE($6, contacto_nombre),
                contacto_telefono = COALESCE($7, contacto_telefono),
                notas = COALESCE($8, notas),
                activo = COALESCE($9, activo, activo),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
            RETURNING *
        `;
        
        const result = await pool.query(updateQuery, [
            nombre || undefined,
            ruc !== undefined ? ruc : undefined,
            telefono || undefined,
            email || undefined,
            direccion || undefined,
            contacto_nombre || undefined,
            contacto_telefono || undefined,
            notas || undefined,
            activo !== undefined ? activo : undefined,
            id
        ]);
        
        res.json({ 
            success: true, 
            message: 'Proveedor actualizado exitosamente',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error al actualizar el proveedor:', error);
        
        // Manejar error de RUC duplicado
        if (error.code === '23505' && error.detail && error.detail.includes('ruc')) {
            return res.status(400).json({ 
                success: false, 
                message: 'Ya existe un proveedor con el mismo RUC'
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Error al actualizar el proveedor',
            error: error.message 
        });
    }
};

// Eliminar un proveedor (borrado lógico)
const eliminarProveedor = async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { id } = req.params;
        
        // Iniciar transacción
        await client.query('BEGIN');
        
        // Verificar si el proveedor existe y pertenece al veterinario
        const checkQuery = `
            SELECT * FROM proveedores 
            WHERE id = $1 AND (veterinario_id = $2 OR veterinario_id IS NULL)
        `;
        
        const checkResult = await client.query(checkQuery, [id, req.veterinarioId]);
        
        if (checkResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                success: false, 
                message: 'Proveedor no encontrado o no tienes permiso para eliminarlo' 
            });
        }
        
        // No permitir eliminar proveedores globales (sin veterinario_id)
        if (!checkResult.rows[0].veterinario_id) {
            await client.query('ROLLBACK');
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes permiso para eliminar proveedores del sistema' 
            });
        }
        
        // Verificar si hay productos asociados a este proveedor
        const productosQuery = 'SELECT COUNT(*) FROM productos WHERE proveedor_id = $1 AND activo = true';
        const productosResult = await client.query(productosQuery, [id]);
        const productosCount = parseInt(productosResult.rows[0].count);
        
        if (productosCount > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                success: false, 
                message: `No se puede eliminar el proveedor porque tiene ${productosCount} productos asociados`
            });
        }
        
        // Verificar si hay compras asociadas a este proveedor
        const comprasQuery = 'SELECT COUNT(*) FROM compras WHERE proveedor_id = $1';
        const comprasResult = await client.query(comprasQuery, [id]);
        const comprasCount = parseInt(comprasResult.rows[0].count);
        
        if (comprasCount > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                success: false, 
                message: `No se puede eliminar el proveedor porque tiene ${comprasCount} compras asociadas`
            });
        }
        
        // Eliminar el proveedor (borrado lógico)
        const deleteQuery = `
            UPDATE proveedores 
            SET activo = false, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $1 
            RETURNING *
        `;
        
        const result = await client.query(deleteQuery, [id]);
        
        // Confirmar transacción
        await client.query('COMMIT');
        
        res.json({ 
            success: true, 
            message: 'Proveedor eliminado exitosamente',
            data: result.rows[0]
        });
    } catch (error) {
        // Revertir transacción en caso de error
        await client.query('ROLLBACK');
        
        console.error('Error al eliminar el proveedor:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al eliminar el proveedor',
            error: error.message 
        });
    } finally {
        // Liberar el cliente de la conexión
        client.release();
    }
};

// Obtener movimientos de inventario
const obtenerMovimientosInventario = async (req, res) => {
    try {
        const { 
            producto_id, 
            tipo_movimiento, 
            fecha_desde, 
            fecha_hasta,
            pagina = 1, 
            por_pagina = DEFAULT_LIMIT 
        } = req.query;
        
        const offset = (pagina - 1) * por_pagina;
        
        // Construir la consulta SQL con filtros opcionales
        let query = `
            SELECT mi.*, p.nombre as producto_nombre, 
                   p.codigo_barras, p.codigo_interno,
                   v.nombre as veterinario_nombre, v.apellido as veterinario_apellido,
                   l.numero_lote, l.fecha_vencimiento
            FROM movimientos_inventario mi
            JOIN productos p ON mi.producto_id = p.id
            LEFT JOIN veterinarios v ON mi.veterinario_id = v.id
            LEFT JOIN lotes l ON mi.lote_id = l.id
            WHERE 1=1
        `;
        
        const queryParams = [];
        let paramIndex = 1;
        
        // Filtrar por veterinario (solo los movimientos de sus productos)
        query += ` AND p.veterinario_id = $${paramIndex++}`;
        queryParams.push(req.veterinarioId);
        
        // Aplicar filtros
        if (producto_id) {
            query += ` AND mi.producto_id = $${paramIndex++}`;
            queryParams.push(producto_id);
        }
        
        if (tipo_movimiento) {
            query += ` AND mi.tipo_movimiento = $${paramIndex++}`;
            queryParams.push(tipo_movimiento);
        }
        
        if (fecha_desde) {
            query += ` AND mi.created_at >= $${paramIndex++}`;
            queryParams.push(fecha_desde);
        }
        
        if (fecha_hasta) {
            // Ajustar la fecha hasta para incluir todo el día
            const fechaHastaAjustada = new Date(fecha_hasta);
            fechaHastaAjustada.setDate(fechaHastaAjustada.getDate() + 1);
            
            query += ` AND mi.created_at < $${paramIndex++}`;
            queryParams.push(fechaHastaAjustada.toISOString().split('T')[0]);
        }
        
        // Ordenar por fecha descendente por defecto
        query += ' ORDER BY mi.created_at DESC';
        
        // Obtener el total de registros para la paginación
        const countQuery = `
            SELECT COUNT(*) 
            FROM movimientos_inventario mi
            JOIN productos p ON mi.producto_id = p.id
            WHERE p.veterinario_id = $1
            ${producto_id ? 'AND mi.producto_id = $2' : ''}
            ${tipo_movimiento ? `AND mi.tipo_movimiento = $${producto_id ? '3' : '2'}` : ''}
            ${fecha_desde ? `AND mi.created_at >= $${producto_id && tipo_movimiento ? '4' : producto_id || tipo_movimiento ? '3' : '2'}` : ''}
            ${fecha_hasta ? `AND mi.created_at < $${[producto_id, tipo_movimiento, fecha_desde].filter(Boolean).length + 1}` : ''}
        `;
        
        const countParams = [req.veterinarioId];
        if (producto_id) countParams.push(producto_id);
        if (tipo_movimiento) countParams.push(tipo_movimiento);
        if (fecha_desde) countParams.push(fecha_desde);
        if (fecha_hasta) {
            const fechaHastaAjustada = new Date(fecha_hasta);
            fechaHastaAjustada.setDate(fechaHastaAjustada.getDate() + 1);
            countParams.push(fechaHastaAjustada.toISOString().split('T')[0]);
        }
        
        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);
        
        // Aplicar paginación a la consulta principal
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        queryParams.push(parseInt(por_pagina), parseInt(offset));
        
        // Ejecutar consulta principal
        const result = await pool.query(query, queryParams);
        
        // Calcular metadatos de paginación
        const paginas_totales = Math.ceil(total / por_pagina);
        
        res.json({
            success: true,
            data: result.rows,
            paginacion: {
                pagina_actual: parseInt(pagina),
                por_pagina: parseInt(por_pagina),
                total_registros: total,
                paginas_totales,
                tiene_siguiente: pagina < paginas_totales,
                tiene_anterior: pagina > 1
            }
        });
    } catch (error) {
        console.error('Error al obtener los movimientos de inventario:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener los movimientos de inventario',
            error: error.message 
        });
    }
};

// Crear un movimiento de inventario manual
const crearMovimientoInventario = async (req, res) => {
    const client = await pool.connect();
    
    try {
        const {
            tipo_movimiento,
            producto_id,
            lote_id = null,
            cantidad,
            costo_unitario,
            motivo,
            referencia_id = null,
            referencia_tipo = null
        } = req.body;
        
        // Validaciones
        if (!tipo_movimiento || !['entrada', 'salida', 'ajuste_entrada', 'ajuste_salida'].includes(tipo_movimiento)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tipo de movimiento no válido. Debe ser: entrada, salida, ajuste_entrada o ajuste_salida' 
            });
        }
        
        if (!producto_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'El ID del producto es obligatorio' 
            });
        }
        
        if (!cantidad || isNaN(parseFloat(cantidad)) || parseFloat(cantidad) <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'La cantidad debe ser un número positivo' 
            });
        }
        
        if (isNaN(parseFloat(costo_unitario)) || parseFloat(costo_unitario) < 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'El costo unitario debe ser un número positivo' 
            });
        }
        
        if (!motivo) {
            return res.status(400).json({ 
                success: false, 
                message: 'El motivo del movimiento es obligatorio' 
            });
        }
        
        // Verificar si el producto existe y pertenece al veterinario
        const productoQuery = 'SELECT * FROM productos WHERE id = $1 AND veterinario_id = $2';
        const productoResult = await client.query(productoQuery, [producto_id, req.veterinarioId]);
        
        if (productoResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Producto no encontrado o no tienes permiso para modificarlo' 
            });
        }
        
        const producto = productoResult.rows[0];
        
        // Si se especificó un lote, verificar que exista y pertenezca al producto
        if (lote_id) {
            const loteQuery = 'SELECT * FROM lotes WHERE id = $1 AND producto_id = $2';
            const loteResult = await client.query(loteQuery, [lote_id, producto_id]);
            
            if (loteResult.rows.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Lote no encontrado o no pertenece al producto especificado' 
                });
            }
            
            // Verificar que no se pueda sacar más stock del disponible en el lote
            if (['salida', 'ajuste_salida'].includes(tipo_movimiento)) {
                const lote = loteResult.rows[0];
                
                if (parseFloat(cantidad) > lote.cantidad_actual) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `No hay suficiente stock en el lote. Disponible: ${lote.cantidad_actual}` 
                    });
                }
            }
        } else if (producto.lote_control) {
            return res.status(400).json({ 
                success: false, 
                message: 'Este producto requiere especificar un lote' 
            });
        }
        
        // Verificar que no se pueda sacar más stock del disponible
        if (['salida', 'ajuste_salida'].includes(tipo_movimiento)) {
            if (parseFloat(cantidad) > producto.stock_actual) {
                return res.status(400).json({ 
                    success: false, 
                    message: `No hay suficiente stock disponible. Stock actual: ${producto.stock_actual}` 
                });
            }
        }
        
        // Iniciar transacción
        await client.query('BEGIN');
        
        // Obtener el stock actual del producto
        const stockActual = parseFloat(producto.stock_actual);
        let nuevoStock = stockActual;
        
        // Calcular el nuevo stock según el tipo de movimiento
        if (tipo_movimiento === 'entrada' || tipo_movimiento === 'ajuste_entrada') {
            nuevoStock += parseFloat(cantidad);
        } else {
            nuevoStock -= parseFloat(cantidad);
        }
        
        // Insertar el movimiento de inventario
        const insertQuery = `
            INSERT INTO movimientos_inventario (
                tipo_movimiento, producto_id, lote_id, cantidad, 
                cantidad_anterior, cantidad_nueva, costo_unitario,
                motivo, referencia_id, referencia_tipo, veterinario_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;
        
        const movimientoResult = await client.query(insertQuery, [
            tipo_movimiento,
            producto_id,
            lote_id,
            parseFloat(cantidad),
            stockActual,
            nuevoStock,
            parseFloat(costo_unitario),
            motivo,
            referencia_id,
            referencia_tipo,
            req.veterinarioId
        ]);
        
        // Actualizar el stock del producto
        const updateProductoQuery = `
            UPDATE productos 
            SET stock_actual = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2
            RETURNING *
        `;
        
        await client.query(updateProductoQuery, [nuevoStock, producto_id]);
        
        // Si hay un lote asociado, actualizar su cantidad
        if (lote_id) {
            const updateLoteQuery = `
                UPDATE lotes 
                SET 
                    cantidad_actual = cantidad_actual ${tipo_movimiento === 'entrada' || tipo_movimiento === 'ajuste_entrada' ? '+' : '-'} $1,
                    updated_at = CURRENT_TIMESTAMP 
                WHERE id = $2
                RETURNING *
            `;
            
            await client.query(updateLoteQuery, [parseFloat(cantidad), lote_id]);
        }
        
        // Confirmar transacción
        await client.query('COMMIT');
        
        res.status(201).json({ 
            success: true, 
            message: 'Movimiento de inventario registrado exitosamente',
            data: movimientoResult.rows[0]
        });
    } catch (error) {
        // Revertir transacción en caso de error
        await client.query('ROLLBACK');
        
        console.error('Error al registrar el movimiento de inventario:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al registrar el movimiento de inventario',
            error: error.message 
        });
    } finally {
        // Liberar el cliente de la conexión
        client.release();
    }
};

// Obtener alertas de inventario
const obtenerAlertasInventario = async (req, res) => {
    try {
        const { 
            resuelta = 'false',
            tipo_alerta,
            nivel_gravedad,
            fecha_desde,
            fecha_hasta,
            pagina = 1, 
            por_pagina = DEFAULT_LIMIT 
        } = req.query;
        
        const offset = (pagina - 1) * por_pagina;
        
        // Construir la consulta SQL con filtros opcionales
        let query = `
            SELECT a.*, p.nombre as producto_nombre, p.codigo_barras, p.codigo_interno,
                   v.nombre as veterinario_nombre, v.apellido as veterinario_apellido
            FROM alertas_inventario a
            JOIN productos p ON a.producto_id = p.id
            LEFT JOIN veterinarios v ON a.veterinario_id = v.id
            WHERE p.veterinario_id = $1
        `;
        
        const queryParams = [req.veterinarioId];
        let paramIndex = 2;
        
        // Aplicar filtros
        if (resuelta === 'true') {
            query += ` AND a.resuelta = true`;
        } else if (resuelta === 'false') {
            query += ` AND a.resuelta = false`;
        }
        
        if (tipo_alerta) {
            query += ` AND a.tipo_alerta = $${paramIndex++}`;
            queryParams.push(tipo_alerta);
        }
        
        if (nivel_gravedad) {
            query += ` AND a.nivel_gravedad = $${paramIndex++}`;
            queryParams.push(nivel_gravedad);
        }
        
        if (fecha_desde) {
            query += ` AND a.fecha_alerta >= $${paramIndex++}`;
            queryParams.push(fecha_desde);
        }
        
        if (fecha_hasta) {
            // Ajustar la fecha hasta para incluir todo el día
            const fechaHastaAjustada = new Date(fecha_hasta);
            fechaHastaAjustada.setDate(fechaHastaAjustada.getDate() + 1);
            
            query += ` AND a.fecha_alerta < $${paramIndex++}`;
            queryParams.push(fechaHastaAjustada.toISOString().split('T')[0]);
        }
        
        // Ordenar por fecha descendente por defecto (las más recientes primero)
        query += ' ORDER BY a.fecha_alerta DESC';
        
        // Obtener el total de registros para la paginación
        const countQuery = `
            SELECT COUNT(*) 
            FROM alertas_inventario a
            JOIN productos p ON a.producto_id = p.id
            WHERE p.veterinario_id = $1
            ${resuelta === 'true' ? 'AND a.resuelta = true' : resuelta === 'false' ? 'AND a.resuelta = false' : ''}
            ${tipo_alerta ? `AND a.tipo_alerta = $2` : ''}
            ${nivel_gravedad ? `AND a.nivel_gravedad = $${tipo_alerta ? '3' : '2'}` : ''}
            ${fecha_desde ? `AND a.fecha_alerta >= $${[tipo_alerta, nivel_gravedad].filter(Boolean).length + 2}` : ''}
            ${fecha_hasta ? `AND a.fecha_alerta < $${[tipo_alerta, nivel_gravedad, fecha_desde].filter(Boolean).length + 2}` : ''}
        `;
        
        const countParams = [req.veterinarioId];
        if (tipo_alerta) countParams.push(tipo_alerta);
        if (nivel_gravedad) countParams.push(nivel_gravedad);
        if (fecha_desde) countParams.push(fecha_desde);
        if (fecha_hasta) {
            const fechaHastaAjustada = new Date(fecha_hasta);
            fechaHastaAjustada.setDate(fechaHastaAjustada.getDate() + 1);
            countParams.push(fechaHastaAjustada.toISOString().split('T')[0]);
        }
        
        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);
        
        // Aplicar paginación a la consulta principal
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        queryParams.push(parseInt(por_pagina), parseInt(offset));
        
        // Ejecutar consulta principal
        const result = await pool.query(query, queryParams);
        
        // Calcular metadatos de paginación
        const paginas_totales = Math.ceil(total / por_pagina);
        
        res.json({
            success: true,
            data: result.rows,
            paginacion: {
                pagina_actual: parseInt(pagina),
                por_pagina: parseInt(por_pagina),
                total_registros: total,
                paginas_totales,
                tiene_siguiente: pagina < paginas_totales,
                tiene_anterior: pagina > 1
            }
        });
    } catch (error) {
        console.error('Error al obtener las alertas de inventario:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener las alertas de inventario',
            error: error.message 
        });
    }
};

// Marcar alerta como resuelta
const marcarAlertaResuelta = async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { id } = req.params;
        const { notas_resolucion } = req.body;
        
        // Iniciar transacción
        await client.query('BEGIN');
        
        // Verificar si la alerta existe y pertenece a un producto del veterinario
        const checkQuery = `
            SELECT a.* 
            FROM alertas_inventario a
            JOIN productos p ON a.producto_id = p.id
            WHERE a.id = $1 AND p.veterinario_id = $2
            FOR UPDATE
        `;
        
        const checkResult = await client.query(checkQuery, [id, req.veterinarioId]);
        
        if (checkResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                success: false, 
                message: 'Alerta no encontrada o no tienes permiso para modificarla' 
            });
        }
        
        const alerta = checkResult.rows[0];
        
        // Si ya está resuelta, no hacer nada
        if (alerta.resuelta) {
            await client.query('ROLLBACK');
            return res.json({ 
                success: true, 
                message: 'La alerta ya estaba marcada como resuelta',
                data: alerta
            });
        }
        
        // Actualizar la alerta
        const updateQuery = `
            UPDATE alertas_inventario 
            SET 
                resuelta = true,
                fecha_resolucion = CURRENT_TIMESTAMP,
                notas_resolucion = COALESCE($1, notas_resolucion),
                veterinario_id = $2
            WHERE id = $3
            RETURNING *
        `;
        
        const result = await client.query(updateQuery, [notas_resolucion || null, req.veterinarioId, id]);
        
        // Confirmar transacción
        await client.query('COMMIT');
        
        res.json({ 
            success: true, 
            message: 'Alerta marcada como resuelta exitosamente',
            data: result.rows[0]
        });
    } catch (error) {
        // Revertir transacción en caso de error
        await client.query('ROLLBACK');
        
        console.error('Error al marcar la alerta como resuelta:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al marcar la alerta como resuelta',
            error: error.message 
        });
    } finally {
        // Liberar el cliente de la conexión
        client.release();
    }
};

// Obtener estadísticas de inventario
const obtenerEstadisticasInventario = async (req, res) => {
    try {
        // Obtener el total de productos
        const productosQuery = `
            SELECT 
                COUNT(*) as total_productos,
                COALESCE(SUM(CASE WHEN stock_actual <= stock_minimo AND stock_minimo > 0 THEN 1 ELSE 0 END), 0) as productos_stock_bajo,
                COALESCE(SUM(CASE WHEN stock_actual = 0 THEN 1 ELSE 0 END), 0) as productos_sin_stock,
                COALESCE(SUM(stock_actual * precio_compra), 0) as valor_total_inventario
            FROM productos 
            WHERE veterinario_id = $1 AND activo = true
        `;
        
        const productosResult = await pool.query(productosQuery, [req.veterinarioId]);
        
        // Obtener productos con stock bajo (solo los primeros 5)
        const stockBajoQuery = `
            SELECT id, nombre, stock_actual, stock_minimo, unidad_medida
            FROM productos 
            WHERE veterinario_id = $1 
              AND activo = true 
              AND stock_actual <= stock_minimo 
              AND stock_minimo > 0
            ORDER BY (stock_actual / NULLIF(stock_minimo, 0)) ASC
            LIMIT 5
        `;
        
        const stockBajoResult = await pool.query(stockBajoQuery, [req.veterinarioId]);
        
        // Obtener productos próximos a vencer (solo los primeros 5)
        const proximosVencerQuery = `
            SELECT p.id, p.nombre, l.numero_lote, l.fecha_vencimiento, 
                   l.cantidad_actual, p.unidad_medida,
                   (l.fecha_vencimiento - CURRENT_DATE) as dias_restantes
            FROM lotes l
            JOIN productos p ON l.producto_id = p.id
            WHERE p.veterinario_id = $1 
              AND l.activo = true
              AND l.fecha_vencimiento BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
            ORDER BY l.fecha_vencimiento ASC
            LIMIT 5
        `;
        
        const proximosVencerResult = await pool.query(proximosVencerQuery, [req.veterinarioId]);
        
        // Obtener movimientos recientes (últimos 5)
        const movimientosRecientesQuery = `
            SELECT mi.id, mi.tipo_movimiento, mi.cantidad, mi.created_at,
                   p.nombre as producto_nombre, p.unidad_medida,
                   v.nombre as veterinario_nombre, v.apellido as veterinario_apellido
            FROM movimientos_inventario mi
            JOIN productos p ON mi.producto_id = p.id
            LEFT JOIN veterinarios v ON mi.veterinario_id = v.id
            WHERE p.veterinario_id = $1
            ORDER BY mi.created_at DESC
            LIMIT 5
        `;
        
        const movimientosRecientesResult = await pool.query(movimientosRecientesQuery, [req.veterinarioId]);
        
        // Obtener distribución de productos por categoría
        const distribucionCategoriasQuery = `
            SELECT 
                COALESCE(c.nombre, 'Sin categoría') as categoria,
                COUNT(p.id) as cantidad_productos,
                COALESCE(SUM(p.stock_actual * p.precio_compra), 0) as valor_total
            FROM productos p
            LEFT JOIN categorias_inventario c ON p.categoria_id = c.id
            WHERE p.veterinario_id = $1 AND p.activo = true
            GROUP BY c.id, c.nombre
            ORDER BY cantidad_productos DESC
        `;
        
        const distribucionCategoriasResult = await pool.query(distribucionCategoriasQuery, [req.veterinarioId]);
        
        // Obtener alertas sin resolver
        const alertasSinResolverQuery = `
            SELECT COUNT(*) as total
            FROM alertas_inventario a
            JOIN productos p ON a.producto_id = p.id
            WHERE p.veterinario_id = $1 AND a.resuelta = false
        `;
        
        const alertasSinResolverResult = await pool.query(alertasSinResolverQuery, [req.veterinarioId]);
        
        // Preparar respuesta
        const estadisticas = {
            resumen: {
                total_productos: parseInt(productosResult.rows[0].total_productos) || 0,
                productos_stock_bajo: parseInt(productosResult.rows[0].productos_stock_bajo) || 0,
                productos_sin_stock: parseInt(productosResult.rows[0].productos_sin_stock) || 0,
                valor_total_inventario: parseFloat(productosResult.rows[0].valor_total_inventario) || 0,
                alertas_sin_resolver: parseInt(alertasSinResolverResult.rows[0].total) || 0
            },
            stock_bajo: stockBajoResult.rows,
            proximos_vencer: proximosVencerResult.rows,
            movimientos_recientes: movimientosRecientesResult.rows,
            distribucion_categorias: distribucionCategoriasResult.rows
        };
        
        res.json({ 
            success: true, 
            data: estadisticas 
        });
    } catch (error) {
        console.error('Error al obtener las estadísticas de inventario:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener las estadísticas de inventario',
            error: error.message 
        });
    }
};

// Obtener reporte de inventario
const obtenerReporteInventario = async (req, res) => {
    try {
        const { 
            categoria_id, 
            tipo_producto, 
            con_stock_bajo = 'false',
            ordenar_por = 'nombre',
            orden = 'ASC'
        } = req.query;
        
        // Construir la consulta SQL con filtros opcionales
        let query = `
            SELECT 
                p.id, p.codigo_barras, p.codigo_interno, p.nombre, 
                p.descripcion, p.tipo_producto, p.stock_actual, 
                p.stock_minimo, p.stock_maximo, p.unidad_medida,
                p.precio_compra, p.precio_venta,
                (p.stock_actual * p.precio_compra) as valor_total_compra,
                (p.stock_actual * p.precio_venta) as valor_total_venta,
                c.nombre as categoria_nombre,
                pr.nombre as proveedor_nombre,
                (p.stock_actual <= p.stock_minimo AND p.stock_minimo > 0) as bajo_stock
            FROM productos p
            LEFT JOIN categorias_inventario c ON p.categoria_id = c.id
            LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
            WHERE p.veterinario_id = $1 AND p.activo = true
        `;
        
        const queryParams = [req.veterinarioId];
        let paramIndex = 2;
        
        // Aplicar filtros
        if (categoria_id) {
            query += ` AND p.categoria_id = $${paramIndex++}`;
            queryParams.push(categoria_id);
        }
        
        if (tipo_producto) {
            query += ` AND p.tipo_producto = $${paramIndex++}`;
            queryParams.push(tipo_producto);
        }
        
        if (con_stock_bajo === 'true') {
            query += ` AND p.stock_actual <= p.stock_minimo AND p.stock_minimo > 0`;
        }
        
        // Ordenar resultados
        const ordenValido = ['nombre', 'stock_actual', 'precio_venta', 'precio_compra', 'valor_total_compra', 'valor_total_venta'].includes(ordenar_por.toLowerCase());
        const direccionOrden = orden.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        
        query += ` ORDER BY ${ordenValido ? ordenar_por : 'nombre'} ${direccionOrden}`;
        
        // Ejecutar consulta
        const result = await pool.query(query, queryParams);
        
        // Obtener totales
        const totales = {
            total_productos: result.rows.length,
            productos_stock_bajo: result.rows.filter(p => p.bajo_stock).length,
            valor_total_compra: result.rows.reduce((sum, p) => sum + parseFloat(p.valor_total_compra || 0), 0),
            valor_total_venta: result.rows.reduce((sum, p) => sum + parseFloat(p.valor_total_venta || 0), 0)
        };
        
        res.json({ 
            success: true, 
            data: {
                productos: result.rows,
                totales: totales
            }
        });
    } catch (error) {
        console.error('Error al generar el reporte de inventario:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al generar el reporte de inventario',
            error: error.message 
        });
    }
};

module.exports = {
    // Productos
    obtenerProductos,
    obtenerProductoPorId,
    crearProducto,
    actualizarProducto,
    eliminarProducto,
    
    // Categorías
    obtenerCategorias,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria,
    
    // Proveedores
    obtenerProveedores,
    crearProveedor,
    actualizarProveedor,
    eliminarProveedor,
    
    // Movimientos de inventario
    obtenerMovimientosInventario,
    crearMovimientoInventario,
    
    // Alertas
    obtenerAlertasInventario,
    marcarAlertaResuelta,
    
    // Reportes y estadísticas
    obtenerEstadisticasInventario,
    obtenerReporteInventario
};
