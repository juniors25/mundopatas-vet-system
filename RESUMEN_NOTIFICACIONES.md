# 📱 Sistema de Notificaciones Automáticas - Mundo Patas

## ✅ ¿Qué se implementó?

### 1. **Bot de Verificación Automática**
- ✅ Verifica diariamente el alimento de todas las mascotas
- ✅ Calcula días restantes basado en peso de bolsa y consumo diario
- ✅ Genera alertas cuando el alimento está por terminarse
- ✅ Registra todas las verificaciones en la base de datos

### 2. **Sistema de Notificaciones por Email**
- ✅ Envío automático de emails a clientes
- ✅ Plantilla HTML profesional con información completa
- ✅ Incluye datos de la veterinaria (nombre, teléfono, dirección, email)
- ✅ Niveles de urgencia (🚨 URGENTE, ⚠️ IMPORTANTE, ℹ️ AVISO)
- ✅ Soporte para Gmail, Outlook, Yahoo, SendGrid

### 3. **Endpoints API**
- ✅ `POST /api/notificaciones/verificar-alimento` - Verificación manual
- ✅ `GET /api/notificaciones/config` - Obtener configuración
- ✅ `POST /api/notificaciones/config` - Actualizar configuración
- ✅ `GET /api/notificaciones/historial` - Ver historial de envíos
- ✅ `GET /api/notificaciones/alertas` - Ver alertas activas
- ✅ `GET /api/mascotas/:id/alimento-restante` - Calcular alimento restante

### 4. **Base de Datos**
- ✅ Tabla `notificaciones_config` - Configuración por veterinaria
- ✅ Tabla `notificaciones_enviadas` - Historial completo
- ✅ Tabla `alertas_alimento` - Alertas generadas
- ✅ Campos en `mascotas` para datos de alimento

### 5. **Configuración y Automatización**
- ✅ Script `bot-notificaciones.js` - Ejecutable independiente
- ✅ Script `configurar-bot-windows.ps1` - Configuración automática en Windows
- ✅ Script `test-notificaciones.js` - Pruebas completas
- ✅ Documentación completa en `CONFIGURACION_BOT_NOTIFICACIONES.md`

---

## 🚀 Cómo Empezar (Paso a Paso)

### Opción 1: Prueba Rápida (Sin Email Real)

```powershell
# 1. Ejecutar prueba completa
node test-notificaciones.js
```

Esto creará:
- ✅ Un cliente de prueba
- ✅ Una mascota con alimento bajo (5 días restantes)
- ✅ Una alerta automática
- ✅ Una notificación simulada (sin enviar email real)

### Opción 2: Configuración Completa (Con Email Real)

#### Paso 1: Configurar Gmail

1. Ve a https://myaccount.google.com/security
2. Activa "Verificación en dos pasos"
3. Busca "Contraseñas de aplicaciones"
4. Crea una contraseña para "Correo" / "Windows Computer"
5. Copia la contraseña de 16 caracteres

#### Paso 2: Crear archivo .env

Crea un archivo `.env` en la raíz del proyecto:

```env
# Base de datos
DATABASE_URL=postgresql://postgres:vale2587@localhost:5432/mundopatas
JWT_SECRET=mundo-patas-secret-key
PORT=3000

# Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
```

#### Paso 3: Probar envío real

```powershell
# Ejecutar prueba con email real
node test-notificaciones.js
```

Deberías recibir un email en `juan.perez@example.com` (o el email que configuraste).

#### Paso 4: Configurar ejecución automática

```powershell
# Ejecutar como Administrador
.\configurar-bot-windows.ps1
```

Esto programará el bot para ejecutarse **diariamente a las 9:00 AM**.

---

## 📊 Cómo Funciona

### 1. Datos de Alimento por Mascota

Para cada mascota, el veterinario ingresa:

```javascript
{
  "tipo_alimento": "Balanceado Premium",
  "marca_alimento": "Royal Canin",
  "peso_bolsa_kg": 15,           // Peso de la bolsa en kg
  "gramos_diarios": 300,         // Consumo diario en gramos
  "fecha_inicio_bolsa": "2025-09-15"  // Cuándo se abrió la bolsa
}
```

### 2. Cálculo Automático

El sistema calcula:

```
Días totales = (Peso bolsa en gramos) / (Gramos diarios)
Días transcurridos = Hoy - Fecha inicio
Días restantes = Días totales - Días transcurridos
Porcentaje restante = (Días restantes / Días totales) × 100
```

**Ejemplo:**
- Bolsa de 15 kg = 15,000 gramos
- Consumo: 300g/día
- Días totales: 15,000 / 300 = 50 días
- Si pasaron 45 días → Quedan 5 días (10% restante)

### 3. Generación de Alertas

El bot verifica:
- ¿Días restantes ≤ Días de aviso configurados?
- Si SÍ → Genera alerta
- ¿Ya se envió notificación en las últimas 24 horas?
- Si NO → Envía notificación

### 4. Envío de Notificación

