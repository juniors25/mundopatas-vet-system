const puppeteer = require('puppeteer');
const logger = require('../bot').logger;

class Cointiply {
    constructor() {
        this.url = 'https://cointiply.com';
        this.username = '';
        this.password = '';
        this.walletAddress = '';
    }

    async loadConfig() {
        try {
            const config = require('../../config/wallets.json');
            this.username = config.faucets.cointiply.username;
            this.password = config.faucets.cointiply.password;
            this.walletAddress = config.faucets.cointiply.wallet_address;
            
            if (!this.username || !this.password) {
                logger.warn('⚠️  Cointiply: Credenciales no configuradas');
                return false;
            }
            return true;
        } catch (error) {
            logger.error('❌ Error cargando configuración de Cointiply:', error);
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

            logger.info('🌐 Navegando a Cointiply...');
            await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 60000 });

            // Verificar login
            const isLoggedIn = await page.$('#login-modal') === null;
            
            if (!isLoggedIn) {
                logger.info('🔐 Iniciando sesión en Cointiply...');
                
                // Hacer clic en login
                await page.click('[data-target="#login-modal"]');
                await page.waitForTimeout(2000);

                await page.type('#login-email', this.username);
                await page.type('#login-password', this.password);
                await page.click('#login-submit');
                await page.waitForTimeout(5000);
                
                logger.info('✅ Sesión iniciada');
            }

            // Navegar a faucet
            logger.info('🎯 Navegando a faucet...');
            await page.goto(`${this.url}/faucet`, { waitUntil: 'networkidle2', timeout: 60000 });

            // Esperar botón de claim
            await page.waitForTimeout(3000);

            const claimButton = await page.$('#claim-button');
            
            if (!claimButton) {
                logger.info('⏰ Claim no disponible en Cointiply');
                await browser.close();
                return { success: false, error: 'Claim no disponible', amount: 0 };
            }

            // Hacer claim
            logger.info('🎲 Haciendo claim en Cointiply...');
            await page.click('#claim-button');
            await page.waitForTimeout(5000);

            // Obtener coins ganados
            const coins = await page.evaluate(() => {
                const element = document.querySelector('#user-coins');
                return element ? element.textContent : '0';
            });

            logger.info(`💰 Coins ganados: ${coins}`);

            await browser.close();
            
            return { 
                success: true, 
                amount: parseInt(coins.replace(/[^0-9]/g, '')) / 10, // Estimación en satoshis
                faucet: 'cointiply'
            };

        } catch (error) {
            logger.error('❌ Error en claim de Cointiply:', error);
            await browser.close();
            return { success: false, error: error.message, amount: 0 };
        }
    }
}

module.exports = new Cointiply();
