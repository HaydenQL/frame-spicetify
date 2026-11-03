Unregister-ScheduledTask -TaskName 'FRAME Update Check' -Confirm:$false -ErrorAction SilentlyContinue
Write-Output 'FRAME scheduled updater removed.'
