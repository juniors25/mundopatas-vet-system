# 🚀 Faucet Bot - Sistema de Ingresos Pasivos Automatizados

Bot automático de faucets de criptomonedas para generar ingresos pasivos sin experiencia en trading.

## 📋 Características

- ✅ **100% Automático** - Ejecución continua sin intervención manual
- ✅ **Multi-Faucet** - Sistema de rotación entre múltiples faucets
- ✅ **Sin Trading** - Sin riesgo de mercado
- ✅ **Capital Mínimo** - Solo 3 USDT para gas fees
- ✅ **Escalable** - Aumenta ganancias con el tiempo
- ✅ **Monitoreo** - Sistema de logging y alertas
- ✅ **Base de Datos** - Tracking de todas las ganancias

## 🎯 Plataformas Soportadas

1. **FreeBitcoin** - Cada hora
2. **FireFaucet** - Cada 10 minutos
3. **Cointiply** - Cada 10 minutos

## 📦 Instalación

### Requisitos Previos
- Node.js 18+ instalado
- npm o yarn
- Cuenta en Binance (para wallet)
- Cuentas en los faucets

### Pasos de Instalación

```bash
# Clonar el repositorio
git clone <tu-repositorio>
cd faucet-bot

# Instalar dependencias
npm install

# Configurar wallets
cp config/wallets.json.example config/wallets.json
# Editar config/wallets.json con tus credenciales
```

## ⚙️ Configuración

### 1. Configurar Wallet en Binance

1. Crear cuenta en [Binance](https://www.binance.com)
2. Completar KYC (verificación de identidad)
3. Ir a "Wallet" → "Spot"
4. Depositar 3 USDT (para gas fees)
5. Obtener dirección de BTC wallet

### 2. Crear Cuentas en Faucets

#### FreeBitcoin
1. Ir a [FreeBitcoin](https://freebitco.in)
2. Registrarse con email
3. Configurar dirección de wallet BTC
4. Verificar email

#### FireFaucet
1. Ir a [FireFaucet](https://firefaucet.win)
2. Registrarse con email
3. Conectar dirección de wallet
4. Verificar email

#### Cointiply
1. Ir a [Cointiply](https://cointiply.com)
2. Registrarse con email
3. Configurar dirección de wallet
4. Verificar email

### 3. Configurar Archivo de Credenciales

Editar `config/wallets.json`:

```json
{
  "binance": {
    "api_key": "TU_API_KEY",
    "secret_key": "TU_SECRET_KEY",
    "wallet_address": "TU_DIRECCION_BTC",
    "network": "BTC"
  },
  "faucets": {
    "freebitcoin": {
      "username": "TU_EMAIL_FREEBITCOIN",
      "password": "TU_PASSWORD",
      "wallet_address": "TU_DIRECCION_BTC"
    },
    "firefaucet": {
      "username": "TU_EMAIL_FIREFAUCET",
      "password": "TU_PASSWORD",
      "wallet_address": "TU_DIRECCION_BTC"
    },
    "cointiply": {
      "username": "TU_EMAIL_COINTIPLY",
      "password": "TU_PASSWORD",
      "wallet_address": "TU_DIRECCION_BTC"
    }
  }
}
```

## 🚀 Ejecución

### Localmente

```bash
# Iniciar el bot
npm start

# O en modo desarrollo
npm run dev
```

### En Producción (Render)

1. Crear cuenta en [Render](https://render.com)
2. Crear nuevo "Web Service"
3. Conectar repositorio de GitHub
4. Configurar variables de entorno
5. Deploy automático

## 📊 Estrategia de Ganancias

### Mes 1 (Capital: 3 USDT)
- FreeBitcoin: 24 claims/día
- FireFaucet: 144 claims/día
- Cointiply: 144 claims/día
- **Estimado**: 0.0005 - 0.001 BTC ($20-40 USD)

### Mes 2-3 (Capital: 20-40 USD)
- Reinversión del 50% de ganancias
- Optimización de tiempos
- **Estimado**: 0.001 - 0.002 BTC ($40-80 USD)

### Mes 4-6 (Capital: 80-160 USD)
- Sistema completamente optimizado
- Múltiples cuentas
- **Estimado**: 0.002 - 0.005 BTC ($80-200 USD)

## 🔒 Seguridad

- Nunca compartir tus API keys
- Usar permisos limitados en Binance
- Habilitar 2FA en todas las cuentas
- Rotar passwords regularmente
- Monitorear logs regularmente

## 📈 Monitoreo

### Logs
- `logs/combined.log` - Todos los logs
- `logs/error.log` - Solo errores

### Base de Datos
- `database/faucet-bot.db` - SQLite con tracking de ganancias

### Métricas
- Claims exitosos/fallidos
- Ganancias por faucet
- Balance acumulado
- Tiempo de ejecución

## ⚠️ Riesgos

1. **Faucet se vuelve scam** - Mitigación: Diversificación
2. **Cuentas baneadas** - Mitigación: Comportamiento humano
3. **Gas fees altos** - Mitigación: Acumular antes de retirar
4. **Captchas difíciles** - Mitigación: Servicio de captcha pago

## 🛠️ Troubleshooting

### El bot no inicia
- Verificar que Node.js esté instalado
- Verificar que las dependencias estén instaladas
- Revisar logs en `logs/error.log`

### Claims fallidos
- Verificar credenciales en `config/wallets.json`
- Verificar conexión a internet
- Revisar si el faucet está operativo

### Faucets no pagan
- Verificar si el faucet sigue siendo legítimo
- Revisar términos y condiciones
- Considerar cambiar a otro faucet

## 📝 Licencia

MIT License - Uso libre para fines personales y comerciales.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 💡 Tips

- Empezar con capital mínimo (3 USDT)
- No reinvertir todo el capital inicial
- Monitorear el sistema regularmente
- Diversificar entre múltiples faucets
- Ser paciente - las ganancias crecen con el tiempo

## 📞 Soporte

Para soporte, abrir un issue en GitHub o contactar al desarrollador.

---

**⚠️ ADVERTENCIA**: Este sistema es para fines educativos. Las ganancias no están garantizadas y pueden variar significativamente. Usa solo capital que puedas permitirte perder.
