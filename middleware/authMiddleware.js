const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

// Configuración de la base de datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Middleware para verificar el token JWT
 */
const authenticateToken = async (req, res, next) => {
    // Obtener el token del encabezado de autorización
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Token de autenticación no proporcionado' 
        });
    }

    try {
        // Verificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mundo-patas-secret-key');
        
        // Verificar que el usuario existe en la base de datos
        const { rows } = await pool.query(
            'SELECT id, email, nombre_veterinario, tipo_cuenta, licencia_activa FROM veterinarios WHERE id = $1',
            [decoded.id]
        );

        if (rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }

        // Adjuntar el usuario al objeto de solicitud
        req.user = rows[0];
        next();
    } catch (error) {
        console.error('Error en autenticación:', error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token expirado' 
            });
        }
        
        return res.status(403).json({ 
            success: false, 
            message: 'Token inválido' 
        });
    }
};

/**
 * Middleware para verificar si el usuario tiene un rol específico
 */
const checkRole = (roles = []) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Usuario no autenticado' 
                });
            }

            // Si roles es un array, verificar si el rol del usuario está incluido
            if (Array.isArray(roles) && !roles.includes(req.user.tipo_cuenta)) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'No tienes permiso para realizar esta acción' 
                });
            }
            
            // Si roles es un string, verificar si coincide con el rol del usuario
            if (typeof roles === 'string' && req.user.tipo_cuenta !== roles) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'No tienes permiso para realizar esta acción' 
                });
            }

            next();
        } catch (error) {
            console.error('Error en verificación de rol:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Error al verificar permisos' 
            });
        }
    };
};

module.exports = {
    authenticateToken,
    checkRole
};
