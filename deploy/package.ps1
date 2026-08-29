param(
    [string]$Version = "1.0.0"
)
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$deploy = [System.IO.Path]::GetFullPath($PSScriptRoot)
$root   = [System.IO.Path]::GetFullPath((Join-Path $deploy '..'))
$tools  = Join-Path $deploy 'tools'
$release = Join-Path $deploy 'release'
$stageName = "ShineCraft-$Version"
$stage = Join-Path $release $stageName
$exeOut = Join-Path $stage 'ShineCraft.exe'
$zipOut = Join-Path $release "$stageName.zip"

Write-Host "== ShineCraft package builder =="
Write-Host "Project root : $root"
Write-Host "Stage output : $stage"

# --- 1. Pick a Node for the pkg CLI (prefer a Node 18-22 binary) -------------
$nodeExe = $null
$portable = Get-ChildItem -Path $tools -Filter 'node.exe' -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch 'node_modules' } |
    Sort-Object FullName -Descending |
    Select-Object -First 1
if ($portable) { $nodeExe = $portable.FullName }
if (-not $nodeExe) {
    $cmdNode = Get-Command node -ErrorAction SilentlyContinue
    if ($cmdNode -and $cmdNode.Source) { $nodeExe = $cmdNode.Source }
}
if (-not $nodeExe) { throw "No Node.js found. Install Node.js or run setup.bat first." }
Write-Host ("Node.js     : " + $nodeExe)

$npmCli = Join-Path (Split-Path $nodeExe) 'node_modules\npm\bin\npm-cli.js'
if (-not (Test-Path -LiteralPath $npmCli)) {
    throw "Cannot locate npm-cli.js next to $nodeExe (run setup.bat once to install a portable Node)."
}

# --- 2. Compile launcher.js -> ShineCraft.exe ---------------------------------
if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage -Force | Out-Null

Write-Host "Compiling ShineCraft.exe (node22-win-x64) ..."
$pkgArgs = @('exec', '--yes', '--package=@yao-pkg/pkg', '--', 'pkg',
    (Join-Path $deploy 'launcher.js'),
    '--targets', 'node22-win-x64',
    '--output', $exeOut,
    '--compress', 'GZip')
& $nodeExe $npmCli @pkgArgs
if ($LASTEXITCODE -ne 0) { throw "pkg failed with exit code $LASTEXITCODE" }
if (-not (Test-Path -LiteralPath $exeOut)) { throw "pkg did not produce $exeOut" }
Write-Host "OK: $exeOut"

# --- 3. Copy project trees (source only, no build artifacts/secrets) ----------
function Copy-Tree($src, $dst, $excludeDirs, $excludeFiles) {
    New-Item -ItemType Directory -Path $dst -Force | Out-Null
    $args = @("$src", "$dst", "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NC", "/NS", "/NP")
    foreach ($e in $excludeDirs) { $args += "/XD"; $args += $e }
    foreach ($e in $excludeFiles) { $args += "/XF"; $args += $e }
    & robocopy.exe @args | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy failed copying $src (exit $LASTEXITCODE)" }
}

$exDirs = @('node_modules', '.next', 'dist', 'uploads', 'logs', 'tools', 'data', 'release', 'coverage', '.git')
$exFiles = @('*.log', 'state.json')

Write-Host "Copying backend ..."
Copy-Tree (Join-Path $root 'backend') (Join-Path $stage 'backend') $exDirs $exFiles
Write-Host "Copying frontend ..."
Copy-Tree (Join-Path $root 'frontend') (Join-Path $stage 'frontend') $exDirs $exFiles
Write-Host "Copying deploy scripts ..."
Copy-Tree $deploy (Join-Path $stage 'deploy') $exDirs $exFiles

# --- 4. Zip -------------------------------------------------------------------
Write-Host "Creating archive ..."
if (Test-Path -LiteralPath $zipOut) { Remove-Item -LiteralPath $zipOut -Force }
Compress-Archive -Path $stage -DestinationPath $zipOut -CompressionLevel Optimal
Write-Host "OK: $zipOut"

$sizeMB = [math]::Round((Get-Item -LiteralPath $zipOut).Length / 1MB, 1)
Write-Host ""
Write-Host "Build complete."
Write-Host "  EXE folder : $stage"
Write-Host "  ZIP        : $zipOut ($sizeMB MB)"
Write-Host ""
Write-Host "Send the ZIP to the target machine. Unzip and double-click"
Write-Host "  ShineCraft.exe  (or run deploy\setup.bat)."