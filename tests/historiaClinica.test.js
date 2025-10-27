const request = require('supertest');
const app = require('../api/server');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Configuración de la base de datos de prueba
const testDbConfig = {
    user: process.env.TEST_DB_USER || 'postgres',
    host: process.env.TEST_DB_HOST || 'localhost',
    database: process.env.TEST_DB_NAME || 'mundopatas_test',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
    port: process.env.TEST_DB_PORT || 5432,
};

const pool = new Pool(testDbConfig);

// Datos de prueba
const testVeterinario = {
    nombre_veterinario: 'Dr. Prueba',
    email: 'test@veterinario.com',
    password: 'test123',
    tipo_cuenta: 'PREMIUM'
};

const testCliente = {
    nombre: 'Cliente',
    apellido: 'Prueba',
    email: 'cliente@test.com',
    telefono: '1234567890'
};

const testMascota = {
    nombre: 'Firulais',
    especie: 'Perro',
    raza: 'Labrador',
    edad: 3,
    sexo: 'Macho'
};

let authToken;
let clienteId;
let mascotaId;
let historiaId;

// Configuración antes de las pruebas
describe('API de Historias Clínicas', () => {
    beforeAll(async () => {
        // Limpiar la base de datos de prueba
        await pool.query('TRUNCATE TABLE historias_clinicas CASCADE');
        await pool.query('TRUNCATE TABLE mascotas CASCADE');
        await pool.query('TRUNCATE TABLE clientes CASCADE');
        await pool.query('TRUNCATE TABLE veterinarios CASCADE');
        await pool.query('TRUNCATE TABLE tipos_consulta CASCADE');
        await pool.query('TRUNCATE TABLE medicamentos CASCADE');
        
        // Insertar datos de prueba
        // 1. Crear veterinario
        const hashedPassword = await bcrypt.hash(testVeterinario.password, 10);
        const { rows: [veterinario] } = await pool.query(
            'INSERT INTO veterinarios (nombre_veterinario, email, password, tipo_cuenta) VALUES ($1, $2, $3, $4) RETURNING *',
            [testVeterinario.nombre_veterinario, testVeterinario.email, hashedPassword, testVeterinario.tipo_cuenta]
        );
        
        // 2. Crear cliente
        const { rows: [cliente] } = await pool.query(
            'INSERT INTO clientes (nombre, apellido, email, telefono, veterinario_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [testCliente.nombre, testCliente.apellido, testCliente.email, testCliente.telefono, veterinario.id]
        );
        clienteId = cliente.id;
        
        // 3. Crear mascota
        const { rows: [mascota] } = await pool.query(
            'INSERT INTO mascotas (cliente_id, nombre, especie, raza, edad, sexo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [clienteId, testMascota.nombre, testMascota.especie, testMascota.raza, testMascota.edad, testMascota.sexo]
        );
        mascotaId = mascota.id;
        
        // 4. Insertar tipos de consulta de prueba
        await pool.query(
            `INSERT INTO tipos_consulta (nombre, descripcion, color) VALUES 
             ('Consulta General', 'Consulta médica general', '#4CAF50'),
             ('Vacunación', 'Aplicación de vacunas', '#2196F3'),
             ('Cirugía', 'Procedimientos quirúrgicos', '#F44336')`
        );
        
        // 5. Insertar medicamentos de prueba
        await pool.query(
            `INSERT INTO medicamentos (nombre_comercial, principio_activo, presentacion, concentracion, stock_actual) VALUES 
             ('Amoxicilina', 'Amoxicilina', 'Tabletas', '500mg', 100),
             ('Ivermectina', 'Ivermectina', 'Inyectable', '1%', 50),
             ('Meloxicam', 'Meloxicam', 'Suspensión', '1.5mg/ml', 30)`
        );
        
        // 6. Obtener token de autenticación
        const loginRes = await request(app)
            .post('/api/login')
            .send({
                email: testVeterinario.email,
                password: testVeterinario.password
            });
            
        authToken = loginRes.body.token;
    });
    
    afterAll(async () => {
        // Cerrar la conexión a la base de datos
        await pool.end();
    });
    
    describe('Creación de historias clínicas', () => {
        it('debería crear una nueva historia clínica', async () => {
            const nuevaHistoria = {
                mascota_id: mascotaId,
                tipo_consulta_id: 1, // Consulta General
                motivo_consulta: 'Control de rutina',
                sintomatologia: 'Paciente asintomático',
                diagnostico: 'Estado de salud óptimo',
                tratamiento: 'Control en 6 meses',
                peso_kg: 4.5,
                temperatura_c: 38.5,
                frecuencia_cardiaca: 90,
                frecuencia_respiratoria: 20,
                medicamentos: [
                    {
                        medicamento_id: 1, // Amoxicilina
                        dosis: '1 tableta cada 12 horas',
                        frecuencia: 'Cada 12 horas por 7 días',
                        duracion_dias: 7,
                        indicaciones: 'Administrar con alimento'
                    }
                ]
            };
            
            const res = await request(app)
                .post('/api/historias-clinicas')
                .set('Authorization', `Bearer ${authToken}`)
                .send(nuevaHistoria);
                
            expect(res.statusCode).toEqual(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data.mascota_id).toBe(mascotaId);
            
            // Guardar el ID para pruebas posteriores
            historiaId = res.body.data.id;
        });
        
        it('debería fallar si faltan campos requeridos', async () => {
            const res = await request(app)
                .post('/api/historias-clinicas')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    // Faltan campos requeridos
                    motivo_consulta: 'Sin datos requeridos'
                });
                
            expect(res.statusCode).toEqual(400);
            expect(res.body.success).toBe(false);
        });
    });
    
    describe('Gestión de archivos adjuntos', () => {
        it('debería subir un archivo adjunto a una historia clínica', async () => {
            // Primero necesitamos una historia clínica existente
            if (!historiaId) {
                const res = await request(app)
                    .post('/api/historias-clinicas')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        mascota_id: mascotaId,
                        tipo_consulta_id: 1,
                        motivo_consulta: 'Prueba de archivo adjunto'
                    });
                
                historiaId = res.body.data.id;
            }
            
            // Crear un archivo de prueba
            const testFilePath = path.join(__dirname, 'test-file.txt');
            fs.writeFileSync(testFilePath, 'Este es un archivo de prueba');
            
            // Subir el archivo
            const res = await request(app)
                .post(`/api/historias-clinicas/${historiaId}/archivos`)
                .set('Authorization', `Bearer ${authToken}`)
                .attach('archivo', testFilePath);
                
            // Limpiar el archivo de prueba
            fs.unlinkSync(testFilePath);
            
            expect(res.statusCode).toEqual(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data.historia_clinica_id).toBe(parseInt(historiaId));
        });
    });
    
    describe('Consulta de historial clínico', () => {
        it('debería obtener el historial clínico de una mascota', async () => {
            const res = await request(app)
                .get(`/api/historias-clinicas/mascota/${mascotaId}`)
                .set('Authorization', `Bearer ${authToken}`);
                
            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.paginacion).toBeDefined();
        });
        
        it('debería incluir archivos adjuntos cuando se solicite', async () => {
            const res = await request(app)
                .get(`/api/historias-clinicas/mascota/${mascotaId}?incluir_archivos=true`)
                .set('Authorization', `Bearer ${authToken}`);
                
            expect(res.statusCode).toEqual(200);
            
            // Verificar que al menos una historia clínica tenga la propiedad 'archivos'
            const tieneArchivos = res.body.data.some(hc => 
                Array.isArray(hc.archivos)
            );
            
            expect(tieneArchivos).toBe(true);
        });
    });
    
    describe('Estadísticas', () => {
        it('debería obtener estadísticas de historias clínicas', async () => {
            const res = await request(app)
                .get('/api/historias-clinicas/estadisticas')
                .set('Authorization', `Bearer ${authToken}`);
                
            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('total_historias');
            expect(Array.isArray(res.body.data.por_tipo)).toBe(true);
            expect(Array.isArray(res.body.data.historial_mensual)).toBe(true);
        });
    });
    
    describe('Gestión de vacunas', () => {
        it('debería registrar una vacuna aplicada', async () => {
            // Primero necesitamos una vacuna en el catálogo
            const { rows: [vacuna] } = await pool.query(
                `INSERT INTO vacunas 
                 (nombre, tipo, descripcion, frecuencia_meses) 
                 VALUES ('Antirrábica', 'Obligatoria', 'Vacuna contra la rabia', 12) 
                 RETURNING *`
            );
            
            const res = await request(app)
                .post(`/api/historias-clinicas/mascota/${mascotaId}/vacunas`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    vacuna_id: vacuna.id,
                    lote: 'LOTE123',
                    notas: 'Aplicación sin incidencias'
                });
                
            expect(res.statusCode).toEqual(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data.vacuna_id).toBe(vacuna.id);
        });
    });
});
