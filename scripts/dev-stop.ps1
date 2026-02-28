$ErrorActionPreference = "Stop"

$backendPort = if ($env:BACKEND_PORT) { [int]$env:BACKEND_PORT } else { 9010 }
$frontendPort = if ($env:FRONTEND_PORT) { [int]$env:FRONTEND_PORT } else { 3001 }

function Stop-PortListener {
    param([int]$Port)

    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if (-not $conns) {
        Write-Output "NO_LISTENER_$Port"
        return
    }

    $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $pids) {
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Milliseconds 250
    Write-Output ("STOPPED_PORT_{0}:{1}" -f $Port, ($pids -join ","))
}

Stop-PortListener -Port $backendPort
Stop-PortListener -Port $frontendPort
Write-Output "[dev-stop] Done."
