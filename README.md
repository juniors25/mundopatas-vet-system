# Sistema Veterinario

Una aplicación web completa para la gestión de clínicas veterinarias que permite registrar clientes, mascotas, consultas médicas, análisis y generar informes detallados.

## Características

### 🐾 Gestión de Mascotas
- Registro completo de mascotas con información detallada
- Vinculación con propietarios
- Historial médico completo

### 👥 Gestión de Clientes
- Registro de propietarios con datos de contacto
- Historial de mascotas por cliente

### 🩺 Consultas Médicas
- Registro de consultas veterinarias
- Diagnósticos y tratamientos
- Control de peso y temperatura
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

## Tecnologías Utilizadas

- **Backend**: Node.js + Express
- **Base de Datos**: SQLite
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **UI Framework**: Bootstrap 5
- **Iconos**: Font Awesome
- **Subida de Archivos**: Multer

## Instalación

1. **Clonar o descargar el proyecto**
   ```bash
   cd windsurf-project
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Iniciar el servidor**
   ```bash
   npm start
   ```
   
   Para desarrollo con auto-reload:
   ```bash
   npm run dev
   ```

4. **Acceder a la aplicación**
   Abrir navegador en: `http://localhost:3000`

## Estructura del Proyecto

```
windsurf-project/
├── server.js              # Servidor principal
├── database.js            # Configuración de base de datos
├── package.json           # Dependencias del proyecto
├── public/                # Archivos estáticos
│   ├── index.html         # Página principal
│   ├── styles.css         # Estilos personalizados
│   └── script.js          # JavaScript frontend
├── uploads/               # Archivos subidos (se crea automáticamente)
└── veterinaria.db         # Base de datos SQLite (se crea automáticamente)
```

## Base de Datos

El sistema utiliza SQLite con las siguientes tablas:

- **clientes**: Información de propietarios
- **mascotas**: Datos de las mascotas
- **consultas**: Historial de consultas médicas
- **analisis**: Análisis y estudios realizados
- **vacunas**: Control de vacunación

## API Endpoints

### Clientes
- `POST /api/clientes` - Registrar cliente
- `GET /api/clientes` - Listar clientes

### Mascotas
- `POST /api/mascotas` - Registrar mascota
- `GET /api/mascotas` - Listar mascotas
- `GET /api/mascotas/:id` - Obtener mascota específica

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

## Personalización

El sistema puede ser fácilmente personalizado:

- **Estilos**: Modificar `public/styles.css`
- **Funcionalidades**: Extender las APIs en `server.js`
- **Base de Datos**: Agregar tablas en `database.js`
- **Interfaz**: Modificar `public/index.html` y `public/script.js`

## Soporte

Para soporte técnico o consultas sobre el sistema, contactar al desarrollador.

---

**Desarrollado para clínicas veterinarias modernas** 🐾
