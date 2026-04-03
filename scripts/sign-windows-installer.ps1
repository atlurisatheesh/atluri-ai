param(
  [string]$InstallerPath = "",
  [string]$CertFile = $env:WINDOWS_SIGN_CERT_FILE,
  [string]$CertPassword = $env:WINDOWS_SIGN_CERT_PASSWORD,
  [string]$TimestampUrl = "http://timestamp.digicert.com"
)

$ErrorActionPreference = "Stop"

function Resolve-Signtool {
  $cmd = Get-Command signtool.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $candidates = @(
    "${env:ProgramFiles(x86)}\Windows Kits\10\bin\x64\signtool.exe",
    "${env:ProgramFiles(x86)}\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe",
    "${env:ProgramFiles(x86)}\Windows Kits\10\bin\10.0.22000.0\x64\signtool.exe"
  )

  foreach ($path in $candidates) {
    if (Test-Path $path) { return $path }
  }

  throw "signtool.exe not found. Install Windows SDK Signing Tools first."
}

function Resolve-Installer([string]$PathHint) {
  if ($PathHint -and (Test-Path $PathHint)) {
    return (Resolve-Path $PathHint).Path
  }

  $releaseDir = Join-Path $PSScriptRoot "..\desktop\release"
  if (-not (Test-Path $releaseDir)) {
    throw "Release directory not found: $releaseDir"
  }

  $latest = Get-ChildItem -Path $releaseDir -Filter "AtluriIn-AI-*-Setup.exe" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $latest) {
    throw "No installer found matching AtluriIn-AI-*-Setup.exe in $releaseDir"
  }

  return $latest.FullName
}

$signTool = Resolve-Signtool
$installer = Resolve-Installer -PathHint $InstallerPath

if (-not $CertFile -or -not (Test-Path $CertFile)) {
  throw "Certificate file not found. Set WINDOWS_SIGN_CERT_FILE to a .pfx path."
}
if (-not $CertPassword) {
  throw "Certificate password missing. Set WINDOWS_SIGN_CERT_PASSWORD."
}

Write-Host "Signing installer: $installer"
& $signTool sign /fd SHA256 /tr $TimestampUrl /td SHA256 /f $CertFile /p $CertPassword "$installer"

$sig = Get-AuthenticodeSignature -FilePath $installer
if ($sig.Status -ne "Valid") {
  throw "Signature validation failed: $($sig.Status)"
}

$hash = Get-FileHash -Path $installer -Algorithm SHA256
Write-Host "Signature valid: $($sig.SignerCertificate.Subject)"
Write-Host "SHA256: $($hash.Hash)"
