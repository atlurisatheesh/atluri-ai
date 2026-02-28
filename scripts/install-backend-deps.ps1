$ErrorActionPreference = "Stop"

param(
    [switch]$Dev
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $repoRoot "backend"

$pythonExe = if ($env:PYTHON_EXE) { $env:PYTHON_EXE } else { "C:/Users/atlur/AppData/Local/Programs/Python/Python311/python.exe" }

if (-not (Test-Path $backendPath)) {
    throw "Backend path not found: $backendPath"
}

$requirementsFile = if ($Dev) {
    Join-Path $backendPath "requirements-dev.txt"
} else {
    Join-Path $backendPath "requirements.txt"
}

if (-not (Test-Path $requirementsFile)) {
    throw "Requirements file not found: $requirementsFile"
}

Write-Output "[deps] Using Python: $pythonExe"
Write-Output "[deps] Installing from: $requirementsFile"

& $pythonExe -m pip install --upgrade pip
& $pythonExe -m pip install -r $requirementsFile

Write-Output "[deps] Done."
