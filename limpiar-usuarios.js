/**
 * Script para limpiar todos los usuarios y datos de prueba
 * USO: node limpiar-usuarios.js
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function limpiarBaseDatos() {
    console.log('🗑️  LIMPIANDO BASE DE DATOS...\n');
    
    try {
        // Desactivar restricciones temporalmente
        await pool.query('SET CONSTRAINTS ALL DEFERRED');
        
        // Borrar en orden para respetar foreign keys
        console.log('1. Borrando notificaciones...');
        await pool.query('DELETE FROM notificaciones');
        await pool.query('DELETE FROM notificaciones_enviadas');
        await pool.query('DELETE FROM alertas_alimento');
        
        console.log('2. Borrando telemedicina...');
        await pool.query('DELETE FROM telemedicina_mensajes');
        await pool.query('DELETE FROM telemedicina_sesiones');
        
        console.log('3. Borrando inventario...');
        await pool.query('DELETE FROM movimientos_inventario');
        await pool.query('DELETE FROM inventario_productos');
        
        console.log('4. Borrando facturación...');
        await pool.query('DELETE FROM pagos');
        await pool.query('DELETE FROM factura_items');
        await pool.query('DELETE FROM facturas');
        
        console.log('5. Borrando citas...');
        await pool.query('DELETE FROM citas');
        
        console.log('6. Borrando servicios...');
        await pool.query('DELETE FROM servicios_veterinaria');
        
        console.log('7. Borrando valoraciones y ubicaciones...');
        await pool.query('DELETE FROM valoraciones');
        await pool.query('DELETE FROM ubicaciones');
        
        console.log('8. Borrando FAQ y protocolos...');
        await pool.query('DELETE FROM faq');
        await pool.query('DELETE FROM protocolos_trabajo');
        
        console.log('9. Borrando consultas médicas...');
        await pool.query('DELETE FROM analisis');
        await pool.query('DELETE FROM vacunas');
        await pool.query('DELETE FROM consultas');
        
        console.log('10. Borrando mascotas...');
        await pool.query('DELETE FROM mascotas');
        
        console.log('11. Borrando clientes...');
        await pool.query('DELETE FROM clientes');
        
        console.log('12. Borrando licencias...');
        await pool.query('DELETE FROM licencias');
        
        console.log('13. Borrando control de ventas...');
        await pool.query('DELETE FROM historial_pagos_clientes');
        await pool.query('DELETE FROM mis_clientes_ventas');
        
        console.log('14. Borrando configuraciones...');
        await pool.query('DELETE FROM configuraciones');
        await pool.query('DELETE FROM notificaciones_config');
        
        console.log('15. Borrando TODOS los veterinarios...');
        const result = await pool.query('DELETE FROM veterinarios RETURNING *');
        
        console.log('\n✅ BASE DE DATOS LIMPIADA COMPLETAMENTE');
        console.log(`📊 ${result.rowCount} veterinarios eliminados\n`);
        
        // Reiniciar secuencias
        console.log('🔄 Reiniciando secuencias...');
        await pool.query('ALTER SEQUENCE veterinarios_id_seq RESTART WITH 1');
        await pool.query('ALTER SEQUENCE clientes_id_seq RESTART WITH 1');
        await pool.query('ALTER SEQUENCE mascotas_id_seq RESTART WITH 1');
        await pool.query('ALTER SEQUENCE licencias_id_seq RESTART WITH 1');
        
        console.log('✅ Secuencias reiniciadas\n');
        console.log('🎉 ¡Listo! La base de datos está limpia y lista para empezar de nuevo.\n');
        
    } catch (error) {
        console.error('❌ Error limpiando base de datos:', error);
    } finally {
        await pool.end();
    }
}

// Ejecutar
limpiarBaseDatos();
