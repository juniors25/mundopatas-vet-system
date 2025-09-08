# 🚀 MUNDO PATAS - Guía de Deployment Completa

## 📋 Archivos Listos para Subir

### Estructura del Repositorio:
```
mundopatas-vet-system/
├── server.js                 # Servidor principal
├── database-postgres.js      # Configuración PostgreSQL
├── package.json              # Dependencias
├── render.yaml               # Configuración Render
├── vercel.json               # Configuración Vercel (opcional)
├── public/                   # Frontend
│   ├── index.html
│   ├── admin-panel.html
│   └── [otros archivos HTML/CSS/JS]
└── README.md
```

## 🔧 PASO 1: GitHub Repository

### Crear Nuevo Repositorio:
1. Ve a: https://github.com/new
2. **Repository name**: `mundopatas-vet-system`
3. **Description**: `Sistema de gestión veterinaria - Mundo Patas`
4. **Public** ✅
5. **NO** inicializar con README, .gitignore, o license
6. Click **Create repository**

### Comandos para Subir:
```bash
cd c:\Users\Juniors\CascadeProjects\windsurf-project
git init
git add .
git commit -m "Initial commit - Mundo Patas Veterinary System"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/mundopatas-vet-system.git
git push -u origin main
```

## 🚀 PASO 2: Render Deployment

### Crear Servicio en Render:
1. Ve a: https://dashboard.render.com
2. Click **New +** → **Web Service**
3. **Connect GitHub** → Selecciona `mundopatas-vet-system`
4. **Configuración automática** (detecta render.yaml):
   - ✅ Name: `mundopatas-veterinaria`
   - ✅ Environment: `Node`
   - ✅ Build Command: `npm install`
   - ✅ Start Command: `node server.js`
   - ✅ Plan: `Free`

### Variables de Entorno (Auto-configuradas):
- `NODE_ENV=production`
- `JWT_SECRET` (generado automáticamente)
- `DATABASE_URL` (desde PostgreSQL database)

### Base de Datos PostgreSQL:
- ✅ Se crea automáticamente desde render.yaml
- ✅ Nombre: `mundopatas-db`
- ✅ Usuario: `mundopatas`
- ✅ Plan: Free

## 🌐 PASO 3: Dominio (Después del deployment)

### Configurar sistemamundopatas.com:
1. En Render → Settings → Custom Domains
2. Agregar: `sistemamundopatas.com`
3. Configurar DNS:
   - **CNAME**: `sistemamundopatas.com` → `mundopatas-veterinaria.onrender.com`

## ✅ Verificación Final

### URLs de Prueba:
- **App**: `https://mundopatas-veterinaria.onrender.com`
- **Admin**: `https://mundopatas-veterinaria.onrender.com/admin-panel.html`
- **API Test**: `https://mundopatas-veterinaria.onrender.com/api/test`

### Logs a Verificar:
```
✅ Conexión a PostgreSQL establecida
✅ Base de datos PostgreSQL inicializada correctamente
Servidor corriendo en puerto 10000
```

## 🔧 Troubleshooting

### Si hay errores de conexión DB:
- Verificar que `DATABASE_URL` esté configurada
- Revisar logs en Render dashboard
- La base de datos puede tardar 1-2 minutos en estar lista

### Si el build falla:
- Verificar que todos los archivos estén en GitHub
- Revisar que package.json tenga todas las dependencias
