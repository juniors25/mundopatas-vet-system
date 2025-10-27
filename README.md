# 🐾 MUNDO PATAS - Sistema Veterinario Completo

Una aplicación web completa para la gestión de clínicas veterinarias que permite registrar clientes, mascotas, consultas médicas, análisis y generar informes detallados. **Incluye sistema automático de notificaciones** para alertas de alimento y recordatorios.

**🔗 Panel de Administración:** [https://sistemamundopatas.com/admin-panel.html](https://sistemamundopatas.com/admin-panel.html)

## ✨ Características Principales

### 🐾 Gestión de Mascotas
- Registro completo de mascotas con información detallada
- Vinculación con propietarios
- Historial médico completo
- **Control de alimento y consumo diario**
- **Cálculo automático de días restantes**

### 👥 Gestión de Clientes
- **Búsqueda avanzada** con múltiples filtros (nombre, apellido, email, teléfono, dirección)
- **Segmentación de clientes** para marketing dirigido
- **Sistema de referidos** con seguimiento
- **Registro completo** de propietarios con datos de contacto extendidos
- Historial de mascotas por cliente
- **Múltiples direcciones** por cliente
- **Etiquetas personalizables** para mejor organización
- **Portal del paciente** para consulta de información
- **Registro de interacciones** con seguimiento de comunicación

### 🩺 Gestión de Historias Clínicas
- **Historial clínico completo** con seguimiento de todas las consultas
- **Tipos de consulta** personalizables con colores para fácil identificación
- **Archivos adjuntos** para guardar radiografías, análisis y documentos
- **Plantillas** para agilizar el registro de consultas frecuentes
- **Vacunación** con registro de lotes y fechas de próxima dosis
- **Desparasitaciones** con seguimiento de productos y fechas
- **Recetas médicas** con gestión de medicamentos y dosis
- **Estadísticas** de consultas por tipo y período
- **Búsqueda avanzada** en el historial clínico
- **Exportación** de historias clínicas en formato PDF
- **Firma digital** para validación de documentos
- **Notas de evolución** con seguimiento de cambios
- **Alertas** para vacunas y controles pendientes
- Observaciones médicas

### 🧪 Análisis y Estudios
- Registro de diferentes tipos de análisis
- Subida de archivos adjuntos (PDF, imágenes, documentos)
- Resultados y observaciones
- Tipos: Hemograma, Bioquímica, Radiografías, Ecografías, etc.

### 📋 Informes Médicos
- Generación de informes completos por mascota
- Historial médico detallado
- Función de impresión
- Exportación de datos

### 💉 Control de Vacunas
- Registro de vacunas aplicadas
- Control de fechas de próximas dosis
- Historial de vacunación

### 🤖 **NUEVO: Bot de Notificaciones Automáticas**
- ✅ Verificación diaria automática de alimento de mascotas
- ✅ Alertas por Email, WhatsApp y Telegram
- ✅ Cálculo inteligente de días restantes
- ✅ Prevención de envíos duplicados
- ✅ Configuración personalizable por veterinario
- ✅ Historial completo de notificaciones
- ✅ Múltiples métodos de ejecución (Task Scheduler, Cron, Manual)

## 🛠️ Tecnologías Utilizadas

- **Backend**: Node.js + Express
- **Base de Datos**: PostgreSQL (producción) / SQLite (desarrollo)
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **UI Framework**: Bootstrap 5
- **Iconos**: Font Awesome
- **Subida de Archivos**: Multer
- **Notificaciones**: 
  - Email: Nodemailer (Gmail)
  - WhatsApp: Twilio
  - Telegram: Bot API
- **Automatización**: node-cron, Task Scheduler (Windows)
- **Autenticación**: JWT (JSON Web Tokens)
- **Seguridad**: bcrypt para passwords

## 🛠️ Nuevas Mejoras

### 🔍 Búsqueda Avanzada de Clientes
- Búsqueda por múltiples criterios simultáneos
- Filtrado por segmentos y etiquetas
- Ordenamiento personalizable
- Paginación de resultados
- Inclusión opcional de mascotas en los resultados

### 📊 Segmentación de Clientes
- Creación y gestión de segmentos personalizados
- Asignación de colores para mejor identificación visual
- Filtrado por segmentos en informes y búsquedas

### 🔄 Sistema de Migraciones
- Control de versiones de la base de datos
- Migraciones automáticas al desplegar
- Scripts para crear nuevas migraciones
- Herramienta de reinicio para entornos de desarrollo

## 📋 Estructura de la Base de Datos

### Tablas Principales

#### `historias_clinicas`
- Registro completo de todas las consultas médicas
- Relación con mascotas, tipos de consulta y veterinarios
- Datos clínicos completos (peso, temperatura, signos vitales)

#### `tipos_consulta`
- Tipos de consulta personalizables (ej: Consulta general, Vacunación, Cirugía)
- Colores para identificación visual

#### `archivos_adjuntos`
- Almacenamiento de archivos médicos (imágenes, PDFs, etc.)
- Metadatos descriptivos y relación con historias clínicas

#### `vacunas` y `vacunas_aplicadas`
- Catálogo de vacunas disponibles
- Registro de aplicaciones con fechas y lotes

#### `medicamentos` y `recetas_medicamentos`
- Inventario de medicamentos
- Prescripciones médicas con dosis y frecuencia

#### `plantillas_historia_clinica`
- Plantillas predefinidas para diferentes tipos de consulta
- Ahorra tiempo en consultas frecuentes

## 🚀 Instalación Rápida

### 1. Clonar o descargar el proyecto
```bash
cd windsurf-project
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env con tus credenciales
# Mínimo requerido:
# - DATABASE_URL (PostgreSQL)
# - JWT_SECRET
# - SMTP_USER y SMTP_PASS (para notificaciones por email)
```

### 4. Iniciar el servidor
```bash
npm start
```

Para desarrollo con auto-reload:
```bash
npm run dev
```

### 5. Acceder a la aplicación
Abrir navegador en: `http://localhost:3000`

## 🤖 Configurar Bot de Notificaciones

### Opción 1: Prueba Rápida
```bash
# Verificar que todo esté configurado correctamente
node test-bot-rapido.js

# Ejecutar bot manualmente
node bot-notificaciones.js
```

### Opción 2: Automático en Windows
```powershell
# Ejecutar como Administrador
.\configurar-bot-windows.ps1
```

### Opción 3: Cron Integrado
```bash
# En .env, configurar:
ENABLE_AUTO_CRON=true

# Reiniciar servidor
npm start
```

📖 **Documentación completa**: Ver [GUIA_COMPLETA_BOT.md](GUIA_COMPLETA_BOT.md)

## 📊 API de Historias Clínicas

### Endpoints Principales

#### `GET /api/historias-clinicas/mascota/:mascota_id`
Obtiene el historial clínico completo de una mascota con paginación.

**Parámetros:**
- `pagina`: Número de página (opcional, predeterminado: 1)
- `por_pagina`: Cantidad de registros por página (opcional, predeterminado: 10)
- `incluir_archivos`: Incluir archivos adjuntos (opcional, valores: 'true' o 'false')

#### `POST /api/historias-clinicas`
Crea una nueva entrada en el historial clínico.

**Cuerpo de la solicitud (JSON):**
```json
{
  "mascota_id": 1,
  "tipo_consulta_id": 1,
  "motivo_consulta": "Control de rutina",
  "sintomatologia": "Paciente asintomático",
  "diagnostico": "Estado de salud óptimo",
  "tratamiento": "Control en 6 meses",
  "peso_kg": 4.5,
  "temperatura_c": 38.5,
  "medicamentos": [
    {
      "medicamento_id": 1,
      "dosis": "1 tableta cada 12 horas",
      "frecuencia": "Cada 12 horas por 7 días",
      "duracion_dias": 7,
      "indicaciones": "Administrar con alimento"
    }
  ]
}
```

#### `POST /api/historias-clinicas/:id/archivos`
Sube un archivo adjunto a una historia clínica.

**Form-Data:**
- `archivo`: Archivo a subir (imagen, PDF, etc.)
- `descripcion`: Descripción opcional del archivo

#### `GET /api/historias-clinicas/estadisticas`
Obtiene estadísticas de las historias clínicas.

**Parámetros:**
- `fecha_desde`: Fecha de inicio (opcional)
- `fecha_hasta`: Fecha de fin (opcional)

## 📄 Estructura del Proyecto

```
windsurf-project/
├── 📄 server-postgres.js           # Servidor principal con PostgreSQL
├── 📄 database-postgres.js         # Configuración de base de datos
├── 📄 bot-notificaciones.js        # Bot de notificaciones (script independiente)
├── 📄 test-bot-rapido.js           # Script de prueba del bot
├── 📄 configurar-bot-windows.ps1   # Instalador automático para Windows
├── 📄 package.json                 # Dependencias del proyecto
├── 📄 .env                         # Variables de entorno (crear desde .env.example)
├── 📄 .env.example                 # Plantilla de configuración
├── 📁 services/                    # Servicios del sistema
│   ├── verificador-alimento.js    # Lógica de verificación de alimento
│   └── notificaciones.js          # Envío de emails/WhatsApp/Telegram
├── 📁 public/                      # Archivos estáticos
│   ├── index.html                 # Landing page
│   ├── sistema.html               # Sistema veterinario
│   ├── paciente.html              # Portal del paciente
│   ├── landing-comercial.html     # Landing comercial
│   └── styles/                    # Estilos CSS
├── 📁 uploads/                     # Archivos subidos (se crea automáticamente)
├── 📁 docs/                        # Documentación
│   ├── GUIA_COMPLETA_BOT.md       # Guía completa del bot
│   ├── CONFIGURACION_BOT_NOTIFICACIONES.md
│   ├── RESUMEN_NOTIFICACIONES.md
│   └── GUIA_NOTIFICACIONES.md
└── 📄 README.md                    # Este archivo
```

## 🗄️ Base de Datos

El sistema utiliza **PostgreSQL** con las siguientes tablas:

### Tablas Principales
- **veterinarios**: Usuarios del sistema (veterinarios)
- **clientes**: Información de propietarios
- **mascotas**: Datos de las mascotas (incluye campos de alimento)
- **consultas**: Historial de consultas médicas
- **analisis**: Análisis y estudios realizados
- **vacunas**: Control de vacunación

### Tablas de Notificaciones (Bot)
- **notificaciones_config**: Configuración de notificaciones por veterinario
- **alertas_alimento**: Registro de alertas generadas
- **notificaciones_enviadas**: Historial de notificaciones enviadas

## 🔌 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar veterinario
- `POST /api/login` - Iniciar sesión

### Clientes
- `POST /api/clientes` - Registrar cliente
- `GET /api/clientes` - Listar clientes
- `GET /api/clientes-con-mascotas` - Clientes con sus mascotas

### Mascotas
- `POST /api/mascotas` - Registrar mascota
- `GET /api/mascotas` - Listar mascotas
- `GET /api/mascotas/:id/alimento-restante` - Calcular días restantes de alimento

### Consultas
- `POST /api/consultas` - Registrar consulta
- `GET /api/consultas/:mascota_id` - Historial de consultas

### Análisis
- `POST /api/analisis` - Registrar análisis (con archivo)
- `GET /api/analisis/:mascota_id` - Historial de análisis

### Vacunas
- `POST /api/vacunas` - Registrar vacuna
- `GET /api/vacunas/:mascota_id` - Historial de vacunas

### Informes
- `GET /api/informe/:mascota_id` - Generar informe completo

### 🤖 Notificaciones (Bot)
- `POST /api/notificaciones/verificar-alimento` - Ejecutar verificación manual
- `GET /api/notificaciones/config` - Obtener configuración
- `POST /api/notificaciones/config` - Actualizar configuración
- `GET /api/notificaciones/historial` - Ver historial de notificaciones
- `GET /api/notificaciones/alertas` - Ver alertas activas

## Funcionalidades Principales

### Dashboard
- Resumen estadístico de la clínica
- Contadores de clientes, mascotas, consultas y análisis

### Registro de Clientes
- Formulario completo con validación
- Lista de clientes registrados

### Registro de Mascotas
- Selección de cliente propietario
- Información detallada (especie, raza, edad, peso, etc.)
- Lista de mascotas con información del propietario

### Consultas Médicas
- Selección de mascota
- Registro de motivo, diagnóstico y tratamiento
- Control de signos vitales
- Historial de consultas por mascota

### Análisis y Estudios
- Diferentes tipos de análisis
- Subida de archivos adjuntos
- Resultados y observaciones
- Historial por mascota

### Informes Médicos
- Informe completo por mascota
- Incluye toda la información médica
- Función de impresión
- Formato profesional

## Uso

1. **Registrar Clientes**: Comenzar registrando los propietarios de las mascotas
2. **Registrar Mascotas**: Asociar mascotas con sus propietarios
3. **Consultas**: Registrar cada visita médica con diagnósticos y tratamientos
4. **Análisis**: Cargar resultados de estudios con archivos adjuntos
5. **Informes**: Generar informes completos para revisión o impresión

## Características Técnicas

- **Responsive Design**: Funciona en dispositivos móviles y desktop
- **Base de Datos Relacional**: Estructura normalizada con claves foráneas
- **Subida de Archivos**: Soporte para PDF, imágenes y documentos
- **Interfaz Moderna**: Diseño limpio con Bootstrap 5
- **Validación**: Validación tanto en frontend como backend
- **Mensajes de Estado**: Feedback visual para todas las operaciones

## Seguridad

- Validación de datos en servidor
- Sanitización de archivos subidos
- Manejo seguro de errores
- Estructura de carpetas protegida

## 🎨 Personalización

El sistema puede ser fácilmente personalizado:

- **Estilos**: Modificar archivos CSS en `public/`
- **Funcionalidades**: Extender las APIs en `server-postgres.js`
- **Base de Datos**: Agregar tablas en `database-postgres.js`
- **Interfaz**: Modificar archivos HTML en `public/`
- **Bot**: Ajustar lógica en `services/verificador-alimento.js`
- **Notificaciones**: Personalizar mensajes en `services/notificaciones.js`

## 📚 Documentación Adicional

- **[GUIA_COMPLETA_BOT.md](GUIA_COMPLETA_BOT.md)** - Guía completa del bot de notificaciones
- **[CONFIGURACION_BOT_NOTIFICACIONES.md](CONFIGURACION_BOT_NOTIFICACIONES.md)** - Configuración paso a paso
- **[RESUMEN_NOTIFICACIONES.md](RESUMEN_NOTIFICACIONES.md)** - Resumen del sistema de notificaciones
- **[GUIA_NOTIFICACIONES.md](GUIA_NOTIFICACIONES.md)** - Guía de uso de notificaciones

## 🔒 Seguridad

- ✅ Autenticación con JWT
- ✅ Passwords encriptados con bcrypt
- ✅ Validación de datos en servidor
- ✅ Sanitización de archivos subidos
- ✅ Protección contra SQL injection (queries parametrizadas)
- ✅ Variables de entorno para credenciales sensibles
- ✅ CORS configurado
- ✅ Manejo seguro de errores

## 🚀 Deployment

### Opciones de Hosting

1. **Railway** - Recomendado para PostgreSQL
2. **Render** - Free tier disponible
3. **Heroku** - Fácil deployment
4. **Vercel** - Para frontend estático
5. **VPS** - Control total (DigitalOcean, Linode, etc.)

Ver documentación de deployment en `PLAN_DEPLOYMENT.md`

## 🧪 Testing

```bash
# Probar conexión a base de datos
node -e "require('./database-postgres').initializeDatabase().then(() => console.log('✅ OK'))"

# Probar bot de notificaciones
node test-bot-rapido.js

# Ejecutar bot manualmente
node bot-notificaciones.js

# Probar APIs
node test-apis.js
```

## 📊 Características Técnicas

- ✅ **Responsive Design**: Funciona en móviles, tablets y desktop
- ✅ **Base de Datos Relacional**: PostgreSQL con estructura normalizada
- ✅ **Subida de Archivos**: Soporte para PDF, imágenes y documentos
- ✅ **Interfaz Moderna**: Diseño limpio con Bootstrap 5
- ✅ **Validación**: Frontend y backend
- ✅ **Mensajes de Estado**: Feedback visual para todas las operaciones
- ✅ **Portal del Paciente**: Acceso público para clientes
- ✅ **Sistema Multi-Veterinario**: Cada veterinario tiene sus propios datos
- ✅ **Notificaciones Automáticas**: Bot inteligente de alertas
- ✅ **Historial Completo**: Registro de todas las acciones

## 🎯 Casos de Uso

### Para Veterinarios
1. Gestión completa de pacientes y clientes
2. Historial médico detallado
3. Generación de informes profesionales
4. Alertas automáticas de alimento
5. Control de vacunación

### Para Clientes
1. Portal de acceso a información de sus mascotas
2. Recepción de notificaciones automáticas
3. Consulta de historial médico
4. Recordatorios de alimento y vacunas

## 📈 Roadmap Futuro

- [ ] App móvil nativa (React Native)
- [ ] Recordatorios de vacunas automáticos
- [ ] Sistema de citas online
- [ ] Telemedicina (videollamadas)
- [ ] Facturación y pagos
- [ ] Inventario de medicamentos
- [ ] Reportes y estadísticas avanzadas
- [ ] Integración con laboratorios
- [ ] Sistema de recordatorios por SMS

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📞 Soporte

Para soporte técnico o consultas sobre el sistema:

- 📧 Email: soporte@mundopatas.com
- 📖 Documentación: Ver archivos `.md` en el proyecto
- 🐛 Issues: Reportar en GitHub

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo `LICENSE` para más detalles.

---

<div align="center">

**🐾 MUNDO PATAS - Sistema Veterinario Completo 🐾**

*Desarrollado para clínicas veterinarias modernas*

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue.svg)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**[Documentación](GUIA_COMPLETA_BOT.md)** • **[Demo](http://localhost:3000)** • **[Reportar Bug](https://github.com/tu-repo/issues)**

</div>
