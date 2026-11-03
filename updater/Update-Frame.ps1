# FRAME release updater. Run as your own Windows user, never as administrator.
[CmdletBinding()]
param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$config = Get-Content (Join-Path $root 'config.json') -Raw | ConvertFrom-Json
$repo = [string]$config.repository
if ($repo -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$' -or $repo -match '^YOUR_') { throw 'Configure a real GitHub owner/repository first.' }
$app = Join-Path $env:APPDATA 'spicetify\CustomApps\frame'
$stateFile = Join-Path $root 'installed-version.txt'
$api = "https://api.github.com/repos/$repo/releases/latest"
$release = Invoke-RestMethod -Uri $api -Headers @{ 'User-Agent' = 'FrameUpdater'; 'Accept' = 'application/vnd.github+json' } -TimeoutSec 25
if ($release.draft -or $release.prerelease -or $release.tag_name -notmatch '^v(\d+)\.(\d+)\.(\d+)$') { throw 'Latest release is not a stable semantic version.' }
$latest = [version](($Matches[1], $Matches[2], $Matches[3]) -join '.')
$currentText = if (Test-Path $stateFile) { (Get-Content $stateFile -Raw).Trim() } else { '0.1.0' }
try { $current = [version]($currentText.TrimStart('v')) } catch { $current = [version]'0.0.0' }
if ($latest -le $current) { Write-Output "FRAME is current ($current)."; exit 0 }
Write-Output "FRAME update available: $latest"
if ($CheckOnly) { exit 0 }
$zipAsset = @($release.assets | Where-Object name -eq 'frame-app.zip') | Select-Object -First 1
$hashAsset = @($release.assets | Where-Object name -eq 'frame-app.zip.sha256') | Select-Object -First 1
if (!$zipAsset -or !$hashAsset) { throw 'Release must contain frame-app.zip and frame-app.zip.sha256.' }
$expectedHost = 'github.com'
foreach ($asset in @($zipAsset, $hashAsset)) {
  $u = [uri]$asset.browser_download_url
  if ($u.Scheme -ne 'https' -or $u.Host -ne $expectedHost -or !$u.AbsolutePath.StartsWith("/$repo/releases/download/")) { throw 'Untrusted asset URL.' }
}
$temp = Join-Path ([IO.Path]::GetTempPath()) ("frame-update-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $temp | Out-Null
$backup = Join-Path $root 'previous-frame'
try {
  $zip = Join-Path $temp 'frame-app.zip'
  $hashFile = Join-Path $temp 'frame-app.zip.sha256'
  Invoke-WebRequest $zipAsset.browser_download_url -OutFile $zip -TimeoutSec 90
  Invoke-WebRequest $hashAsset.browser_download_url -OutFile $hashFile -TimeoutSec 30
  $expected = ((Get-Content $hashFile -Raw).Trim() -split '\s+')[0]
  if ($expected -notmatch '^[0-9a-fA-F]{64}$') { throw 'Invalid SHA256 checksum.' }
  $actual = (Get-FileHash $zip -Algorithm SHA256).Hash
  if ($actual -ine $expected) { throw 'Release checksum mismatch.' }
  $extract = Join-Path $temp 'extracted'
  Expand-Archive -LiteralPath $zip -DestinationPath $extract
  $source = Join-Path $extract 'frame'
  if (!(Test-Path (Join-Path $source 'index.js')) -or !(Test-Path (Join-Path $source 'manifest.json'))) { throw 'Invalid release layout.' }
  $files = @(Get-ChildItem $extract -Recurse -File)
  if (@($files | Where-Object { $_.Extension -notin @('.js','.json','.css') }).Count -gt 0) { throw 'Unexpected file type in release.' }
  if ($files.Count -gt 30 -or ($files | Measure-Object Length -Sum).Sum -gt 3000000) { throw 'Release exceeds limits.' }
  if (Test-Path $backup) { Remove-Item $backup -Recurse -Force }
  if (Test-Path $app) { Copy-Item $app $backup -Recurse -Force }
  try {
    if (Test-Path $app) { Remove-Item $app -Recurse -Force }
    Copy-Item $source $app -Recurse -Force
    & spicetify apply
    if ($LASTEXITCODE -ne 0) { throw 'Spicetify apply failed.' }
    Set-Content -Path $stateFile -Value $latest.ToString() -NoNewline
    Write-Output "Installed FRAME $latest. Restart Spotify if the UI has not refreshed."
  } catch {
    if (Test-Path $app) { Remove-Item $app -Recurse -Force }
    if (Test-Path $backup) { Copy-Item $backup $app -Recurse -Force; & spicetify apply | Out-Null }
    throw
  }
} finally { if (Test-Path $temp) { Remove-Item $temp -Recurse -Force } }
