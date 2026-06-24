const cron = require('node-cron');
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Importar módulos de faucets
const freeBitcoin = require('./faucets/freebitcoin');
const fireFaucet = require('./faucets/firefaucet');
const cointiply = require('./faucets/cointiply');

// Importar base de datos
const database = require('./database');

// Configuración de logging
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

// Crear directorio de logs si no existe
if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
}

// Configuración de faucets
const faucetConfig = {
    freebitcoin: {
        enabled: true,
        schedule: '0 * * * *', // Cada hora
        priority: 'high'
    },
    firefaucet: {
        enabled: true,
        schedule: '*/10 * * * *', // Cada 10 minutos
        priority: 'medium'
    },
    cointiply: {
        enabled: true,
        schedule: '*/10 * * * *', // Cada 10 minutos
        priority: 'medium'
    }
};

// Sistema de rotación
class FaucetRotationSystem {
    constructor() {
        this.currentFaucet = 0;
        this.faucets = ['freebitcoin', 'firefaucet', 'cointiply'];
        this.lastExecution = {};
    }

    async executeNext() {
        const faucetName = this.faucets[this.currentFaucet];
        
        if (!faucetConfig[faucetName].enabled) {
            this.currentFaucet = (this.currentFaucet + 1) % this.faucets.length;
            return null;
        }

        try {
            logger.info(`🚀 Ejecutando faucet: ${faucetName}`);
            
            let result;
            switch(faucetName) {
                case 'freebitcoin':
                    result = await freeBitcoin.claim();
                    break;
                case 'firefaucet':
                    result = await fireFaucet.claim();
                    break;
                case 'cointiply':
                    result = await cointiply.claim();
                    break;
            }

            // Registrar en base de datos
            await database.recordClaim(
                faucetName, 
                result.amount || 0, 
                result.success, 
                result.error || null
            );

            this.lastExecution[faucetName] = {
                timestamp: new Date(),
                success: result.success,
                amount: result.amount || 0,
                error: result.error || null
            };

            logger.info(`✅ ${faucetName}: ${result.success ? 'Exitoso' : 'Fallido'} - ${result.amount || 0} satoshis`);
            
            this.currentFaucet = (this.currentFaucet + 1) % this.faucets.length;
            return result;

        } catch (error) {
            logger.error(`❌ Error en ${faucetName}:`, error);
            
            // Registrar error en base de datos
            await database.recordClaim(faucetName, 0, false, error.message);
            
            this.currentFaucet = (this.currentFaucet + 1) % this.faucets.length;
            return { success: false, error: error.message };
        }
    }

    getStatus() {
        return {
            currentFaucet: this.faucets[this.currentFaucet],
            lastExecutions: this.lastExecution,
            enabledFaucets: Object.keys(faucetConfig).filter(f => faucetConfig[f].enabled)
        };
    }
}

// Inicializar sistema de rotación
const rotationSystem = new FaucetRotationSystem();

// Configurar tareas cron
function setupCronJobs() {
    logger.info('⏰ Configurando tareas cron...');

    // FreeBitcoin - Cada hora
    if (faucetConfig.freebitcoin.enabled) {
        cron.schedule(faucetConfig.freebitcoin.schedule, async () => {
            await freeBitcoin.claim();
        });
        logger.info('✅ FreeBitcoin programado: Cada hora');
    }

    // FireFaucet - Cada 10 minutos
    if (faucetConfig.firefaucet.enabled) {
        cron.schedule(faucetConfig.firefaucet.schedule, async () => {
            await fireFaucet.claim();
        });
        logger.info('✅ FireFaucet programado: Cada 10 minutos');
    }

    // Cointiply - Cada 10 minutos
    if (faucetConfig.cointiply.enabled) {
        cron.schedule(faucetConfig.cointiply.schedule, async () => {
            await cointiply.claim();
        });
        logger.info('✅ Cointiply programado: Cada 10 minutos');
    }

    // Reporte diario - Cada 24 horas
    cron.schedule('0 0 * * *', () => {
        generateDailyReport();
    });
    logger.info('✅ Reporte diario programado: Cada 24 horas');
}

// Generar reporte diario
async function generateDailyReport() {
    try {
        const status = rotationSystem.getStatus();
        const totalEarnings = await database.getTotalEarnings();
        const recentClaims = await database.getRecentClaims(20);
        
        logger.info('📊 Reporte Diario del Sistema:');
        logger.info('='.repeat(50));
        logger.info('Estado del Sistema:');
        logger.info(JSON.stringify(status, null, 2));
        logger.info('='.repeat(50));
        logger.info('Ganancias Totales por Faucet:');
        totalEarnings.forEach(earning => {
            logger.info(`${earning.faucet}: ${earning.total} satoshis (${earning.claims} claims)`);
        });
        logger.info('='.repeat(50));
        logger.info('Últimos 20 Claims:');
        recentClaims.forEach(claim => {
            logger.info(`${claim.faucet} - ${claim.amount} satoshis - ${claim.success ? '✅' : '❌'} - ${claim.timestamp}`);
        });
        logger.info('='.repeat(50));
        
        // Aquí se puede agregar envío de email con el reporte
    } catch (error) {
        logger.error('❌ Error generando reporte diario:', error);
    }
}

// Función principal
async function main() {
    logger.info('🚀 Iniciando Bot de Faucets Automatizados...');
    logger.info('💰 Capital inicial: 3 USDT');
    logger.info('⚡ Estrategia: Sistema de rotación multi-faucet');
    
    try {
        // Inicializar base de datos
        logger.info('📊 Inicializando base de datos...');
        await database.init();
        
        // Verificar configuración
        const configPath = path.join(__dirname, '../config/wallets.json');
        if (!fs.existsSync(configPath)) {
            logger.error('❌ Archivo de configuración no encontrado: config/wallets.json');
            logger.info('📝 Por favor, configura tus wallets y cuentas de faucets en config/wallets.json');
            return;
        }

        // Configurar tareas cron
        setupCronJobs();

        // Ejecución inicial de prueba
        logger.info('🧪 Ejecutando prueba inicial...');
        await rotationSystem.executeNext();

        logger.info('✅ Bot iniciado correctamente');
        logger.info('🔄 Sistema en ejecución continua...');
        logger.info('📊 Presiona Ctrl+C para detener');

        // Mantener el proceso activo
        process.on('SIGINT', () => {
            logger.info('🛑 Deteniendo bot...');
            database.close();
            process.exit(0);
        });

    } catch (error) {
        logger.error('❌ Error al iniciar el bot:', error);
        process.exit(1);
    }
}

// Iniciar bot
if (require.main === module) {
    main();
}

module.exports = { rotationSystem, logger };
