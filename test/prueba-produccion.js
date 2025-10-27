const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuración
const API_BASE_URL = 'https://sistemamundopatas.com/api';
const TEST_EMAIL = `test-${Date.now()}@ejemplo.com`;
const TEST_PASSWORD = 'Test123456!';

// Variables para almacenar datos entre pruebas
let authToken = '';
let veterinarioId = '';
const clientesCreados = [];

// Configuración de Axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Función para mostrar mensajes de progreso
function logMensaje(mensaje, tipo = 'info') {
  const colores = {
    info: '\x1b[36m%s\x1b[0m',
    exito: '\x1b[32m%s\x1b[0m',
    error: '\x1b[31m%s\x1b[0m',
    advertencia: '\x1b[33m%s\x1b[0m'
  };
  
  const prefijo = {
    info: '[INFO]',
    exito: '[ÉXITO]',
    error: '[ERROR]',
    advertencia: '[ADVERTENCIA]'
  };
  
  console.log(colores[tipo], `${prefijo[tipo]} ${mensaje}`);
}

// Función para generar datos de prueba
function generarDatosCliente(index) {
  const nombres = ['Juan', 'María', 'Carlos', 'Ana', 'Pedro', 'Laura', 'Miguel', 'Sofía', 'Diego', 'Valentina'];
  const apellidos = ['González', 'Rodríguez', 'Pérez', 'López', 'Martínez', 'Gómez', 'Fernández', 'Sánchez'];
  
  const nombre = nombres[Math.floor(Math.random() * nombres.length)];
  const apellido = apellidos[Math.floor(Math.random() * apellidos.length)];
  const email = `cliente${index+1}.${Date.now()}@ejemplo.com`;
  
  return {
    nombre: `${nombre} ${apellido}`,
    email,
    telefono: `11${Math.floor(1000000 + Math.random() * 9000000)}`,
    direccion: `Calle ${Math.floor(Math.random() * 1000)} #${Math.floor(Math.random() * 1000)}`,
    notas: `Cliente de prueba ${index+1}`
  };
}

// Función para registrar una nueva veterinaria
async function registrarVeterinaria() {
  try {
    logMensaje('Registrando nueva veterinaria de prueba...');
    
    const response = await api.post('/register', {
      nombre_veterinario: `Veterinaria Test ${Date.now()}`,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      confirmPassword: TEST_PASSWORD,
      telefono: '1122334455',
      direccion: 'Av. Test 1234',
      tipo_licencia: 'PROFESIONAL',
      accessKey: 'CLAVE_DE_ACCESO_VALIDA' // Asegúrate de usar una clave válida
    });
    
    logMensaje('Veterinaria registrada con éxito', 'exito');
    return response.data.veterinario;
  } catch (error) {
    logMensaje(`Error al registrar veterinaria: ${error.response?.data?.message || error.message}`, 'error');
    throw error;
  }
}

// Función para iniciar sesión
async function iniciarSesion() {
  try {
    logMensaje('Iniciando sesión...');
    
    const response = await api.post('/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    authToken = response.data.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    
    logMensaje('Sesión iniciada con éxito', 'exito');
    return response.data.veterinario;
  } catch (error) {
    logMensaje(`Error al iniciar sesión: ${error.response?.data?.message || error.message}`, 'error');
    throw error;
  }
}

// Función para crear clientes de prueba
async function crearClientes(cantidad) {
  logMensado(`Creando ${cantidad} clientes de prueba...`);
  
  for (let i = 0; i < cantidad; i++) {
    try {
      const clienteData = generarDatosCliente(i);
      const response = await api.post('/clientes', clienteData);
      
      clientesCreados.push({
        id: response.data.id,
        ...clienteData
      });
      
      logMensado(`Cliente ${i+1}/${cantidad} creado: ${clienteData.nombre}`, 'exito');
    } catch (error) {
      logMensaje(`Error al crear cliente: ${error.response?.data?.message || error.message}`, 'error');
    }
    
    // Pequeña pausa entre solicitudes
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Función para limpiar datos de prueba
async function limpiarDatosPrueba() {
  logMensaje('Limpiando datos de prueba...', 'advertencia');
  
  // Eliminar clientes creados
  for (const cliente of clientesCreados) {
    try {
      await api.delete(`/clientes/${cliente.id}`);
      logMensaje(`Cliente eliminado: ${cliente.nombre}`, 'exito');
    } catch (error) {
      logMensaje(`Error al eliminar cliente ${cliente.nombre}: ${error.message}`, 'error');
    }
    
    // Pequeña pausa entre eliminaciones
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Cerrar sesión
  try {
    await api.post('/logout');
    logMensaje('Sesión cerrada correctamente', 'exito');
  } catch (error) {
    logMensaje(`Error al cerrar sesión: ${error.message}`, 'error');
  }
}

// Función principal
async function ejecutarPruebas() {
  try {
    console.log('🚀 Iniciando pruebas del sistema Mundo Patas 🐾\n');
    
    // 1. Registrar nueva veterinaria
    const veterinaria = await registrarVeterinaria();
    veterinarioId = veterinaria.id;
    
    // 2. Iniciar sesión
    await iniciarSesion();
    
    // 3. Crear clientes de prueba
    await crearClientes(20);
    
    // 4. Mostrar resumen
    console.log('\n📊 Resumen de pruebas:');
    console.log(`- Veterinaria creada: ${veterinaria.email}`);
    console.log(`- Clientes creados: ${clientesCreados.length}`);
    
    // 5. Preguntar si se desea limpiar los datos
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('\n¿Deseas eliminar los datos de prueba? (s/n): ', async (respuesta) => {
      if (respuesta.toLowerCase() === 's') {
        await limpiarDatosPrueba();
        console.log('\n✅ Pruebas completadas y datos de prueba eliminados');
      } else {
        console.log('\n⚠️  Los datos de prueba no se eliminaron. Recuerda hacerlo manualmente.');
      }
      
      readline.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error.message);
    
    // Intentar limpiar en caso de error
    try {
      await limpiarDatosPrueba();
    } catch (cleanupError) {
      console.error('Error al limpiar datos de prueba:', cleanupError.message);
    }
    
    process.exit(1);
  }
}

// Ejecutar pruebas
ejecutarPruebas();
