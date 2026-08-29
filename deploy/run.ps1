param(
    [string]$Mode = "run"
)

# Bootstrap launcher for ShineCraft.
# - Uses a portable Node.js from deploy/tools when present.
# - Falls back to the system node on PATH.
# - If neither exists, downloads a portable Node.js (internet required on first run).
# Then runs deploy/launcher.js <Mode>.

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$deploy  = [System.IO.Path]::GetFullPath($PSScriptRoot)
$root    = [System.IO.Path]::GetFullPath((Join-Path $deploy '..'))
$tools   = Join-Path $deploy 'tools'
$logs    = Join-Path $deploy 'logs'
$launcher = Join-Path $deploy 'launcher.js'

function Find-NodeExecutable {
    $portable = Get-ChildItem -Path $tools -Filter 'node.exe' -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch 'node_modules' } |
        Sort-Object FullName -Descending |
        Select-Object -First 1
    if ($portable) { return $portable.FullName }

    $cmdNode = Get-Command node -ErrorAction SilentlyContinue
    if ($cmdNode -and $cmdNode.Source) { return $cmdNode.Source }

    return $null
}

function Install-PortableNode {
    New-Item -ItemType Directory -Path $tools -Force | Out-Null
    $ver = 'v22.12.0'
    $zip = Join-Path $tools "node-$ver-win-x64.zip"
    $dir = Join-Path $tools $ver
    if (-not (Test-Path -LiteralPath (Join-Path $dir 'node.exe'))) {
        if (-not (Test-Path -LiteralPath $zip)) {
            Write-Host "[ShineCraft] Downloading portable Node.js $ver ..."
            Invoke-WebRequest -Uri "https://nodejs.org/dist/$ver/node-$ver-win-x64.zip" -OutFile $zip -UseBasicParsing
        }
        Write-Host "[ShineCraft] Extracting Node.js ..."
        $inner = Join-Path $tools "node-$ver-win-x64"
        if (Test-Path -LiteralPath $inner) { Remove-Item -LiteralPath $inner -Recurse -Force }
        Expand-Archive -LiteralPath $zip -DestinationPath $tools -Force
        Rename-Item -LiteralPath $inner -NewName $ver
    }
    return (Join-Path $dir 'node.exe')
}

$nodeExe = Find-NodeExecutable
if (-not $nodeExe) {
    Write-Host "[ShineCraft] Node.js not found on this computer. Installing a portable copy (one-time)."
    $nodeExe = Install-PortableNode
}

Write-Host "[ShineCraft] Using Node.js: $nodeExe"
$nodeDir = Split-Path -Parent $nodeExe
$env:PATH = "$nodeDir;$env:PATH"

if ($Mode -eq 'reinstall') {
    Write-Host ""
    Write-Host "================== SHINECRAFT FULL SETUP =================="
    & $nodeExe $launcher setup
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host ""
    Write-Host "[ShineCraft] Setup complete. Launching application ..."
    & $nodeExe $launcher run
    exit $LASTEXITCODE
}

& $nodeExe $launcher $Mode
exit $LASTEXITCODE