# 🎯 FLUJO DE LICENCIAS - GUÍA VISUAL PASO A PASO

## 📱 PROCESO COMPLETO: DE DEMO A PREMIUM

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUJO COMPLETO DE LICENCIAS                      │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   CLIENTE    │
│  (Potencial) │
└──────┬───────┘
       │
       │ 1. Entra al demo
       ▼
┌─────────────────────────────────────┐
│  Landing Comercial                  │
│  sistemamundopatas.com/             │
│  landing-comercial.html             │
│                                     │
│  [Botón: Probar Demo]              │
└──────────────┬──────────────────────┘
               │
               │ 2. Click "Probar Demo"
               ▼
┌─────────────────────────────────────┐
│  Sistema Crea Cuenta DEMO           │
│                                     │
│  ✓ Email: demo-[timestamp]@...     │
│  ✓ tipo_cuenta: "DEMO"             │
│  ✓ licencia_activa: false          │
│  ✓ Datos de ejemplo cargados       │
└──────────────┬──────────────────────┘
               │
               │ 3. Prueba el sistema
               ▼
┌─────────────────────────────────────┐
│  Cliente Usa el Sistema             │
│                                     │
│  • Registra clientes                │
│  • Agrega mascotas                  │
│  • Crea consultas                   │
│  • Genera informes                  │
│  • Prueba todas las funciones       │
└──────────────┬──────────────────────┘
               │
               │ 4. Le gusta, quiere comprar
               ▼
┌─────────────────────────────────────┐
│  Cliente Contacta Vendedor          │
│                                     │
│  📧 Email                           │
│  📱 WhatsApp                        │
│  ☎️  Teléfono                       │
└──────────────┬──────────────────────┘
               │
               │ 5. Negocia y paga
               ▼
┌─────────────────────────────────────┐
│  VENDEDOR (Tú o Gastón)            │
│                                     │
│  ✓ Recibe pago                     │
│  ✓ Confirma transacción            │
└──────────────┬──────────────────────┘
               │
               │ 6. Genera licencia
               ▼
┌─────────────────────────────────────────────────────────────┐
│  ADMIN PANEL - Generar Licencia                            │
│                                                             │
│  POST /api/admin/licencias/generar                         │
│  Authorization: Bearer admin-mundopatas-2024               │
│                                                             │
│  {                                                          │
│    "tipo": "PREMIUM",                                      │
│    "cantidad": 1,                                          │
│    "notas": "Dr. Juan Pérez - Pago confirmado"           │
│  }                                                          │
│                                                             │
│  ↓ RESPUESTA:                                              │
│                                                             │
│  {                                                          │
│    "clave": "MUNDOPATAS-2025-A7F3K9X2-L8M4N5P6"          │
│  }                                                          │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ 7. Envía clave al cliente
               ▼
┌─────────────────────────────────────┐
│  VENDEDOR Envía Clave               │
│                                     │
│  📧 Por Email (plantilla)           │
│  📱 Por WhatsApp                    │
│                                     │
│  Clave: MUNDOPATAS-2025-...        │
└──────────────┬──────────────────────┘
               │
               │ 8. Cliente recibe clave
               ▼
┌─────────────────────────────────────┐
│  CLIENTE Activa Licencia            │
│                                     │
│  1. Inicia sesión (cuenta DEMO)    │
│  2. Va a "Activar Licencia"        │
│  3. Ingresa clave                   │
│  4. Click "Activar"                 │
└──────────────┬──────────────────────┘
               │
               │ 9. Sistema valida y activa
               ▼
┌─────────────────────────────────────────────────────────────┐
│  SISTEMA Procesa Activación                                │
│                                                             │
│  ✓ Valida clave existe                                     │
│  ✓ Verifica no está activada                              │
│  ✓ Confirma veterinario no tiene otra licencia           │
│                                                             │
│  UPDATE licencias SET                                       │
│    veterinario_id = [ID],                                  │
│    estado = 'activa',                                      │
│    fecha_activacion = NOW(),                               │
│    fecha_expiracion = NOW() + 1 year,                     │
│    activa = true                                           │
│                                                             │
│  UPDATE veterinarios SET                                    │
│    licencia_activa = true,                                 │
│    tipo_cuenta = 'PREMIUM'                                 │
│                                                             │
│  ✓ CONSERVA TODOS LOS DATOS DEL DEMO                      │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ 10. Confirmación
               ▼
┌─────────────────────────────────────┐
│  ✅ CUENTA PREMIUM ACTIVADA         │
│                                     │
│  • Tipo: PREMIUM                    │
│  • Válida hasta: 10/10/2026        │
│  • Todos los datos conservados      │
│  • Acceso completo por 1 año       │
└─────────────────────────────────────┘
```

---

## 🔑 EJEMPLO PRÁCTICO COMPLETO

### Escenario: Dr. Juan Pérez compra el sistema

```
DÍA 1 - LUNES
─────────────────────────────────────────────────────────────

