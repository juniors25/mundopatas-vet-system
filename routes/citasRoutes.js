const express = require('express');
const router = express.Router();
const { verificarToken, esVeterinario } = require('../middleware/authMiddleware');
const {
    getCitasPorVeterinario,
    crearCita,
    actualizarCita,
    eliminarCita,
    getHorariosDisponibles,
    verificarDisponibilidadCita
} = require('../controllers/citasController');

// Obtener citas de un veterinario (filtradas por fechas opcionales)
router.get('/veterinario/:id_veterinario', verificarToken, getCitasPorVeterinario);

// Obtener horarios disponibles para un veterinario
router.get('/disponibles/:id_veterinario', verificarToken, getHorariosDisponibles);

// Verificar disponibilidad de un horario específico
router.post('/verificar-disponibilidad', verificarToken, verificarDisponibilidadCita);

// Crear una nueva cita (accesible por clientes y veterinarios)
router.post('/', verificarToken, crearCita);

// Actualizar una cita existente (solo veterinario o administrador)
router.put('/:id', verificarToken, esVeterinario, actualizarCita);

// Eliminar una cita (solo veterinario o administrador)
router.delete('/:id', verificarToken, esVeterinario, eliminarCita);

module.exports = router;
