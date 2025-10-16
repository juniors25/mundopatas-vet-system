# 🧪 GUÍA DE PRUEBA: Sistema de Licencias

## ✅ CAMBIOS REALIZADOS

Se agregaron los siguientes endpoints y funcionalidades:

### 1. **Tabla de Licencias en Base de Datos**
- Tabla `licencias` creada automáticamente al iniciar el servidor
- Columnas agregadas a tabla `veterinarios`: `licencia_activa`, `tipo_cuenta`, `fecha_expiracion_demo`

### 2. **Nuevos Endpoints**

#### **Generar Licencias (ADMIN)**
```http
POST /api/admin/licencias/generar
Authorization: Bearer admin-mundopatas-2024
Content-Type: application/json

{
  "tipo": "PREMIUM",
  "cantidad": 1,
  "notas": "Cliente: Dr. Juan Pérez - Pago confirmado"
}
```

#### **Listar Licencias (ADMIN)**
```http
GET /api/admin/licencias
Authorization: Bearer admin-mundopatas-2024
```

#### **Activar Licencia (USUARIO)**
```http
POST /api/validate-license-key
Authorization: Bearer [TOKEN_DEL_VETERINARIO]
Content-Type: application/json

{
  "licenseKey": "MUNDOPATAS-2025-A7F3K9X2-L8M4N5P6"
}
```

---

## 🧪 CÓMO PROBAR

### **Paso 1: Generar una Licencia de Prueba**

Usa **Postman**, **Thunder Client** o **curl**:

```bash
curl -X POST https://sistemamundopatas.com/api/admin/licencias/generar \
  -H "Authorization: Bearer admin-mundopatas-2024" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "PREMIUM",
    "cantidad": 1,
    "notas": "Prueba - Cliente Test"
  }'
```

**Respuesta esperada:**
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
      "fecha_generacion": "2025-10-15T19:00:00.000Z",
      "notas": "Prueba - Cliente Test"
    }
  ]
}
```

**✅ Copia la clave generada** (ejemplo: `MUNDOPATAS-2025-A7F3K9X2-L8M4N5P6`)

---

### **Paso 2: Crear una Cuenta DEMO**

1. Ve a: https://sistemamundopatas.com/landing-comercial.html
2. Click en **"Probar Demo"**
3. El sistema te crea una cuenta DEMO automáticamente
4. **Guarda el token** que aparece en `localStorage` (abre DevTools → Application → Local Storage → token)

O usa el endpoint directamente:

```bash
curl -X POST https://sistemamundopatas.com/api/demo-login
```

**Respuesta:**
```json
{
  "message": "Acceso demo exitoso - Datos precargados",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "email": "demo-1729024193000@mundopatas.com",
    "nombre": "Dr. Demo 1729024193000"
  }
}
```

**✅ Copia el token**

---

### **Paso 3: Activar la Licencia**

Usa el token de tu cuenta DEMO y la clave de licencia generada:

```bash
curl -X POST https://sistemamundopatas.com/api/validate-license-key \
  -H "Authorization: Bearer [TU_TOKEN_AQUI]" \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "MUNDOPATAS-2025-A7F3K9X2-L8M4N5P6"
  }'
```

**Respuesta esperada (ÉXITO):**
```json
{
  "message": "¡Licencia activada exitosamente!",
  "plan": "PREMIUM",
  "features": [
    "Acceso completo",
    "Sin límites",
    "Soporte prioritario",
    "Actualizaciones gratuitas"
  ],
  "fecha_expiracion": "2026-10-15T19:00:00.000Z"
}
```

---

### **Paso 4: Verificar en la Base de Datos**

Conéctate a tu base de datos PostgreSQL y verifica:

```sql
-- Ver la licencia activada
SELECT * FROM licencias WHERE clave = 'MUNDOPATAS-2025-A7F3K9X2-L8M4N5P6';

-- Ver el veterinario actualizado
SELECT id, nombre_veterinario, email, tipo_cuenta, licencia_activa 
FROM veterinarios 
WHERE id = 123;
```

**Resultado esperado:**
- Licencia: `estado = 'activa'`, `activa = true`, `veterinario_id = 123`
- Veterinario: `tipo_cuenta = 'PREMIUM'`, `licencia_activa = true`

---

## 🎯 PRUEBA DESDE EL FRONTEND

### **Opción 1: Usar el Sistema Web**

1. Inicia sesión con tu cuenta DEMO
2. Ve a **"Mi Cuenta"** o **"Configuración"**
3. Busca el botón **"Activar Licencia Premium"**
4. Ingresa la clave: `MUNDOPATAS-2025-A7F3K9X2-L8M4N5P6`
5. Click en **"Activar"**
6. Deberías ver un mensaje de éxito

### **Opción 2: Usar la Consola del Navegador**

Abre DevTools (F12) y ejecuta:

```javascript
const token = localStorage.getItem('token');

fetch('/api/validate-license-key', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        licenseKey: 'MUNDOPATAS-2025-A7F3K9X2-L8M4N5P6'
    })
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error(err));
```

---

## ❌ ERRORES COMUNES

### **Error: "Clave de licencia inválida"**
- La clave no existe en la base de datos
- Verifica que generaste la licencia correctamente

### **Error: "Esta licencia ya ha sido activada"**
- La licencia ya fue usada por otro veterinario
- Genera una nueva licencia

### **Error: "Ya tienes una licencia activa"**
- El veterinario ya tiene una licencia PREMIUM
- No puede activar otra licencia

### **Error: "Token de acceso requerido"**
- No enviaste el token de autenticación
- Verifica que el header `Authorization: Bearer [TOKEN]` esté presente

---

## 📊 VERIFICAR ESTADO DEL SISTEMA

### **Ver todas las licencias (ADMIN)**

```bash
curl -X GET https://sistemamundopatas.com/api/admin/licencias \
  -H "Authorization: Bearer admin-mundopatas-2024"
```

### **Ver mi licencia (USUARIO)**

```bash
curl -X GET https://sistemamundopatas.com/api/licencias/mi-licencia \
  -H "Authorization: Bearer [TU_TOKEN]"
```

---

## 🚀 DEPLOY A PRODUCCIÓN

Los cambios ya fueron pusheados a GitHub:
- Commit: `9c2d19e - Add license system endpoints and database tables`
- Branch: `main`

**Render detectará automáticamente los cambios y re-desplegará el servidor.**

Espera 2-3 minutos y verifica que el servidor esté funcionando:
```bash
curl https://sistemamundopatas.com/api/app-config
```

---

## 📝 RESUMEN

✅ **Agregado:** Endpoint `/api/validate-license-key` para activar licencias
✅ **Agregado:** Endpoint `/api/admin/licencias/generar` para generar licencias
✅ **Agregado:** Endpoint `/api/admin/licencias` para listar licencias
✅ **Agregado:** Tabla `licencias` en PostgreSQL
✅ **Agregado:** Columnas de licencia en tabla `veterinarios`
✅ **Agregado:** Índices para mejor rendimiento

🎯 **Próximo paso:** Probar la activación de licencias desde el frontend

---

**Última actualización:** 15/10/2025  
**Estado:** ✅ Listo para Probar
