# 🚀 GUÍA MIGRACIÓN A NEON POSTGRESQL

## Paso 1: Crear cuenta en Neon (GRATIS)

1. **Ve a**: https://neon.tech
2. **Regístrate** con tu email o GitHub
3. **Crea un nuevo proyecto**:
   - Nombre: `mundo-patas-veterinaria`
   - Región: `US East (Ohio)` (más cercana)
   - PostgreSQL version: `16` (última)

## Paso 2: Obtener credenciales

Una vez creado el proyecto, Neon te dará:

```
DATABASE_URL=postgresql://[usuario]:[password]@[host]/[database]?sslmode=require
```

**Ejemplo**:
```
DATABASE_URL=postgresql://mundopatas_owner:abc123@ep-cool-cloud-123.us-east-2.aws.neon.tech/mundopatas?sslmode=require
```

## Paso 3: Configurar variables de entorno

### En Vercel:
1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega:
   - `DATABASE_URL` = tu URL de Neon
   - `NODE_ENV` = `production`

### Localmente (opcional):
Crea `.env.local`:
```
DATABASE_URL=postgresql://...tu-url-de-neon
NODE_ENV=development
```

## Paso 4: Actualizar código backend

Ya tenemos el archivo `server-postgres.js` listo, solo necesitamos:
1. Reemplazar `api/server.js` con la versión PostgreSQL
2. Actualizar `package.json` con dependencias PostgreSQL
3. Hacer redeploy

## Beneficios de Neon:

✅ **3GB gratis** - suficiente para miles de clientes
✅ **Persistencia real** - datos nunca se pierden
✅ **Backups automáticos** - seguridad total
✅ **Escalabilidad** - crece con tu negocio
✅ **Performance** - mucho más rápido que in-memory

## Plan de migración:

1. ⏳ Crear cuenta Neon
2. ⏳ Obtener DATABASE_URL
3. ⏳ Configurar variables en Vercel
4. ⏳ Actualizar código backend
5. ⏳ Redeploy y probar

**Tiempo estimado**: 15-20 minutos
**Costo**: $0 (plan gratuito)
