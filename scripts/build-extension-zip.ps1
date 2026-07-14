# build-extension-zip.ps1
# Builds Amplify_extension.zip from /extension folder into /frontend/public/downloads/.
# Also syncs the version string from extension/manifest.json into
# frontend/public/downloads/extension-info.json so the web app can show
# "What's new" copy and detect outdated installs.
#
# Usage (from project root):
#   pwsh -File scripts/build-extension-zip.ps1
#
# After this, run `git push` — Vercel will rebuild and serve the new zip
# from https://amplifyhd.tech/downloads/Amplify_extension.zip.

$ErrorActionPreference = 'Stop'

$scriptDir    = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot  = Resolve-Path (Join-Path $scriptDir '..')
$extDir       = Join-Path $projectRoot 'extension'
$manifestPath = Join-Path $extDir 'manifest.json'
$outDir       = Join-Path $projectRoot 'frontend\public\downloads'
$outFile      = Join-Path $outDir 'Amplify_extension.zip'
$infoFile     = Join-Path $outDir 'extension-info.json'

if (-not (Test-Path $manifestPath)) {
    throw "Extension manifest not found: $manifestPath"
}

if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

# Read version from manifest so the web app can show "Phiên bản X.Y.Z".
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$version  = $manifest.version
$name     = $manifest.name

# Update extension-info.json with current version + build timestamp.
$infoObject = [ordered]@{
    version       = $version
    name          = $name
    min_browser   = 'Chrome 102+'
    build_channel = 'stable'
    built_at      = (Get-Date).ToString('o')
}
$infoObject | ConvertTo-Json -Depth 4 | Set-Content -Path $infoFile -Encoding UTF8

# Clean old build.
if (Test-Path $outFile) {
    Remove-Item $outFile -Force
}

# Build zip from /extension contents.
# CompressionLevel Optimal gives ~30% smaller output vs Default on minified JS.
Compress-Archive `
    -Path (Join-Path $extDir '*') `
    -DestinationPath $outFile `
    -CompressionLevel Optimal

$sizeBytes = (Get-Item $outFile).Length
$sizeMB    = [math]::Round($sizeBytes / 1MB, 2)

Write-Host ""
Write-Host "Extension zip built:" -ForegroundColor Green
Write-Host "  File:     $outFile"
Write-Host "  Version:  $version"
Write-Host "  Size:     $sizeMB MB"
Write-Host "  Info:     $infoFile"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. git add frontend/public/downloads/"
Write-Host "  2. git commit -m 'chore(extension): rebuild zip v$version'"
Write-Host "  3. git push   (Vercel will deploy automatically)"
Write-Host ""
Write-Host "After deploy, users will download from:" -ForegroundColor Cyan
Write-Host "  https://amplifyhd.tech/downloads/Amplify_extension.zip"
Write-Host ""