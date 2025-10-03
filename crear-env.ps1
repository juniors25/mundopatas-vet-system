# Script para crear archivo .env con configuracion basica
# Ejecutar: .\crear-env.ps1

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "CREADOR DE ARCHIVO .ENV - MUNDO PATAS" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si ya existe .env
if (Test-Path ".env") {
    Write-Host "El archivo .env ya existe." -ForegroundColor Yellow
    $respuesta = Read-Host "Deseas sobrescribirlo? (s/n)"
    if ($respuesta -ne "s") {
        Write-Host "Operacion cancelada" -ForegroundColor Red
        exit
    }
}

Write-Host ""
Write-Host "Configuracion de Base de Datos PostgreSQL" -ForegroundColor Green
Write-Host "---------------------------------------------------" -ForegroundColor Green
Write-Host ""

$dbHost = Read-Host "Host de PostgreSQL (default: localhost)"
if ([string]::IsNullOrWhiteSpace($dbHost)) { $dbHost = "localhost" }

$dbPort = Read-Host "Puerto (default: 5432)"
if ([string]::IsNullOrWhiteSpace($dbPort)) { $dbPort = "5432" }

$dbUser = Read-Host "Usuario (default: postgres)"
if ([string]::IsNullOrWhiteSpace($dbUser)) { $dbUser = "postgres" }

$dbPass = Read-Host "Contrasena" -AsSecureString
$dbPassPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPass))

$dbName = Read-Host "Nombre de la base de datos (default: mundopatas)"
if ([string]::IsNullOrWhiteSpace($dbName)) { $dbName = "mundopatas" }

Write-Host ""
Write-Host "Configuracion de Email (Opcional - presiona Enter para omitir)" -ForegroundColor Green
Write-Host "---------------------------------------------------" -ForegroundColor Green
Write-Host ""

$smtpUser = Read-Host "Email de Gmail (opcional)"
$smtpPass = ""
if (-not [string]::IsNullOrWhiteSpace($smtpUser)) {
    $smtpPassSecure = Read-Host "Contrasena de aplicacion de Gmail" -AsSecureString
    $smtpPass = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($smtpPassSecure))
}

# Crear contenido del archivo .env
$envContent = @"
# ==================== CONFIGURACIÓN MUNDO PATAS ====================

# Servidor
PORT=3000
NODE_ENV=development

# Base de datos PostgreSQL
DATABASE_URL=postgresql://${dbUser}:${dbPassPlain}@${dbHost}:${dbPort}/${dbName}

# Configuración de archivos
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# ==================== NOTIFICACIONES ====================

# Bot de Notificaciones Automático
ENABLE_AUTO_CRON=false

# Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=${smtpUser}
SMTP_PASS=${smtpPass}

# WhatsApp (Twilio - Opcional)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=

# Telegram (Opcional)
TELEGRAM_BOT_TOKEN=

# ==================== SEGURIDAD ====================

# JWT Secret
JWT_SECRET=mundo-patas-secret-key-$(Get-Random -Minimum 10000 -Maximum 99999)
SESSION_SECRET=session-secret-$(Get-Random -Minimum 10000 -Maximum 99999)

# URLs
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:3000
"@

# Guardar archivo
$envContent | Out-File -FilePath ".env" -Encoding UTF8 -NoNewline

Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ ARCHIVO .ENV CREADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Green

Write-Host "📋 Configuración guardada:" -ForegroundColor Cyan
Write-Host "   • Base de datos: ${dbName}" -ForegroundColor White
Write-Host "   • Host: ${dbHost}:${dbPort}" -ForegroundColor White
Write-Host "   • Usuario: ${dbUser}" -ForegroundColor White
if (-not [string]::IsNullOrWhiteSpace($smtpUser)) {
    Write-Host "   • Email configurado: ${smtpUser}" -ForegroundColor White
} else {
    Write-Host "   • Email: No configurado" -ForegroundColor Yellow
}

Write-Host "`n🎯 Próximos pasos:" -ForegroundColor Cyan
Write-Host "   1. Verifica el archivo .env" -ForegroundColor White
Write-Host "   2. Ejecuta: node test-bot-rapido.js" -ForegroundColor White
Write-Host "   3. Si todo funciona, ejecuta: node bot-notificaciones.js`n" -ForegroundColor White

Write-Host "IMPORTANTE: No compartas el archivo .env con nadie" -ForegroundColor Yellow
Write-Host "El archivo .env contiene informacion sensible`n" -ForegroundColor Yellow
