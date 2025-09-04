// Configuración del sistema MUNDO PATAS
module.exports = {
    // Configuración de la aplicación
    APP_MODE: process.env.APP_MODE || 'demo', // 'demo' o 'full'
    
    // Configuración de la versión demo
    DEMO_CONFIG: {
        MAX_CLIENTS: 3,
        MAX_PETS_PER_CLIENT: 2,
        MAX_CONSULTATIONS: 5,
        MAX_ANALYSIS: 3,
        MAX_VACCINES: 5,
        FEATURES_DISABLED: [],
        DEMO_DATA_ENABLED: true,
        WATERMARK_ENABLED: true
    },
    
    // Configuración de la versión completa
    FULL_CONFIG: {
        MAX_CLIENTS: -1, // Sin límite
        MAX_PETS_PER_CLIENT: -1,
        MAX_CONSULTATIONS: -1,
        MAX_ANALYSIS: -1,
        MAX_VACCINES: -1,
        FEATURES_DISABLED: [],
        DEMO_DATA_ENABLED: false,
        WATERMARK_ENABLED: false
    },
    
    // Claves de acceso válidas (generadas por ti)
    VALID_ACCESS_KEYS: [
        'MUNDOPATAS-2024-PREMIUM-001',
        'MUNDOPATAS-2024-PREMIUM-002',
        'MUNDOPATAS-2024-PREMIUM-003',
        'MUNDOPATAS-2024-PREMIUM-004',
        'MUNDOPATAS-2024-PREMIUM-005'
    ],
    
    // Configuración de base de datos
    DATABASE: {
        DEMO_DB: 'veterinaria_demo.db',
        FULL_DB: 'veterinaria_full.db'
    },
    
    // Mensajes del sistema
    MESSAGES: {
        DEMO_LIMIT_REACHED: 'Has alcanzado el límite de la versión demo. Contacta al administrador para obtener la versión completa.',
        INVALID_ACCESS_KEY: 'Clave de acceso inválida. Contacta al administrador para obtener una clave válida.',
        DEMO_WATERMARK: '🚀 VERSIÓN DEMO - MUNDO PATAS'
    }
};
