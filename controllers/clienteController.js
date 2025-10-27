const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Búsqueda avanzada de clientes con múltiples filtros
 */
const buscarClientes = async (req, res) => {
    try {
        const {
            query,
            segmento_id,
            tiene_mascotas,
            activo,
            fecha_desde,
            fecha_hasta,
            ordenar_por = 'nombre',
            orden = 'ASC',
            pagina = 1,
            por_pagina = 10,
            incluir_mascotas = false
        } = req.query;

        // Validar parámetros
        const offset = (pagina - 1) * por_pagina;
        const ordenes_validas = ['nombre', 'apellido', 'email', 'created_at'];
        const orden_valida = ordenes_validas.includes(ordenar_por) ? ordenar_por : 'nombre';
        const direccion_orden = orden.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        // Construir la consulta SQL dinámica
        let queryParams = [];
        let whereClauses = ['c.veterinario_id = $1'];
        queryParams.push(req.user.id); // Asumiendo que el ID del veterinario está en el token

        // Aplicar filtros
        if (query) {
            whereClauses.push(`(
                c.nombre ILIKE $${queryParams.length + 1} OR 
                c.apellido ILIKE $${queryParams.length + 1} OR 
                c.email ILIKE $${queryParams.length + 1} OR
                c.telefono LIKE $${queryParams.length + 1} OR
                c.direccion ILIKE $${queryParams.length + 1}
            )`);
            queryParams.push(`%${query}%`);
        }

        if (segmento_id) {
            whereClauses.push(`c.segmento_id = $${queryParams.length + 1}`);
            queryParams.push(segmento_id);
        }

        if (tiene_mascotas === 'true') {
            whereClauses.push(`EXISTS (SELECT 1 FROM mascotas m WHERE m.cliente_id = c.id)`);
        } else if (tiene_mascotas === 'false') {
            whereClauses.push(`NOT EXISTS (SELECT 1 FROM mascotas m WHERE m.cliente_id = c.id)`);
        }

        if (activo === 'true' || activo === 'false') {
            whereClauses.push(`c.activo = $${queryParams.length + 1}`);
            queryParams.push(activo === 'true');
        }

        if (fecha_desde) {
            whereClauses.push(`c.created_at >= $${queryParams.length + 1}`);
            queryParams.push(fecha_desde);
        }

        if (fecha_hasta) {
            whereClauses.push(`c.created_at <= $${queryParams.length + 1}`);
            queryParams.push(fecha_hasta);
        }

        // Consulta para obtener los clientes
        let sql = `
            SELECT 
                c.*,
                s.nombre as segmento_nombre,
                s.color as segmento_color,
                (SELECT COUNT(*) FROM mascotas m WHERE m.cliente_id = c.id) as total_mascotas,
                (SELECT COUNT(*) FROM interacciones_cliente ic WHERE ic.cliente_id = c.id) as total_interacciones
            FROM clientes c
            LEFT JOIN segmentos s ON c.segmento_id = s.id
            WHERE ${whereClauses.join(' AND ')}
            ORDER BY c.${orden_valida} ${direccion_orden}
            LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
        `;

        // Agregar parámetros de paginación
        queryParams.push(parseInt(por_pagina), offset);

        // Ejecutar consulta
        const { rows: clientes } = await pool.query(sql, queryParams);

        // Obtener el total de registros para la paginación
        const countSql = `
            SELECT COUNT(*) as total 
            FROM clientes c
            WHERE ${whereClauses.join(' AND ')}
        `;
        
        const { rows: [{ total }] } = await pool.query(
            countSql, 
            queryParams.slice(0, -2) // Excluir parámetros de paginación
        );

        // Obtener mascotas si se solicita
        if (incluir_mascotas === 'true' && clientes.length > 0) {
            const clienteIds = clientes.map(c => c.id);
            const { rows: mascotas } = await pool.query(
                'SELECT * FROM mascotas WHERE cliente_id = ANY($1)',
                [clienteIds]
            );

            // Agrupar mascotas por cliente
            const mascotasPorCliente = mascotas.reduce((acc, mascota) => {
                if (!acc[mascota.cliente_id]) {
                    acc[mascota.cliente_id] = [];
                }
                acc[mascota.cliente_id].push(mascota);
                return acc;
            }, {});

            // Agregar mascotas a cada cliente
            clientes.forEach(cliente => {
                cliente.mascotas = mascotasPorCliente[cliente.id] || [];
            });
        }

        // Respuesta final
        res.json({
            success: true,
            data: clientes,
            paginacion: {
                total: parseInt(total),
                pagina: parseInt(pagina),
                por_pagina: parseInt(por_pagina),
                total_paginas: Math.ceil(total / por_pagina)
            }
        });

    } catch (error) {
        console.error('Error en buscarClientes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al buscar clientes',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Obtener un cliente por ID con toda su información
 */
const obtenerClientePorId = async (req, res) => {
    try {
        const { id } = req.params;
        const { incluir_mascotas = 'true', incluir_interacciones = 'false' } = req.query;

        // Obtener información básica del cliente
        const { rows: [cliente] } = await pool.query(
            `SELECT c.*, s.nombre as segmento_nombre, s.color as segmento_color 
             FROM clientes c
             LEFT JOIN segmentos s ON c.segmento_id = s.id
             WHERE c.id = $1 AND c.veterinario_id = $2`,
            [id, req.user.id]
        );

        if (!cliente) {
            return res.status(404).json({
                success: false,
                message: 'Cliente no encontrado'
            });
        }

        // Obtener direcciones del cliente
        const { rows: direcciones } = await pool.query(
            'SELECT * FROM direcciones_cliente WHERE cliente_id = $1',
            [id]
        );

        // Obtener etiquetas del cliente
        const { rows: etiquetas } = await pool.query(
            `SELECT e.* 
             FROM etiquetas e
             JOIN cliente_etiquetas ce ON e.id = ce.etiqueta_id
             WHERE ce.cliente_id = $1`,
            [id]
        );

        // Obtener mascotas si se solicita
        let mascotas = [];
        if (incluir_mascotas === 'true') {
            const { rows: mascotasData } = await pool.query(
                'SELECT * FROM mascotas WHERE cliente_id = $1',
                [id]
            );
            mascotas = mascotasData;
        }

        // Obtener interacciones si se solicita
        let interacciones = [];
        if (incluir_interacciones === 'true') {
            const { rows: interaccionesData } = await pool.query(
                `SELECT ic.*, v.nombre_veterinario as veterinario_nombre
                 FROM interacciones_cliente ic
                 JOIN veterinarios v ON ic.veterinario_id = v.id
                 WHERE ic.cliente_id = $1
                 ORDER BY ic.fecha_hora DESC
                 LIMIT 20`,
                [id]
            );
            interacciones = interaccionesData;
        }

        // Construir respuesta
        const respuesta = {
            ...cliente,
            direcciones,
            etiquetas,
            mascotas,
            interacciones
        };

        res.json({
            success: true,
            data: respuesta
        });

    } catch (error) {
        console.error('Error en obtenerClientePorId:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el cliente',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    buscarClientes,
    obtenerClientePorId
};
