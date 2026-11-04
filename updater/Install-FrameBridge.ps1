$ErrorActionPreference='Stop'
$source=Split-Path -Parent $MyInvocation.MyCommand.Path
$destination=Join-Path $env:LOCALAPPDATA 'FrameUpdater'
New-Item -ItemType Directory -Path $destination -Force | Out-Null
foreach($file in @('Frame-Bridge.ps1','Run-FrameUpdate.ps1','Update-Frame.ps1')){
  $from=Join-Path $source $file
  if(!(Test-Path $from)){throw "Missing $file from helper package."}
  Copy-Item $from (Join-Path $destination $file) -Force
}
$config=Join-Path $destination 'config.json'
if(!(Test-Path $config)){ @{repository='HaydenQL/frame-spicetify'} | ConvertTo-Json | Set-Content $config }
$script=Join-Path $destination 'Frame-Bridge.ps1'
$action=New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}"' -f $script)
$trigger=New-ScheduledTaskTrigger -AtLogOn -User ([Security.Principal.WindowsIdentity]::GetCurrent().Name)
$principal=New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'FRAME Update Bridge' -Action $action -Trigger $trigger -Principal $principal -Force | Out-Null
Start-Process powershell.exe -WindowStyle Hidden -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"' + $script + '"'))
Write-Host 'FRAME update helper installed. Restart Spotify, then click Update now.' -ForegroundColor Green
