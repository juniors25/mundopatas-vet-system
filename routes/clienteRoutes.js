const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateToken);

/**
 * @swagger
 * /api/clientes/buscar:
 *   get:
 *     summary: Búsqueda avanzada de clientes
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Término de búsqueda general (nombre, apellido, email, teléfono, dirección)
 *       - in: query
 *         name: segmento_id
 *         schema:
 *           type: integer
 *         description: ID del segmento para filtrar
 *       - in: query
 *         name: tiene_mascotas
 *         schema:
 *           type: boolean
 *         description: Filtrar por clientes con o sin mascotas
 *       - in: query
 *         name: activo
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado activo/inactivo
 *       - in: query
 *         name: fecha_desde
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de creación desde (YYYY-MM-DD)
 *       - in: query
 *         name: fecha_hasta
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de creación hasta (YYYY-MM-DD)
 *       - in: query
 *         name: ordenar_por
 *         schema:
 *           type: string
 *           enum: [nombre, apellido, email, created_at]
 *           default: nombre
 *         description: Campo por el que ordenar los resultados
 *       - in: query
 *         name: orden
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: ASC
 *         description: Orden ascendente (ASC) o descendente (DESC)
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página para la paginación
 *       - in: query
 *         name: por_pagina
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Cantidad de resultados por página
 *       - in: query
 *         name: incluir_mascotas
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Incluir información de mascotas en la respuesta
 *     responses:
 *       200:
 *         description: Lista de clientes que coinciden con los criterios de búsqueda
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Cliente'
 *                 paginacion:
 *                   $ref: '#/components/schemas/Paginacion'
 *       500:
 *         description: Error del servidor
 */
router.get('/buscar', clienteController.buscarClientes);

/**
 * @swagger
 * /api/clientes/{id}:
 *   get:
 *     summary: Obtener un cliente por ID
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cliente
 *       - in: query
 *         name: incluir_mascotas
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Incluir información de mascotas en la respuesta
 *       - in: query
 *         name: incluir_interacciones
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Incluir historial de interacciones del cliente
 *     responses:
 *       200:
 *         description: Detalles del cliente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ClienteCompleto'
 *       404:
 *         description: Cliente no encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/:id', clienteController.obtenerClientePorId);

module.exports = router;
