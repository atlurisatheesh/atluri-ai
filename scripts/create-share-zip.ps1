param(
  [string]$OutFile = "share/linkedin-ai-share.zip",
  [switch]$IncludeData
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$repoRoot = (Resolve-Path $repoRoot).Path

$outPath = Join-Path $repoRoot $OutFile
$outDir = Split-Path -Parent $outPath
if (-not (Test-Path $outDir)) {
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}

if (Test-Path $outPath) {
  Remove-Item -Force $outPath
}

# Ensure compression types are available (Windows PowerShell sometimes doesn't load them by default).
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

# Folders/files that are large, machine-specific, or often sensitive.
$excludeDirNames = @(
  '.git',
  'node_modules',
  '.next',
  'dist',
  'build',
  'out',
  'coverage',
  '.cache',
  '.pytest_cache',
  '__pycache__',
  '.venv',
  'venv',
  '.mypy_cache',
  '.ruff_cache',
  '.turbo',
  '.idea',
  '.vscode'
)

$excludeFilePatterns = @(
  '*.pyc',
  '*.pyo',
  '*.pyd',
  '*.log',
  '*.zip',
  '*.7z',
  '*.rar',
  '*.exe',
  '*.dmg',
  '*.pkg',
  '*.msi',
  '*.pdb',
  '*.obj',
  '*.dll',
  '*.so',
  '*.dylib',
  '*.class',
  '*.map',
  '*.tmp'
)

$excludeExactNames = @(
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
  '.DS_Store'
)

# Local data stores in this repo can contain personal/session data.
# Default: exclude them unless -IncludeData is provided.
$excludeDataPaths = @(
  'backend/data',
  'qa/reports',
  'frontend/qa'
)

function Should-ExcludeFile([string]$fullPath) {
  $rel = $fullPath.Substring($repoRoot.Length).TrimStart('\','/')
  $relSlash = $rel -replace '\\','/'

  $name = Split-Path -Leaf $fullPath
  if ($excludeExactNames -contains $name) { return $true }

  foreach ($pat in $excludeFilePatterns) {
    if ($name -like $pat) { return $true }
  }

  if (-not $IncludeData) {
    foreach ($p in $excludeDataPaths) {
      if ($relSlash -like "$p/*" -or $relSlash -eq $p) { return $true }
    }
  }

  return $false
}

function Should-ExcludeDir([string]$dirPath) {
  $name = Split-Path -Leaf $dirPath
  if ($excludeDirNames -contains $name) { return $true }

  if (-not $IncludeData) {
    $rel = $dirPath.Substring($repoRoot.Length).TrimStart('\','/')
    $relSlash = $rel -replace '\\','/'
    foreach ($p in $excludeDataPaths) {
      if ($relSlash -eq $p -or $relSlash -like "$p/*") { return $true }
    }
  }

  return $false
}

Write-Host "Creating share ZIP: $outPath" -ForegroundColor Cyan
Write-Host "IncludeData: $IncludeData" -ForegroundColor Cyan

$zip = [System.IO.Compression.ZipFile]::Open($outPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  $files = Get-ChildItem -LiteralPath $repoRoot -Recurse -File -Force
  $added = 0

  foreach ($f in $files) {
    $full = $f.FullName

    # Skip anything under excluded directories.
    $dir = $f.DirectoryName
    $skip = $false
    while ($dir -and ($dir.Length -ge $repoRoot.Length)) {
      if (Should-ExcludeDir $dir) { $skip = $true; break }
      if ($dir -eq $repoRoot) { break }
      $dir = Split-Path -Parent $dir
    }
    if ($skip) { continue }

    if (Should-ExcludeFile $full) { continue }

    $rel = $full.Substring($repoRoot.Length).TrimStart('\','/')
    $rel = $rel -replace '\\','/'

    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $full, $rel, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    $added += 1
  }

  Write-Host "Added files: $added" -ForegroundColor Green
} finally {
  $zip.Dispose()
}

Write-Host "Done." -ForegroundColor Green
