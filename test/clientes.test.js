const request = require('supertest');
const { testPool, setupTestDatabase, teardownTestDatabase } = require('./setup');
const bcrypt = require('bcrypt');

// Importar la aplicación después de configurar las variables de entorno
process.env.NODE_ENV = 'test';
const app = require('../api/server');

// Datos de prueba
const testUser = {
  email: 'test@example.com',
  password: 'testpassword123',
  nombre_veterinario: 'Test Veterinario',
  telefono: '123456789',
  direccion: 'Calle Falsa 123',
  tipo_licencia: 'BASICO',
  licencia_activa: true
};

// Datos de prueba para clientes
const testClientes = [
  {
    nombre: 'Juan Pérez',
    email: 'juan@example.com',
    telefono: '1234567890',
    direccion: 'Calle 123',
    notas: 'Cliente preferente',
    mascotas: [
      {
        nombre: 'Firulais',
        especie: 'Perro',
        raza: 'Labrador',
        fecha_nacimiento: '2020-01-15',
        color: 'Dorado',
        sexo: 'Macho',
        esterilizado: false,
        peso: 25.5,
        notas: 'Alérgico a la penicilina'
      },
      {
        nombre: 'Michi',
        especie: 'Gato',
        raza: 'Siamés',
        fecha_nacimiento: '2021-05-20',
        color: 'Blanco y marrón',
        sexo: 'Hembra',
        esterilizado: true,
        peso: 4.2,
        notas: 'Tímido con extraños'
      }
    ]
  },
  // Agregar más clientes de prueba según sea necesario
];

// Variables para almacenar datos entre pruebas
let authToken;
let veterinarioId;
let clienteIds = [];
let mascotaIds = [];

