# 🚀 CONFIGURACIÓN NEON POSTGRESQL - PASO A PASO

## 1. Crear cuenta en Neon (GRATIS - 3GB)

1. Ve a: **https://neon.tech**
2. Haz clic en "Sign Up"
3. Regístrate con tu email o GitHub
4. Verifica tu email

## 2. Crear proyecto

1. Una vez dentro, haz clic en "Create Project"
2. Configuración:
   - **Project name**: `mundo-patas-veterinaria`
   - **Database name**: `mundopatas`
   - **Region**: `US East (Ohio)` (más cercana a Argentina)
   - **PostgreSQL version**: `16` (última versión)

## 3. Obtener credenciales

Después de crear el proyecto, verás una pantalla con:

```
DATABASE_URL=postgresql://[usuario]:[password]@[host]/[database]?sslmode=require
```

**COPIA ESTA URL COMPLETA** - la necesitarás en el siguiente paso.

## 4. Configurar en Vercel

1. Ve a **https://vercel.com/dashboard**
2. Busca tu proyecto `mundopatas-veterinaria-2024`
3. Haz clic en el proyecto
4. Ve a **Settings** → **Environment Variables**
5. Agrega nueva variable:
   - **Name**: `DATABASE_URL`
   - **Value**: Pega la URL completa de Neon
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

## ✅ Beneficios de Neon:

- **3GB gratis** - suficiente para miles de registros
- **Persistencia real** - datos nunca se pierden
- **Backups automáticos** - seguridad total
- **Escalabilidad** - crece con tu negocio
- **Performance** - conexiones rápidas desde Vercel

## 🔧 Si algo sale mal:

1. Verifica que la DATABASE_URL esté correcta en Vercel
2. Asegúrate de que incluya `?sslmode=require` al final
3. Redeploy el proyecto después de agregar variables
4. Revisa los logs en Vercel → Functions → View Function Logs

**Tiempo estimado**: 10-15 minutos
**Costo**: $0 (plan gratuito de Neon)
