const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('./bot').logger;

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, '../database/faucet-bot.db');
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            // Crear directorio de base de datos si no existe
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    logger.error('❌ Error conectando a la base de datos:', err);
                    reject(err);
                } else {
                    logger.info('✅ Base de datos conectada');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    async createTables() {
        return new Promise((resolve, reject) => {
            const queries = [
                `CREATE TABLE IF NOT EXISTS claims (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    faucet TEXT NOT NULL,
                    amount REAL NOT NULL,
                    currency TEXT DEFAULT 'BTC',
                    success BOOLEAN NOT NULL,
                    error TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE TABLE IF NOT EXISTS daily_stats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date DATE NOT NULL,
                    faucet TEXT NOT NULL,
                    total_claims INTEGER DEFAULT 0,
                    total_amount REAL DEFAULT 0,
                    successful_claims INTEGER DEFAULT 0,
                    failed_claims INTEGER DEFAULT 0
                )`,
                `CREATE TABLE IF NOT EXISTS withdrawals (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    faucet TEXT NOT NULL,
                    amount REAL NOT NULL,
                    address TEXT NOT NULL,
                    tx_hash TEXT,
                    status TEXT DEFAULT 'pending',
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )`
            ];

            let completed = 0;
            queries.forEach((query, index) => {
                this.db.run(query, (err) => {
                    if (err) {
                        logger.error(`❌ Error creando tabla ${index}:`, err);
                        reject(err);
                    } else {
                        completed++;
                        if (completed === queries.length) {
                            logger.info('✅ Tablas creadas correctamente');
                            resolve();
                        }
                    }
                });
            });
        });
    }

    async recordClaim(faucet, amount, success, error = null) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO claims (faucet, amount, success, error)
                VALUES (?, ?, ?, ?)
            `;
            
            this.db.run(query, [faucet, amount, success, error], function(err) {
                if (err) {
                    logger.error('❌ Error registrando claim:', err);
                    reject(err);
                } else {
                    logger.info(`💾 Claim registrado: ${faucet} - ${amount} satoshis`);
                    resolve(this.lastID);
                }
            });
        });
    }

    async getDailyStats(date = null) {
        return new Promise((resolve, reject) => {
            const query = date 
                ? `SELECT * FROM daily_stats WHERE date = ?`
                : `SELECT * FROM daily_stats ORDER BY date DESC LIMIT 7`;
            
            const params = date ? [date] : [];
            
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    logger.error('❌ Error obteniendo estadísticas:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getTotalEarnings() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT faucet, SUM(amount) as total, COUNT(*) as claims
                FROM claims 
                WHERE success = 1
                GROUP BY faucet
            `;
            
            this.db.all(query, [], (err, rows) => {
                if (err) {
                    logger.error('❌ Error obteniendo ganancias totales:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async recordWithdrawal(faucet, amount, address) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO withdrawals (faucet, amount, address)
                VALUES (?, ?, ?)
            `;
            
            this.db.run(query, [faucet, amount, address], function(err) {
                if (err) {
                    logger.error('❌ Error registrando retiro:', err);
                    reject(err);
                } else {
                    logger.info(`💸 Retiro registrado: ${faucet} - ${amount} satoshis`);
                    resolve(this.lastID);
                }
            });
        });
    }

    async getRecentClaims(limit = 50) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM claims 
                ORDER BY timestamp DESC 
                LIMIT ?
            `;
            
            this.db.all(query, [limit], (err, rows) => {
                if (err) {
                    logger.error('❌ Error obteniendo claims recientes:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    logger.error('❌ Error cerrando base de datos:', err);
                } else {
                    logger.info('✅ Base de datos cerrada');
                }
            });
        }
    }
}

module.exports = new Database();
