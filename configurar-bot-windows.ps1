# Script para configurar el Bot de Notificaciones en Windows Task Scheduler
# Ejecutar como Administrador

$taskName = "MundoPatas-BotNotificaciones"
$scriptPath = "$PSScriptRoot\bot-notificaciones.js"
$nodePath = (Get-Command node).Source
$workingDir = $PSScriptRoot

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🤖 CONFIGURACIÓN DEL BOT DE NOTIFICACIONES" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verificar si ya existe la tarea
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "⚠️  La tarea '$taskName' ya existe." -ForegroundColor Yellow
    $response = Read-Host "¿Deseas reemplazarla? (S/N)"
    
    if ($response -eq "S" -or $response -eq "s") {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        Write-Host "✅ Tarea anterior eliminada" -ForegroundColor Green
    } else {
        Write-Host "❌ Operación cancelada" -ForegroundColor Red
        exit
    }
}

# Crear la acción (ejecutar el script)
$action = New-ScheduledTaskAction `
    -Execute $nodePath `
    -Argument "`"$scriptPath`"" `
    -WorkingDirectory $workingDir

# Crear el trigger (diariamente a las 9:00 AM)
$trigger = New-ScheduledTaskTrigger -Daily -At 9:00AM

# Configurar las opciones de la tarea
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

# Registrar la tarea
Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Bot de notificaciones automáticas para Mundo Patas - Verifica el alimento de las mascotas y envía alertas a los clientes"

Write-Host ""
Write-Host "✅ Tarea programada creada exitosamente" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Detalles de la configuración:" -ForegroundColor Cyan
Write-Host "   • Nombre: $taskName"
Write-Host "   • Frecuencia: Diaria"
Write-Host "   • Hora: 9:00 AM"
Write-Host "   • Script: $scriptPath"
Write-Host "   • Node.js: $nodePath"
Write-Host ""
Write-Host "🔧 Para modificar la tarea:" -ForegroundColor Yellow
Write-Host "   1. Abre 'Programador de tareas' (Task Scheduler)"
Write-Host "   2. Busca '$taskName'"
Write-Host "   3. Haz clic derecho → Propiedades"
Write-Host ""
Write-Host "🧪 Para probar el bot manualmente:" -ForegroundColor Yellow
Write-Host "   node bot-notificaciones.js"
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
