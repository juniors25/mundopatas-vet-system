const request = require('supertest');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { testPool, setupTestDatabase, teardownTestDatabase } = require('./setup');

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

// Datos de prueba para registro
const newUser = {
  email: 'nuevo@ejemplo.com',
  password: 'nuevopassword123',
  confirmPassword: 'nuevopassword123',
  nombre_veterinario: 'Nuevo Veterinario',
  telefono: '987654321',
  direccion: 'Avenida Siempre Viva 456',
  tipo_licencia: 'BASICO',
  licencia_activa: true,
  accessKey: 'CLAVE_DE_ACCESO_VALIDA' // Asegúrate de que coincida con tu configuración
};

describe('Pruebas de Autenticación', () => {
  beforeAll(async () => {
    // Configurar la base de datos de prueba
    await setupTestDatabase();
    
    // Limpiar tablas
    await testPool.query('TRUNCATE TABLE veterinarios, clientes, mascotas, citas, facturas CASCADE');
    
    // Crear usuario de prueba
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await testPool.query(
      'INSERT INTO veterinarios (nombre_veterinario, email, password, telefono, direccion, tipo_licencia, licencia_activa) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
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
  });

  afterAll(async () => {
    // Limpiar la base de datos después de las pruebas
    await teardownTestDatabase();
  });

  describe('POST /api/register', () => {
    it('debería registrar un nuevo veterinario', async () => {
      const response = await request(app)
        .post('/api/register')
        .send(newUser);
      
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('message', 'Usuario registrado con éxito');
      expect(response.body).toHaveProperty('veterinario');
      expect(response.body.veterinario).toHaveProperty('email', newUser.email);
    });

    it('debería fallar al registrar con email existente', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          ...newUser,
          email: testUser.email // Email ya existente
        });
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('message', 'El correo ya está registrado');
    });
  });

  describe('POST /api/login', () => {
    it('debería iniciar sesión con credenciales válidas', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('veterinario');
      expect(response.body.veterinario).toHaveProperty('email', testUser.email);
    });

    it('debería fallar con contraseña incorrecta', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          email: testUser.email,
          password: 'contraseñaincorrecta'
        });
      
      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('message', 'Credenciales inválidas');
    });

    it('debería fallar con usuario inexistente', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          email: 'noexiste@ejemplo.com',
          password: 'cualquiercontraseña'
        });
      
      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('message', 'Usuario no encontrado');
    });
  });

  describe('GET /api/veterinario/perfil', () => {
    let authToken;

    beforeAll(async () => {
      // Iniciar sesión para obtener el token
      const response = await request(app)
        .post('/api/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      authToken = response.body.token;
    });

    it('debería obtener el perfil del veterinario autenticado', async () => {
      const response = await request(app)
        .get('/api/veterinario/perfil')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).toHaveProperty('nombre_veterinario', testUser.nombre_veterinario);
    });

    it('debería fallar sin token de autenticación', async () => {
      const response = await request(app)
        .get('/api/veterinario/perfil');
      
      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('message', 'No hay token, permiso no válido');
    });
  });

  describe('PUT /api/veterinario/perfil', () => {
    let authToken;

    beforeAll(async () => {
      // Iniciar sesión para obtener el token
      const response = await request(app)
        .post('/api/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      authToken = response.body.token;
    });

    it('debería actualizar el perfil del veterinario', async () => {
      const updatedData = {
        nombre_veterinario: 'Nuevo Nombre',
        telefono: '987654321',
        direccion: 'Nueva Dirección 123'
      };

      const response = await request(app)
        .put('/api/veterinario/perfil')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedData);
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('message', 'Perfil actualizado correctamente');
      expect(response.body).toHaveProperty('veterinario');
      expect(response.body.veterinario).toHaveProperty('nombre_veterinario', updatedData.nombre_veterinario);
      expect(response.body.veterinario).toHaveProperty('telefono', updatedData.telefono);
      expect(response.body.veterinario).toHaveProperty('direccion', updatedData.direccion);
    });
  });

  describe('PUT /api/veterinario/cambiar-password', () => {
    let authToken;

    beforeAll(async () => {
      // Iniciar sesión para obtener el token
      const response = await request(app)
        .post('/api/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      authToken = response.body.token;
    });

    it('debería cambiar la contraseña del veterinario', async () => {
      const newPassword = 'nuevacontraseña123';
      
      const response = await request(app)
        .put('/api/veterinario/cambiar-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword: newPassword,
          confirmNewPassword: newPassword
        });
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('message', 'Contraseña actualizada correctamente');

      // Verificar que la nueva contraseña funcione
      const loginResponse = await request(app)
        .post('/api/login')
        .send({
          email: testUser.email,
          password: newPassword
        });
      
      expect(loginResponse.statusCode).toBe(200);
      expect(loginResponse.body).toHaveProperty('token');
    });

    it('debería fallar con la contraseña actual incorrecta', async () => {
      const response = await request(app)
        .put('/api/veterinario/cambiar-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'contraseñaincorrecta',
          newPassword: 'nuevacontraseña123',
          confirmNewPassword: 'nuevacontraseña123'
        });
      
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('message', 'La contraseña actual es incorrecta');
    });
  });
});
