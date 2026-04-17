# Configuración GitHub Token

## Pasos para crear Personal Access Token:

1. Ir a: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Configurar:
   - Note: "Mundo Patas Deploy"
   - Expiration: 90 days
   - Scopes: ✅ repo (Full control of private repositories)
4. Click "Generate token"
5. Copiar el token (solo se muestra una vez)

## Para usar el token:

```bash
git remote set-url origin https://juniors25:TOKEN@github.com/juniors25/mundopatas-vet-system.git
git push -u origin main
```

## Opción 2: Subir manualmente

1. Ir a: https://github.com/juniors25/mundopatas-vet-system
2. Click "Add file" → "Upload files"
3. Arrastrar todos los archivos del proyecto
4. Commit changes: "Deploy inicial"
