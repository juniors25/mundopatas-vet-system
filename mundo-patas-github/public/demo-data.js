// Datos de demostración para MUNDO PATAS
const DEMO_DATA = {
    veterinario: {
        nombre_veterinaria: "Clínica Veterinaria Demo",
        nombre_veterinario: "Dr. Juan Pérez",
        email: "demo@mundopatas.com",
        password: "demo123",
        telefono: "555-0123",
        direccion: "Av. Principal 123, Ciudad Demo"
    },
    
    clientes: [
        {
            nombre: "María",
            apellido: "González",
            email: "maria@email.com",
            telefono: "555-1001",
            direccion: "Calle 1 #123"
        },
        {
            nombre: "Carlos",
            apellido: "Rodríguez",
            email: "carlos@email.com",
            telefono: "555-1002",
            direccion: "Calle 2 #456"
        },
        {
            nombre: "Ana",
            apellido: "López",
            email: "ana@email.com",
            telefono: "555-1003",
            direccion: "Calle 3 #789"
        }
    ],
    
    mascotas: [
        {
            nombre: "Max",
            especie: "Perro",
            raza: "Golden Retriever",
            edad: 3,
            peso: 25.5,
            color: "Dorado",
            sexo: "Macho",
            cliente_index: 0
        },
        {
            nombre: "Luna",
            especie: "Gato",
            raza: "Siamés",
            edad: 2,
            peso: 4.2,
            color: "Gris",
            sexo: "Hembra",
            cliente_index: 0
        },
        {
            nombre: "Rocky",
            especie: "Perro",
            raza: "Bulldog",
            edad: 4,
            peso: 18.0,
            color: "Blanco",
            sexo: "Macho",
            cliente_index: 1
        },
        {
            nombre: "Mimi",
            especie: "Gato",
            raza: "Persa",
            edad: 1,
            peso: 3.8,
            color: "Negro",
            sexo: "Hembra",
            cliente_index: 2
        }
    ],
    
    consultas: [
        {
            mascota_index: 0,
            motivo: "Revisión general y vacunación",
            diagnostico: "Animal en buen estado de salud",
            tratamiento: "Aplicación de vacuna antirrábica",
            peso_actual: 25.5,
            temperatura: 38.2,
            observaciones: "Se recomienda revisión en 6 meses"
        },
        {
            mascota_index: 1,
            motivo: "Vómitos y pérdida de apetito",
            diagnostico: "Gastroenteritis leve",
            tratamiento: "Dieta blanda y medicación",
            peso_actual: 4.0,
            temperatura: 39.1,
            observaciones: "Mejoría esperada en 3-5 días"
        },
        {
            mascota_index: 2,
            motivo: "Control de peso y ejercicio",
            diagnostico: "Sobrepeso leve",
            tratamiento: "Plan de ejercicio y dieta",
            peso_actual: 18.5,
            temperatura: 38.0,
            observaciones: "Reducir porciones de comida"
        }
    ],
    
    vacunas: [
        {
            mascota_index: 0,
            nombre_vacuna: "Rabia",
            fecha_aplicacion: "2024-01-15",
            fecha_proxima: "2025-01-15",
            lote: "RAB2024001",
            veterinario: "Dr. Juan Pérez",
            observaciones: "Sin reacciones adversas"
        },
        {
            mascota_index: 0,
            nombre_vacuna: "Parvovirus",
            fecha_aplicacion: "2024-02-01",
            fecha_proxima: "2025-02-01",
            lote: "PAR2024001",
            veterinario: "Dr. Juan Pérez",
            observaciones: "Aplicación exitosa"
        },
        {
            mascota_index: 1,
            nombre_vacuna: "Triple Felina",
            fecha_aplicacion: "2024-01-20",
            fecha_proxima: "2025-01-20",
            lote: "TF2024001",
            veterinario: "Dr. Juan Pérez",
            observaciones: "Reacción leve en el sitio de aplicación"
        }
    ],
    
    analisis: [
        {
            mascota_index: 0,
            tipo_analisis: "Hemograma",
            resultados: "Valores dentro de parámetros normales. Glóbulos rojos: 6.2 M/μL, Glóbulos blancos: 8.5 K/μL",
            observaciones: "Excelente estado de salud"
        },
        {
            mascota_index: 1,
            tipo_analisis: "Análisis de Orina",
            resultados: "Densidad: 1.025, pH: 6.5, Proteínas: negativo",
            observaciones: "Función renal normal"
        }
    ]
};

// Función para cargar datos de demostración
async function loadDemoData() {
    if (typeof window === 'undefined') return; // Solo en el navegador
    
    try {
        console.log('🎭 Cargando datos de demostración...');
        
        // Registrar veterinario demo
        const registerResponse = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(DEMO_DATA.veterinario)
        });
        
        if (!registerResponse.ok) {
            console.log('Veterinario demo ya existe o error en registro');
            return;
        }
        
        const registerData = await registerResponse.json();
        const token = registerData.token;
        
        // Registrar clientes
        const clienteIds = [];
        for (const cliente of DEMO_DATA.clientes) {
            const clienteResponse = await fetch('/api/clientes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(cliente)
            });
            
            if (clienteResponse.ok) {
                const clienteData = await clienteResponse.json();
                clienteIds.push(clienteData.id);
            }
        }
        
        // Registrar mascotas
        const mascotaIds = [];
        for (const mascota of DEMO_DATA.mascotas) {
            const mascotaData = {
                ...mascota,
                cliente_id: clienteIds[mascota.cliente_index]
            };
            delete mascotaData.cliente_index;
            
            const mascotaResponse = await fetch('/api/mascotas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(mascotaData)
            });
            
            if (mascotaResponse.ok) {
                const mascotaResult = await mascotaResponse.json();
                mascotaIds.push(mascotaResult.id);
            }
        }
        
        // Registrar consultas
        for (const consulta of DEMO_DATA.consultas) {
            const consultaData = {
                ...consulta,
                mascota_id: mascotaIds[consulta.mascota_index]
            };
            delete consultaData.mascota_index;
            
            await fetch('/api/consultas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(consultaData)
            });
        }
        
        // Registrar vacunas
        for (const vacuna of DEMO_DATA.vacunas) {
            const vacunaData = {
                ...vacuna,
                mascota_id: mascotaIds[vacuna.mascota_index]
            };
            delete vacunaData.mascota_index;
            
            await fetch('/api/vacunas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(vacunaData)
            });
        }
        
        // Registrar análisis
        for (const analisis of DEMO_DATA.analisis) {
            const analisisData = {
                ...analisis,
                mascota_id: mascotaIds[analisis.mascota_index]
            };
            delete analisisData.mascota_index;
            
            await fetch('/api/analisis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(analisisData)
            });
        }
        
        console.log('✅ Datos de demostración cargados exitosamente');
        
    } catch (error) {
        console.error('❌ Error cargando datos de demostración:', error);
    }
}

// Exportar para uso en el navegador
if (typeof window !== 'undefined') {
    window.DEMO_DATA = DEMO_DATA;
    window.loadDemoData = loadDemoData;
}
