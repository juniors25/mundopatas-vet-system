# 🗑️ INSTRUCCIONES PARA LIMPIAR LA BASE DE DATOS

## ✅ Opción 1: Desde Render Shell (MÁS FÁCIL)

1. **Ve a Render Dashboard:**
   ```
   https://dashboard.render.com
   ```

2. **Selecciona tu servicio:**
   - Click en `mundopatas-veterinaria` o `mundopatas-vet-system`

3. **Abre la Shell:**
   - Click en la pestaña **"Shell"** (arriba a la derecha)
   - Espera a que cargue la terminal

4. **Ejecuta el comando:**
   ```bash
   node limpiar-usuarios.js
   ```

5. **Espera el resultado:**
   ```
   🗑️  LIMPIANDO BASE DE DATOS...
   ✅ BASE DE DATOS LIMPIADA COMPLETAMENTE
   📊 X veterinarios eliminados
   🎉 ¡Listo! La base de datos está limpia
   ```

---

## ✅ Opción 2: SQL Directo (Desde Render Database)

1. **Ve a Render Dashboard:**
   ```
   https://dashboard.render.com
   ```

2. **Selecciona tu base de datos:**
   - Click en `mundopatas-db` (PostgreSQL)

3. **Abre el Query Editor:**
   - Click en **"Connect"** → **"External Connection"**
   - Copia el comando de conexión

4. **Ejecuta estos comandos SQL:**
   ```sql
   -- Borrar todo en orden
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

   -- Reiniciar secuencias
   ALTER SEQUENCE veterinarios_id_seq RESTART WITH 1;
   ALTER SEQUENCE clientes_id_seq RESTART WITH 1;
   ALTER SEQUENCE mascotas_id_seq RESTART WITH 1;
   ALTER SEQUENCE licencias_id_seq RESTART WITH 1;
   ```

---

## ✅ Opción 3: Desde tu PC (Requiere DATABASE_URL)

1. **Obtén la DATABASE_URL:**
   - Ve a Render Dashboard
   - Click en tu servicio
   - Click en "Environment"
   - Copia el valor de `DATABASE_URL`

2. **Configura la variable de entorno:**
   ```bash
   # Windows PowerShell
   $env:DATABASE_URL="postgresql://usuario:password@host:5432/database"
   
   # Windows CMD
   set DATABASE_URL=postgresql://usuario:password@host:5432/database
   
   # Linux/Mac
   export DATABASE_URL="postgresql://usuario:password@host:5432/database"
   ```

3. **Ejecuta el script:**
   ```bash
   node limpiar-usuarios.js
   ```

---

## 🎯 Verificar que se Limpió

Después de ejecutar la limpieza, verifica:

```sql
SELECT COUNT(*) FROM veterinarios;
-- Resultado esperado: 0

SELECT COUNT(*) FROM clientes;
-- Resultado esperado: 0

SELECT COUNT(*) FROM licencias;
-- Resultado esperado: 0
```

---

## ⚠️ IMPORTANTE

- ✅ Esta acción **NO SE PUEDE DESHACER**
- ✅ Borra **TODOS** los datos de **TODAS** las tablas
- ✅ Reinicia los contadores (IDs empiezan desde 1)
- ✅ La estructura de las tablas se mantiene intacta
- ✅ Solo borra los datos, no las tablas

---

## 🚀 Después de Limpiar

1. La base de datos estará completamente vacía
2. Puedes registrar nuevos veterinarios desde cero
3. Los IDs empezarán desde 1
4. Todo funcionará como nuevo

---

## 📞 Soporte

Si tienes problemas:
- **Gastón Díaz**
- 📱 2617024193
- 📧 jjvserviciosinformaticos@gmail.com
