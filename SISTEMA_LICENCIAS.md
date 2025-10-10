# 🔐 SISTEMA DE LICENCIAS - MUNDO PATAS

## 📋 Descripción General

Sistema completo de gestión de licencias que permite controlar el acceso al sistema veterinario, convirtiendo cuentas DEMO en cuentas PREMIUM mediante claves de activación únicas.

---

## 🎯 FLUJO COMPLETO: DE DEMO A PREMIUM

### Paso 1: Usuario Prueba el Sistema DEMO

**Acción del Cliente:**
1. Entra a: `https://sistemamundopatas.com/landing-comercial.html`
2. Click en "Probar Demo"
3. El sistema crea automáticamente:
   - Cuenta DEMO temporal
   - Email: `demo-[timestamp]@mundopatas.com`
   - Datos de ejemplo (clientes y mascotas)
   - `tipo_cuenta`: **DEMO**
   - `licencia_activa`: **false**

**Duración del Demo:**
- Acceso ilimitado para probar
- Todas las funcionalidades disponibles
- Datos aislados por veterinario

---

### Paso 2: Cliente Decide Comprar

**Acción del Cliente:**
1. Le gusta el sistema y quiere comprarlo
2. Contacta al vendedor (tú o Gastón Díaz)
3. Realiza el pago acordado

**Acción del Vendedor:**
1. Recibe el pago
2. Confirma la transacción
3. Procede a generar la licencia

---

### Paso 3: Generar Licencia (ADMIN)

**Endpoint:** `POST /api/admin/licencias/generar`

**Headers:**
```json
{
  "Authorization": "Bearer admin-mundopatas-2024"
}
```

**Body:**
```json
{
  "tipo": "PREMIUM",
  "cantidad": 1,
  "notas": "Cliente: Dr. Juan Pérez - Pago confirmado 10/10/2025"
}
```

**Respuesta:**
```json
{
  "message": "1 licencia(s) generada(s) exitosamente",
  "licencias": [
    {
      "id": 1,
      "clave": "MUNDOPATAS-2025-A7F3K9X2-L8M4N5P6",
      "tipo": "PREMIUM",
      "estado": "disponible",
      "activa": false,
      "fecha_generacion": "2025-10-10T16:00:00.000Z",
      "notas": "Cliente: Dr. Juan Pérez - Pago confirmado 10/10/2025"
    }
  ]
}
```

**Formato de la Clave:**
```
MUNDOPATAS-[AÑO]-[RANDOM]-[TIMESTAMP]
Ejemplo: MUNDOPATAS-2025-A7F3K9X2-L8M4N5P6
```

---

### Paso 4: Enviar Licencia al Cliente

**Acción del Vendedor:**

**Opción A - Email:**
```
Asunto: Tu Licencia MUNDO PATAS - Sistema Veterinario

Hola Dr. Juan Pérez,

¡Gracias por tu compra! Aquí está tu clave de licencia PREMIUM:

🔑 CLAVE: MUNDOPATAS-2025-A7F3K9X2-L8M4N5P6

INSTRUCCIONES PARA ACTIVAR:

1. Inicia sesión en tu cuenta DEMO:
   https://sistemamundopatas.com

2. Ve a "Mi Cuenta" o "Configuración"

3. Busca la opción "Activar Licencia"

4. Ingresa la clave que te enviamos

5. ¡Listo! Tu cuenta ahora es PREMIUM por 1 año

BENEFICIOS DE TU LICENCIA PREMIUM:
✅ Acceso completo por 1 año
✅ Todos tus datos del demo se conservan
✅ Sin límites de clientes o mascotas
✅ Soporte técnico prioritario
✅ Actualizaciones gratuitas

¿Necesitas ayuda? Contáctanos:
📧 soporte@mundopatas.com
📱 WhatsApp: +54 261 702 4193

Saludos,
Equipo MUNDO PATAS
```

**Opción B - WhatsApp:**
```
🐾 MUNDO PATAS - Tu Licencia PREMIUM

Hola Dr. Juan Pérez! 👋

Tu clave de activación:
🔑 MUNDOPATAS-2025-A7F3K9X2-L8M4N5P6

Para activar:
1️⃣ Ingresa a sistemamundopatas.com
2️⃣ Ve a "Activar Licencia"
3️⃣ Pega la clave
4️⃣ ¡Listo! 🎉

Válida por 1 año desde hoy.
Todos tus datos del demo se conservan.

¿Dudas? Escríbeme! 😊
```

---

### Paso 5: Cliente Activa la Licencia

**Acción del Cliente:**

**Método 1 - Desde el Sistema:**
1. Inicia sesión en su cuenta DEMO
2. Va a "Mi Cuenta" o "Configuración"
3. Click en "Activar Licencia Premium"
4. Ingresa la clave: `MUNDOPATAS-2025-A7F3K9X2-L8M4N5P6`
5. Click en "Activar"

**Método 2 - API Directa:**

