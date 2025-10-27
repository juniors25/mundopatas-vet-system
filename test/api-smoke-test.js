const request = require('supertest');
const app = require('../api/server');

// Configuración
const API_BASE_URL = 'https://sistemamundopatas.com/api';
const TEST_CREDENTIALS = {
  email: 'fer@gmail.com',
  password: '123456'
};

// Variables para almacenar tokens y IDs
let authToken = '';
let clienteId = '';
let mascotaId = '';

// Función para realizar login y obtener token
async function login() {
  try {
    const response = await request(API_BASE_URL)
      .post('/login')
      .send(TEST_CREDENTIALS);
    
    if (response.status === 200 && response.body.token) {
      authToken = response.body.token;
      console.log('✅ Login exitoso');
      return true;
    } else {
      console.error('❌ Error en login:', response.body);
      return false;
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    return false;
  }
}

// Prueba de conexión a la API
async function testAPIConnection() {
  try {
    console.log('🔍 Probando conexión con la API...');
    const response = await request(API_BASE_URL).get('/');
    
    if (response.status === 200) {
      console.log('✅ Conexión exitosa con la API');
      return true;
    } else {
      console.error('❌ Error en la conexión con la API:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Error de conexión con la API:', error.message);
    return false;
  }
}

// Prueba de obtención de clientes
async function testGetClientes() {
  try {
    console.log('📋 Obteniendo lista de clientes...');
    const response = await request(API_BASE_URL)
      .get('/clientes')
      .set('Authorization', `Bearer ${authToken}`);
    
    if (response.status === 200) {
      console.log(`✅ Se encontraron ${response.body.length} clientes`);
      return true;
    } else {
      console.error('❌ Error al obtener clientes:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Error al obtener clientes:', error.message);
    return false;
  }
}

// Prueba de creación de cliente
async function testCreateCliente() {
  try {
    console.log('➕ Creando nuevo cliente...');
    const nuevoCliente = {
      nombre: 'Cliente de Prueba ' + Date.now(),
      email: `test.${Date.now()}@example.com`,
      telefono: '123456789',
      direccion: 'Calle Falsa 123',
      notas: 'Cliente de prueba creado automáticamente'
    };
    
    const response = await request(API_BASE_URL)
      .post('/clientes')
      .set('Authorization', `Bearer ${authToken}`)
      .send(nuevoCliente);
    
    if (response.status === 201) {
      clienteId = response.body.id;
      console.log(`✅ Cliente creado correctamente con ID: ${clienteId}`);
      return true;
    } else {
      console.error('❌ Error al crear cliente:', response.status, response.body);
      return false;
    }
  } catch (error) {
    console.error('❌ Error al crear cliente:', error.message);
    return false;
  }
}

// Prueba de creación de mascota
async function testCreateMascota() {
  if (!clienteId) {
    console.log('⚠️  No hay cliente para agregar mascota');
    return false;
  }
  
  try {
    console.log('🐾 Agregando mascota al cliente...');
    const nuevaMascota = {
      nombre: 'Firulais',
      especie: 'Perro',
      raza: 'Mestizo',
      fecha_nacimiento: '2020-01-01',
      color: 'Negro',
      sexo: 'Macho',
      esterilizado: false,
      peso: 15.5,
      notas: 'Mascota de prueba'
    };
    
    const response = await request(API_BASE_URL)
      .post(`/clientes/${clienteId}/mascotas`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(nuevaMascota);
    
    if (response.status === 201) {
      mascotaId = response.body.id;
      console.log(`✅ Mascota agregada correctamente con ID: ${mascotaId}`);
      return true;
    } else {
      console.error('❌ Error al agregar mascota:', response.status, response.body);
      return false;
    }
  } catch (error) {
    console.error('❌ Error al agregar mascota:', error.message);
    return false;
  }
}

// Prueba de creación de cita
async function testCreateCita() {
  if (!clienteId) {
    console.log('⚠️  No hay cliente para agendar cita');
    return false;
  }
  
  try {
    console.log('📅 Creando cita...');
    
    // Obtener fecha de mañana a la misma hora
    const fechaCita = new Date();
    fechaCita.setDate(fechaCita.getDate() + 1);
    
    const nuevaCita = {
      cliente_id: clienteId,
      mascota_id: mascotaId || null,
      fecha: fechaCita.toISOString(),
      motivo: 'Consulta de rutina',
      notas: 'Cita de prueba creada automáticamente'
    };
    
    const response = await request(API_BASE_URL)
      .post('/citas')
      .set('Authorization', `Bearer ${authToken}`)
      .send(nuevaCita);
    
    if (response.status === 201) {
      console.log(`✅ Cita creada correctamente con ID: ${response.body.id}`);
      return true;
    } else {
      console.error('❌ Error al crear cita:', response.status, response.body);
      return false;
    }
  } catch (error) {
    console.error('❌ Error al crear cita:', error.message);
    return false;
  }
}

// Función principal para ejecutar todas las pruebas
async function runTests() {
  console.log('🚀 Iniciando pruebas de humo...\n');
  
  // 1. Probar conexión con la API
  const apiConnected = await testAPIConnection();
  if (!apiConnected) {
    console.log('\n❌ Pruebas fallidas: No se pudo conectar a la API');
    return;
  }
  
  // 2. Iniciar sesión
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('\n❌ Pruebas fallidas: No se pudo iniciar sesión');
    return;
  }
  
  // 3. Ejecutar pruebas secuenciales
  const tests = [
    { name: 'Obtener lista de clientes', test: testGetClientes },
    { name: 'Crear nuevo cliente', test: testCreateCliente },
    { name: 'Agregar mascota al cliente', test: testCreateMascota },
    { name: 'Agendar cita', test: testCreateCita }
  ];
  
  let allTestsPassed = true;
  
  for (const test of tests) {
    console.log(`\n🔹 Ejecutando prueba: ${test.name}`);
    const result = await test.test();
    
    if (!result) {
      console.log(`❌ Falló la prueba: ${test.name}`);
      allTestsPassed = false;
      // Continuar con las siguientes pruebas
    }
  }
  
  // Mostrar resumen
  console.log('\n📊 Resumen de pruebas:');
  console.log(allTestsPassed ? '✅ ¡Todas las pruebas pasaron exitosamente!' : '❌ Algunas pruebas fallaron');
  
  // Mostrar datos de prueba creados
  if (clienteId) {
    console.log(`\n📌 ID de cliente de prueba: ${clienteId}`);
  }
  if (mascotaId) {
    console.log(`📌 ID de mascota de prueba: ${mascotaId}`);
  }
}

// Ejecutar las pruebas
runTests().catch(error => {
  console.error('❌ Error inesperado:', error);
});
