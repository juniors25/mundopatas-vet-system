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
  direccion: 'Calle Falsa 123'
};

let authToken;
let categoriaId;
let proveedorId;
let productoId;
let movimientoId;
let alertaId;

// Antes de las pruebas, configurar la base de datos y crear un usuario de prueba
describe('Pruebas del Módulo de Inventario', () => {
  beforeAll(async () => {
    // Configurar la base de datos de prueba
    await setupTestDatabase();
    
    // Limpiar tablas
    await testPool.query('TRUNCATE TABLE veterinarios, productos, categorias, proveedores, movimientos_inventario, alertas_inventario CASCADE');
    
    // Crear usuario de prueba
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    const result = await testPool.query(
      'INSERT INTO veterinarios (nombre_veterinario, email, password, telefono, direccion, licencia_activa) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [testUser.nombre_veterinario, testUser.email, hashedPassword, testUser.telefono, testUser.direccion, true]
    );
    
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
    // Limpiar después de las pruebas
    await teardownTestDatabase();
  });

  // Pruebas de Categorías
  describe('Categorías', () => {
    it('debería crear una nueva categoría', async () => {
      const response = await request(app)
        .post('/api/inventario/categorias')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nombre: 'Medicamentos',
          descripcion: 'Productos farmacéuticos para tratamiento veterinario'
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.nombre).toBe('Medicamentos');
      
      categoriaId = response.body.id;
    });

    it('debería obtener todas las categorías', async () => {
      const response = await request(app)
        .get('/api/inventario/categorias')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  // Pruebas de Proveedores
  describe('Proveedores', () => {
    it('debería crear un nuevo proveedor', async () => {
      const response = await request(app)
        .post('/api/inventario/proveedores')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nombre: 'Distribuidora Veterinaria S.A.',
          ruc: '12345678901',
          telefono: '987654321',
          email: 'contacto@distribuidoravet.com',
          direccion: 'Av. Principal 123',
          contacto: 'Juan Pérez'
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.nombre).toBe('Distribuidora Veterinaria S.A.');
      
      proveedorId = response.body.id;
    });
  });

  // Pruebas de Productos
  describe('Productos', () => {
    it('debería crear un nuevo producto', async () => {
      const response = await request(app)
        .post('/api/inventario/productos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          codigo: 'MED-001',
          nombre: 'Antipulgas para perros',
          descripcion: 'Tratamiento mensual contra pulgas y garrapatas',
          precio_compra: 15.99,
          precio_venta: 29.99,
          stock_minimo: 10,
          stock_actual: 50,
          unidad_medida: 'unidad',
          categoria_id: categoriaId,
          proveedor_id: proveedorId
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.nombre).toBe('Antipulgas para perros');
      
      productoId = response.body.id;
    });

    it('debería obtener un producto por ID', async () => {
      const response = await request(app)
        .get(`/api/inventario/productos/${productoId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(productoId);
      expect(response.body.nombre).toBe('Antipulgas para perros');
    });
  });

  // Pruebas de Movimientos de Inventario
  describe('Movimientos de Inventario', () => {
    it('debería registrar una entrada de inventario', async () => {
      const response = await request(app)
        .post('/api/inventario/movimientos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tipo_movimiento: 'entrada',
          producto_id: productoId,
          cantidad: 10,
          costo_unitario: 15.99,
          motivo: 'Compra a proveedor',
          referencia: 'FACT-001'
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.tipo_movimiento).toBe('entrada');
      
      movimientoId = response.body.id;
    });

    it('debería registrar una salida de inventario', async () => {
      const response = await request(app)
        .post('/api/inventario/movimientos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tipo_movimiento: 'salida',
          producto_id: productoId,
          cantidad: 2,
          costo_unitario: 15.99,
          motivo: 'Venta a cliente',
          referencia: 'VENTA-001'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.tipo_movimiento).toBe('salida');
    });
  });

  // Pruebas de Alertas
  describe('Alertas de Inventario', () => {
    it('debería obtener alertas de inventario', async () => {
      // Primero forzamos una alerta bajando el stock por debajo del mínimo
      await testPool.query(
        'UPDATE productos SET stock_actual = 5 WHERE id = $1',
        [productoId]
      );
      
      const response = await request(app)
        .get('/api/inventario/alertas')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // Debería haber al menos una alerta para el producto con stock bajo
      const alertaProducto = response.body.find(a => a.producto_id === productoId);
      expect(alertaProducto).toBeDefined();
      
      alertaId = alertaProducto.id;
    });

    it('debería marcar una alerta como resuelta', async () => {
      const response = await request(app)
        .put(`/api/inventario/alertas/${alertaId}/resolver`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          solucion: 'Se realizó pedido de reposición al proveedor'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.mensaje).toBe('Alerta marcada como resuelta');
    });
  });

  // Pruebas de Reportes
  describe('Reportes de Inventario', () => {
    it('debería obtener estadísticas de inventario', async () => {
      const response = await request(app)
        .get('/api/inventario/estadisticas')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total_productos');
      expect(response.body).toHaveProperty('valor_total_inventario');
      expect(response.body).toHaveProperty('productos_bajo_stock');
    });

    it('debería generar un reporte de inventario', async () => {
      const response = await request(app)
        .get('/api/inventario/reportes/inventario')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });
});
