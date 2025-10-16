# 🗑️ CÓMO BORRAR TODOS LOS DATOS DE LA BASE DE DATOS

## ✅ MÉTODO 1: Usando Render Shell (MÁS FÁCIL)

### Paso 1: Accede a Render
```
https://dashboard.render.com
```

### Paso 2: Selecciona tu Servicio
- Click en `mundopatas-veterinaria` o tu servicio web

### Paso 3: Abre la Shell
- Click en la pestaña **"Shell"** (arriba a la derecha)
- Espera a que cargue la terminal

### Paso 4: Ejecuta el Script
```bash
node limpiar-usuarios.js
```

### Paso 5: Verás Esto
```
🗑️  LIMPIANDO BASE DE DATOS...

1. Borrando notificaciones...
2. Borrando telemedicina...
3. Borrando inventario...
4. Borrando facturación...
5. Borrando citas...
6. Borrando servicios...
7. Borrando valoraciones y ubicaciones...
8. Borrando FAQ y protocolos...
9. Borrando consultas médicas...
10. Borrando mascotas...
11. Borrando clientes...
12. Borrando licencias...
13. Borrando control de ventas...
14. Borrando configuraciones...
15. Borrando TODOS los veterinarios...

✅ BASE DE DATOS LIMPIADA COMPLETAMENTE
📊 X veterinarios eliminados

🔄 Reiniciando secuencias...
✅ Secuencias reiniciadas

🎉 ¡Listo! La base de datos está limpia
```

---

## ✅ MÉTODO 2: Usando SQL Directo en Render

### Paso 1: Accede a tu Base de Datos
```
https://dashboard.render.com
```

### Paso 2: Selecciona tu Database
- Click en `mundopatas-db` (PostgreSQL)

### Paso 3: Conecta con psql
- Click en **"Connect"**
- Copia el comando que aparece (algo como):
```bash
PGPASSWORD=xxx psql -h xxx.oregon-postgres.render.com -U mundopatas_db_user mundopatas_db
```

### Paso 4: Ejecuta el Script SQL
Copia y pega el contenido del archivo `BORRAR_TODO.sql`:

```sql
BEGIN;

DELETE FROM notificaciones;
DELETE FROM notificaciones_enviadas;
DELETE FROM alertas_alimento;
DELETE FROM telemedicina_mensajes;
DELETE FROM telemedicina_sesiones;
DELETE FROM movimientos_inventario;
DELETE FROM inventario_productos;
DELETE FROM pagos;
DELETE FROM factura_items;
DELETE FROM facturas;
DELETE FROM citas;
DELETE FROM servicios_veterinaria;
DELETE FROM valoraciones;
DELETE FROM ubicaciones;
DELETE FROM faq;
DELETE FROM protocolos_trabajo;
DELETE FROM analisis;
DELETE FROM vacunas;
DELETE FROM consultas;
DELETE FROM mascotas;
DELETE FROM clientes;
DELETE FROM licencias;
DELETE FROM historial_pagos_clientes;
DELETE FROM mis_clientes_ventas;
DELETE FROM configuraciones;
DELETE FROM notificaciones_config;
DELETE FROM veterinarios;

ALTER SEQUENCE veterinarios_id_seq RESTART WITH 1;
ALTER SEQUENCE clientes_id_seq RESTART WITH 1;
ALTER SEQUENCE mascotas_id_seq RESTART WITH 1;
ALTER SEQUENCE consultas_id_seq RESTART WITH 1;
ALTER SEQUENCE licencias_id_seq RESTART WITH 1;
ALTER SEQUENCE facturas_id_seq RESTART WITH 1;
ALTER SEQUENCE citas_id_seq RESTART WITH 1;

COMMIT;
```

### Paso 5: Verifica
```sql
SELECT COUNT(*) FROM veterinarios;
-- Debe devolver: 0

SELECT COUNT(*) FROM clientes;
-- Debe devolver: 0
```

---

## ✅ MÉTODO 3: Desde Render Web Console

### Paso 1: Ve a tu Database
```
https://dashboard.render.com
```
- Click en `mundopatas-db`

### Paso 2: Abre el Query Editor
- Click en **"Query"** o **"Console"**

### Paso 3: Ejecuta Comando por Comando
```sql
-- Copiar y pegar línea por línea
DELETE FROM veterinarios;
DELETE FROM clientes;
DELETE FROM mascotas;
DELETE FROM licencias;
DELETE FROM consultas;
DELETE FROM facturas;
DELETE FROM citas;
DELETE FROM inventario_productos;

-- Reiniciar contadores
ALTER SEQUENCE veterinarios_id_seq RESTART WITH 1;
ALTER SEQUENCE clientes_id_seq RESTART WITH 1;
ALTER SEQUENCE mascotas_id_seq RESTART WITH 1;
```

---

## ⚠️ IMPORTANTE

- ✅ Esta acción **NO SE PUEDE DESHACER**
- ✅ Borra **TODOS** los datos de **TODAS** las tablas
- ✅ Los IDs empezarán desde 1 nuevamente
- ✅ La estructura de las tablas NO se borra
- ✅ Solo se borran los datos, no las tablas

---

## 🎯 Después de Borrar

1. La base de datos estará completamente vacía
2. Puedes registrar nuevos veterinarios
3. Los IDs empezarán desde 1
4. Todo funcionará como nuevo

---

## 📞 Soporte

**Gastón Díaz**
- 📱 2617024193
- 📧 jjvserviciosinformaticos@gmail.com

---

## 🚀 Verificación Final

Después de ejecutar el script, verifica:

```sql
SELECT 
    'veterinarios' as tabla, 
    COUNT(*) as registros 
FROM veterinarios
UNION ALL
SELECT 'clientes', COUNT(*) FROM clientes
UNION ALL
SELECT 'mascotas', COUNT(*) FROM mascotas
UNION ALL
SELECT 'licencias', COUNT(*) FROM licencias;
```

**Resultado esperado:**
```
tabla          | registros
---------------|----------
veterinarios   | 0
clientes       | 0
mascotas       | 0
licencias      | 0
```

✅ **¡Listo! Base de datos limpia y lista para empezar de nuevo.**
