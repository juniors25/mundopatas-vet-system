# 🔐 CREDENCIALES Y ACCESO AL SISTEMA MUNDO PATAS

## 📋 Información General del Sistema

**Sistema:** MUNDO PATAS - Sistema Veterinario Completo  
**URL Producción:** https://sistemamundopatas.com  
**Plataforma de Hosting:** Render.com  
**Base de Datos:** PostgreSQL (Render)

---

## 👨‍⚕️ ACCESO PARA VETERINARIOS

### Sistema Completo - Acceso Principal

Para acceder al **sistema completo** con todas las funcionalidades, los veterinarios deben:

1. **Registrarse en el sistema:**
   - URL: https://sistemamundopatas.com
   - Click en "Registrarse" o "Crear Cuenta"
   - Completar el formulario de registro con:
     - Nombre de la veterinaria
     - Nombre del veterinario
     - Email (será el usuario de acceso)
     - Contraseña (la que el veterinario elija)
     - Teléfono
     - Dirección

2. **Iniciar Sesión:**
   - URL: https://sistemamundopatas.com
   - Email: [el email registrado]
   - Contraseña: [la contraseña elegida al registrarse]

### ⚠️ IMPORTANTE: No hay contraseña predeterminada

**El sistema NO tiene una contraseña fija o predeterminada.** Cada veterinario:
- ✅ Crea su propia cuenta con su email y contraseña
- ✅ Tiene acceso completo a TODAS las funcionalidades desde el momento del registro
- ✅ Sus datos están aislados de otros veterinarios (multi-tenant)
- ✅ Puede recuperar su contraseña si la olvida

---

## 🎯 SISTEMA DEMO PARA PRESENTACIONES

### Acceso Demo Automático

Para **demostraciones comerciales** sin necesidad de registro:

**URL:** https://sistemamundopatas.com/landing-comercial.html

**Características del Demo:**
- ✅ Acceso instantáneo sin registro
- ✅ Crea un veterinario demo único por sesión
- ✅ Datos de ejemplo pre-cargados (clientes y mascotas)
- ✅ Todas las funcionalidades disponibles
- ✅ Datos aislados por sesión (cada demo es independiente)
- ✅ Ideal para presentaciones de ventas

**Cómo funciona:**
1. Entrar a la landing comercial
2. Click en "Probar Demo"
3. El sistema crea automáticamente:
   - Un veterinario demo con email único (demo-[timestamp]@mundopatas.com)
   - 3 clientes de ejemplo
   - 5 mascotas de ejemplo
   - Token de sesión válido

---

## 🏥 FUNCIONALIDADES DEL SISTEMA COMPLETO

Una vez que el veterinario inicia sesión, tiene acceso a:

### ✅ Gestión Completa
- 👥 **Clientes:** Registro y gestión de propietarios
- 🐾 **Mascotas:** Registro con información completa
- 🩺 **Consultas:** Historial médico detallado
- 🧪 **Análisis:** Estudios y resultados
- 💉 **Vacunas:** Control de vacunación
- 📋 **Informes:** Generación de reportes médicos

### ✅ Funcionalidades Avanzadas
- 📅 **Citas Online:** Sistema de agendamiento para clientes
- 💳 **Facturación:** Gestión de pagos y facturas
- 📦 **Inventario:** Control de medicamentos y productos
- 🔔 **Notificaciones:** Alertas automáticas de alimento
- 📊 **Reportes:** Estadísticas y análisis
- 🔗 **QR para Clientes:** Código QR para que clientes agenden citas

### ✅ Integraciones
- 💰 **Mercado Pago:** Pagos online
- 🏦 **Transferencias:** CBU/CVU configurables
- 📧 **Email:** Notificaciones automáticas
- 📱 **WhatsApp:** Alertas por WhatsApp (Twilio)
- 💬 **Telegram:** Notificaciones por Telegram

---

## 🔧 PANEL DE ADMINISTRACIÓN

**URL:** https://sistemamundopatas.com/admin-panel.html

**Credenciales de Administrador:**
- Usuario: `admin`
- Contraseña: `mundopatas2024`

**Funcionalidades del Admin:**
- Gestión de licencias
- Validación de claves de acceso
- Configuración global del sistema
- Monitoreo de veterinarios registrados

