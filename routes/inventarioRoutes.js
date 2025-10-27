const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { validarCampos } = require('../middleware/validar-campos');
const { validarJWT } = require('../middleware/validar-jwt');
const {
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
} = require('../controllers/inventarioController');

// Aplicar middleware de autenticación a todas las rutas
router.use(validarJWT);

// Rutas de Productos
router.get('/productos', obtenerProductos);
router.get('/productos/:id', obtenerProductoPorId);
router.post('/productos', [
    check('nombre', 'El nombre del producto es obligatorio').not().isEmpty(),
    check('precio_compra', 'El precio de compra debe ser un número positivo').isFloat({ min: 0 }),
    check('precio_venta', 'El precio de venta debe ser un número positivo').isFloat({ min: 0 }),
    check('unidad_medida', 'La unidad de medida es obligatoria').not().isEmpty(),
    validarCampos
], crearProducto);

router.put('/productos/:id', [
    check('nombre', 'El nombre del producto es obligatorio').optional().not().isEmpty(),
    check('precio_compra', 'El precio de compra debe ser un número positivo').optional().isFloat({ min: 0 }),
    check('precio_venta', 'El precio de venta debe ser un número positivo').optional().isFloat({ min: 0 }),
    validarCampos
], actualizarProducto);

router.delete('/productos/:id', eliminarProducto);

// Rutas de Categorías
router.get('/categorias', obtenerCategorias);
router.post('/categorias', [
    check('nombre', 'El nombre de la categoría es obligatorio').not().isEmpty(),
    validarCampos
], crearCategoria);

router.put('/categorias/:id', [
    check('nombre', 'El nombre de la categoría es obligatorio').optional().not().isEmpty(),
    validarCampos
], actualizarCategoria);

router.delete('/categorias/:id', eliminarCategoria);

// Rutas de Proveedores
router.get('/proveedores', obtenerProveedores);
router.post('/proveedores', [
    check('nombre', 'El nombre del proveedor es obligatorio').not().isEmpty(),
    check('ruc', 'El RUC debe tener entre 8 y 15 caracteres').optional().isLength({ min: 8, max: 15 }),
    check('email', 'El correo electrónico no es válido').optional().isEmail(),
    validarCampos
], crearProveedor);

router.put('/proveedores/:id', [
    check('nombre', 'El nombre del proveedor es obligatorio').optional().not().isEmpty(),
    check('ruc', 'El RUC debe tener entre 8 y 15 caracteres').optional().isLength({ min: 8, max: 15 }),
    check('email', 'El correo electrónico no es válido').optional().isEmail(),
    validarCampos
], actualizarProveedor);

router.delete('/proveedores/:id', eliminarProveedor);

// Rutas de Movimientos de Inventario
router.get('/movimientos', obtenerMovimientosInventario);
router.post('/movimientos', [
    check('tipo_movimiento', 'Tipo de movimiento no válido').isIn(['entrada', 'salida', 'ajuste_entrada', 'ajuste_salida']),
    check('producto_id', 'El ID del producto es obligatorio').isInt(),
    check('cantidad', 'La cantidad debe ser un número positivo').isFloat({ min: 0.001 }),
    check('costo_unitario', 'El costo unitario debe ser un número positivo').isFloat({ min: 0 }),
    check('motivo', 'El motivo del movimiento es obligatorio').not().isEmpty(),
    validarCampos
], crearMovimientoInventario);

// Rutas de Alertas de Inventario
router.get('/alertas', obtenerAlertasInventario);
router.put('/alertas/:id/resolver', marcarAlertaResuelta);

// Rutas de Reportes y Estadísticas
router.get('/estadisticas', obtenerEstadisticasInventario);
router.get('/reportes/inventario', obtenerReporteInventario);

module.exports = router;
