// Script para crear usuario de prueba
const API_URL = 'http://localhost:3000';

async function crearUsuarioPrueba() {
    const userData = {
        nombre_veterinaria: "Clínica MUNDO PATAS",
        nombre_veterinario: "Dr. Juan Pérez",
        email: "admin@mundopatas.com",
        password: "admin123",
        telefono: "2617024193",
        direccion: "Av. San Martín 123, Mendoza"
    };

    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Usuario creado exitosamente!');
            console.log('📧 Email:', userData.email);
            console.log('🔑 Password:', userData.password);
            console.log('🎫 Token:', data.token);
            
            // Guardar en localStorage para uso inmediato
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            console.log('\n✨ Ya puedes acceder al sistema con estas credenciales');
            console.log('O simplemente recarga la página - el token ya está guardado');
        } else {
            console.log('⚠️ El usuario ya existe o hubo un error:', data.error);
            console.log('Intenta iniciar sesión con:');
            console.log('📧 Email:', userData.email);
            console.log('🔑 Password:', userData.password);
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Ejecutar
crearUsuarioPrueba();
