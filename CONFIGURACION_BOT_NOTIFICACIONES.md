# 🤖 Configuración del Bot de Notificaciones - Mundo Patas

## 📋 Descripción

El Bot de Notificaciones es un sistema automático que:
- ✅ Verifica diariamente el alimento de todas las mascotas
- ✅ Calcula cuántos días quedan antes de que se termine
- ✅ Envía notificaciones automáticas por email a los clientes
- ✅ Incluye información completa de la veterinaria en cada notificación
- ✅ Registra todas las notificaciones enviadas

---

## 🚀 Configuración Rápida (5 minutos)

### Paso 1: Configurar Email (Gmail - Recomendado)

1. **Crear contraseña de aplicación en Gmail:**
   - Ve a: https://myaccount.google.com/security
   - Activa "Verificación en dos pasos" (si no está activa)
   - Busca "Contraseñas de aplicaciones"
   - Selecciona "Correo" y "Windows Computer"
   - Copia la contraseña de 16 caracteres

2. **Configurar variables de entorno:**
   
   Crea un archivo `.env` en la raíz del proyecto con:
   ```env
   # Base de datos
   DATABASE_URL=postgresql://postgres:vale2587@localhost:5432/mundopatas
   JWT_SECRET=mundo-patas-secret-key
   PORT=3000
   
   # Configuración de Email
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=tu_email@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx
   ```

### Paso 2: Probar el Bot Manualmente

```powershell
# Ejecutar el bot una vez para probar
node bot-notificaciones.js
```

Deberías ver algo como:
```
═══════════════════════════════════════════════════════════
🤖 BOT DE NOTIFICACIONES - MUNDO PATAS
═══════════════════════════════════════════════════════════
⏰ Fecha y hora: 02/10/2025 21:00:00

🔌 Conectando a la base de datos...
✅ Conexión establecida

🔍 Iniciando verificación de alimento...
📊 Encontradas 5 mascotas con datos de alimento
⚠️ Alerta: Max - 3 días restantes
✅ Email enviado a cliente@email.com

═══════════════════════════════════════════════════════════
📊 RESUMEN DE EJECUCIÓN
═══════════════════════════════════════════════════════════
✅ Estado: EXITOSO
📋 Mascotas verificadas: 5
⚠️  Alertas generadas: 1
📧 Notificaciones enviadas: 1
═══════════════════════════════════════════════════════════
```

### Paso 3: Configurar Ejecución Automática (Windows)

```powershell
# Ejecutar como Administrador
.\configurar-bot-windows.ps1
```

Esto creará una tarea programada que ejecutará el bot **diariamente a las 9:00 AM**.

---

## 📊 Uso en el Sistema

### 1. Configurar Notificaciones por Veterinaria

En el sistema web, ve a **Configuración → Notificaciones**:

- ✅ Activar notificaciones por email
- 📧 Email de notificaciones (opcional, usa el del veterinario por defecto)
- ⏰ Días de aviso: 7 (recomendado)

### 2. Configurar Datos de Alimento por Mascota

Para cada mascota, ingresa:
- **Tipo de alimento**: Balanceado, Croquetas, etc.
- **Marca**: Royal Canin, Eukanuba, etc.
- **Peso de bolsa (kg)**: 15, 20, etc.
- **Gramos diarios**: 200, 300, etc.
- **Fecha de inicio**: Cuando abriste la bolsa

### 3. Verificación Manual

Puedes ejecutar la verificación manualmente desde:
- **Sistema web**: Notificaciones → Verificar Alimento Ahora
- **API**: `POST /api/notificaciones/verificar-alimento`
- **Línea de comandos**: `node bot-notificaciones.js`

### 4. Ver Historial

En el sistema: **Notificaciones → Historial**

Verás:
- Fecha y hora de envío
- Cliente y mascota
- Canal (email)
- Estado (enviado/error)
- Mensaje completo

---

## 📧 Ejemplo de Notificación Enviada

**Asunto:** ⚠️ IMPORTANTE - Alimento de Max por terminarse

**Contenido:**

