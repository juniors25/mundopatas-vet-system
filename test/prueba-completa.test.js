const request = require('supertest');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

// Configuración
const API_BASE_URL = 'https://sistemamundopatas.com/api';
const TEST_EMAIL = `test-${Date.now()}@ejemplo.com`;
const TEST_PASSWORD = 'Test123456!';

// Variables para almacenar datos entre pruebas
let authToken = '';
let veterinarioId = '';
const clientesCreados = [];
const mascotasCreadas = [];
const citasCreadas = [];
const productosCreados = [];

// Datos de prueba
function generarDatosPrueba() {
  // Generar 20 clientes con datos aleatorios
  const clientes = [];
  const nombres = ['Juan', 'María', 'Carlos', 'Ana', 'Pedro', 'Laura', 'Miguel', 'Sofía', 'Diego', 'Valentina'];
  const apellidos = ['González', 'Rodríguez', 'Pérez', 'López', 'Martínez', 'Gómez', 'Fernández', 'Sánchez'];
  
  for (let i = 0; i < 20; i++) {
    const nombre = nombres[Math.floor(Math.random() * nombres.length)];
    const apellido = apellidos[Math.floor(Math.random() * apellidos.length)];
    const email = `cliente${i+1}.${Date.now()}@ejemplo.com`;
    
    clientes.push({
      nombre: `${nombre} ${apellido}`,
      email,
      telefono: `11${Math.floor(1000000 + Math.random() * 9000000)}`,
      direccion: `Calle ${Math.floor(Math.random() * 1000)} #${Math.floor(Math.random() * 1000)}`,
      notas: `Cliente de prueba ${i+1}`,
      mascotas: generarMascotasParaCliente()
    });
  }
  
  return clientes;
}

function generarMascotasParaCliente() {
  const especies = ['Perro', 'Gato', 'Conejo', 'Hámster', 'Pájaro'];
  const razasPerro = ['Labrador', 'Pastor Alemán', 'Bulldog', 'Chihuahua', 'Mestizo'];
  const razasGato = ['Siamés', 'Persa', 'Bengalí', 'Mestizo'];
  const colores = ['Negro', 'Blanco', 'Marrón', 'Gris', 'Atigrado', 'Bicolor'];
  
  const numMascotas = Math.floor(Math.random() * 3) + 1; // 1-3 mascotas por cliente
  const mascotas = [];
  
  for (let i = 0; i < numMascotas; i++) {
    const especie = especies[Math.floor(Math.random() * especies.length)];
    let raza = 'Mestizo';
    
    if (especie === 'Perro') {
      raza = razasPerro[Math.floor(Math.random() * razasPerro.length)];
    } else if (especie === 'Gato') {
      raza = razasGato[Math.floor(Math.random() * razasGato.length)];
    }
    
    const añoNacimiento = 2020 + Math.floor(Math.random() * 3); // 2020-2022
    const mesNacimiento = Math.floor(Math.random() * 12) + 1;
    const diaNacimiento = Math.floor(Math.random() * 28) + 1;
    
    mascotas.push({
      nombre: `Mascota ${i+1}`,
      especie,
      raza,
      fecha_nacimiento: `${añoNacimiento}-${mesNacimiento.toString().padStart(2, '0')}-${diaNacimiento.toString().padStart(2, '0')}`,
      color: colores[Math.floor(Math.random() * colores.length)],
      sexo: Math.random() > 0.5 ? 'Macho' : 'Hembra',
      esterilizado: Math.random() > 0.5,
      peso: (Math.random() * 30 + 1).toFixed(1),
      notas: `Mascota de prueba ${i+1}`
    });
  }
  
  return mascotas;
}

// Funciones de utilidad
async function login(email, password) {
  const response = await request(API_BASE_URL)
    .post('/login')
    .send({ email, password });
  
  if (response.status === 200 && response.body.token) {
    return response.body.token;
  }
  throw new Error('Error en login: ' + JSON.stringify(response.body));
}

