param(
  [string]$FrontendUrl = 'http://127.0.0.1:3001',
  [switch]$OpenDevTools
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$desktopDir = Join-Path $repoRoot 'desktop'

if (-not (Test-Path $desktopDir)) {
  throw "Desktop folder not found at: $desktopDir"
}

$env:DESKTOP_FRONTEND_URL = $FrontendUrl
$env:ELECTRON_ENABLE_LOGGING = 'true'
$env:ELECTRON_ENABLE_STACK_DUMPING = 'true'
if ($OpenDevTools) {
  $env:DESKTOP_OPEN_DEVTOOLS = 'true'
}

Write-Host "Starting desktop app from: $desktopDir" -ForegroundColor Cyan
Write-Host "Frontend URL: $FrontendUrl" -ForegroundColor Cyan

Set-Location $desktopDir
npm run dev