**Endpoint:** `POST /api/veterinario/convertir-demo`

**Headers:**
```json
{
  "Authorization": "Bearer [TOKEN_DEL_VETERINARIO]"
}
```

**Body:**
```json
{
  "clave_licencia": "MUNDOPATAS-2025-A7F3K9X2-L8M4N5P6"
}
```

**Respuesta Exitosa:**
```json
{
  "message": "¡Felicitaciones! Tu cuenta DEMO ha sido convertida a PREMIUM",
  "tipo": "PREMIUM",
  "fecha_expiracion": "2026-10-10T16:00:00.000Z"
}
```

---

### Paso 6: Sistema Actualiza Automáticamente

**Lo que hace el sistema:**

1. **Valida la clave:**
   - Verifica que existe
   - Verifica que no está activada
   - Verifica que el veterinario no tiene otra licencia activa

2. **Activa la licencia:**
   ```sql
   UPDATE licencias SET
     veterinario_id = [ID_VETERINARIO],
     estado = 'activa',
     fecha_activacion = NOW(),
     fecha_expiracion = NOW() + INTERVAL '1 year',
     activa = true
   WHERE clave = 'MUNDOPATAS-2025-A7F3K9X2-L8M4N5P6'
   ```

3. **Actualiza el veterinario:**
   ```sql
   UPDATE veterinarios SET
     licencia_activa = true,
     tipo_cuenta = 'PREMIUM',
     fecha_expiracion_demo = NULL
   WHERE id = [ID_VETERINARIO]
   ```

4. **Conserva todos los datos:**
   - ✅ Clientes registrados
   - ✅ Mascotas
   - ✅ Consultas
   - ✅ Análisis
   - ✅ Configuración de pagos
   - ✅ Todo permanece intacto

---

## 🔧 ENDPOINTS DISPONIBLES

### 1. Generar Licencias (ADMIN)

```http
POST /api/admin/licencias/generar
Authorization: Bearer admin-mundopatas-2024

{
  "tipo": "PREMIUM",
  "cantidad": 5,
  "notas": "Lote para promoción octubre 2025"
}
```

**Respuesta:**
```json
{
  "message": "5 licencia(s) generada(s) exitosamente",
  "licencias": [
    { "clave": "MUNDOPATAS-2025-...", "tipo": "PREMIUM" },
    { "clave": "MUNDOPATAS-2025-...", "tipo": "PREMIUM" },
    ...
  ]
}
```

---

### 2. Validar Licencia (Sin Activar)

```http
POST /api/licencias/validar

{
  "clave": "MUNDOPATAS-2025-A7F3K9X2-L8M4N5P6"
}
```

**Respuesta:**
```json
{
  "valid": true,
  "tipo": "PREMIUM",
  "message": "Clave válida. Lista para activar."
}
```

---

### 3. Activar Licencia

```http
POST /api/licencias/activar
Authorization: Bearer [TOKEN_VETERINARIO]

{
  "clave": "MUNDOPATAS-2025-A7F3K9X2-L8M4N5P6"
}
```

**Respuesta:**
```json
{
  "message": "Licencia activada exitosamente",
  "tipo": "PREMIUM",
  "fecha_expiracion": "2026-10-10T16:00:00.000Z"
}
```

---

### 4. Convertir DEMO a PREMIUM

```http
POST /api/veterinario/convertir-demo
Authorization: Bearer [TOKEN_VETERINARIO]

{
  "clave_licencia": "MUNDOPATAS-2025-A7F3K9X2-L8M4N5P6"
}
```

---

### 5. Ver Mi Licencia

```http
GET /api/licencias/mi-licencia
Authorization: Bearer [TOKEN_VETERINARIO]
```

**Respuesta (con licencia):**
```json
{
  "tiene_licencia": true,
  "licencia": {
    "id": 1,
    "clave": "MUNDOPATAS-2025-...",
    "tipo": "PREMIUM",
    "estado": "activa",
    "fecha_activacion": "2025-10-10T16:00:00.000Z",
    "fecha_expiracion": "2026-10-10T16:00:00.000Z",
    "activa": true
  }
}
```

**Respuesta (sin licencia - DEMO):**
```json
{
  "tiene_licencia": false,
  "tipo_cuenta": "DEMO",
  "fecha_expiracion_demo": null
}
```

---

### 6. Listar Todas las Licencias (ADMIN)

```http
GET /api/admin/licencias
Authorization: Bearer admin-mundopatas-2024
```

**Respuesta:**
```json
[
  {
    "id": 1,
    "clave": "MUNDOPATAS-2025-...",
    "tipo": "PREMIUM",
    "estado": "activa",
    "veterinario_id": 123,
    "nombre_veterinario": "Dr. Juan Pérez",
    "email": "juan@ejemplo.com",
    "fecha_activacion": "2025-10-10T16:00:00.000Z",
    "fecha_expiracion": "2026-10-10T16:00:00.000Z"
  },
  {
    "id": 2,
    "clave": "MUNDOPATAS-2025-...",
    "tipo": "PREMIUM",
    "estado": "disponible",
    "veterinario_id": null,
    "nombre_veterinario": null,
    "email": null
  }
]
```

