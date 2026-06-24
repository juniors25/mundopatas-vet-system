const puppeteer = require('puppeteer');
const logger = require('../bot').logger;

class FireFaucet {
    constructor() {
        this.url = 'https://firefaucet.win';
        this.username = '';
        this.password = '';
        this.walletAddress = '';
    }

    async loadConfig() {
        try {
            const config = require('../../config/wallets.json');
            this.username = config.faucets.firefaucet.username;
            this.password = config.faucets.firefaucet.password;
            this.walletAddress = config.faucets.firefaucet.wallet_address;
            
            if (!this.username || !this.password) {
                logger.warn('⚠️  FireFaucet: Credenciales no configuradas');
                return false;
            }
            return true;
        } catch (error) {
            logger.error('❌ Error cargando configuración de FireFaucet:', error);
            return false;
        }
    }

    async claim() {
        if (!await this.loadConfig()) {
            return { success: false, error: 'Credenciales no configuradas' };
        }

        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            const page = await browser.newPage();
            
            await page.setViewport({ width: 1280, height: 720 });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

            logger.info('🌐 Navegando a FireFaucet...');
            await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 60000 });

            // Verificar login
            const isLoggedIn = await page.$('#login') === null;
            
            if (!isLoggedIn) {
                logger.info('🔐 Iniciando sesión en FireFaucet...');
                
                await page.type('#login', this.username);
                await page.type('#password', this.password);
                await page.click('button[type="submit"]');
                await page.waitForTimeout(5000);
                
                logger.info('✅ Sesión iniciada');
            }

            // Navegar a sección de claim
            logger.info('🎯 Navegando a sección de claim...');
            await page.goto(`${this.url}/auto`, { waitUntil: 'networkidle2', timeout: 60000 });

            // Esperar botón de claim
            await page.waitForTimeout(3000);

            // FireFaucet usa un sistema de puntos, verificamos si podemos claim
            const claimButton = await page.$('#claimBtn');
            
            if (!claimButton) {
                logger.info('⏰ Claim no disponible en FireFaucet');
                await browser.close();
                return { success: false, error: 'Claim no disponible', amount: 0 };
            }

            // Hacer claim
            logger.info('🎲 Haciendo claim en FireFaucet...');
            await page.click('#claimBtn');
            await page.waitForTimeout(5000);

            // Obtener puntos ganados
            const points = await page.evaluate(() => {
                const element = document.querySelector('#balance');
                return element ? element.textContent : '0';
            });

            logger.info(`💰 Puntos ganados: ${points}`);

            await browser.close();
            
            return { 
                success: true, 
                amount: parseInt(points.replace(/[^0-9]/g, '')) / 100, // Estimación en satoshis
                faucet: 'firefaucet'
            };

        } catch (error) {
            logger.error('❌ Error en claim de FireFaucet:', error);
            await browser.close();
            return { success: false, error: error.message, amount: 0 };
        }
    }
}

module.exports = new FireFaucet();
