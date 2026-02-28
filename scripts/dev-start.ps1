$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $repoRoot "backend"
$frontendPath = Join-Path $repoRoot "frontend"

$pythonExe = if ($env:PYTHON_EXE) { $env:PYTHON_EXE } else { "C:/Users/atlur/AppData/Local/Programs/Python/Python311/python.exe" }
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

Write-Output "[dev-start] Stopping stale listeners..."
Stop-PortListener -Port $backendPort
Stop-PortListener -Port $frontendPort

Write-Output "[dev-start] Starting backend on $backendPort..."
$backendArgs = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "$backendPort")
Start-Process -FilePath $pythonExe -ArgumentList $backendArgs -WorkingDirectory $backendPath -WindowStyle Hidden | Out-Null

Write-Output "[dev-start] Starting frontend on $frontendPort..."
$npmCmd = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $npmCmd) {
    throw "npm.cmd not found in PATH"
}
$frontendArgs = @("run", "dev", "--", "--port", "$frontendPort")
Start-Process -FilePath $npmCmd -ArgumentList $frontendArgs -WorkingDirectory $frontendPath -WindowStyle Hidden | Out-Null

Write-Output "[dev-start] Started."
Write-Output ("Backend:  http://127.0.0.1:{0}" -f $backendPort)
Write-Output ("Frontend: http://127.0.0.1:{0}" -f $frontendPort)
