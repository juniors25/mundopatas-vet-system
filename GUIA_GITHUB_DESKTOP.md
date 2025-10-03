# 🖥️ GUÍA PASO A PASO - GITHUB DESKTOP

## 📥 PASO 1: DESCARGAR E INSTALAR

1. **Descargar GitHub Desktop**
   - Ve a: https://desktop.github.com/
   - Click en "Download for Windows"
   - Ejecuta el instalador

2. **Instalar**
   - Sigue el asistente de instalación
   - Acepta los términos
   - Espera a que termine

---

## 🔐 PASO 2: AUTENTICARSE

1. **Abrir GitHub Desktop**
   - Busca "GitHub Desktop" en el menú inicio
   - Ábrelo

2. **Sign in**
   - Click en "Sign in to GitHub.com"
   - Se abrirá tu navegador
   - Ingresa tus credenciales de GitHub
   - Usuario: `jjvserviciosinformaticos-ship-it` (o tu usuario)
   - Autoriza GitHub Desktop

3. **Configurar Git**
   - Ingresa tu nombre
   - Ingresa tu email
   - Click en "Finish"

---

## 📂 PASO 3: AGREGAR EL REPOSITORIO

### **Opción A: Si ya clonaste el repo**

1. **Add Local Repository**
   - File → Add Local Repository
   - Click en "Choose..."
   - Navega a: `C:\Users\Juniors\CascadeProjects\windsurf-project`
   - Click en "Add repository"

### **Opción B: Si no lo has clonado**

1. **Clone Repository**
   - File → Clone Repository
   - Busca: `mundopatas-vet-system`
   - Selecciona la ubicación local
   - Click en "Clone"

---

## 📝 PASO 4: VER LOS CAMBIOS

Una vez agregado el repositorio:

1. **Panel izquierdo: "Changes"**
   - Verás todos los archivos modificados
   - Deberías ver 29 archivos cambiados

2. **Archivos principales que verás:**
   ```
   ✅ database-postgres.js
   ✅ server-postgres.js
   ✅ migrate-consultas.js
   ✅ bot-notificaciones.js
   ✅ services/notificaciones.js
   ✅ services/verificador-alimento.js
   ... y 23 archivos más
   ```

3. **Commit ya creado**
   - El commit ya está hecho desde la terminal
   - Mensaje: "Reestructuración módulo consultas..."
   - Solo falta hacer PUSH

---

## 🚀 PASO 5: PUSH A GITHUB

1. **Verificar rama**
   - Arriba verás: "Current branch: main"
   - Si dice otra cosa, cambia a "main"

2. **Click en "Push origin"**
   - Botón azul arriba a la derecha
   - Dice "Push origin" o "↑ Push"

3. **Esperar**
   - Verás una barra de progreso
   - Puede tardar 1-2 minutos
   - Espera hasta que diga "Pushed successfully"

4. **Verificar en GitHub**
   - Ve a: https://github.com/jjvserviciosinformaticos-ship-it/mundopatas-vet-system
   - Deberías ver el commit reciente
   - Verifica la fecha y hora

---

## ✅ PASO 6: VERIFICAR DEPLOY EN RENDER

1. **Ir a Render Dashboard**
   - https://dashboard.render.com/

2. **Seleccionar tu servicio**
   - Click en "mundopatas" (o el nombre de tu servicio)

3. **Ver el deploy**
   - Deberías ver "Deploy in progress..."
   - Espera 2-5 minutos
   - Cuando termine dirá "Live"

4. **Ver logs**
   - Click en "Logs"
   - Verifica que no haya errores
   - Busca: "✅ Servidor PostgreSQL iniciado"

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### **Error: "Authentication failed"**

**Solución:**
1. File → Options → Accounts
2. Click en "Sign out"
3. Click en "Sign in to GitHub.com"
4. Vuelve a autenticarte

### **Error: "Permission denied"**

**Solución:**
1. Verifica que estés usando la cuenta correcta
2. Ve a GitHub.com y verifica que tengas acceso al repositorio
3. Si no tienes acceso, pide permisos al dueño del repo

### **Error: "Repository not found"**

**Solución:**
1. Verifica la URL del repositorio
2. File → Repository Settings
3. Verifica que la URL sea correcta:
   ```
   https://github.com/jjvserviciosinformaticos-ship-it/mundopatas-vet-system.git
   ```

### **No aparece el botón "Push origin"**

**Solución:**
1. Verifica que haya cambios committeados
2. Si no hay cambios, haz un commit:
   - Escribe un mensaje en "Summary"
   - Click en "Commit to main"
   - Ahora debería aparecer "Push origin"

---

## 📊 VERIFICACIÓN FINAL

Después del push exitoso:

✅ **En GitHub:**
- Ve al repositorio
- Verás el commit reciente
- Fecha y hora actualizadas

✅ **En Render:**
- Deploy automático iniciado
- Logs mostrando la instalación
- Servicio "Live" después de 2-5 minutos

✅ **En la base de datos:**
- Los 28 campos nuevos ya están
- No necesitas hacer nada más en la BD

---

## 🎯 PRÓXIMOS PASOS

Una vez que el deploy esté completo:

1. **Probar el sistema en producción**
   - Abre tu URL de Render
   - Verifica que cargue correctamente

2. **Actualizar la interfaz de usuario**
   - Modificar el formulario de consultas
   - Agregar todos los campos nuevos
   - Actualizar el JavaScript

3. **Hacer otro commit y push**
   - Seguir el mismo proceso
   - GitHub Desktop lo hará más fácil

---

## 💡 TIPS

- **Siempre haz pull antes de push** (para evitar conflictos)
- **Escribe mensajes de commit descriptivos**
- **Verifica los cambios antes de commitear**
- **No subas archivos sensibles** (.env, contraseñas, etc.)
- **Usa .gitignore** para excluir archivos automáticamente

---

## 📞 AYUDA ADICIONAL

Si sigues teniendo problemas:

1. **Documentación oficial:**
   - https://docs.github.com/en/desktop

2. **Video tutorial:**
   - Busca en YouTube: "GitHub Desktop tutorial español"

3. **Alternativa: VS Code**
   - VS Code también tiene integración con Git
   - Más simple para operaciones básicas
