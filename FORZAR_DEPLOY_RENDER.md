# FORZAR DEPLOY MANUAL EN RENDER

## Problema Identificado

Render está deployando una versión antigua:
- **Commit actual en Render**: `55f56378a4d156603958956e0c7d8f1a141636ee`
- **Error 500 persistente**: `/api/consultas` fallando
- **Commits recientes no se deployan**: Problema de sincronización GitHub-Render

## Solución Inmediata

### 1. Forzar Deploy Manual en Render

**Pasos:**
1. **Ir a Dashboard Render**: https://dashboard.render.com
2. **Seleccionar servicio**: `srv-d3hg4d0gjchc73afnu30`
3. **Hacer clic en "Manual Deploy"**
4. **Seleccionar "Deploy latest commit"**
5. **Esperar a que complete** (2-3 minutos)

### 2. Si no funciona, Desconectar y Reconectar GitHub

**Opción B:**
1. **En el servicio**: "Settings" -> "GitHub"
2. **"Disconnect"** del repositorio
3. **"Connect"** nuevamente al repositorio
4. **Forzar deploy** manual

### 3. Último Recurso: Subir Archivos Directamente

**Si todo falla:**
1. **Subir archivos corregidos** manualmente a GitHub
2. **Crear nuevo commit** con cambios
3. **Forzar deploy** en Render

## Archivos Críticos que Faltan Deployar

1. **`server-postgres.js`** - Con logging global y fixes
2. **Últimos commits**:
   - "Fix mascotas API - Remove complex JOIN to prevent 500 errors"
   - "Add global logging to identify 500 errors source"

## Verificación Después del Deploy

1. **Revisar logs de Render** para ver qué endpoint falla
2. **Probar sistema**: https://www.sistemamundopatas.com/sistema.html
3. **Verificar que no haya error 500** en consultas

## Estado Urgente

**CRÍTICO**: Sistema no funciona correctamente por versión antigua deployada
**ACCIÓN**: Forzar deploy manual inmediatamente
**RESULTADO**: Sistema 100% funcional y listo para vender
