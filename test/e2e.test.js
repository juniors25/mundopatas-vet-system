const request = require('supertest');
const { v4: uuidv4 } = require('uuid');
const assert = require('assert');

// URL base de la API
const BASE_URL = 'https://sistemamundopatas.com/api';

// Datos de prueba
const testClinic = {
  nombre: 'Veterinaria de Prueba ' + Math.floor(Math.random() * 1000),
  email: `test_${uuidv4().substring(0, 8)}@test.com`,
  password: 'Test123!',
  telefono: '1234567890',
  direccion: 'Calle Falsa 123',
  ciudad: 'Ciudad de Prueba',
  pais: 'País de Prueba'
};

let authToken = '';
let clienteId = '';
let mascotaId = '';
let citaId = '';

describe('Pruebas E2E del Sistema de Gestión Veterinaria', function() {
  this.timeout(30000); // Aumentar el timeout para las pruebas

  // 1. Prueba de registro de nueva clínica
  it('debería registrar una nueva clínica', async () => {
    const response = await request(BASE_URL)
      .post('/registro')
      .send(testClinic)
      .expect('Content-Type', /json/)
      .expect(201);

    assert.ok(response.body.token, 'El token de autenticación debería estar presente');
    authToken = response.body.token;
  });

  // 2. Prueba de login
  it('debería iniciar sesión correctamente', async () => {
    const response = await request(BASE_URL)
      .post('/login')
      .send({
        email: testClinic.email,
        password: testClinic.password
      })
      .expect('Content-Type', /json/)
      .expect(200);

    assert.ok(response.body.token, 'El token de autenticación debería estar presente');
    authToken = response.body.token;
  });

  // 3. Prueba de creación de cliente
  it('debería crear un nuevo cliente', async () => {
    const clienteData = {
      nombre: 'Cliente de Prueba',
      email: `cliente_${uuidv4().substring(0, 8)}@test.com`,
      telefono: '123456789',
      direccion: 'Calle Cliente 123'
    };

    const response = await request(BASE_URL)
      .post('/clientes')
      .set('Authorization', `Bearer ${authToken}`)
      .send(clienteData)
      .expect('Content-Type', /json/)
      .expect(201);

    assert.ok(response.body.id, 'El ID del cliente debería estar presente');
    clienteId = response.body.id;
  });

  // 4. Prueba de creación de mascota
  it('debería crear una nueva mascota', async () => {
    const mascotaData = {
      nombre: 'Firulais',
      especie: 'Perro',
      raza: 'Labrador',
      edad: 3,
      sexo: 'Macho',
      cliente_id: clienteId
    };

    const response = await request(BASE_URL)
      .post('/mascotas')
      .set('Authorization', `Bearer ${authToken}`)
      .send(mascotaData)
      .expect('Content-Type', /json/)
      .expect(201);

    assert.ok(response.body.id, 'El ID de la mascota debería estar presente');
    mascotaId = response.body.id;
  });

  // 5. Prueba de creación de cita
  it('debería crear una nueva cita', async () => {
    const fechaCita = new Date();
    fechaCita.setDate(fechaCita.getDate() + 1); // Cita para mañana

    const citaData = {
      mascota_id: mascotaId,
      fecha: fechaCita.toISOString(),
      motivo: 'Consulta de rutina',
      notas: 'Prueba automatizada',
      estado: 'pendiente'
    };

    const response = await request(BASE_URL)
      .post('/citas')
      .set('Authorization', `Bearer ${authToken}`)
      .send(citaData)
      .expect('Content-Type', /json/)
      .expect(201);

    assert.ok(response.body.id, 'El ID de la cita debería estar presente');
    citaId = response.body.id;
  });

  // 6. Prueba de listado de clientes
  it('debería obtener el listado de clientes', async () => {
    const response = await request(BASE_URL)
      .get('/clientes')
      .set('Authorization', `Bearer ${authToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    assert.ok(Array.isArray(response.body), 'La respuesta debería ser un arreglo');
    assert.ok(response.body.length > 0, 'Debería haber al menos un cliente');
  });

  // 7. Prueba de búsqueda de cliente
  it('debería buscar un cliente por nombre', async () => {
    const response = await request(BASE_URL)
      .get('/clientes/buscar?q=Prueba')
      .set('Authorization', `Bearer ${authToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    assert.ok(Array.isArray(response.body), 'La respuesta debería ser un arreglo');
  });

  // 8. Prueba de actualización de cita
  it('debería actualizar una cita existente', async () => {
    const response = await request(BASE_URL)
      .put(`/citas/${citaId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        estado: 'confirmada',
        notas: 'Cita confirmada - Prueba automatizada'
      })
      .expect('Content-Type', /json/)
      .expect(200);

    assert.strictEqual(response.body.estado, 'confirmada', 'El estado de la cita debería estar actualizado');
  });

  // 9. Prueba de eliminación de cita
  it('debería eliminar una cita existente', async () => {
    await request(BASE_URL)
      .delete(`/citas/${citaId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(204);
  });

  // 10. Prueba de generación de informe
  it('debería generar un informe de clientes', async () => {
    const response = await request(BASE_URL)
      .get('/informes/clientes')
      .set('Authorization', `Bearer ${authToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    assert.ok(response.body, 'Debería devolver el informe de clientes');
  });
});
