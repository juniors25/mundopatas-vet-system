# INSTRUCCIONES DE CONFIGURACIÓN - BOT DE FAUCETS

## 🚀 Paso 1: Preparación Inicial

### 1.1 Instalar Node.js
- Descargar Node.js desde https://nodejs.org
- Instalar versión 18 LTS o superior
- Verificar instalación: `node --version`

### 1.2 Crear Directorio del Proyecto
```bash
mkdir faucet-bot
cd faucet-bot
```

### 1.3 Copiar Archivos del Proyecto
Copiar todos los archivos creados al directorio `faucet-bot`:
- package.json
- render.yaml
- .env.example
- config/wallets.json
- src/ (todos los archivos)
- README.md

## 🔐 Paso 2: Configurar Wallet en Binance

### 2.1 Crear Cuenta en Binance
1. Ir a https://www.binance.com
2. Hacer clic en "Register"
3. Completar registro con email
4. Verificar email

### 2.2 Completar KYC (Verificación de Identidad)
1. Ir a "Profile" → "Identification"
2. Subir documento de identidad
3. Verificar dirección
4. Esperar aprobación (generalmente 1-2 horas)

### 2.3 Depositar 3 USDT
1. Ir a "Wallet" → "Overview"
2. Hacer clic en "Deposit"
3. Seleccionar "USDT"
4. Copiar dirección de depósito
5. Enviar 3 USDT desde otra wallet/exchange

### 2.4 Obtener API Keys
1. Ir a "API Management"
2. Hacer clic en "Create API"
3. Nombrar la API (ej: "Faucet Bot")
4. Configurar permisos:
   - ✅ Enable Reading
   - ✅ Enable Spot & Margin Trading
   - ❌ Enable Withdrawals (NO activar por seguridad)
5. Guardar API Key y Secret Key

### 2.5 Obtener Dirección BTC Wallet
1. Ir a "Wallet" → "Spot"
2. Buscar "BTC"
3. Hacer clic en "Deposit"
4. Copiar dirección BTC

## 📱 Paso 3: Crear Cuentas en Faucets

### 3.1 FreeBitcoin
1. Ir a https://freebitco.in
2. Hacer clic en "SIGN UP"
3. Ingresar email y contraseña
4. Verificar email
5. Configurar dirección BTC en "Profile" → "Bitcoin Address"

### 3.2 FireFaucet
1. Ir a https://firefaucet.win
2. Hacer clic en "Register"
3. Ingresar email y contraseña
4. Verificar email
5. Conectar dirección BTC en "Address"

### 3.3 Cointiply
1. Ir a https://cointiply.com
2. Hacer clic en "Join Now"
3. Ingresar email y contraseña
4. Verificar email
5. Configurar dirección BTC en "Settings" → "Bitcoin Address"

## ⚙️ Paso 4: Configurar Archivo de Credenciales

### 4.1 Editar config/wallets.json
```json
{
  "binance": {
    "api_key": "TU_API_KEY_DE_BINANCE",
    "secret_key": "TU_SECRET_KEY_DE_BINANCE",
    "wallet_address": "TU_DIRECCION_BTC_DE_BINANCE",
    "network": "BTC"
  },
  "faucets": {
    "freebitcoin": {
      "username": "TU_EMAIL_DE_FREEBITCOIN",
      "password": "TU_PASSWORD_DE_FREEBITCOIN",
      "wallet_address": "TU_DIRECCION_BTC"
    },
    "firefaucet": {
      "username": "TU_EMAIL_DE_FIREFAUCET",
      "password": "TU_PASSWORD_DE_FIREFAUCET",
      "wallet_address": "TU_DIRECCION_BTC"
    },
    "cointiply": {
      "username": "TU_EMAIL_DE_COINTIPLY",
      "password": "TU_PASSWORD_DE_COINTIPLY",
      "wallet_address": "TU_DIRECCION_BTC"
    }
  }
}
```

### 4.2 Crear archivo .env
```bash
cp .env.example .env
```

Editar .env con tus credenciales reales.

## 📦 Paso 5: Instalar Dependencias

```bash
cd faucet-bot
npm install
```

## 🧪 Paso 6: Probar Localmente

```bash
npm start
```

