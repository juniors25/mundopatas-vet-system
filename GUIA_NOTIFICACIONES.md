# 📱 Guía de Configuración del Sistema de Notificaciones

## 🎯 Descripción General

El sistema de notificaciones de Mundo Patas permite enviar alertas automáticas a los clientes cuando el alimento de sus mascotas está por terminarse. Soporta tres canales de comunicación:

- ✉️ **Email** (Recomendado - Fácil de configurar)
- 📱 **WhatsApp** (Requiere cuenta Twilio)
- 💬 **Telegram** (Requiere Bot de Telegram)

---

## 📧 Configuración de Email (Nodemailer)

### Opción 1: Gmail (Recomendado para empezar)

1. **Crear una contraseña de aplicación en Gmail:**
   - Ve a tu cuenta de Google: https://myaccount.google.com/
   - Seguridad → Verificación en dos pasos (actívala si no está activa)
   - Contraseñas de aplicaciones → Selecciona "Correo" y "Otro"
   - Copia la contraseña generada (16 caracteres)

2. **Configurar variables de entorno:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=tu_email@gmail.com
   SMTP_PASS=tu_contraseña_de_aplicacion_de_16_caracteres
   ```

### Opción 2: Otros proveedores

**Outlook/Hotmail:**
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=tu_email@outlook.com
SMTP_PASS=tu_contraseña
```

**Yahoo:**
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=tu_email@yahoo.com
SMTP_PASS=tu_contraseña_de_aplicacion
```

**SendGrid (Profesional):**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=tu_sendgrid_api_key
```

---

## 📱 Configuración de WhatsApp (Twilio)

