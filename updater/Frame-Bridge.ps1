# FRAME local update bridge. Runs as the signed-in user, not elevated.
# The Spotify embedded browser cannot reliably open external Windows protocols.
# This loopback-only listener accepts requests from Spotify's desktop origin.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$log = Join-Path $root 'bridge.log'
$state = Join-Path $root 'bridge-status.json'
$port = 43891
$nonce = [guid]::NewGuid().ToString('N')
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,$port)
function Write-State([string]$status,[string]$message) {
  @{ status=$status; message=$message; time=(Get-Date).ToString('o') } | ConvertTo-Json -Compress | Set-Content -Path $state -Encoding UTF8
}
Write-State 'ready' 'FRAME update helper is ready.'
$listener.Start()
try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $client.ReceiveTimeout=4000; $client.SendTimeout=4000
      $stream = $client.GetStream()
      $reader = [IO.StreamReader]::new($stream,[Text.Encoding]::ASCII,$false,1024,$true)
      $request = $reader.ReadLine()
      if (!$request -or $request.Length -gt 2048) { continue }
      $headers=@{}
      for($i=0;$i -lt 60;$i++){
        $line=$reader.ReadLine()
        if (!$line) { break }
        if ($line.Length -gt 4096) { break }
        $parts=$line.Split(':',2)
        if($parts.Length -eq 2){ $headers[$parts[0].Trim().ToLowerInvariant()]=$parts[1].Trim() }
      }
      $origin=[string]$headers['origin']
      $allowed = $origin -match '^https://([a-z0-9-]+\.)*spotify\.com$' -or $origin -eq 'https://xpui.app.spotify.com'
      $method,$path = $request.Split(' ')[0..1]
      $status='200 OK'
      $body=@{status='ready';message='FRAME bridge ready.';nonce=$nonce}
      if (!$allowed) { $status='403 Forbidden'; $body=@{error='Origin not allowed'} }
      elseif ($method -eq 'OPTIONS') { $status='204 No Content'; $body=@{} }
      elseif ($method -eq 'GET' -and $path -eq '/status') {
        if(Test-Path $state){ try { $body=Get-Content $state -Raw | ConvertFrom-Json } catch {} }
        $body=@{status=$body.status;message=$body.message;nonce=$nonce}
      }
      elseif ($method -eq 'POST' -and $path -eq '/install' -and $headers['x-frame-nonce'] -eq $nonce) {
        $existing = if(Test-Path $state){Get-Content $state -Raw | ConvertFrom-Json}else{$null}
        if($existing.status -eq 'installing'){ $status='409 Conflict'; $body=@{status='installing'} }
        else {
          Write-State 'installing' 'Downloading and applying FRAME update.'
          $script=Join-Path $root 'Update-Frame.ps1'
          $launcher=Join-Path $root 'Run-FrameUpdate.ps1'
          if(!(Test-Path $script) -or !(Test-Path $launcher)){ $status='500 Internal Server Error'; Write-State 'error' 'Updater files missing.'; $body=@{status='error'} }
          else {
            Start-Process powershell.exe -WindowStyle Hidden -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"' + $launcher + '"')) | Out-Null
            $body=@{status='installing';message='Updater launched'}
          }
        }
      } else { $status='404 Not Found'; $body=@{error='Unknown endpoint or invalid token'} }
      $json=ConvertTo-Json $body -Compress -Depth 4
      $bytes=[Text.Encoding]::UTF8.GetBytes($json)
      $cors=if($allowed){"Access-Control-Allow-Origin: $origin`r`nAccess-Control-Allow-Methods: GET, POST, OPTIONS`r`nAccess-Control-Allow-Headers: X-Frame-Nonce, Content-Type`r`nAccess-Control-Allow-Private-Network: true`r`nVary: Origin`r`n"}else{''}
      $head="HTTP/1.1 $status`r`nContent-Type: application/json`r`nCache-Control: no-store`r`nConnection: close`r`nX-Content-Type-Options: nosniff`r`n$cors"+"Content-Length: $($bytes.Length)`r`n`r`n"
      $headerBytes=[Text.Encoding]::ASCII.GetBytes($head)
      $stream.Write($headerBytes,0,$headerBytes.Length)
      if($method -ne 'OPTIONS'){ $stream.Write($bytes,0,$bytes.Length) }
      $stream.Flush()
    } catch { Add-Content $log ("Bridge request error: " + $_.Exception.Message) }
    finally { $client.Close() }
  }
} finally { $listener.Stop() }