Verificar que:
- ✅ El bot inicia correctamente
- ✅ La base de datos se crea
- ✅ Los claims se ejecutan
- ✅ Los logs se generan correctamente

## 🚀 Paso 7: Deploy en Render

### 7.1 Crear Repositorio en GitHub
1. Ir a https://github.com
2. Crear nuevo repositorio "faucet-bot"
3. Subir archivos del proyecto

### 7.2 Crear Servicio en Render
1. Ir a https://dashboard.render.com
2. Hacer clic en "New" → "Web Service"
3. Conectar repositorio de GitHub
4. Render detectará automáticamente el archivo render.yaml
5. Hacer clic en "Create Web Service"

### 7.3 Configurar Variables de Entorno
En Render, agregar las siguientes variables de entorno:
- `NODE_ENV`: production
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD`: true
- `PUPPETEER_EXECUTABLE_PATH`: /usr/bin/chromium-browser

### 7.4 Deploy
- Render hará deploy automático
- Esperar 3-5 minutos
- Verificar logs en el dashboard de Render

## 📊 Paso 8: Monitoreo

### 8.1 Ver Logs en Render
1. Ir al servicio en Render
2. Hacer clic en "Logs"
3. Verificar que los claims se ejecutan correctamente

### 8.2 Verificar Base de Datos
El sistema crea automáticamente `database/faucet-bot.db` con:
- Historial de claims
- Ganancias totales
- Estadísticas diarias

### 8.3 Reportes Diarios
El bot genera reportes diarios automáticamente que incluyen:
- Estado del sistema
- Ganancias por faucet
- Últimos claims
- Errores si los hay

## 🔒 Paso 9: Seguridad

### 9.1 Proteger API Keys
- Nunca compartir tus API keys
- No subir config/wallets.json a GitHub público
- Usar repositorio privado si es posible

### 9.2 Habilitar 2FA
- Habilitar 2FA en Binance
- Habilitar 2FA en todos los faucets
- Usar autenticador Google Authenticator

### 9.3 Monitoreo Regular
- Revisar logs diariamente
- Verificar ganancias
- Revisar si los faucets siguen pagando

## 💰 Paso 10: Estrategia de Retiro

### 10.1 Umbrales de Retiro
- FreeBitcoin: 0.0003 BTC
- FireFaucet: 10,000 satoshis
- Cointiply: 35,000 satoshis

### 10.2 Estrategia de Reinversión
- Mes 1: Reinvertir 100% de ganancias
- Mes 2-3: Reinvertir 50%, retirar 50%
- Mes 4+: Reinvertir 30%, retirar 70%

### 10.3 Retiro a Binance
1. Acumular hasta mínimo de retiro
2. Solicitar retiro a dirección BTC de Binance
3. Esperar confirmación (generalmente 30-60 minutos)
4. Convertir BTC a USDT en Binance
5. Retirar USDT a tu banco

## 🎯 Paso 11: Optimización

### 11.1 Añadir Más Faucets
- AllCoins.pw
- ClaimFreeCoins
- Otros faucets legítimos

### 11.2 Múltiples Cuentas
- Crear cuentas adicionales en cada faucet
- Usar diferentes emails
- Aumentar ganancias proporcionalmente

### 11.3 Optimizar Tiempos
- Ajustar horarios de ejecución
- Evitar horas pico de tráfico
- Maximizar eficiencia

## ⚠️ Paso 12: Troubleshooting

### Problema: El bot no inicia
- Verificar instalación de Node.js
- Verificar instalación de dependencias
- Revisar logs en logs/error.log

### Problema: Claims fallidos
- Verificar credenciales en config/wallets.json
- Verificar conexión a internet
- Revisar si el faucet está operativo

### Problema: Faucet no paga
- Verificar si el faucet sigue siendo legítimo
- Revisar términos y condiciones
- Considerar cambiar a otro faucet

## 📞 Soporte

Para problemas o preguntas:
- Revisar README.md
- Revisar logs del sistema
- Abrir issue en GitHub

---

**⚠️ IMPORTANTE**: Este sistema es para fines educativos. Las ganancias no están garantizadas y pueden variar significativamente. Usa solo capital que puedas permitirte perder.
