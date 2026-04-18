# PLAN B - DESCONECTAR Y RECONECTAR GITHUB - PASO A PASO

## Paso 1: Ir al Dashboard de Render
1. **Abrir navegador**: https://dashboard.render.com
2. **Iniciar sesión** con tu cuenta de Render

## Paso 2: Seleccionar el Servicio
1. **Buscar servicio**: `srv-d3hg4d0gjchc73afnu30`
2. **Hacer clic** en el nombre del servicio

## Paso 3: Ir a Configuración de GitHub
1. **Hacer clic** en la pestaña "Settings" (en el menú superior)
2. **Buscar sección** "GitHub" en la página de configuración

## Paso 4: Desconectar GitHub
1. **Buscar botón** "Disconnect" o "Disconnect from GitHub"
2. **Hacer clic** en "Disconnect"
3. **Confirmar** la desconexión si pregunta (hacer clic en "Confirm")

## Paso 5: Reconectar GitHub
1. **Hacer clic** en "Connect" o "Connect to GitHub"
2. **Seleccionar cuenta** de GitHub si tienes múltiples
3. **Autorizar** a Render a acceder a tu cuenta GitHub
4. **Seleccionar repositorio**: `juniors25/mundopatas-vet-system`
5. **Seleccionar rama**: `main` (o `master`)
6. **Hacer clic** en "Connect Repository"

## Paso 6: Configurar Deploy
1. **Verificar que** el "Root Directory" esté vacío o en "/"
2. **Verificar que** el "Build Command" sea: `npm install && npm rebuild`
3. **Verificar que** el "Start Command" sea: `node server-postgres.js`
4. **Hacer clic** en "Save Changes" si hiciste cambios

## Paso 7: Forzar Deploy Manual
1. **Volver a la página principal** del servicio
2. **Hacer clic** en "Manual Deploy"
3. **Seleccionar** "Deploy latest commit"
4. **Esperar** a que complete el deploy (2-3 minutos)

## Paso 8: Verificar
1. **Revisar logs** para ver si hay errores
2. **Probar sistema**: https://www.sistemamundopatas.com/sistema.html
3. **Verificar que no haya error 500** en consultas

## Si Sigue Sin Funcionar

### Plan C: Subir Archivos Manualmente
1. **Ir a GitHub**: https://github.com/juniors25/mundopatas-vet-system
2. **"Add file" -> "Upload files"**
3. **Subir**: `server-postgres.js` (la versión más reciente)
4. **Commit**: "Fix consultas API - Final version"
5. **Forzar deploy** en Render nuevamente

## Importante

- **No borres el servicio** en Render
- **No cambies la base de datos**
- **Conserva las variables de entorno**
- **Sé paciente** - el proceso puede tomar 5-10 minutos total
