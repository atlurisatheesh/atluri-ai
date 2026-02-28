$ErrorActionPreference = "Stop"

param(
    [switch]$BackendDev,
    [switch]$FrontendForceInstall
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendInstaller = Join-Path $PSScriptRoot "install-backend-deps.ps1"
$frontendInstaller = Join-Path $PSScriptRoot "install-frontend-deps.ps1"

if (-not (Test-Path $backendInstaller)) {
    throw "Backend installer not found: $backendInstaller"
}

if (-not (Test-Path $frontendInstaller)) {
    throw "Frontend installer not found: $frontendInstaller"
}

Write-Output "[setup] Installing backend dependencies..."
if ($BackendDev) {
    & $backendInstaller -Dev
} else {
    & $backendInstaller
}

Write-Output "[setup] Installing frontend dependencies..."
if ($FrontendForceInstall) {
    & $frontendInstaller -ForceInstall
} else {
    & $frontendInstaller
}

Write-Output "[setup] All dependencies installed."
Write-Output "[setup] Next step: ./scripts/dev-start.ps1"
