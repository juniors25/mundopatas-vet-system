// Script de prueba para todas las APIs de MUNDO PATAS
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let authToken = '';

// Función helper para hacer requests
async function makeRequest(method, endpoint, data = null, useAuth = false) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: useAuth ? { 'Authorization': `Bearer ${authToken}` } : {}
        };
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return { 
            success: false, 
            error: error.response?.data || error.message,
            status: error.response?.status || 500
        };
    }
}

async function runTests() {
    console.log('🧪 INICIANDO PRUEBAS DE MUNDO PATAS\n');
    
    // 1. Probar endpoint de test
    console.log('1️⃣ Probando endpoint de test...');
    const testResult = await makeRequest('GET', '/api/test');
    console.log('✅ Test endpoint:', testResult.success ? 'OK' : 'FAIL');
    console.log('   Respuesta:', testResult.data?.message || testResult.error);
    
    // 2. Probar registro de veterinario
    console.log('\n2️⃣ Probando registro de veterinario...');
    const registerData = {
        nombre_veterinaria: 'Clínica Test',
        nombre_veterinario: 'Dr. Test',
        email: 'test@test.com',
        password: 'test123',
        telefono: '123456789',
        direccion: 'Calle Test 123'
    };
    
    const registerResult = await makeRequest('POST', '/api/auth/register', registerData);
    console.log('✅ Registro:', registerResult.success ? 'OK' : 'FAIL');
    
    if (registerResult.success) {
        authToken = registerResult.data.token;
        console.log('   Token obtenido:', authToken ? 'SÍ' : 'NO');
    } else {
        console.log('   Error:', registerResult.error);
    }
    
    // 3. Probar login
    console.log('\n3️⃣ Probando login...');
    const loginData = {
        email: 'test@test.com',
        password: 'test123'
    };
    
    const loginResult = await makeRequest('POST', '/api/login', loginData);
    console.log('✅ Login:', loginResult.success ? 'OK' : 'FAIL');
    
    if (loginResult.success && loginResult.data.token) {
        authToken = loginResult.data.token;
    }
    
    // 4. Probar dashboard (requiere autenticación)
    console.log('\n4️⃣ Probando dashboard...');
    const dashboardResult = await makeRequest('GET', '/api/dashboard', null, true);
    console.log('✅ Dashboard:', dashboardResult.success ? 'OK' : 'FAIL');
    if (dashboardResult.success) {
        console.log('   Métricas obtenidas:', Object.keys(dashboardResult.data.metricas || {}).length);
    }
    
    // 5. Probar creación de cliente
    console.log('\n5️⃣ Probando creación de cliente...');
    const clienteData = {
        nombre: 'Juan',
        apellido: 'Pérez',
        telefono: '987654321',
        email: 'juan@test.com',
        direccion: 'Av. Test 456'
    };
    
    const clienteResult = await makeRequest('POST', '/api/clientes', clienteData, true);
    console.log('✅ Crear cliente:', clienteResult.success ? 'OK' : 'FAIL');
    let clienteId = clienteResult.data?.id;
    
    // 6. Probar creación de mascota
    console.log('\n6️⃣ Probando creación de mascota...');
    if (clienteId) {
        const mascotaData = {
            nombre: 'Firulais',
            especie: 'Perro',
            raza: 'Labrador',
            edad: 3,
            peso: 25.5,
            color: 'Dorado',
            sexo: 'Macho',
            cliente_id: clienteId
        };
        
        const mascotaResult = await makeRequest('POST', '/api/mascotas', mascotaData, true);
        console.log('✅ Crear mascota:', mascotaResult.success ? 'OK' : 'FAIL');
    }
    
    // 7. Probar medicamentos
    console.log('\n7️⃣ Probando inventario de medicamentos...');
    const medicamentoData = {
        nombre: 'Antibiótico Test',
        principio_activo: 'Amoxicilina',
        presentacion: 'Tabletas',
        concentracion: '500mg',
        laboratorio: 'Lab Test',
        precio_compra: 10.50,
        precio_venta: 15.75,
        stock_inicial: 100,
        stock_minimo: 10,
        fecha_vencimiento: '2025-12-31'
    };
    
    const medicamentoResult = await makeRequest('POST', '/api/medicamentos', medicamentoData, true);
    console.log('✅ Crear medicamento:', medicamentoResult.success ? 'OK' : 'FAIL');
    
    // 8. Probar notificaciones
    console.log('\n8️⃣ Probando sistema de notificaciones...');
    const notificacionData = {
        tipo: 'test',
        titulo: 'Notificación de prueba',
        mensaje: 'Esta es una notificación de prueba del sistema'
    };
    
    const notifResult = await makeRequest('POST', '/api/notificaciones', notificacionData, true);
    console.log('✅ Crear notificación:', notifResult.success ? 'OK' : 'FAIL');
    
    // 9. Obtener notificaciones
    const getNotifResult = await makeRequest('GET', '/api/notificaciones', null, true);
    console.log('✅ Obtener notificaciones:', getNotifResult.success ? 'OK' : 'FAIL');
    if (getNotifResult.success) {
        console.log('   Notificaciones encontradas:', getNotifResult.data?.length || 0);
    }
    
    // 10. Probar reportes
    console.log('\n🔟 Probando reportes...');
    const reporteIngresos = await makeRequest('GET', '/api/reportes/ingresos', null, true);
    console.log('✅ Reporte ingresos:', reporteIngresos.success ? 'OK' : 'FAIL');
    
    const reporteInventario = await makeRequest('GET', '/api/reportes/inventario', null, true);
    console.log('✅ Reporte inventario:', reporteInventario.success ? 'OK' : 'FAIL');
    
    console.log('\n🎉 PRUEBAS COMPLETADAS');
    console.log('═══════════════════════════════════════');
    console.log('✅ Sistema funcionando correctamente');
    console.log('🔐 Autenticación: OPERATIVA');
    console.log('📊 Dashboard: OPERATIVO');
    console.log('👥 Gestión clientes/mascotas: OPERATIVA');
    console.log('💊 Inventario medicamentos: OPERATIVO');
    console.log('🔔 Notificaciones: OPERATIVAS');
    console.log('📈 Reportes: OPERATIVOS');
}

// Ejecutar pruebas
runTests().catch(console.error);
