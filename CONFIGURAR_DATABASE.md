# CONFIGURAR DATABASE_URL EN RENDER

## DATABASE_URL Recibido
```
postgresql://mundopatas_admin:xsAcMOEx1XBDYsH3m4DQ2WmJOK9Lv4Aw@dpg-d7hccu5ckfvc73eh0teg-a.oregon-postgres.render.com/mundopatas_veterinaria_qw2b
```

## Pasos para Configurar en Render

### 1. Ir al Servicio Web
1. **Dashboard Render**: https://dashboard.render.com
2. **Click en**: `mundopatas-vet-system`
3. **Ir a**: "Environment"

### 2. Agregar Variable de Entorno
1. **Click "Add Environment Variable"**
2. **Key**: `DATABASE_URL`
3. **Value**: 
```
postgresql://mundopatas_admin:xsAcMOEx1XBDYsH3m4DQ2WmJOK9Lv4Aw@dpg-d7hccu5ckfvc73eh0teg-a.oregon-postgres.render.com/mundopatas_veterinaria_qw2b
```
4. **Click "Save"**

### 3. Reiniciar Servicio
1. **Click "Manual Deploy"**
2. **Seleccionar "Deploy latest commit"**
3. **Esperar 2-3 minutos**

## Verificación

Una vez reiniciado:
1. **Visitar**: https://www.sistemamundopatas.com/sistema.html
2. **Verificar que los datos no muestren "0"**
3. **Probar registrar un cliente**

## Estado Esperado

- **Dashboard**: Mostrará números reales
- **Clientes**: Podrás registrar y ver clientes
- **Mascotas**: Podrás registrar mascotas
- **Consultas**: Podrás crear consultas

## Si Hay Problemas

Si después de configurar sigue mostrando "0":
1. **Verificar logs en Render**
2. **Confirmar que la base de datos esté "Live"**
3. **Revisar que el DATABASE_URL sea correcto**

## Resultado Final

Una vez configurado:
- **Sistema 100% funcional**
- **Base de datos persistente**
- **Listo para vender licencias**
- **Planes**: $30.000-$50.000 ARS/mes
