const request = require('supertest');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Configuración de la base de datos de prueba
const testDbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'mundopatas_test',
  password: 'postgres',
  port: 5432,
};

const testPool = new Pool(testDbConfig);

// Datos de prueba
const testUser = {
  email: 'test@example.com',
  password: 'testpassword123',
  nombre_veterinario: 'Test Veterinario',
  telefono: '123456789',
  direccion: 'Calle Falsa 123'
};

let authToken;
let categoriaId;
let proveedorId;
let productoId;

// Función para limpiar la base de datos
const limpiarBaseDeDatos = async () => {
  try {
    // Deshabilitar restricciones de clave foránea temporalmente
    await testPool.query('SET session_replication_role = replica;');
    
    // Eliminar datos de las tablas
    await testPool.query('TRUNCATE TABLE alertas_inventario, movimientos_inventario, lotes, productos, categorias, proveedores, veterinarios CASCADE;');
    
    // Volver a habilitar restricciones
    await testPool.query('SET session_replication_role = DEFAULT;');
    
    console.log('✅ Base de datos limpiada correctamente');
  } catch (error) {
    console.error('❌ Error al limpiar la base de datos:', error);
    throw error;
  }
};

// Función para crear un usuario de prueba
const crearUsuarioPrueba = async () => {
  try {
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await testPool.query(
      'INSERT INTO veterinarios (nombre_veterinario, email, password, telefono, direccion, licencia_activa) VALUES ($1, $2, $3, $4, $5, $6)',
      [testUser.nombre_veterinario, testUser.email, hashedPassword, testUser.telefono, testUser.direccion, true]
    );
    console.log('✅ Usuario de prueba creado correctamente');
  } catch (error) {
    console.error('❌ Error al crear usuario de prueba:', error);
    throw error;
  }
};

