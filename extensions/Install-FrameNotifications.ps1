# One-time setup for FRAME global notifications and the Update Now action.
# Run as your normal Windows user, not as administrator.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$updater = Join-Path $env:LOCALAPPDATA 'FrameUpdater\Update-Frame.ps1'
if (!(Test-Path $updater)) { throw "FRAME updater not found at $updater" }
$extension = Join-Path $root 'frame-updates.js'
if (!(Test-Path $extension)) { throw "Place frame-updates.js next to this installer." }
$target = Join-Path $env:APPDATA 'spicetify\Extensions'
New-Item -ItemType Directory -Path $target -Force | Out-Null
Copy-Item $extension (Join-Path $target 'frame-updates.js') -Force
$spicetify = Get-Command spicetify -ErrorAction Stop
& spicetify config extensions frame-updates.js
if ($LASTEXITCODE -ne 0) { throw 'Could not enable FRAME extension.' }

# The URL is a fixed action, not a command argument. No remote input is passed to PowerShell.
$key = 'HKCU:\Software\Classes\frame-update'
New-Item $key -Force | Out-Null
Set-Item $key -Value 'URL:FRAME Updater'
New-ItemProperty $key -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null
$commandKey = Join-Path $key 'shell\open\command'
New-Item $commandKey -Force | Out-Null
$escaped = $updater.Replace('"', '')
$command = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + $escaped + '"'
Set-Item $commandKey -Value $command
Write-Host 'FRAME notification and Update Now protocol installed.'
Write-Host 'Spicetify needs to apply the extension. This may reload Spotify and interrupt playback.'
$answer = Read-Host 'Apply now? (y/N)'
if ($answer -eq 'y') { & spicetify apply }