describe('Pruebas del Módulo de Clientes y Mascotas', () => {
  beforeAll(async () => {
    // Configurar la base de datos de prueba
    await setupTestDatabase();
    
    // Limpiar tablas
    await testPool.query('TRUNCATE TABLE veterinarios, clientes, mascotas CASCADE');
    
    // Crear usuario de prueba
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    const result = await testPool.query(
      `INSERT INTO veterinarios 
       (nombre_veterinario, email, password, telefono, direccion, tipo_licencia, licencia_activa) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id`,
      [
        testUser.nombre_veterinario, 
        testUser.email, 
        hashedPassword, 
        testUser.telefono, 
        testUser.direccion,
        testUser.tipo_licencia,
        testUser.licencia_activa
      ]
    );
    
    veterinarioId = result.rows[0].id;
    
    // Obtener token de autenticación
    const response = await request(app)
      .post('/api/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });
      
    authToken = response.body.token;
  });

  afterAll(async () => {
    // Limpiar la base de datos después de las pruebas
    await teardownTestDatabase();
  });

  describe('Gestión de Clientes', () => {
    it('debería crear un nuevo cliente', async () => {
      const clienteData = testClientes[0];
      const response = await request(app)
        .post('/api/clientes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nombre: clienteData.nombre,
          email: clienteData.email,
          telefono: clienteData.telefono,
          direccion: clienteData.direccion,
          notas: clienteData.notas
        });
      
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('nombre', clienteData.nombre);
      expect(response.body).toHaveProperty('email', clienteData.email);
      
      clienteIds.push(response.body.id);
    });

    it('debería obtener la lista de clientes', async () => {
      const response = await request(app)
        .get('/api/clientes')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('nombre');
    });

    it('debería buscar clientes por nombre', async () => {
      const searchTerm = testClientes[0].nombre.split(' ')[0]; // Primera palabra del nombre
      const response = await request(app)
        .get(`/api/clientes/buscar?q=${searchTerm}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].nombre).toContain(searchTerm);
    });

    it('debería actualizar un cliente existente', async () => {
      if (clienteIds.length === 0) {
        throw new Error('No hay clientes para actualizar');
      }
      
      const clienteId = clienteIds[0];
      const updatedData = {
        nombre: 'Juan Carlos Pérez',
        telefono: '987654321',
        direccion: 'Avenida Siempre Viva 456'
      };
      
      const response = await request(app)
        .put(`/api/clientes/${clienteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedData);
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('id', clienteId);
      expect(response.body).toHaveProperty('nombre', updatedData.nombre);
      expect(response.body).toHaveProperty('telefono', updatedData.telefono);
    });
  });

  describe('Gestión de Mascotas', () => {
    it('debería agregar una mascota a un cliente', async () => {
      if (clienteIds.length === 0) {
        throw new Error('No hay clientes para agregar mascotas');
      }
      
      const clienteId = clienteIds[0];
      const mascotaData = testClientes[0].mascotas[0];
      
      const response = await request(app)
        .post(`/api/clientes/${clienteId}/mascotas`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(mascotaData);
      
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('nombre', mascotaData.nombre);
      expect(response.body).toHaveProperty('especie', mascotaData.especie);
      
      mascotaIds.push({
        id: response.body.id,
        clienteId: clienteId
      });
    });

    it('debería obtener las mascotas de un cliente', async () => {
      if (clienteIds.length === 0) {
        throw new Error('No hay clientes para consultar mascotas');
      }
      
      const clienteId = clienteIds[0];
      const response = await request(app)
        .get(`/api/clientes/${clienteId}/mascotas`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('nombre');
    });

    it('debería actualizar los datos de una mascota', async () => {
      if (mascotaIds.length === 0) {
        throw new Error('No hay mascotas para actualizar');
      }
      
      const mascotaId = mascotaIds[0].id;
      const updatedData = {
        nombre: 'Firulais Actualizado',
        peso: 28.0,
        notas: 'Ahora con dieta especial'
      };
      
      const response = await request(app)
        .put(`/api/mascotas/${mascotaId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedData);
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('id', mascotaId);
      expect(response.body).toHaveProperty('nombre', updatedData.nombre);
      expect(response.body).toHaveProperty('peso', updatedData.peso.toString());
    });

    it('debería buscar mascotas por nombre', async () => {
      if (mascotaIds.length === 0) {
        throw new Error('No hay mascotas para buscar');
      }
      
      const searchTerm = 'Firulais';
      const response = await request(app)
        .get(`/api/mascotas/buscar?q=${searchTerm}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].nombre).toContain(searchTerm);
    });
  });

  describe('Eliminación de Datos', () => {
    it('debería eliminar una mascota', async () => {
      if (mascotaIds.length === 0) {
        throw new Error('No hay mascotas para eliminar');
      }
      
      const mascotaId = mascotaIds[mascotaIds.length - 1].id;
      const response = await request(app)
        .delete(`/api/mascotas/${mascotaId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('mensaje', 'Mascota eliminada correctamente');
      
      // Verificar que la mascota ya no existe
      const verifyResponse = await request(app)
        .get(`/api/mascotas/${mascotaId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(verifyResponse.statusCode).toBe(404);
      
      // Eliminar la mascota del array de IDs
      mascotaIds = mascotaIds.filter(m => m.id !== mascotaId);
    });

    it('debería eliminar un cliente y sus mascotas', async () => {
      if (clienteIds.length === 0) {
        throw new Error('No hay clientes para eliminar');
      }
      
      const clienteId = clienteIds[clienteIds.length - 1];
      const response = await request(app)
        .delete(`/api/clientes/${clienteId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('mensaje', 'Cliente y sus mascotas eliminados correctamente');
      
      // Verificar que el cliente ya no existe
      const verifyResponse = await request(app)
        .get(`/api/clientes/${clienteId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(verifyResponse.statusCode).toBe(404);
      
      // Verificar que las mascotas asociadas también se eliminaron
      if (mascotaIds.some(m => m.clienteId === clienteId)) {
        const mascotasResponse = await request(app)
          .get(`/api/clientes/${clienteId}/mascotas`)
          .set('Authorization', `Bearer ${authToken}`);
        
        expect(mascotasResponse.body.length).toBe(0);
      }
      
      // Eliminar el cliente del array de IDs
      clienteIds = clienteIds.filter(id => id !== clienteId);
    });
  });
});
