const { pool } = require('./database-postgres');

async function testConnection() {
    try {
        console.log('🔄 Probando conexión a PostgreSQL...');
        const result = await pool.query('SELECT NOW()');
        console.log('✅ Conexión exitosa:', result.rows[0]);
        
        // Probar consulta de clientes
        console.log('\n🔄 Probando consulta de clientes...');
        const clientes = await pool.query('SELECT * FROM clientes LIMIT 5');
        console.log('✅ Clientes encontrados:', clientes.rows.length);
        
        // Probar consulta de veterinarios
        console.log('\n🔄 Probando consulta de veterinarios...');
        const vets = await pool.query('SELECT id, email, nombre_veterinario FROM veterinarios LIMIT 5');
        console.log('✅ Veterinarios encontrados:', vets.rows.length);
        console.log('Veterinarios:', vets.rows);
        
        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

testConnection();
