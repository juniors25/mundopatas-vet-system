const { pool } = require('./database-postgres');
const bcrypt = require('bcrypt');

async function checkUser() {
    try {
        const result = await pool.query('SELECT id, email, nombre_veterinario, password FROM veterinarios WHERE email = $1', ['vale@gmail.com']);
        
        if (result.rows.length === 0) {
            console.log('❌ Usuario no encontrado');
            await pool.end();
            return;
        }
        
        const user = result.rows[0];
        console.log('✅ Usuario encontrado:');
        console.log('  ID:', user.id);
        console.log('  Email:', user.email);
        console.log('  Nombre:', user.nombre_veterinario);
        console.log('  Password hash:', user.password.substring(0, 20) + '...');
        
        // Probar contraseña
        const passwords = ['vale2587', 'fernando', '123456', 'admin'];
        console.log('\n🔐 Probando contraseñas...');
        
        for (const pwd of passwords) {
            const match = await bcrypt.compare(pwd, user.password);
            console.log(`  "${pwd}": ${match ? '✅ CORRECTA' : '❌'}`);
        }
        
        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkUser();