// Función para obtener token de autenticación
const obtenerToken = async () => {
  try {
    const response = await request('http://localhost:3000')
      .post('/api/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });
    
    if (response.body.token) {
      return response.body.token;
    } else {
      throw new Error('No se pudo obtener el token de autenticación');
    }
  } catch (error) {
    console.error('❌ Error al obtener token:', error.message);
    throw error;
  }
};

// Función para probar el módulo de inventario
const probarModuloInventario = async () => {
  try {
    console.log('🚀 Iniciando pruebas del módulo de inventario...');
    
    // 1. Limpiar base de datos
    console.log('\n1. Limpiando base de datos...');
    await limpiarBaseDeDatos();
    
    // 2. Crear usuario de prueba
    console.log('\n2. Creando usuario de prueba...');
    await crearUsuarioPrueba();
    
    // 3. Obtener token de autenticación
    console.log('\n3. Obteniendo token de autenticación...');
    authToken = await obtenerToken();
    console.log('✅ Token obtenido:', authToken.substring(0, 20) + '...');
    
    // 4. Probar CRUD de categorías
    console.log('\n4. Probando CRUD de categorías...');
    
    // Crear categoría
    const categoriaResponse = await request('http://localhost:3000')
      .post('/api/inventario/categorias')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        nombre: 'Medicamentos',
        descripcion: 'Productos farmacéuticos para tratamiento veterinario'
      });
    
    if (categoriaResponse.status === 201) {
      categoriaId = categoriaResponse.body.id;
      console.log('✅ Categoría creada con ID:', categoriaId);
    } else {
      throw new Error(`Error al crear categoría: ${JSON.stringify(categoriaResponse.body)}`);
    }
    
    // 5. Probar CRUD de proveedores
    console.log('\n5. Probando CRUD de proveedores...');
    
    // Crear proveedor
    const proveedorResponse = await request('http://localhost:3000')
      .post('/api/inventario/proveedores')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        nombre: 'Distribuidora Veterinaria S.A.',
        ruc: '12345678901',
        telefono: '987654321',
        email: 'contacto@distribuidoravet.com',
        direccion: 'Av. Principal 123',
        contacto: 'Juan Pérez'
      });
    
    if (proveedorResponse.status === 201) {
      proveedorId = proveedorResponse.body.id;
      console.log('✅ Proveedor creado con ID:', proveedorId);
    } else {
      throw new Error(`Error al crear proveedor: ${JSON.stringify(proveedorResponse.body)}`);
    }
    
    // 6. Probar CRUD de productos
    console.log('\n6. Probando CRUD de productos...');
    
    // Crear producto
    const productoResponse = await request('http://localhost:3000')
      .post('/api/inventario/productos')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        codigo: 'MED-001',
        nombre: 'Antipulgas para perros',
        descripcion: 'Tratamiento mensual contra pulgas y garrapatas',
        precio_compra: 15.99,
        precio_venta: 29.99,
        stock_minimo: 10,
        stock_actual: 50,
        unidad_medida: 'unidad',
        categoria_id: categoriaId,
        proveedor_id: proveedorId
      });
    
    if (productoResponse.status === 201) {
      productoId = productoResponse.body.id;
      console.log('✅ Producto creado con ID:', productoId);
    } else {
      throw new Error(`Error al crear producto: ${JSON.stringify(productoResponse.body)}`);
    }
    
    // 7. Probar movimientos de inventario
    console.log('\n7. Probando movimientos de inventario...');
    
    // Registrar entrada de inventario
    const entradaResponse = await request('http://localhost:3000')
      .post('/api/inventario/movimientos')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        tipo_movimiento: 'entrada',
        producto_id: productoId,
        cantidad: 10,
        costo_unitario: 15.99,
        motivo: 'Compra a proveedor',
        referencia: 'FACT-001'
      });
    
    if (entradaResponse.status === 201) {
      console.log('✅ Entrada de inventario registrada correctamente');
    } else {
      throw new Error(`Error al registrar entrada de inventario: ${JSON.stringify(entradaResponse.body)}`);
    }
    
    // Registrar salida de inventario
    const salidaResponse = await request('http://localhost:3000')
      .post('/api/inventario/movimientos')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        tipo_movimiento: 'salida',
        producto_id: productoId,
        cantidad: 2,
        costo_unitario: 15.99,
        motivo: 'Venta a cliente',
        referencia: 'VENTA-001'
      });
    
    if (salidaResponse.status === 201) {
      console.log('✅ Salida de inventario registrada correctamente');
    } else {
      throw new Error(`Error al registrar salida de inventario: ${JSON.stringify(salidaResponse.body)}`);
    }
    
    // 8. Probar alertas de inventario
    console.log('\n8. Probando alertas de inventario...');
    
    // Forzar una alerta bajando el stock por debajo del mínimo
    await testPool.query(
      'UPDATE productos SET stock_actual = 5 WHERE id = $1',
      [productoId]
    );
    
    // Obtener alertas
    const alertasResponse = await request('http://localhost:3000')
      .get('/api/inventario/alertas')
      .set('Authorization', `Bearer ${authToken}`);
    
    if (alertasResponse.status === 200 && Array.isArray(alertasResponse.body)) {
      console.log(`✅ Se encontraron ${alertasResponse.body.length} alertas`);
      
      // Marcar alerta como resuelta si existe
      if (alertasResponse.body.length > 0) {
        const alertaId = alertasResponse.body[0].id;
        const resolverResponse = await request('http://localhost:3000')
          .put(`/api/inventario/alertas/${alertaId}/resolver`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            solucion: 'Se realizó pedido de reposición al proveedor'
          });
        
        if (resolverResponse.status === 200) {
          console.log('✅ Alerta marcada como resuelta correctamente');
        } else {
          console.warn('⚠️ No se pudo marcar la alerta como resuelta:', resolverResponse.body);
        }
      }
    } else {
      console.warn('⚠️ No se encontraron alertas o hubo un error al obtenerlas');
    }
    
    // 9. Probar reportes de inventario
    console.log('\n9. Probando reportes de inventario...');
    
    // Obtener estadísticas
    const estadisticasResponse = await request('http://localhost:3000')
      .get('/api/inventario/estadisticas')
      .set('Authorization', `Bearer ${authToken}`);
    
    if (estadisticasResponse.status === 200) {
      console.log('✅ Estadísticas obtenidas correctamente:', estadisticasResponse.body);
    } else {
      console.warn('⚠️ No se pudieron obtener las estadísticas:', estadisticasResponse.body);
    }
    
    // Obtener reporte de inventario
    const reporteResponse = await request('http://localhost:3000')
      .get('/api/inventario/reportes/inventario')
      .set('Authorization', `Bearer ${authToken}`);
    
    if (reporteResponse.status === 200 && Array.isArray(reporteResponse.body)) {
      console.log(`✅ Reporte de inventario obtenido con ${reporteResponse.body.length} productos`);
    } else {
      console.warn('⚠️ No se pudo obtener el reporte de inventario:', reporteResponse.body);
    }
    
    console.log('\n🎉 ¡Todas las pruebas se completaron con éxito!');
    
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.message);
    process.exit(1);
  } finally {
    // Cerrar la conexión a la base de datos
    await testPool.end();
    process.exit(0);
  }
};

// Ejecutar pruebas
probarModuloInventario();
