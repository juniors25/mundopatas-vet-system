# 🤖 Guía Completa del Bot de Notificaciones

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Configuración Inicial](#configuración-inicial)
4. [Métodos de Ejecución](#métodos-de-ejecución)
5. [Configuración de Canales](#configuración-de-canales)
6. [Pruebas y Verificación](#pruebas-y-verificación)
7. [Solución de Problemas](#solución-de-problemas)

---

## 📖 Descripción General

El **Bot de Notificaciones de Mundo Patas** es un sistema automático que:

- ✅ Verifica diariamente el alimento de todas las mascotas
- ✅ Calcula días restantes basándose en consumo diario
- ✅ Envía alertas automáticas a los clientes por Email, WhatsApp o Telegram
- ✅ Registra todas las notificaciones en la base de datos
- ✅ Previene envíos duplicados (máximo 1 por día por mascota)

---

## 🏗️ Arquitectura del Sistema

### Componentes Principales

```
📁 Proyecto
├── 📄 bot-notificaciones.js          # Script independiente del bot
├── 📄 server-postgres.js             # Servidor con cron integrado (opcional)
├── 📁 services/
│   ├── verificador-alimento.js       # Lógica de verificación
│   └── notificaciones.js             # Envío de mensajes
├── 📄 .env                           # Configuración (crear desde .env.example)
└── 📄 configurar-bot-windows.ps1     # Script de instalación Windows
```

### Flujo de Trabajo

```
1. Bot se ejecuta (manual, cron o Task Scheduler)
   ↓
2. Conecta a la base de datos PostgreSQL
   ↓
3. Obtiene todas las mascotas con datos de alimento
   ↓
4. Calcula días restantes para cada mascota
   ↓
5. Si días ≤ umbral configurado → Genera alerta
   ↓
6. Verifica que no se haya enviado en últimas 24h
   ↓
7. Envía notificaciones por canales habilitados
   ↓
8. Registra en base de datos
   ↓
9. Genera reporte de ejecución
```

---

## ⚙️ Configuración Inicial

### Paso 1: Crear archivo `.env`

Copia el archivo `.env.example` y renómbralo a `.env`:

```bash
cp .env.example .env
```

### Paso 2: Configurar Variables Básicas

```env
# Base de datos (OBLIGATORIO)
DATABASE_URL=postgresql://usuario:password@localhost:5432/mundopatas

# JWT Secret (OBLIGATORIO)
JWT_SECRET=tu_clave_secreta_muy_segura_minimo_32_caracteres
```

### Paso 3: Configurar Canales de Notificación

#### 📧 Email (Gmail - Recomendado)

1. **Habilitar verificación en 2 pasos** en tu cuenta Google
2. **Crear contraseña de aplicación**:
   - Ve a: https://myaccount.google.com/apppasswords
   - Selecciona "Correo" y "Otro dispositivo"
   - Copia la contraseña de 16 caracteres

3. **Configurar en `.env`**:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=abcd efgh ijkl mnop  # 16 caracteres sin espacios
```

#### 📱 WhatsApp (Twilio - Opcional)

1. **Crear cuenta** en https://www.twilio.com/
2. **Obtener credenciales** del Dashboard
3. **Configurar WhatsApp Sandbox**: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886
```

#### 💬 Telegram (Opcional)

1. **Crear bot** con @BotFather en Telegram
   - Envía `/newbot` a @BotFather
   - Sigue las instrucciones
   - Copia el token

2. **Configurar en `.env`**:
```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

---

## 🚀 Métodos de Ejecución

Tienes **3 opciones** para ejecutar el bot:

### Opción 1: Ejecución Manual (Desarrollo/Pruebas)

```bash
node bot-notificaciones.js
```

**Ventajas:**
- ✅ Ideal para pruebas
- ✅ Ver resultados inmediatos
- ✅ Depuración fácil

**Desventajas:**
- ❌ No es automático
- ❌ Requiere ejecución manual

---

### Opción 2: Task Scheduler (Windows - Recomendado)

#### Instalación Automática

```powershell
# Ejecutar como Administrador
.\configurar-bot-windows.ps1
```

#### Instalación Manual

1. **Abrir Task Scheduler** (Programador de tareas)
2. **Crear tarea básica**:
   - Nombre: `MundoPatas-BotNotificaciones`
   - Descripción: `Bot de notificaciones automáticas`
3. **Desencadenador**: Diariamente a las 9:00 AM
4. **Acción**: Iniciar programa
   - Programa: `node.exe`
   - Argumentos: `bot-notificaciones.js`
   - Directorio: `C:\ruta\a\tu\proyecto`
5. **Guardar**

**Ventajas:**
- ✅ Totalmente automático
- ✅ Se ejecuta aunque no estés logueado
- ✅ Logs en Task Scheduler
- ✅ Fácil de configurar en Windows

**Desventajas:**
- ❌ Solo para Windows
- ❌ Requiere que la PC esté encendida

---

### Opción 3: Cron Integrado en el Servidor

#### Habilitar en `.env`

```env
ENABLE_AUTO_CRON=true
```

#### Reiniciar el servidor

```bash
npm start
```

El bot se ejecutará automáticamente todos los días a las 9:00 AM mientras el servidor esté corriendo.

**Ventajas:**
- ✅ No requiere configuración adicional
- ✅ Funciona en cualquier sistema operativo
- ✅ Ideal para servidores en la nube

**Desventajas:**
- ❌ Requiere que el servidor esté siempre corriendo
- ❌ Si el servidor se reinicia, el cron se reinicia

---

## 🎯 Configuración de Canales desde la Interfaz Web

### Acceder a Configuración

1. Inicia sesión en el sistema
2. Ve a **Configuración → Notificaciones**
3. Configura los parámetros:

```
📧 Email: ☑️ Habilitado
   └─ Email: veterinaria@ejemplo.com

📱 WhatsApp: ☑️ Habilitado
   └─ Teléfono: +5491123456789

💬 Telegram: ☐ Deshabilitado

⏰ Días de aviso: 7 días
```

### Parámetros Configurables

| Parámetro | Descripción | Valor por Defecto |
|-----------|-------------|-------------------|
| **Email Habilitado** | Enviar notificaciones por email | ✅ Sí |
| **WhatsApp Habilitado** | Enviar notificaciones por WhatsApp | ❌ No |
| **Telegram Habilitado** | Enviar notificaciones por Telegram | ❌ No |
| **Días de Aviso** | Umbral para generar alertas | 7 días |

---

## 🧪 Pruebas y Verificación

### 1. Probar Conexión a Base de Datos

```bash
node -e "require('./database-postgres').initializeDatabase().then(() => console.log('✅ OK')).catch(e => console.error('❌', e))"
```

### 2. Ejecutar Bot Manualmente

```bash
node bot-notificaciones.js
```

**Salida esperada:**

```
═══════════════════════════════════════════════════════════
🤖 BOT DE NOTIFICACIONES - MUNDO PATAS
═══════════════════════════════════════════════════════════
⏰ Fecha y hora: 2/10/2025 09:00:00

🔌 Conectando a la base de datos...
✅ Conexión establecida

🔍 Iniciando verificación de alimento...
📊 Encontradas 15 mascotas con datos de alimento
⚠️ Alerta: Max - 5 días restantes
✅ Email enviado a cliente@ejemplo.com

═══════════════════════════════════════════════════════════
📊 RESUMEN DE EJECUCIÓN
═══════════════════════════════════════════════════════════
✅ Estado: EXITOSO
📋 Mascotas verificadas: 15
⚠️  Alertas generadas: 3
📧 Notificaciones enviadas: 3
═══════════════════════════════════════════════════════════
```

### 3. Verificar desde la API

```bash
# Obtener alertas activas
curl -H "Authorization: Bearer TU_TOKEN" http://localhost:3000/api/notificaciones/alertas

# Ver historial de notificaciones
curl -H "Authorization: Bearer TU_TOKEN" http://localhost:3000/api/notificaciones/historial
```

### 4. Probar Envío Manual desde el Sistema

1. Inicia sesión en el sistema
2. Ve a **Notificaciones → Verificar Alimento**
3. Haz clic en **"Verificar Ahora"**
4. Revisa el resultado

---

## 🔧 Solución de Problemas

### ❌ Error: "Cannot find module 'dotenv'"

**Solución:**
```bash
npm install
```

### ❌ Error: "Connection refused" (Base de datos)

**Causas posibles:**
1. PostgreSQL no está corriendo
2. Credenciales incorrectas en `DATABASE_URL`
3. Firewall bloqueando conexión

**Solución:**
```bash
# Verificar PostgreSQL
pg_isready

# Verificar credenciales en .env
DATABASE_URL=postgresql://usuario:password@localhost:5432/mundopatas
```

### ❌ Error: "Invalid login" (Email)

**Causas:**
1. Contraseña incorrecta
2. No habilitaste "Contraseñas de aplicación" en Google
3. Verificación en 2 pasos deshabilitada

**Solución:**
1. Ve a https://myaccount.google.com/apppasswords
2. Genera nueva contraseña de aplicación
3. Actualiza `SMTP_PASS` en `.env`

### ⚠️ Las notificaciones no se envían

**Verificar:**

1. **¿Hay mascotas con datos de alimento?**
```sql
SELECT COUNT(*) FROM mascotas 
WHERE peso_bolsa_kg IS NOT NULL 
  AND gramos_diarios IS NOT NULL 
  AND fecha_inicio_bolsa IS NOT NULL;
```

2. **¿Hay alertas que cumplan el umbral?**
   - Verifica que `dias_restantes <= dias_aviso_alimento`

3. **¿Se envió notificación en las últimas 24 horas?**
   - El sistema previene duplicados

4. **¿Están habilitados los canales?**
   - Revisa la configuración en la interfaz web

### 📊 Ver Logs del Bot

**Task Scheduler (Windows):**
1. Abre Task Scheduler
2. Busca `MundoPatas-BotNotificaciones`
3. Pestaña "Historial"

**Cron Integrado:**
- Los logs aparecen en la consola del servidor

**Ejecución Manual:**
- Los logs aparecen directamente en la terminal

---

## 📈 Monitoreo y Estadísticas

### Endpoints Disponibles

```javascript
// Obtener configuración
GET /api/notificaciones/config

// Actualizar configuración
POST /api/notificaciones/config

// Ver historial de notificaciones
GET /api/notificaciones/historial

// Ver alertas activas
GET /api/notificaciones/alertas

// Ejecutar verificación manual
POST /api/notificaciones/verificar-alimento

// Calcular días restantes de una mascota
GET /api/mascotas/:id/alimento-restante
```

### Consultas SQL Útiles

```sql
-- Ver últimas notificaciones enviadas
SELECT * FROM notificaciones_enviadas 
ORDER BY fecha_envio DESC 
LIMIT 10;

-- Ver alertas activas
SELECT * FROM alertas_alimento 
WHERE fecha_alerta > NOW() - INTERVAL '7 days'
ORDER BY dias_restantes ASC;

-- Estadísticas de envíos
SELECT 
    canal,
    estado,
    COUNT(*) as total
FROM notificaciones_enviadas
WHERE fecha_envio > NOW() - INTERVAL '30 days'
GROUP BY canal, estado;
```

---

## 🎯 Mejores Prácticas

### ✅ Recomendaciones

1. **Usa Task Scheduler en Windows** para ejecución automática confiable
2. **Configura al menos Email** como canal de notificación
3. **Prueba manualmente** antes de automatizar
4. **Revisa logs regularmente** para detectar problemas
5. **Mantén actualizado** el campo de alimento en cada mascota
6. **Configura días de aviso** según tus necesidades (3-7 días recomendado)

### ⚠️ Evitar

1. ❌ No ejecutar múltiples instancias simultáneamente
2. ❌ No usar contraseñas reales de email (usar contraseñas de aplicación)
3. ❌ No compartir el archivo `.env` (contiene credenciales)
4. ❌ No modificar directamente las tablas de notificaciones

---

## 📞 Soporte

Si tienes problemas:

1. **Revisa esta guía** completa
2. **Verifica logs** del bot
3. **Consulta la documentación** de cada servicio (Gmail, Twilio, Telegram)
4. **Ejecuta pruebas manuales** para aislar el problema

---

## 🎉 ¡Listo!

Tu bot de notificaciones está configurado y listo para funcionar. El sistema ahora:

- ✅ Monitorea automáticamente el alimento de todas las mascotas
- ✅ Envía alertas oportunas a los clientes
- ✅ Registra todas las notificaciones
- ✅ Previene que las mascotas se queden sin alimento

**¡Mundo Patas está cuidando a tus pacientes 24/7! 🐾**
