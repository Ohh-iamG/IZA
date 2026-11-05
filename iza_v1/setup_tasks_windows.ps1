# ===========================================================================
#  setup_tasks_windows.ps1 - registers IZA's scheduled jobs. Run once, in
#  PowerShell, from the folder that contains iza.py:
#      powershell -ExecutionPolicy Bypass -File .\setup_tasks_windows.ps1
#
#    IZA watch    every hour      safety-net rules -> your circle
#    IZA remind   every 15 min    due doses -> your phone (IZA_SELF_WEBHOOK)
#    IZA backup   daily 03:30     encrypted backup -> IZA_BACKUP_DIR
#
#  A laptop that is asleep runs nothing. For the safety net, also set
#  IZA_WATCH_PING_URL so you are warned when the watcher goes quiet, or run
#  `iza watch` on an always-on machine (Railway, a home mini-PC).
#  The circle is NOT an emergency service. In an emergency call 000.
# ===========================================================================

$ErrorActionPreference = "Stop"
$python = (Get-Command python).Source
$script = Join-Path $PSScriptRoot "iza.py"

if (-not (Test-Path (Join-Path $PSScriptRoot ".env"))) {
    Write-Warning "No .env next to iza.py. Copy .env.example to .env and fill it in first."
    exit 1
}

$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd `
              -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
              -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

function Add-IzaTask($name, $iza_args, $trigger) {
    $action = New-ScheduledTaskAction -Execute $python -Argument "`"$script`" $iza_args" -WorkingDirectory $PSScriptRoot
    Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings `
        -Description "IZA: $iza_args" -Force | Out-Null
    Write-Host "registered $name"
}

Add-IzaTask "IZA watch"  "watch"  (New-ScheduledTaskTrigger -Once (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1))
Add-IzaTask "IZA remind" "remind" (New-ScheduledTaskTrigger -Once (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 15))
Add-IzaTask "IZA backup" "backup" (New-ScheduledTaskTrigger -Daily -At 3:30am)

Write-Host ""
Write-Host "Now test the alert path:   iza test-notify"
Write-Host "Remove later:              Unregister-ScheduledTask -TaskName 'IZA watch','IZA remind','IZA backup'"