09:00 - Dr. Juan Pérez entra al demo
        URL: sistemamundopatas.com/landing-comercial.html
        Sistema crea: demo-1728561234567@mundopatas.com

09:05 - Prueba registrar clientes
        Agrega: María González, Carlos Rodríguez

09:15 - Registra mascotas
        Agrega: "Max" (Perro), "Luna" (Gato)

09:30 - Crea consultas médicas
        Prueba el sistema completo

10:00 - Le encanta! Decide comprar
        Llama por teléfono: +54 261 702 4193


DÍA 1 - LUNES (Continuación)
─────────────────────────────────────────────────────────────

10:15 - Gastón Díaz (Vendedor) atiende llamada
        Precio acordado: $50,000 ARS
        Dr. Pérez hace transferencia

10:30 - Gastón confirma pago recibido
        Abre Postman o terminal


10:35 - Gastón genera licencia:

        POST https://sistemamundopatas.com/api/admin/licencias/generar
        Headers:
          Authorization: Bearer admin-mundopatas-2024
        Body:
          {
            "tipo": "PREMIUM",
            "cantidad": 1,
            "notas": "Dr. Juan Pérez - Veterinaria San Martín - $50k"
          }

        Respuesta:
          {
            "clave": "MUNDOPATAS-2025-K7M9P2X4-N8Q5R3T6"
          }


10:40 - Gastón envía WhatsApp al Dr. Pérez:

        ───────────────────────────────────────
        🐾 MUNDO PATAS - Tu Licencia PREMIUM

        Hola Dr. Juan Pérez! 👋

        ¡Gracias por tu compra! 🎉

        Tu clave de activación:
        🔑 MUNDOPATAS-2025-K7M9P2X4-N8Q5R3T6

        PARA ACTIVAR:
        1️⃣ Ingresa a sistemamundopatas.com
        2️⃣ Inicia sesión con tu cuenta demo
        3️⃣ Ve a "Mi Cuenta" → "Activar Licencia"
        4️⃣ Pega la clave
        5️⃣ Click en "Activar"

        ✅ Válida por 1 año
        ✅ Todos tus datos se conservan
        ✅ Soporte incluido

        ¿Dudas? Escríbeme! 😊
        Gastón Díaz
        ───────────────────────────────────────


10:45 - Dr. Pérez recibe WhatsApp
        Abre sistemamundopatas.com


10:47 - Dr. Pérez inicia sesión
        Email: demo-1728561234567@mundopatas.com
        (Su cuenta demo)


10:48 - Dr. Pérez va a "Mi Cuenta"
        Click en "Activar Licencia Premium"
        Aparece formulario


10:49 - Dr. Pérez ingresa clave:
        MUNDOPATAS-2025-K7M9P2X4-N8Q5R3T6
        Click "Activar"


10:50 - Sistema procesa:
        ✓ Valida clave
        ✓ Activa licencia
        ✓ Actualiza cuenta a PREMIUM
        ✓ Conserva todos los datos


10:51 - Dr. Pérez ve confirmación:
        ───────────────────────────────────────
        ✅ ¡FELICITACIONES!

        Tu cuenta ha sido activada exitosamente

        Tipo: PREMIUM
        Válida hasta: 10 Octubre 2026
        
        Todos tus datos han sido conservados:
        • 2 Clientes
        • 2 Mascotas
        • 1 Consulta

        ¡Bienvenido a MUNDO PATAS PREMIUM! 🐾
        ───────────────────────────────────────


10:52 - Dr. Pérez continúa usando el sistema
        Ahora con cuenta PREMIUM por 1 año
        Sin limitaciones
        Con soporte prioritario
```

---

## 📊 ESTADOS DEL SISTEMA

### Base de Datos - Tabla `licencias`

```sql
-- ANTES de activar
┌────┬──────────────────────────────────┬────────────────┬─────────┬─────────────┐
│ id │ clave                            │ veterinario_id │ estado  │ activa      │
├────┼──────────────────────────────────┼────────────────┼─────────┼─────────────┤
│ 1  │ MUNDOPATAS-2025-K7M9P2X4-N8Q5... │ NULL           │disponible│ false      │
└────┴──────────────────────────────────┴────────────────┴─────────┴─────────────┘

-- DESPUÉS de activar
┌────┬──────────────────────────────────┬────────────────┬─────────┬─────────────┐
│ id │ clave                            │ veterinario_id │ estado  │ activa      │
├────┼──────────────────────────────────┼────────────────┼─────────┼─────────────┤
│ 1  │ MUNDOPATAS-2025-K7M9P2X4-N8Q5... │ 123            │ activa  │ true        │
└────┴──────────────────────────────────┴────────────────┴─────────┴─────────────┘
```

### Base de Datos - Tabla `veterinarios`

```sql
-- ANTES de activar (DEMO)
┌────┬──────────────────────────────┬──────────────┬────────────────┬──────────────┐
│ id │ email                        │ tipo_cuenta  │ licencia_activa│ datos        │
├────┼──────────────────────────────┼──────────────┼────────────────┼──────────────┤
│123 │ demo-1728561234567@mundo...  │ DEMO         │ false          │ 2 clientes   │
│    │                              │              │                │ 2 mascotas   │
└────┴──────────────────────────────┴──────────────┴────────────────┴──────────────┘