// Pruebas
describe('Prueba Completa del Sistema', () => {
  // 1. Registrar nueva veterinaria
  it('debería registrar una nueva veterinaria', async () => {
    const nombreVeterinaria = `Veterinaria Test ${Date.now()}`;
    
    const response = await request(API_BASE_URL)
      .post('/register')
      .send({
        nombre_veterinario: nombreVeterinaria,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        confirmPassword: TEST_PASSWORD,
        telefono: '1122334455',
        direccion: 'Av. Test 1234',
        tipo_licencia: 'PROFESIONAL',
        accessKey: 'CLAVE_DE_ACCESO_VALIDA' // Asegúrate de usar una clave válida
      });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('veterinario');
    expect(response.body.veterinario.email).toBe(TEST_EMAIL);
    
    // Iniciar sesión con la nueva cuenta
    authToken = await login(TEST_EMAIL, TEST_PASSWORD);
  });
  
  // 2. Obtener perfil del veterinario
  it('debería obtener el perfil del veterinario', async () => {
    const response = await request(API_BASE_URL)
      .get('/veterinario/perfil')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('email', TEST_EMAIL);
    
    veterinarioId = response.body.id;
  });
  
  // 3. Crear clientes y mascotas
  const clientes = generarDatosPrueba();
  
  for (let i = 0; i < clientes.length; i++) {
    const cliente = clientes[i];
    
    it(`debería crear el cliente ${i+1}: ${cliente.nombre}`, async () => {
      // Crear cliente
      const response = await request(API_BASE_URL)
        .post('/clientes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nombre: cliente.nombre,
          email: cliente.email,
          telefono: cliente.telefono,
          direccion: cliente.direccion,
          notas: cliente.notas
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      
      const clienteId = response.body.id;
      cliente.id = clienteId;
      clientesCreados.push(cliente);
      
      // Crear mascotas para este cliente
      for (const mascota of cliente.mascotas) {
        const mascotaResponse = await request(API_BASE_URL)
          .post(`/clientes/${clienteId}/mascotas`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(mascota);
        
        expect(mascotaResponse.status).toBe(201);
        expect(mascotaResponse.body).toHaveProperty('id');
        
        mascota.id = mascotaResponse.body.id;
        mascota.cliente_id = clienteId;
        mascotasCreadas.push(mascota);
      }
    });
  }
  
  // 4. Crear citas para algunos clientes
  it('debería crear citas para los clientes', async () => {
    // Tomar los primeros 10 clientes para crear citas
    const clientesConCitas = clientesCreados.slice(0, 10);
    
    for (const cliente of clientesConCitas) {
      // Tomar la primera mascota del cliente
      const mascota = cliente.mascotas && cliente.mascotas.length > 0 ? cliente.mascotas[0] : null;
      
      if (!mascota) continue;
      
      // Crear fecha para la cita (próximos 30 días)
      const fechaCita = new Date();
      fechaCita.setDate(fechaCita.getDate() + Math.floor(Math.random() * 30) + 1);
      
      const citaData = {
        cliente_id: cliente.id,
        mascota_id: mascota.id,
        fecha: fechaCita.toISOString(),
        motivo: 'Consulta de rutina',
        notas: `Cita de prueba para ${mascota.nombre}`
      };
      
      const response = await request(API_BASE_URL)
        .post('/citas')
        .set('Authorization', `Bearer ${authToken}`)
        .send(citaData);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      
      citaData.id = response.body.id;
      citasCreadas.push(citaData);
    }
  });
  
  // 5. Probar el módulo de inventario
  it('debería gestionar el inventario', async () => {
    // Crear categoría de producto
    const categoriaResponse = await request(API_BASE_URL)
      .post('/inventario/categorias')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        nombre: 'Medicamentos',
        descripcion: 'Medicamentos para mascotas'
      });
    
    expect(categoriaResponse.status).toBe(201);
    const categoriaId = categoriaResponse.body.id;
    
    // Crear proveedor
    const proveedorResponse = await request(API_BASE_URL)
      .post('/inventario/proveedores')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        nombre: 'Proveedor de Prueba',
        telefono: '1122334455',
        email: 'proveedor@ejemplo.com',
        direccion: 'Calle Proveedor 123'
      });
    
    expect(proveedorResponse.status).toBe(201);
    const proveedorId = proveedorResponse.body.id;
    
    // Crear productos
    const productos = [
      { nombre: 'Antipulgas', precio: 25.99, stock: 50, stock_minimo: 10, categoria_id: categoriaId, proveedor_id: proveedorId },
      { nombre: 'Vacuna Antirrábica', precio: 15.50, stock: 100, stock_minimo: 20, categoria_id: categoriaId, proveedor_id: proveedorId },
      { nombre: 'Shampoo para mascotas', precio: 12.75, stock: 30, stock_minimo: 5, categoria_id: categoriaId, proveedor_id: proveedorId }
    ];
    
    for (const producto of productos) {
      const response = await request(API_BASE_URL)
        .post('/inventario/productos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(producto);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      
      producto.id = response.body.id;
      productosCreados.push(producto);
    }
    
    // Probar búsqueda de productos
    const busquedaResponse = await request(API_BASE_URL)
      .get('/inventario/productos/buscar?q=antipulgas')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(busquedaResponse.status).toBe(200);
    expect(Array.isArray(busquedaResponse.body)).toBe(true);
    expect(busquedaResponse.body.length).toBeGreaterThan(0);
  });
  
  // 6. Probar facturación
  it('debería generar facturas', async () => {
    if (clientesCreados.length === 0 || productosCreados.length === 0) {
      console.log('No hay clientes o productos para generar factura');
      return;
    }
    
    const cliente = clientesCreados[0];
    const producto = productosCreados[0];
    
    const facturaData = {
      cliente_id: cliente.id,
      items: [
        {
          tipo: 'producto',
          id: producto.id,
          cantidad: 2,
          precio_unitario: producto.precio,
          descripcion: producto.nombre
        },
        {
          tipo: 'servicio',
          id: null,
          cantidad: 1,
          precio_unitario: 50.00,
          descripcion: 'Consulta veterinaria'
        }
      ],
      forma_pago: 'efectivo',
      notas: 'Factura de prueba generada automáticamente'
    };
    
    const response = await request(API_BASE_URL)
      .post('/facturas')
      .set('Authorization', `Bearer ${authToken}`)
      .send(facturaData);
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('total');
    expect(response.body.total).toBe((producto.precio * 2 + 50).toFixed(2));
  });
  
  // 7. Probar generación de reportes
  it('debería generar reportes', async () => {
    // Reporte de clientes
    const clientesResponse = await request(API_BASE_URL)
      .get('/reportes/clientes')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(clientesResponse.status).toBe(200);
    expect(Array.isArray(clientesResponse.body)).toBe(true);
    
    // Reporte de citas
    const citasResponse = await request(API_BASE_URL)
      .get('/reportes/citas')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(citasResponse.status).toBe(200);
    expect(Array.isArray(citasResponse.body)).toBe(true);
    
    // Reporte de inventario
    const inventarioResponse = await request(API_BASE_URL)
      .get('/reportes/inventario')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(inventarioResponse.status).toBe(200);
    expect(Array.isArray(inventarioResponse.body)).toBe(true);
  });
  
  // 8. Limpieza (opcional)
  afterAll(async () => {
    console.log('\n📊 Resumen de pruebas:');
    console.log(`- Clientes creados: ${clientesCreados.length}`);
    console.log(`- Mascotas creadas: ${mascotasCreadas.length}`);
    console.log(`- Citas creadas: ${citasCreadas.length}`);
    console.log(`- Productos creados: ${productosCreados.length}`);
    
    // Nota: En un entorno real, podrías querer limpiar los datos de prueba
    // Esto dependerá de tu estrategia de manejo de datos de prueba
  });
});
