# 🌐 GUÍA PASO A PASO - DOMINIO GRATIS PARA MUNDO PATAS

## 🎯 **CONFIGURACIÓN COMPLETA EN 15 MINUTOS**

### **PASO 1: REGISTRAR DOMINIO GRATIS**

#### **Opción A: Freenom (Recomendado)**
1. Ve a **[freenom.com](https://freenom.com)**
2. Busca tu dominio deseado:
   - `mundopatas.tk`
   - `mundopatas.ml`
   - `mundopatas.ga`
   - `mundopatas.cf`
3. Selecciona **"Get it now!"**
4. Configura por **12 meses GRATIS**
5. Crea cuenta y confirma

#### **Opción B: Dot.tk**
1. Ve a **[dot.tk](https://dot.tk)**
2. Busca `mundopatas.tk`
3. Registro gratuito por 1 año

### **PASO 2: CONFIGURAR DNS**

#### **En Freenom/Dot.tk:**
1. Ve a **"My Domains"**
2. Clic en **"Manage Domain"**
3. Ve a **"Management Tools" → "Nameservers"**
4. Selecciona **"Use custom nameservers"**
5. Agrega los nameservers de Netlify:
   ```
   dns1.p01.nsone.net
   dns2.p01.nsone.net
   dns3.p01.nsone.net
   dns4.p01.nsone.net
   ```

### **PASO 3: CONFIGURAR EN NETLIFY**

1. Ve a tu sitio en **Netlify Dashboard**
2. Clic en **"Domain settings"**
3. Clic en **"Add custom domain"**
4. Ingresa tu dominio: `mundopatas.tk`
5. Clic en **"Verify"**
6. Netlify configurará automáticamente SSL

### **PASO 4: VERIFICAR CONFIGURACIÓN**

Espera 15-30 minutos y verifica:
- `http://mundopatas.tk` → Redirige a HTTPS
- `https://mundopatas.tk` → Tu sitio funcionando
- SSL activo (candado verde)

## 🚀 **URLs FINALES DE MUNDO PATAS**

Una vez configurado tendrás:

- **🏠 Página principal**: `https://mundopatas.tk/`
- **💼 Landing comercial**: `https://mundopatas.tk/landing-comercial.html`
- **🏥 Sistema veterinario**: `https://mundopatas.tk/sistema.html`
- **👥 Portal del paciente**: `https://mundopatas.tk/paciente.html`
- **📱 Panel admin**: `https://mundopatas.tk/admin-panel.html`

## 🔧 **CONFIGURACIÓN AVANZADA**

### **Redirecciones automáticas:**
```
# En netlify.toml
[[redirects]]
  from = "/vet"
  to = "/sistema.html"
  status = 301

[[redirects]]
  from = "/pacientes"
  to = "/paciente.html"
  status = 301
```

### **Headers de seguridad:**
```
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
```

## 📋 **CHECKLIST FINAL**

- [ ] Dominio registrado en Freenom
- [ ] Nameservers configurados
- [ ] Dominio agregado en Netlify
- [ ] SSL activado automáticamente
- [ ] Sitio funcionando en dominio personalizado
- [ ] Todas las páginas accesibles

## 🎉 **¡MUNDO PATAS CON DOMINIO PROPIO LISTO!**

Total invertido: **$0** 💰
Tiempo de configuración: **15 minutos** ⏱️
Resultado: **Sistema profesional con dominio propio** 🚀
