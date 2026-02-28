$ErrorActionPreference = "Stop"

param(
    [switch]$ForceInstall
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendPath = Join-Path $repoRoot "frontend"

if (-not (Test-Path $frontendPath)) {
    throw "Frontend path not found: $frontendPath"
}

$npmCmd = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $npmCmd) {
    throw "npm.cmd not found in PATH"
}

Push-Location $frontendPath
try {
    if ($ForceInstall) {
        Write-Output "[deps] Running npm install (forced mode)..."
        & $npmCmd install
    } else {
        Write-Output "[deps] Running npm ci..."
        & $npmCmd ci
    }
    Write-Output "[deps] Done."
} finally {
    Pop-Location
}
