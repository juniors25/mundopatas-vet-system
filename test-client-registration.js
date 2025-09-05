// Test script para diagnosticar error de registro de clientes
const https = require('https');
const http = require('http');

function makeRequest(url, options) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const req = protocol.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve({ status: res.statusCode, data: result });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });
        
        req.on('error', reject);
        
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

async function testClientRegistration() {
    const baseUrl = 'https://www.sistemamundopatas.com';
    
    console.log('🔍 Iniciando diagnóstico de registro de clientes...\n');
    
    try {
        // 1. Primero intentar registrar un veterinario de prueba
        console.log('1. Registrando veterinario de prueba...');
        const registerResponse = await makeRequest(`${baseUrl}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nombre_veterinario: 'Dr. Test',
                email: 'test@test.com',
                password: 'test123',
                telefono: '123456789',
                direccion: 'Test Address'
            })
        });
        
        console.log('Registro veterinario:', registerResponse.status, registerResponse.data);
        
        if (registerResponse.status !== 200) {
            console.log('❌ Error en registro de veterinario');
            return;
        }
        
        const token = registerResponse.data.token;
        console.log('✅ Veterinario registrado exitosamente\n');
        
        // 2. Intentar registrar un cliente
        console.log('2. Registrando cliente de prueba...');
        const clientResponse = await makeRequest(`${baseUrl}/api/clientes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                nombre: 'Juan',
                apellido: 'Pérez',
                email: 'juan@test.com',
                telefono: '987654321',
                direccion: 'Calle Test 123'
            })
        });
        
        console.log('Registro cliente:', clientResponse.status, clientResponse.data);
        
        if (clientResponse.status === 200 || clientResponse.status === 201) {
            console.log('✅ Cliente registrado exitosamente');
        } else {
            console.log('❌ Error en registro de cliente:', clientResponse.data.error || clientResponse.data);
        }
        
        // 3. Verificar lista de clientes
        console.log('\n3. Verificando lista de clientes...');
        const listResponse = await makeRequest(`${baseUrl}/api/clientes`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Lista clientes:', listResponse.status, listResponse.data);
        
    } catch (error) {
        console.error('❌ Error de conexión:', error.message);
    }
}

// Ejecutar test
testClientRegistration();
