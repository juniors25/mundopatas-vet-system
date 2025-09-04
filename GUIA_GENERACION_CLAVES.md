# 🔑 GUÍA DE GENERACIÓN DE CLAVES DE LICENCIA - MUNDO PATAS

## 👨‍💼 **Para: Gastón Díaz (Propietario del Sistema)**

---

## 📋 **PROCESO COMPLETO DE ACTIVACIÓN DE LICENCIAS**

### **🎯 Paso 1: Recepción de Solicitud de Cliente**

**📞 Cliente te contacta por:**
- Teléfono: 2617024193
- Email: jjvserviciosinformaticos@gmail.com
- WhatsApp: 2617024193

**📝 Información a solicitar al cliente:**
1. Nombre de la veterinaria
2. Nombre del veterinario responsable
3. Email de contacto
4. Teléfono
5. Plan deseado (Básico/Profesional/Premium)
6. Cantidad de veterinarios que usarán el sistema

---

### **🔑 Paso 2: Generación de Clave de Licencia**

**📋 Claves Pre-configuradas en el Sistema:**

```javascript
// Estas claves ya están programadas en server.js
const VALID_LICENSE_KEYS = {
    'MUNDOPATAS-PREMIUM-2025': {
        plan: 'premium',
        features: ['citas', 'facturacion', 'inventario', 'notificaciones', 'reportes', 'telemedicina', 'multivet'],
        expires: '2025-12-31',
        maxUsers: 5
    },
    'MUNDOPATAS-PRO-2025': {
        plan: 'profesional', 
        features: ['citas', 'facturacion', 'inventario', 'notificaciones', 'reportes'],
        expires: '2025-12-31',
        maxUsers: 3
    },
    'MUNDOPATAS-BASIC-2025': {
        plan: 'basico',
        features: ['citas', 'facturacion'],
        expires: '2025-12-31',
        maxUsers: 1
    },
    'GASTON-DEV-MASTER-KEY': {
        plan: 'developer',
        features: ['all'],
        expires: '2030-12-31',
        maxUsers: 999
    }
};
```

**🎯 Opciones para Generar Claves:**

### **OPCIÓN A: Usar Claves Pre-configuradas (Recomendado)**

**Para cada cliente, asigna una clave según el plan:**

- **Plan Básico**: `MUNDOPATAS-BASIC-2025`
- **Plan Profesional**: `MUNDOPATAS-PRO-2025` 
- **Plan Premium**: `MUNDOPATAS-PREMIUM-2025`
- **Para ti (desarrollador)**: `GASTON-DEV-MASTER-KEY`

### **OPCIÓN B: Crear Claves Personalizadas**

**📝 Formato sugerido para claves personalizadas:**
```
MUNDOPATAS-[PLAN]-[VETERINARIA]-[AÑO]

Ejemplos:
- MUNDOPATAS-PRO-VETCENTER-2025
- MUNDOPATAS-BASIC-ANIMALCARE-2025
- MUNDOPATAS-PREMIUM-CLINICASUR-2025
```

**🔧 Para agregar nuevas claves al sistema:**
1. Edita el archivo `server.js`
2. Busca la sección `VALID_LICENSE_KEYS`
3. Agrega la nueva clave siguiendo el formato:

```javascript
'MUNDOPATAS-PRO-VETCENTER-2025': {
    plan: 'profesional',
    features: ['citas', 'facturacion', 'inventario', 'notificaciones', 'reportes'],
    expires: '2025-12-31',
    maxUsers: 3
}
```

---

### **📧 Paso 3: Envío de Clave al Cliente**

**📱 Template de WhatsApp/Email:**

```
🐾 ¡Hola [NOMBRE_VETERINARIO]!

¡Tu licencia de MUNDO PATAS está lista! 🎉

📋 DATOS DE TU LICENCIA:
• Plan: [PLAN_CONTRATADO]
• Clave de Activación: [CLAVE_GENERADA]
• Válida hasta: 31/12/2025
• Usuarios permitidos: [CANTIDAD]

🔑 CÓMO ACTIVAR:
1. Ingresa a tu sistema MUNDO PATAS
2. Ve a "Nuevas Funciones" en el menú
3. Haz clic en "Activar Licencia"
4. Ingresa la clave: [CLAVE_GENERADA]
5. ¡Listo! Todas las funciones premium estarán disponibles

📞 SOPORTE:
• WhatsApp: 2617024193
• Email: jjvserviciosinformaticos@gmail.com
• Horario: Lun-Vie 9:00-18:00

¡Gracias por confiar en MUNDO PATAS! 🚀

Gastón Díaz
JJV Servicios Informáticos
```

