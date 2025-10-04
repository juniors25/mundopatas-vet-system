# 🚀 DEPLOYMENT EN RENDER - PASO A PASO

## ⚠️ IMPORTANTE: Usar Blueprint

Tu proyecto ya tiene `render.yaml` configurado. Debes desplegarlo como **Blueprint** para que Render cree automáticamente la base de datos.

## 📋 PASOS CORRECTOS

### **1. Eliminar el servicio actual (si existe)**
1. Ve a [dashboard.render.com](https://dashboard.render.com)
2. Selecciona el servicio `mundopatas-veterinaria`
3. Ve a **Settings** → Scroll hasta abajo
4. Click en **"Delete Service"**
5. Confirma la eliminación

### **2. Crear nuevo deployment con Blueprint**
1. En el Dashboard de Render, click en **"New +"**
2. Selecciona **"Blueprint"** (NO "Web Service")
3. Conecta tu repositorio de GitHub: `jjvserviciosinformaticos-ship-it/mundopatas-vet-system`
4. Render detectará automáticamente el archivo `render.yaml`
5. Click en **"Apply"**

### **3. Render creará automáticamente:**
- ✅ Base de datos PostgreSQL (`mundopatas-db`)
- ✅ Web Service (`mundopatas-veterinaria`)
- ✅ Variable `DATABASE_URL` conectada automáticamente
- ✅ Variable `JWT_SECRET` generada automáticamente
- ✅ Variable `NODE_ENV=production`

### **4. Esperar el deployment**
- El proceso toma 2-5 minutos
- Verás en los logs: `✅ Base de datos inicializada correctamente`
- Tu app estará disponible en: `https://sistemamundopatas.com`

## 🔧 ALTERNATIVA: Configurar manualmente (si no quieres usar Blueprint)

Si prefieres mantener el servicio actual:

### **Paso 1: Crear base de datos PostgreSQL**
1. En Render Dashboard → **"New +"** → **"PostgreSQL"**
2. Nombre: `mundopatas-db`
3. Database: `mundopatas`
4. User: `mundopatas_user`
5. Plan: **Free**
6. Click **"Create Database"**

### **Paso 2: Copiar la URL de conexión**
1. Una vez creada, ve a la base de datos
2. Copia la **"Internal Database URL"** (empieza con `postgresql://`)

### **Paso 3: Configurar variable en el servicio**
1. Ve a tu servicio `mundopatas-veterinaria`
2. **Environment** → **"Add Environment Variable"**
3. Key: `DATABASE_URL`
4. Value: Pega la URL que copiaste
5. **"Save Changes"**

### **Paso 4: Redeploy**
1. Ve a **"Manual Deploy"** → **"Deploy latest commit"**
2. Espera a que termine el deployment

## ✅ VERIFICACIÓN

Cuando esté funcionando correctamente, verás en los logs:

```
✅ Base de datos inicializada correctamente
✅ Servidor PostgreSQL iniciado en puerto 10000
```

## 🌐 DOMINIO

Tu app estará disponible en:
- https://sistemamundopatas.com
- https://mundopatas-veterinaria.onrender.com (URL de Render)

---

**RECOMENDACIÓN:** Usa la **Opción 1 (Blueprint)** para evitar errores de configuración manual.