### Requisitos:
- Cuenta de Twilio (https://www.twilio.com/)
- WhatsApp Business API activado

### Pasos:

1. **Crear cuenta en Twilio:**
   - Regístrate en https://www.twilio.com/try-twilio
   - Verifica tu número de teléfono
   - Obtén $15 USD de crédito gratis para pruebas

2. **Activar WhatsApp Sandbox:**
   - En el dashboard de Twilio, ve a: Messaging → Try it out → Send a WhatsApp message
   - Sigue las instrucciones para conectar tu WhatsApp al sandbox
   - Envía el mensaje de activación desde tu WhatsApp

3. **Obtener credenciales:**
   - Account SID: En el dashboard principal
   - Auth Token: En el dashboard principal (clic en "Show")
   - WhatsApp Number: En la sección de WhatsApp Sandbox

4. **Configurar variables de entorno:**
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=tu_auth_token_aqui
   TWILIO_WHATSAPP_NUMBER=+14155238886
   ```

### Limitaciones del Sandbox:
- Solo puedes enviar mensajes a números que se hayan unido al sandbox
- Para producción, necesitas solicitar acceso a WhatsApp Business API

### Producción (WhatsApp Business API):
- Solicita acceso en: https://www.twilio.com/whatsapp/request-access
- Requiere verificación de negocio
- Costo: ~$0.005 por mensaje

---

## 💬 Configuración de Telegram

### Pasos:

1. **Crear un Bot de Telegram:**
   - Abre Telegram y busca: @BotFather
   - Envía el comando: `/newbot`
   - Sigue las instrucciones (nombre y username del bot)
   - Guarda el **token** que te proporciona

2. **Obtener Chat ID:**
   - Busca tu bot en Telegram y envíale un mensaje
   - Abre en el navegador: `https://api.telegram.org/bot<TU_TOKEN>/getUpdates`
   - Busca el campo `"chat":{"id":123456789}`
   - Ese número es tu Chat ID

3. **Configurar variables de entorno:**
   ```env
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```

4. **Configurar en el sistema:**
   - En el panel de notificaciones, ingresa el Chat ID del cliente
   - Activa las notificaciones por Telegram

---

## ⚙️ Configuración en el Sistema

### 1. Acceder al Panel de Configuración

En el sistema, ve a: **Configuración → Notificaciones**

### 2. Configurar Canales

**Email:**
- ✅ Activar notificaciones por email
- Ingresar email de notificaciones (opcional, si es diferente al del veterinario)

**WhatsApp:**
- ✅ Activar notificaciones por WhatsApp
- Ingresar número de teléfono del cliente (formato: +5491112345678)

**Telegram:**
- ✅ Activar notificaciones por Telegram
- Ingresar Chat ID del cliente

### 3. Configurar Umbral de Alerta

- **Días de aviso:** Número de días antes de que se termine el alimento para enviar alerta
- Recomendado: 7 días (permite tiempo suficiente para comprar)

---

## 🔄 Funcionamiento Automático

### Verificación Programada

El sistema verifica automáticamente el alimento de todas las mascotas:
- **Frecuencia:** Diariamente a las 9:00 AM
- **Proceso:**
  1. Calcula días restantes de alimento para cada mascota
  2. Compara con el umbral configurado
  3. Genera alertas si es necesario
  4. Envía notificaciones por los canales habilitados

### Verificación Manual

También puedes ejecutar la verificación manualmente:
- En el sistema: **Notificaciones → Verificar Alimento Ahora**
- O mediante API: `POST /api/notificaciones/verificar-alimento`

---

## 📊 Monitoreo

### Historial de Notificaciones

Ve a: **Notificaciones → Historial**

Verás:
- Fecha y hora de envío
- Canal utilizado (email/whatsapp/telegram)
- Destinatario
- Estado (enviado/error)
- Mensaje de error (si aplica)

### Alertas Activas

Ve a: **Notificaciones → Alertas Activas**

Muestra todas las mascotas con alimento bajo:
- Nombre de la mascota
- Días restantes
- Porcentaje restante
- Estado de notificación

---

## 💰 Costos Estimados

### Email (Nodemailer)
- **Gmail:** Gratis (límite: 500 emails/día)
- **SendGrid:** Gratis hasta 100 emails/día, luego desde $15/mes

### WhatsApp (Twilio)
- **Sandbox:** Gratis (solo para pruebas)
- **Producción:** ~$0.005 por mensaje
- **Ejemplo:** 100 clientes × 1 mensaje/mes = $0.50/mes

### Telegram
- **Completamente gratis** ✅
- Sin límites de mensajes
- Sin costos ocultos

---

## 🔧 Solución de Problemas

### Email no se envía

1. **Verificar credenciales:**
   - SMTP_USER y SMTP_PASS correctos
   - Contraseña de aplicación (no la contraseña normal)

2. **Verificar configuración:**
   - SMTP_HOST y SMTP_PORT correctos
   - Verificación en dos pasos activada (Gmail)

3. **Revisar logs del servidor:**
   ```bash
   # Ver últimos logs
   tail -f logs/server.log
   ```

### WhatsApp no se envía

1. **Verificar sandbox:**
   - El número del cliente está unido al sandbox
   - Mensaje de activación enviado correctamente

2. **Verificar credenciales:**
   - TWILIO_ACCOUNT_SID correcto
   - TWILIO_AUTH_TOKEN correcto
   - Crédito disponible en la cuenta

3. **Formato de número:**
   - Debe incluir código de país: +5491112345678
   - Sin espacios ni guiones

### Telegram no se envía

1. **Verificar token:**
   - TELEGRAM_BOT_TOKEN correcto
   - Bot activo

2. **Verificar Chat ID:**
   - Chat ID correcto
   - Cliente ha iniciado conversación con el bot

---

## 📝 Recomendaciones

### Para Empezar:
1. ✅ Configura **Email** primero (más fácil y gratis)
2. ⚠️ Prueba con tu propio email antes de enviar a clientes
3. 📱 Agrega WhatsApp o Telegram después si lo necesitas

### Para Producción:
1. 🔐 Usa variables de entorno (nunca hardcodees credenciales)
2. 📊 Monitorea el historial regularmente
3. 💰 Considera SendGrid para emails profesionales
4. 📱 Telegram es gratis y confiable para notificaciones

### Mejores Prácticas:
- Configura umbral de 7 días mínimo
- Envía notificaciones solo una vez por día
- Incluye información de contacto en los mensajes
- Prueba el sistema regularmente

---

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs del servidor
2. Verifica las variables de entorno
3. Consulta la documentación oficial:
   - Nodemailer: https://nodemailer.com/
   - Twilio: https://www.twilio.com/docs
   - Telegram Bots: https://core.telegram.org/bots

---

## 🚀 Próximos Pasos

Una vez configurado:
1. ✅ Prueba enviando notificaciones de prueba
2. ✅ Configura los datos de alimento de las mascotas
3. ✅ Activa las notificaciones para tus clientes
4. ✅ Monitorea el historial y ajusta según necesites

¡Listo! Tu sistema de notificaciones está configurado y funcionando. 🎉