El email incluye:
- 🐕 Nombre de la mascota
- ⏰ Días restantes
- 📊 Porcentaje restante
- 🍖 Tipo y marca de alimento
- ⚖️ Consumo diario
- 🏥 Datos completos de la veterinaria
- 📞 Teléfono de contacto
- 📧 Email de contacto
- 📍 Dirección

---

## 📧 Ejemplo de Email Enviado

**Para:** juan.perez@example.com  
**De:** Mundo Patas Veterinaria <tu_email@gmail.com>  
**Asunto:** ⚠️ IMPORTANTE - Alimento de Max por terminarse

```
⚠️ IMPORTANTE - Alimento por Terminarse

Hola Juan Pérez,

Le informamos que el alimento de su mascota Max está por terminarse.

📊 Estado actual:
• Días restantes: 5 días
• Porcentaje restante: 10%
• Tipo de alimento: Balanceado Premium
• Marca: Royal Canin
• Consumo diario: 300g

Para cualquier consulta, no dude en contactarnos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏥 Veterinaria Los Amigos
👨‍⚕️ Dr. Fernando García
📞 +54 11 1234-5678
📧 vale@gmail.com
📍 Av. Principal 123, Buenos Aires
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Saludos,
Veterinaria Los Amigos 🐾
```

---

## 🎯 Uso en el Sistema Web

### 1. Configurar Notificaciones

En el sistema: **Configuración → Notificaciones**

```javascript
{
  "email_habilitado": true,
  "dias_aviso_alimento": 7,  // Avisar cuando queden 7 días o menos
  "email_notificaciones": "notificaciones@veterinaria.com" // Opcional
}
```

### 2. Agregar Datos de Alimento a Mascota

Al crear/editar una mascota:
1. Ir a la ficha de la mascota
2. Sección "Información de Alimento"
3. Completar todos los campos
4. Guardar

### 3. Ver Alertas Activas

**Notificaciones → Alertas Activas**

Muestra todas las mascotas con alimento bajo.

### 4. Ver Historial

**Notificaciones → Historial**

Muestra todas las notificaciones enviadas con:
- Fecha y hora
- Cliente y mascota
- Canal (email)
- Estado (enviado/error)
- Mensaje completo

---

## 🔧 Comandos Útiles

```powershell
# Probar el bot manualmente
node bot-notificaciones.js

# Ejecutar prueba completa
node test-notificaciones.js

# Configurar ejecución automática (como Admin)
.\configurar-bot-windows.ps1

# Ver tarea programada
Get-ScheduledTask -TaskName "MundoPatas-BotNotificaciones"

# Ejecutar tarea manualmente
Start-ScheduledTask -TaskName "MundoPatas-BotNotificaciones"

# Ver historial de ejecuciones
Get-ScheduledTaskInfo -TaskName "MundoPatas-BotNotificaciones"
```

---

## 📁 Archivos Creados

```
📦 windsurf-project/
├── 📄 bot-notificaciones.js              # Bot ejecutable
├── 📄 configurar-bot-windows.ps1         # Configuración automática
├── 📄 test-notificaciones.js             # Script de prueba
├── 📄 CONFIGURACION_BOT_NOTIFICACIONES.md # Guía detallada
├── 📄 RESUMEN_NOTIFICACIONES.md          # Este archivo
├── 📂 services/
│   ├── 📄 notificaciones.js              # Servicio de envío
│   └── 📄 verificador-alimento.js        # Lógica de verificación
└── 📄 server-postgres.js                 # Servidor con endpoints
```

---

## 🎉 ¡Listo para Usar!

El sistema está **100% funcional** y listo para:

1. ✅ **Probar sin email real** → `node test-notificaciones.js`
2. ✅ **Configurar Gmail** → Crear contraseña de aplicación
3. ✅ **Probar con email real** → Configurar .env y ejecutar prueba
4. ✅ **Automatizar** → Ejecutar `configurar-bot-windows.ps1`
5. ✅ **Usar en producción** → Agregar datos de alimento a mascotas

---

## 💡 Próximos Pasos Sugeridos

1. **Agregar WhatsApp** (opcional)
   - Configurar cuenta Twilio
   - Activar WhatsApp Business API
   - Descomentar código en `verificador-alimento.js`

2. **Agregar Telegram** (opcional)
   - Crear bot con @BotFather
   - Configurar TELEGRAM_BOT_TOKEN
   - Obtener Chat IDs de clientes

3. **Panel de Administración**
   - Crear interfaz web para configuración
   - Dashboard con estadísticas
   - Gestión de notificaciones

4. **Notificaciones de Vacunas**
   - Implementar verificación de vacunas vencidas
   - Enviar recordatorios automáticos
   - Similar al sistema de alimento

---

## 📞 Soporte

- 📖 Guía completa: `CONFIGURACION_BOT_NOTIFICACIONES.md`
- 📖 Guía de notificaciones: `GUIA_NOTIFICACIONES.md`
- 🧪 Script de prueba: `node test-notificaciones.js`
- 🤖 Bot manual: `node bot-notificaciones.js`

---

**¡El sistema de notificaciones está completamente implementado y funcionando!** 🎉🐾
