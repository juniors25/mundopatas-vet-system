const puppeteer = require('puppeteer');
const logger = require('../bot').logger;

class FreeBitcoin {
    constructor() {
        this.url = 'https://freebitco.in';
        this.username = '';
        this.password = '';
        this.walletAddress = '';
    }

    async loadConfig() {
        try {
            const config = require('../../config/wallets.json');
            this.username = config.faucets.freebitcoin.username;
            this.password = config.faucets.freebitcoin.password;
            this.walletAddress = config.faucets.freebitcoin.wallet_address;
            
            if (!this.username || !this.password) {
                logger.warn('⚠️  FreeBitcoin: Credenciales no configuradas');
                return false;
            }
            return true;
        } catch (error) {
            logger.error('❌ Error cargando configuración de FreeBitcoin:', error);
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
            
            // Configurar viewport y user agent
            await page.setViewport({ width: 1280, height: 720 });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

            logger.info('🌐 Navegando a FreeBitcoin...');
            await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 60000 });

            // Verificar si ya está logueado
            const isLoggedIn = await page.$('#login_form') === null;
            
            if (!isLoggedIn) {
                logger.info('🔐 Iniciando sesión...');
                
                // Hacer clic en Login
                await page.click('#login_button');
                await page.waitForTimeout(2000);

                // Ingresar credenciales
                await page.type('#login_form_btc_address', this.username);
                await page.type('#login_form_password', this.password);
                
                // Hacer clic en submit
                await page.click('#login_button');
                await page.waitForTimeout(5000);
                
                logger.info('✅ Sesión iniciada');
            }

            // Esperar a que el botón de claim esté disponible
            logger.info('⏳ Esperando botón de claim...');
            await page.waitForSelector('#free_play_form_button', { timeout: 30000 });

            // Verificar si el claim está disponible
            const claimButton = await page.$('#free_play_form_button');
            const claimText = await claimButton ? page.evaluate(el => el.textContent, claimButton) : '';
            
            if (claimText && !claimText.includes('ROLL')) {
                logger.info('⏰ Claim no disponible aún, esperando...');
                await browser.close();
                return { success: false, error: 'Claim no disponible', amount: 0 };
            }

            // Hacer clic en ROLL
            logger.info('🎲 Haciendo ROLL...');
            await page.click('#free_play_form_button');
            await page.waitForTimeout(3000);

            // Esperar resultado
            await page.waitForSelector('#multiplier_first_digit', { timeout: 10000 });

            // Obtener ganancia
            const winAmount = await page.evaluate(() => {
                const element = document.querySelector('#win_amount');
                return element ? element.textContent : '0';
            });

            logger.info(`💰 Ganancia: ${winAmount} BTC`);

            // Cerrar popup si aparece
            try {
                await page.waitForSelector('.close-reveal-modal', { timeout: 5000 });
                await page.click('.close-reveal-modal');
                await page.waitForTimeout(1000);
            } catch (e) {
                // Popup no apareció, continuar
            }

            await browser.close();
            
            return { 
                success: true, 
                amount: parseFloat(winAmount.replace(/[^0-9.]/g, '')) * 100000000, // Convertir a satoshis
                faucet: 'freebitcoin'
            };

        } catch (error) {
            logger.error('❌ Error en claim de FreeBitcoin:', error);
            await browser.close();
            return { success: false, error: error.message, amount: 0 };
        }
    }

    async getBalance() {
        // Implementar para obtener balance actual
        return { success: false, error: 'No implementado aún' };
    }
}

module.exports = new FreeBitcoin();
