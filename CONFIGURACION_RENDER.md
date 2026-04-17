# 🔧 CONFIGURACIÓN RENDER - MUNDO PATAS

## 📋 Estado Actual
✅ Código subido a GitHub: juniors25/mundopatas-vet-system
✅ Servicio Render: srv-d3hg4d0gjchc73afnu30
✅ render.yaml configurado
✅ Dominio: sistemamundopatas.com
✅ Email: jjvserviciosinformaticos@gmail.com

## 🚀 PASOS PARA CONFIGURAR RENDER

### 1. Conectar Repositorio GitHub

1. **Ir a tu dashboard**: https://dashboard.render.com/web/srv-d3hg4d0gjchc73afnu30
2. **Ir a "Settings"**
3. **Buscar "Connect Repository"**
4. **Seleccionar**: juniors25/mundopatas-vet-system
5. **Click "Connect"**
6. **Activar "Auto-Deploy"** desde la rama main

### 2. Configurar Base de Datos

1. **En el mismo servicio**, ir a "Environment"
2. **Verificar que DATABASE_URL esté configurada**
3. **Si no está**, agregar:
   - Key: `DATABASE_URL`
   - Value: (se autocompletará desde la BD de Render)

### 3. Configurar Variables de Entorno

Agregar las siguientes variables:

```bash
NODE_ENV=production
JWT_SECRET=(generado automáticamente)
ENABLE_AUTO_CRON=false
PORT=10000
FRONTEND_URL=https://sistemamundopatas.com
API_URL=https://api.sistemamundopatas.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=jjvserviciosinformaticos@gmail.com
SMTP_PASS=(tu app password de Gmail)
```

### 4. Configurar Dominio Personalizado

1. **Ir a "Custom Domains"**
2. **Agregar**: sistemamundopatas.com
3. **Configurar DNS**:
   ```
   Tipo: A
   Nombre: @
   Valor: (IP que proporciona Render)
   ```
4. **Activar SSL** (automático en Render)

### 5. Configurar Gmail para Notificaciones

1. **Ir a**: https://myaccount.google.com/apppasswords
2. **Generar App Password**:
   - App: "Mundo Patas"
   - Device: "Windows Computer"
3. **Copiar password de 16 caracteres**
4. **Agregar en Render**: `SMTP_PASS`

## 🔄 Deploy Automático

Una vez configurado:
- **Cada push a GitHub** → Deploy automático
- **Tiempo de deploy**: 2-3 minutos
- **URL**: https://sistemamundopatas.com

## 🎯 Verificación Final

1. **Deploy completado**: Visitar https://sistemamundopatas.com
2. **Funcionalidades clave**:
   - ✅ Landing comercial
   - ✅ Sistema de licencias
   - ✅ Portal de clientes
   - ✅ Panel de administración

## 💰 Listo para Vender

Una vez online:
- **Demo funcionando**: https://sistemamundopatas.com/landing-comercial.html
- **Panel admin**: https://sistemamundopatas.com/admin-panel.html
- **Planes**: $30.000-$50.000 ARS/mes

## 🚨 Soporte Técnico

Para configurar:
- **Base de datos**: Revisar logs en Render
- **Dominio**: Verificar configuración DNS
- **Email**: Probar envío de notificaciones