---

## 📱 PORTAL DEL PACIENTE

**URL:** https://sistemamundopatas.com/paciente.html

**Acceso Público para Clientes:**
- Los clientes pueden consultar información de sus mascotas
- Búsqueda por nombre completo y email
- Visualización de historial médico
- No requiere contraseña (solo datos de identificación)

---

## 🎫 SISTEMA DE QR PARA CLIENTES

### Para Veterinarios

Cada veterinario puede generar un **código QR personalizado** para su clínica:

**URL de Generación:** https://sistemamundopatas.com/generar-qr.html

**Uso:**
1. El veterinario inicia sesión en el sistema
2. Accede a "Generar QR para Clientes"
3. El sistema genera un QR único con su ID de veterinario
4. El veterinario imprime el QR y lo coloca en su clínica

### Para Clientes

Cuando un cliente escanea el QR:
1. Se abre automáticamente el formulario de agendamiento de citas
2. El formulario ya está vinculado al veterinario correcto
3. El cliente completa sus datos y agenda la cita
4. Puede pagar online (Mercado Pago/Transferencia) o en efectivo

**URL de Agendamiento:**
```
https://sistemamundopatas.com/agendar-cita.html?vet=[ID_VETERINARIO]
```

---

## 🔒 SEGURIDAD

### Encriptación de Contraseñas
- ✅ Todas las contraseñas se encriptan con **bcrypt** (10 rounds)
- ✅ No se almacenan contraseñas en texto plano
- ✅ Imposible recuperar contraseñas (solo resetear)

### Autenticación
- ✅ **JWT (JSON Web Tokens)** para sesiones
- ✅ Tokens válidos por 24 horas
- ✅ Renovación automática de sesión

### Aislamiento de Datos
- ✅ **Multi-tenant:** Cada veterinario solo ve sus datos
- ✅ Validación de permisos en cada request
- ✅ Queries parametrizadas (protección SQL injection)

---

## 📞 SOPORTE TÉCNICO

**Para problemas de acceso:**
- 📧 Email: soporte@mundopatas.com
- 📱 WhatsApp: +54 261 702 4193
- 🌐 Web: https://sistemamundopatas.com

**Problemas comunes:**
1. **Olvidé mi contraseña:** Usar función "Recuperar Contraseña" (próximamente)
2. **No puedo registrarme:** Verificar que el email no esté ya registrado
3. **Error al iniciar sesión:** Verificar email y contraseña correctos
4. **No veo mis datos:** Asegurarse de estar usando el email correcto

---

## 📊 RESUMEN DE CREDENCIALES

| Tipo de Acceso | URL | Usuario | Contraseña |
|----------------|-----|---------|------------|
| **Veterinario (Registro)** | sistemamundopatas.com | Email elegido | Contraseña elegida |
| **Veterinario (Login)** | sistemamundopatas.com | Email registrado | Contraseña registrada |
| **Demo Comercial** | sistemamundopatas.com/landing-comercial.html | Automático | Automático |
| **Admin Panel** | sistemamundopatas.com/admin-panel.html | admin | mundopatas2024 |
| **Portal Paciente** | sistemamundopatas.com/paciente.html | Público | No requiere |
| **Agendar Cita (QR)** | sistemamundopatas.com/agendar-cita.html?vet=X | Público | No requiere |

---

## 🚀 PRIMEROS PASOS PARA NUEVOS VETERINARIOS

### 1. Registro Inicial
```
1. Ir a: https://sistemamundopatas.com
2. Click en "Registrarse"
3. Completar formulario
4. Confirmar email (si está habilitado)
5. Iniciar sesión
```

### 2. Configuración Inicial
```
1. Configurar métodos de pago (Mercado Pago, CBU/CVU)
2. Crear servicios y precios
3. Generar QR para clientes
4. Configurar notificaciones (opcional)
```

### 3. Uso Diario
```
1. Registrar clientes
2. Registrar mascotas
3. Crear consultas médicas
4. Generar informes
5. Gestionar citas
```

---

**Última actualización:** 2025-10-10  
**Versión del Sistema:** 2.0.0  
**Estado:** ✅ Producción - Totalmente Operativo