-- DESPUÉS de activar (PREMIUM)
┌────┬──────────────────────────────┬──────────────┬────────────────┬──────────────┐
│ id │ email                        │ tipo_cuenta  │ licencia_activa│ datos        │
├────┼──────────────────────────────┼──────────────┼────────────────┼──────────────┤
│123 │ demo-1728561234567@mundo...  │ PREMIUM      │ true           │ 2 clientes   │
│    │                              │              │                │ 2 mascotas   │
│    │                              │              │                │ ✓ CONSERVADOS│
└────┴──────────────────────────────┴──────────────┴────────────────┴──────────────┘
```

---

## 🎯 COMANDOS RÁPIDOS PARA TI (VENDEDOR)

### Generar 1 Licencia

```bash
curl -X POST https://sistemamundopatas.com/api/admin/licencias/generar \
  -H "Authorization: Bearer admin-mundopatas-2024" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "PREMIUM",
    "cantidad": 1,
    "notas": "Dr. Juan Pérez - Pago confirmado"
  }'
```

### Generar 10 Licencias (Lote)

```bash
curl -X POST https://sistemamundopatas.com/api/admin/licencias/generar \
  -H "Authorization: Bearer admin-mundopatas-2024" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "PREMIUM",
    "cantidad": 10,
    "notas": "Lote promoción Octubre 2025"
  }'
```

### Ver Todas las Licencias

```bash
curl -X GET https://sistemamundopatas.com/api/admin/licencias \
  -H "Authorization: Bearer admin-mundopatas-2024"
```

---

## 📧 PLANTILLA DE EMAIL PARA ENVIAR LICENCIA

```
Asunto: 🐾 Tu Licencia MUNDO PATAS - Sistema Veterinario PREMIUM

Hola Dr. [NOMBRE],

¡Gracias por confiar en MUNDO PATAS! 🎉

Aquí está tu clave de licencia PREMIUM:

┌─────────────────────────────────────────────────────────┐
│                                                         │
│  🔑 CLAVE DE ACTIVACIÓN:                               │
│                                                         │
│     MUNDOPATAS-2025-K7M9P2X4-N8Q5R3T6                 │
│                                                         │
└─────────────────────────────────────────────────────────┘


📋 INSTRUCCIONES PARA ACTIVAR:

1. Ingresa a: https://sistemamundopatas.com

2. Inicia sesión con tu cuenta DEMO

3. Ve a "Mi Cuenta" o "Configuración"

4. Busca la opción "Activar Licencia Premium"

5. Ingresa la clave que te enviamos

6. Click en "Activar"

7. ¡Listo! Tu cuenta ahora es PREMIUM por 1 año


✅ BENEFICIOS DE TU LICENCIA PREMIUM:

• Acceso completo por 1 año (hasta 10 Octubre 2026)
• Todos tus datos del demo se conservan
• Sin límites de clientes o mascotas
• Sin límites de consultas o análisis
• Soporte técnico prioritario
• Actualizaciones gratuitas
• Nuevas funcionalidades incluidas


🎁 EXTRAS INCLUIDOS:

• Sistema de QR para que tus clientes agenden citas
• Notificaciones automáticas por email
• Generación de informes médicos
• Control de inventario de medicamentos
• Facturación integrada
• Y mucho más...


📞 ¿NECESITAS AYUDA?

Si tienes alguna duda o problema para activar:

📧 Email: soporte@mundopatas.com
📱 WhatsApp: +54 261 702 4193
🌐 Web: https://sistemamundopatas.com


¡Bienvenido a MUNDO PATAS PREMIUM! 🐾

Saludos,
Gastón Díaz
Equipo MUNDO PATAS
```

---

## 🎯 CHECKLIST PARA CADA VENTA

```
□ 1. Cliente probó el demo
□ 2. Cliente confirmó que le gusta
□ 3. Negociaste el precio
□ 4. Recibiste el pago
□ 5. Confirmaste la transacción
□ 6. Generaste la licencia (API)
□ 7. Copiaste la clave generada
□ 8. Enviaste la clave al cliente (Email/WhatsApp)
□ 9. Cliente confirmó recepción
□ 10. Cliente activó la licencia
□ 11. Verificaste que se activó correctamente
□ 12. Diste bienvenida al cliente
```

---

**Última actualización:** 2025-10-10  
**Versión:** 1.0.0  
**Estado:** ✅ Listo para Usar