---

### **🎯 Paso 4: Instrucciones para el Cliente**

**📋 Proceso que debe seguir el cliente:**

1. **Acceder al Sistema**
   - URL: [URL_DEL_SISTEMA_COMPLETO]
   - Login con sus credenciales

2. **Ir a Activación**
   - Menú → "Nuevas Funciones"
   - Buscar botón "Activar Licencia Premium"

3. **Ingresar Clave**
   - Copiar y pegar la clave exactamente
   - Hacer clic en "Activar"

4. **Confirmación**
   - El sistema mostrará mensaje de éxito
   - Las nuevas funciones aparecerán en el menú

---

### **🔧 Paso 5: Verificación de Activación**

**🕵️ Cómo verificar que la licencia se activó correctamente:**

1. **Desde el Sistema del Cliente:**
   - Las nuevas funciones aparecen en el menú
   - No hay mensajes de "funcionalidad premium"

2. **Desde tu Panel (si tienes acceso):**
   - Verificar en base de datos tabla `configuraciones`
   - Buscar registros con `license_key`, `license_plan`, `license_features`

3. **Prueba de Funcionalidades:**
   - Pedir al cliente que pruebe una función premium
   - Confirmar que funciona sin restricciones

---

### **⚠️ Paso 6: Resolución de Problemas**

**🚨 Problemas Comunes y Soluciones:**

**❌ "Clave inválida":**
- Verificar que la clave esté bien escrita
- Confirmar que la clave existe en `VALID_LICENSE_KEYS`
- Revisar mayúsculas/minúsculas

**❌ "Licencia expirada":**
- Verificar fecha de expiración en el código
- Actualizar fecha si es necesario

**❌ "Error de conexión":**
- Verificar que el servidor esté funcionando
- Revisar conexión a internet del cliente

**🔧 Soporte Remoto:**
- Puedes acceder al sistema del cliente (con permiso)
- Activar la licencia directamente desde la base de datos
- Verificar logs de error en el servidor

---

## 📊 **CONTROL DE LICENCIAS VENDIDAS**

### **📝 Registro de Ventas (Recomendado)**

**Crear una planilla Excel/Google Sheets con:**

| Fecha | Cliente | Veterinaria | Plan | Clave | Precio | Estado | Vencimiento |
|-------|---------|-------------|------|-------|--------|--------|-------------|
| 20/08/25 | Dr. Pérez | Vet Center | Pro | MUNDOPATAS-PRO-2025 | $30,000 | Activa | 31/12/25 |

### **🔄 Renovaciones**

**Para renovar licencias:**
1. Actualizar fecha de vencimiento en el código
2. Reiniciar servidor (si es necesario)
3. Notificar al cliente que la licencia se renovó

---

## 💰 **PRECIOS ACTUALIZADOS (ARS)**

### **💵 Planes y Precios:**

- **Plan Básico**: $15,000 ARS/mes
  - Clave: `MUNDOPATAS-BASIC-2025`
  - Funciones: Citas + Facturación
  - Usuarios: 1

- **Plan Profesional**: $30,000 ARS/mes  
  - Clave: `MUNDOPATAS-PRO-2025`
  - Funciones: Citas + Facturación + Inventario + Notificaciones + Reportes
  - Usuarios: 3

- **Plan Premium**: $50,000 ARS/mes
  - Clave: `MUNDOPATAS-PREMIUM-2025`
  - Funciones: TODAS (incluye Telemedicina + Multi-veterinario)
  - Usuarios: 5

### **🎯 Recomendaciones de Venta:**

- **Veterinarias pequeñas (1-2 vets)**: Plan Básico
- **Clínicas medianas (3-5 vets)**: Plan Profesional  
- **Hospitales/Clínicas grandes (5+ vets)**: Plan Premium

---

## 🎉 **¡SISTEMA LISTO PARA COMERCIALIZAR!**

**Todo está configurado para que puedas:**
1. ✅ Recibir solicitudes de clientes
2. ✅ Generar/asignar claves de licencia  
3. ✅ Enviar instrucciones de activación
4. ✅ Brindar soporte técnico
5. ✅ Controlar renovaciones

**¡A vender MUNDO PATAS! 🚀**
