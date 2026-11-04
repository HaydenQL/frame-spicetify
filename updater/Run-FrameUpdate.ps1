$ErrorActionPreference='Stop'
$root=Split-Path -Parent $MyInvocation.MyCommand.Path
$state=Join-Path $root 'bridge-status.json'
$log=Join-Path $root 'last-update.log'
try {
  & (Join-Path $root 'Update-Frame.ps1') *>&1 | Out-File -FilePath $log -Encoding UTF8
  if($LASTEXITCODE -and $LASTEXITCODE -ne 0){ throw "Updater exit code $LASTEXITCODE" }
  @{status='success';message='Updater finished. Restart Spotify if needed.';time=(Get-Date).ToString('o')} | ConvertTo-Json | Set-Content $state
} catch {
  Add-Content $log $_.Exception.ToString()
  @{status='error';message=$_.Exception.Message;time=(Get-Date).ToString('o')} | ConvertTo-Json | Set-Content $state
}
