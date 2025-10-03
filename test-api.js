const fetch = require('node-fetch');

async function testAPI() {
    try {
        // 1. Login
        console.log('🔐 Intentando login...');
        const loginResponse = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'vale@gmail.com',
                password: 'vale2587'
            })
        });
        
        if (!loginResponse.ok) {
            console.error('❌ Error en login:', loginResponse.status);
            const text = await loginResponse.text();
            console.error('Respuesta:', text);
            return;
        }
        
        const loginData = await loginResponse.json();
        console.log('✅ Login exitoso');
        console.log('Token:', loginData.token.substring(0, 20) + '...');
        
        // 2. Obtener clientes con mascotas
        console.log('\n📋 Obteniendo clientes con mascotas...');
        const clientesResponse = await fetch('http://localhost:3000/api/clientes-con-mascotas', {
            headers: { 
                'Authorization': `Bearer ${loginData.token}`
            }
        });
        
        console.log('Status:', clientesResponse.status);
        
        if (!clientesResponse.ok) {
            const text = await clientesResponse.text();
            console.error('❌ Error:', text);
            return;
        }
        
        const clientes = await clientesResponse.json();
        console.log('✅ Clientes obtenidos:', clientes.length);
        console.log('Datos:', JSON.stringify(clientes, null, 2));
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    }
}

testAPI();