---

## 📊 ESTADOS DE LICENCIA

| Estado | Descripción |
|--------|-------------|
| **disponible** | Licencia generada, lista para activar |
| **activa** | Licencia activada y en uso |
| **expirada** | Licencia venció (implementar en futuro) |
| **cancelada** | Licencia cancelada por admin (implementar en futuro) |

---

## 📊 TIPOS DE CUENTA

| Tipo | Descripción | Licencia Requerida |
|------|-------------|-------------------|
| **DEMO** | Cuenta de prueba temporal | ❌ No |
| **PREMIUM** | Cuenta completa por 1 año | ✅ Sí |
| **BASIC** | Plan básico (futuro) | ✅ Sí |
| **ENTERPRISE** | Plan empresarial (futuro) | ✅ Sí |

---

## 🔒 SEGURIDAD

### Validaciones Implementadas:

1. ✅ **Clave única:** No se pueden duplicar claves
2. ✅ **Una activación por clave:** No se puede reutilizar
3. ✅ **Una licencia por veterinario:** No puede tener múltiples activas
4. ✅ **Autenticación requerida:** Solo el veterinario puede activar su licencia
5. ✅ **Admin protegido:** Solo admin puede generar licencias

### Token de Admin:

```
Authorization: Bearer admin-mundopatas-2024
```

**⚠️ IMPORTANTE:** En producción, cambiar por un sistema de autenticación más robusto (JWT, OAuth, etc.)

---

## 📝 TABLA DE BASE DE DATOS

```sql
CREATE TABLE licencias (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    veterinario_id INTEGER REFERENCES veterinarios(id),
    tipo VARCHAR(50) NOT NULL DEFAULT 'PREMIUM',
    estado VARCHAR(50) NOT NULL DEFAULT 'disponible',
    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_activacion TIMESTAMP,
    fecha_expiracion TIMESTAMP,
    activa BOOLEAN DEFAULT false,
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para rendimiento
CREATE INDEX idx_licencias_clave ON licencias(clave);
CREATE INDEX idx_licencias_veterinario ON licencias(veterinario_id);
CREATE INDEX idx_licencias_estado ON licencias(estado);
```

**Columnas agregadas a veterinarios:**
```sql
ALTER TABLE veterinarios ADD COLUMN licencia_activa BOOLEAN DEFAULT false;
ALTER TABLE veterinarios ADD COLUMN tipo_cuenta VARCHAR(50) DEFAULT 'DEMO';
ALTER TABLE veterinarios ADD COLUMN fecha_expiracion_demo TIMESTAMP;
```

---

## 🎯 CASOS DE USO

### Caso 1: Generar 10 Licencias para Promoción

```bash
curl -X POST https://sistemamundopatas.com/api/admin/licencias/generar \
  -H "Authorization: Bearer admin-mundopatas-2024" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "PREMIUM",
    "cantidad": 10,
    "notas": "Promoción Black Friday 2025"
  }'
```

### Caso 2: Cliente Activa su Licencia

```javascript
// Frontend - Formulario de activación
async function activarLicencia(clave) {
    const token = localStorage.getItem('token');
    
    const response = await fetch('/api/veterinario/convertir-demo', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ clave_licencia: clave })
    });
    
    const data = await response.json();
    
    if (response.ok) {
        alert(data.message);
        // Recargar página o actualizar UI
        window.location.reload();
    } else {
        alert(data.error);
    }
}
```

### Caso 3: Verificar Estado de Licencia

```javascript
// Frontend - Mostrar banner si es DEMO
async function verificarLicencia() {
    const token = localStorage.getItem('token');
    
    const response = await fetch('/api/licencias/mi-licencia', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    const data = await response.json();
    
    if (!data.tiene_licencia && data.tipo_cuenta === 'DEMO') {
        // Mostrar banner: "Estás en modo DEMO. Activa tu licencia PREMIUM"
        mostrarBannerDemo();
    }
}
```

---

## 🚀 PRÓXIMAS MEJORAS

- [ ] Sistema de renovación automática
- [ ] Notificaciones de expiración (30, 15, 7 días antes)
- [ ] Planes BASIC y ENTERPRISE
- [ ] Descuentos por renovación anticipada
- [ ] Panel de admin web para gestionar licencias
- [ ] Integración con Mercado Pago para compra directa
- [ ] Licencias por suscripción mensual
- [ ] Reportes de ventas de licencias

---

## 📞 SOPORTE

**Para problemas con licencias:**
- 📧 Email: licencias@mundopatas.com
- 📱 WhatsApp: +54 261 702 4193
- 🌐 Web: https://sistemamundopatas.com/soporte

---

**Última actualización:** 2025-10-10  
**Versión:** 1.0.0  
**Estado:** ✅ Producción - Totalmente Operativo
