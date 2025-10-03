// Script de prueba del sistema de notificaciones
require('dotenv').config();
const { pool, initializeDatabase } = require('./database-postgres');
const { verificarAlimentoMascotas, calcularDiasRestantes } = require('./services/verificador-alimento');

async function testNotificaciones() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧪 PRUEBA DEL SISTEMA DE NOTIFICACIONES');
    console.log('═══════════════════════════════════════════════════════════\n');

    try {
        // Inicializar base de datos
        await initializeDatabase();
        console.log('✅ Base de datos conectada\n');

        // 1. Obtener veterinario de prueba
        const vetResult = await pool.query('SELECT * FROM veterinarios LIMIT 1');
        if (vetResult.rows.length === 0) {
            console.log('❌ No hay veterinarios registrados');
            process.exit(1);
        }
        const veterinario = vetResult.rows[0];
        console.log(`👨‍⚕️ Veterinario: ${veterinario.nombre_veterinario}`);
        console.log(`🏥 Veterinaria: ${veterinario.nombre_veterinaria}\n`);

        // 2. Obtener o crear cliente de prueba
        let clienteResult = await pool.query(
            'SELECT * FROM clientes WHERE veterinario_id = $1 LIMIT 1',
            [veterinario.id]
        );

        let cliente;
        if (clienteResult.rows.length === 0) {
            console.log('📝 Creando cliente de prueba...');
            clienteResult = await pool.query(
                `INSERT INTO clientes (veterinario_id, nombre, apellido, email, telefono, direccion)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [veterinario.id, 'Juan', 'Pérez', 'juan.perez@example.com', '+5491112345678', 'Calle Falsa 123']
            );
            cliente = clienteResult.rows[0];
            console.log('✅ Cliente creado\n');
        } else {
            cliente = clienteResult.rows[0];
            console.log(`👤 Cliente: ${cliente.nombre} ${cliente.apellido}\n`);
        }

        // 3. Crear mascota de prueba con alimento bajo
        console.log('🐕 Creando mascota de prueba con alimento bajo...');
        
        // Calcular fecha de inicio para que queden 5 días
        const pesoBolsaKg = 15; // 15 kg
        const gramosDiarios = 300; // 300g por día
        const diasTotales = Math.floor((pesoBolsaKg * 1000) / gramosDiarios); // 50 días
        const diasTranscurridos = diasTotales - 5; // Para que queden 5 días
        const fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() - diasTranscurridos);

        const mascotaResult = await pool.query(
            `INSERT INTO mascotas (
                veterinario_id, cliente_id, nombre, especie, raza, edad, peso, pelaje, sexo,
                tipo_alimento, marca_alimento, peso_bolsa_kg, fecha_inicio_bolsa, gramos_diarios
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
            [
                veterinario.id, cliente.id, 'Max', 'Perro', 'Labrador', 3, 25.5, 'Dorado', 'Macho',
                'Balanceado Premium', 'Royal Canin', pesoBolsaKg, fechaInicio, gramosDiarios
            ]
        );
        const mascota = mascotaResult.rows[0];
        console.log(`✅ Mascota creada: ${mascota.nombre}`);

        // 4. Calcular días restantes
        const calculo = calcularDiasRestantes(
            mascota.peso_bolsa_kg,
            mascota.gramos_diarios,
            mascota.fecha_inicio_bolsa
        );
        
        console.log('\n📊 Cálculo de alimento:');
        console.log(`   • Peso de bolsa: ${mascota.peso_bolsa_kg} kg`);
        console.log(`   • Consumo diario: ${mascota.gramos_diarios}g`);
        console.log(`   • Días totales: ${calculo.diasTotales} días`);
        console.log(`   • Días transcurridos: ${calculo.diasTranscurridos} días`);
        console.log(`   • Días restantes: ${calculo.diasRestantes} días`);
        console.log(`   • Porcentaje restante: ${calculo.porcentajeRestante}%\n`);

        // 5. Configurar notificaciones para el veterinario
        console.log('⚙️ Configurando notificaciones...');
        await pool.query(
            `INSERT INTO notificaciones_config (veterinario_id, email_habilitado, dias_aviso_alimento)
             VALUES ($1, true, 7)
             ON CONFLICT (veterinario_id) DO UPDATE SET
                email_habilitado = true,
                dias_aviso_alimento = 7`,
            [veterinario.id]
        );
        console.log('✅ Configuración guardada\n');

        // 6. Ejecutar verificación
        console.log('🔍 Ejecutando verificación de alimento...\n');
        const resultado = await verificarAlimentoMascotas();

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('📊 RESULTADO DE LA PRUEBA');
        console.log('═══════════════════════════════════════════════════════════');
        
        if (resultado.success) {
            console.log('✅ Estado: EXITOSO');
            console.log(`📋 Mascotas verificadas: ${resultado.mascotasVerificadas}`);
            console.log(`⚠️  Alertas generadas: ${resultado.alertasGeneradas}`);
            console.log(`📧 Notificaciones enviadas: ${resultado.notificacionesEnviadas}`);
            
            if (resultado.notificacionesEnviadas > 0) {
                console.log('\n📧 Notificación enviada a:', cliente.email);
                console.log('   (Revisa tu bandeja de entrada si configuraste SMTP)');
            } else {
                console.log('\n⚠️  No se enviaron notificaciones.');
                console.log('   Configura SMTP_USER y SMTP_PASS para enviar emails reales.');
            }
        } else {
            console.log('❌ Estado: ERROR');
            console.log(`⚠️  Mensaje: ${resultado.error}`);
        }

        console.log('═══════════════════════════════════════════════════════════\n');

        // 7. Mostrar historial
        const historialResult = await pool.query(
            `SELECT * FROM notificaciones_enviadas 
             WHERE veterinario_id = $1 
             ORDER BY fecha_envio DESC LIMIT 5`,
            [veterinario.id]
        );

        if (historialResult.rows.length > 0) {
            console.log('📜 Últimas notificaciones enviadas:');
            historialResult.rows.forEach((notif, i) => {
                console.log(`\n${i + 1}. ${notif.tipo_notificacion} - ${notif.canal}`);
                console.log(`   Destinatario: ${notif.destinatario}`);
                console.log(`   Estado: ${notif.estado}`);
                console.log(`   Fecha: ${new Date(notif.fecha_envio).toLocaleString('es-AR')}`);
            });
        }

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('✅ PRUEBA COMPLETADA');
        console.log('═══════════════════════════════════════════════════════════\n');

        await pool.end();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERROR:', error);
        process.exit(1);
    }
}

testNotificaciones();
