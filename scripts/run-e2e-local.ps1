$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$outLog = Join-Path $root "tmp-next-e2e.out.log"
$errLog = Join-Path $root "tmp-next-e2e.err.log"
$port = if ($env:PORT) { $env:PORT } else { "3100" }
$baseUrl = if ($env:PLAYWRIGHT_BASE_URL) { $env:PLAYWRIGHT_BASE_URL } else { "http://127.0.0.1:$port" }

$env:PORT = $port
$env:PLAYWRIGHT_BASE_URL = $baseUrl
$env:NEXT_PUBLIC_APP_URL = $baseUrl

$nodeArgs = @(
  "node_modules/next/dist/bin/next",
  "start",
  "--hostname",
  "127.0.0.1",
  "--port",
  $port
)

$server = Start-Process `
  -FilePath "node" `
  -ArgumentList $nodeArgs `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -RedirectStandardOutput $outLog `
  -RedirectStandardError $errLog `
  -PassThru

try {
  $ready = $false
  for ($i = 0; $i -lt 60; $i++) {
    try {
      $response = Invoke-WebRequest -Uri "$baseUrl/es/login" -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -lt 500) {
        $ready = $true
        break
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  if (-not $ready) {
    Get-Content $outLog -Tail 80 -ErrorAction SilentlyContinue
    Get-Content $errLog -Tail 80 -ErrorAction SilentlyContinue
    throw "Next server did not become ready at $baseUrl"
  }

  npm run test:e2e
  exit $LASTEXITCODE
} finally {
  if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force
  }
}