```
⚠️ IMPORTANTE - Alimento por Terminarse

Hola Juan Pérez,

Le informamos que el alimento de su mascota Max está por terminarse.

📊 Estado actual:
• Días restantes: 5 días
• Porcentaje restante: 25%
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

## 🔧 Personalización

### Cambiar Hora de Ejecución

1. Abre "Programador de tareas" (Task Scheduler)
2. Busca "MundoPatas-BotNotificaciones"
3. Clic derecho → Propiedades
4. Pestaña "Desencadenadores" → Editar
5. Cambia la hora

### Cambiar Días de Aviso

En el sistema web:
- Configuración → Notificaciones
- Cambiar "Días de aviso": 3, 5, 7, 10, etc.

### Personalizar Mensajes

Edita el archivo: `services/notificaciones.js`
- Función: `generarMensajeAlimentoBajo()`

---

## 🐛 Solución de Problemas

### Email no se envía

1. **Verificar credenciales:**
   ```powershell
   # Ver variables de entorno
   $env:SMTP_USER
   $env:SMTP_PASS
   ```

2. **Verificar Gmail:**
   - ¿Verificación en dos pasos activa?
   - ¿Contraseña de aplicación correcta?
   - ¿Email correcto?

3. **Probar conexión:**
   ```powershell
   node bot-notificaciones.js
   ```

### Bot no se ejecuta automáticamente

1. **Verificar tarea programada:**
   - Abre "Programador de tareas"
   - Busca "MundoPatas-BotNotificaciones"
   - Ver "Última ejecución" y "Resultado"

2. **Ver logs:**
   - En Task Scheduler, pestaña "Historial"

3. **Ejecutar manualmente:**
   ```powershell
   node bot-notificaciones.js
   ```

### No se generan alertas

1. **Verificar datos de mascotas:**
   - ¿Tienen peso_bolsa_kg?
   - ¿Tienen gramos_diarios?
   - ¿Tienen fecha_inicio_bolsa?

2. **Verificar umbral:**
   - ¿Días restantes < Días de aviso configurados?

---

## 📊 Endpoints API

### Verificar alimento manualmente
```http
POST /api/notificaciones/verificar-alimento
Authorization: Bearer {token}
```

### Obtener configuración
```http
GET /api/notificaciones/config
Authorization: Bearer {token}
```

### Actualizar configuración
```http
POST /api/notificaciones/config
Authorization: Bearer {token}
Content-Type: application/json

{
  "email_habilitado": true,
  "dias_aviso_alimento": 7,
  "email_notificaciones": "notificaciones@veterinaria.com"
}
```

### Ver historial
```http
GET /api/notificaciones/historial
Authorization: Bearer {token}
```

### Ver alertas activas
```http
GET /api/notificaciones/alertas
Authorization: Bearer {token}
```

### Calcular alimento restante de una mascota
```http
GET /api/mascotas/{id}/alimento-restante
Authorization: Bearer {token}
```

---

## 💡 Mejores Prácticas

1. **Configuración inicial:**
   - ✅ Prueba con tu propio email primero
   - ✅ Verifica que los emails lleguen correctamente
   - ✅ Revisa el formato y contenido

2. **Datos de mascotas:**
   - ✅ Ingresa datos precisos de alimento
   - ✅ Actualiza la fecha cuando cambies de bolsa
   - ✅ Ajusta gramos diarios según necesidad

3. **Monitoreo:**
   - ✅ Revisa el historial semanalmente
   - ✅ Verifica que no haya errores
   - ✅ Ajusta configuración según feedback

4. **Seguridad:**
   - ✅ Nunca compartas tu contraseña de aplicación
   - ✅ Usa archivo .env (no subir a git)
   - ✅ Cambia contraseñas periódicamente

---

## 🎯 Próximos Pasos

Una vez configurado:

1. ✅ Agrega datos de alimento a las mascotas existentes
2. ✅ Espera la primera ejecución automática (9:00 AM)
3. ✅ Revisa el historial de notificaciones
4. ✅ Ajusta configuración según necesites

---

## 📞 Soporte

Si tienes problemas:
1. Revisa esta guía completa
2. Ejecuta el bot manualmente para ver errores
3. Verifica las variables de entorno
4. Consulta los logs del sistema

---

¡Listo! Tu sistema de notificaciones automáticas está configurado y funcionando. 🎉
