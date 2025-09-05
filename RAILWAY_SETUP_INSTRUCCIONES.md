# 🚀 CONFIGURACIÓN RAILWAY POSTGRESQL - PASO A PASO

## 💰 **COSTO: $5 USD/mes** (perfecto para tu presupuesto)

## 1. Crear cuenta en Railway

1. Ve a: **https://railway.app**
2. Haz clic en "Start a New Project"
3. Regístrate con GitHub (más rápido)
4. Verifica tu cuenta

## 2. Crear base de datos PostgreSQL

1. En el dashboard, haz clic en **"+ New Project"**
2. Selecciona **"Provision PostgreSQL"**
3. Configuración:
   - **Project name**: `mundo-patas-veterinaria`
   - **Database name**: Se crea automáticamente

## 3. Obtener credenciales

1. Haz clic en tu proyecto PostgreSQL
2. Ve a la pestaña **"Variables"**
3. Verás estas variables automáticas:
   ```
   DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/railway
   PGHOST=[host]
   PGPORT=[port]
   PGUSER=postgres
   PGPASSWORD=[password]
   PGDATABASE=railway
   ```

4. **COPIA la DATABASE_URL completa** - la necesitarás para Vercel

## 4. Configurar en Vercel

1. Ve a **https://vercel.com/dashboard**
2. Busca tu proyecto `mundopatas-veterinaria-2024`
3. Haz clic en el proyecto
4. Ve a **Settings** → **Environment Variables**
5. Agrega nueva variable:
   - **Name**: `DATABASE_URL`
   - **Value**: Pega la URL completa de Railway
   - **Environments**: Marca todas (Production, Preview, Development)
6. Haz clic en **Save**

## 5. Redeploy automático

1. Ve a **Deployments** en tu proyecto Vercel
2. Haz clic en los 3 puntos (...) del último deployment
3. Selecciona **Redeploy**
4. Espera 2-3 minutos

## 6. Verificar funcionamiento

1. Ve a: **https://www.sistemamundopatas.com**
2. Haz login con:
   - Email: `demo@mundopatas.com`
   - Password: `demo123`
3. Prueba registrar un nuevo cliente

## ✅ Ventajas de Railway:

- **$5/mes** - precio fijo y predecible
- **500GB de transferencia** incluidos
- **Persistencia garantizada** - datos nunca se pierden
- **Backups automáticos** - seguridad total
- **Performance excelente** - conexiones rápidas
- **Escalabilidad** - crece con tu negocio

## 💳 Configurar facturación:

1. En Railway, ve a **Settings** → **Billing**
2. Agrega tu tarjeta de crédito
3. Selecciona plan **"Developer"** ($5/mes)

## 🔧 Si algo sale mal:

1. Verifica que la DATABASE_URL esté correcta en Vercel
2. Asegúrate de que Railway esté activo y facturado
3. Redeploy el proyecto después de agregar variables
4. Revisa los logs en Vercel → Functions → View Function Logs

**Tiempo estimado**: 15-20 minutos
**Costo**: $5 USD/mes (excelente relación precio-calidad)
