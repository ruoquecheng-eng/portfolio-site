[CmdletBinding()]
param(
  [string]$SourceRoot = "C:\Agent"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Destination = Join-Path $ProjectRoot "src\assets\downloads\Scenic-Guide-Digital-Human-Source-v0.1.0.zip"
$Staging = Join-Path ([System.IO.Path]::GetTempPath()) ("scenic-guide-public-" + [guid]::NewGuid().ToString("N"))

function Copy-AllowedFile([string]$Source, [string]$Relative) {
  $target = Join-Path $Staging $Relative
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
  Copy-Item -LiteralPath $Source -Destination $target
}

function Write-PublicFile([string]$Relative, [string]$Content) {
  $target = Join-Path $Staging $Relative
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
  [System.IO.File]::WriteAllText($target, $Content, [System.Text.UTF8Encoding]::new($false))
}

try {
  New-Item -ItemType Directory -Force -Path $Staging | Out-Null
  $frontend = Join-Path $SourceRoot "frontend"
  $backend = Join-Path $SourceRoot "backend"
  $fallback = Join-Path $ProjectRoot "source-packages\scenic-guide\guide-fallback.svg"

  foreach ($file in @("index.html", "guide-kei.html", "local_frontend_server.js")) {
    Copy-AllowedFile (Join-Path $frontend $file) (Join-Path "frontend" $file)
  }
  foreach ($file in @("assets\experience-ui.js", "assets\premium-ui.css")) {
    Copy-AllowedFile (Join-Path $frontend $file) (Join-Path "frontend" $file)
  }
  Get-ChildItem -LiteralPath (Join-Path $frontend "assets\avatars") -File -Filter "*.svg" | ForEach-Object {
    Copy-AllowedFile $_.FullName (Join-Path "frontend\assets\avatars" $_.Name)
  }
  Copy-AllowedFile $fallback "frontend\assets\avatars\guide-fallback.svg"

  foreach ($file in @("server.js", "package.json", "package-lock.json", "requirements.txt", "conf.yaml")) {
    Copy-AllowedFile (Join-Path $backend $file) (Join-Path "backend" $file)
  }
  Get-ChildItem -LiteralPath (Join-Path $backend "app") -File -Filter "*.py" | ForEach-Object {
    Copy-AllowedFile $_.FullName (Join-Path "backend\app" $_.Name)
  }
  foreach ($file in @("demo_scenic_knowledge.json", "public_pack_knowledge.json", "eval_set.json", "regression_cases.json")) {
    Copy-AllowedFile (Join-Path $backend "data\$file") (Join-Path "backend\data" $file)
  }

  foreach ($page in @("frontend\index.html", "frontend\guide-kei.html")) {
    $path = Join-Path $Staging $page
    $html = Get-Content -LiteralPath $path -Raw
    $html = [regex]::Replace($html, '(?im)^\s*<link\b[^>]*assets/(?:vendor/live2d|live2d)[^>]*>\s*\r?\n?', '')
    $html = [regex]::Replace($html, '(?im)^\s*<script\b[^>]*assets/(?:vendor/live2d|live2d)[^>]*></script>\s*\r?\n?', '')
    $html = [regex]::Replace($html, 'assets/(?:vendor/live2d|live2d)/[^"''\s?]+(?:\?[^"'']*)?', 'assets/avatars/guide-fallback.svg')
    $html = $html -replace 'const ENABLE_HIYORI_LIVE2D_AUTO = true;', 'const ENABLE_HIYORI_LIVE2D_AUTO = false; // Public package: third-party Live2D assets are intentionally excluded.'
    $html = [regex]::Replace($html, '<link rel="icon" href="[^"]+"[^>]*>', '<link rel="icon" href="assets/avatars/guide-fallback.svg" type="image/svg+xml">', 1)
    [System.IO.File]::WriteAllText($path, $html, [System.Text.UTF8Encoding]::new($false))
  }

  # Remove the actual sensitive values from every staged text file. Read the
  # values from the private environment file so this public packaging script
  # never hard-codes or republishes a credential.
  $privateEnv = Join-Path $backend "competition.env"
  if (Test-Path -LiteralPath $privateEnv) {
    $sensitiveValues = Get-Content -LiteralPath $privateEnv | ForEach-Object {
      if ($_ -match '^\s*([^#=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim().Trim('"').Trim("'")
        if ($key -match '(?i)(API_KEY|ADMIN_TOKEN|PASSWORD|SECRET)$' -and $value.Length -ge 6) {
          $value
        }
      }
    } | Where-Object { $_ } | Select-Object -Unique

    Get-ChildItem -LiteralPath $Staging -File -Recurse | Where-Object {
      $_.Extension -in @('.html', '.js', '.py', '.yaml', '.yml', '.json', '.md', '.txt', '.example', '.ps1') -or
      $_.Name -eq '.env.example'
    } | ForEach-Object {
      $text = Get-Content -LiteralPath $_.FullName -Raw
      foreach ($secret in $sensitiveValues) {
        $text = $text.Replace($secret, '')
      }
      [System.IO.File]::WriteAllText($_.FullName, $text, [System.Text.UTF8Encoding]::new($false))
    }
  }

  Write-PublicFile ".env.example" @'
# Optional local configuration. Leave these values empty to use the local fallback behavior.
MODEL_BASE_URL=
MODEL_NAME=
MODEL_API_KEY=
MODEL_TIMEOUT_SECONDS=30000
MODEL_MAX_RETRIES=0
SERVER_TTS_ENABLED=false
SERVER_TTS_PROVIDER=
SERVER_ASR_PROVIDER=
ADMIN_TOKEN=
ADMIN_TOKEN_REQUIRED=false
'@
  Write-PublicFile "README.md" @'
# Scenic Guide Digital Human — sanitized public source package

This package is a reproducible, sanitized snapshot of the competition prototype. It contains the visitor-facing front end, the local Node.js back end, selected sample knowledge data, and a static SVG guide fallback.

## Excluded deliberately

- `.env`, `competition.env`, credentials, API keys, administrator tokens, and private configuration
- databases, `store.json`, caches, logs, reports, backups, uploads, and `node_modules`
- `frontend/assets/live2d`, `frontend/assets/vendor/live2d`, and all other Live2D/model files whose redistribution rights were not established

The public build disables Live2D loading. When original model assets are absent, the interface uses `frontend/assets/avatars/guide-fallback.svg`. This keeps the UI inspectable without claiming that third-party model assets are included.

## Run locally

1. Install Node.js 20 or newer.
2. In `backend`, run `npm ci` and then `node server.js`.
3. In another terminal, run `node frontend/local_frontend_server.js`.
4. Open `http://127.0.0.1:8010/`.

No model API key is required for the local fallback path. Copy the root `.env.example` only if optional local configuration is needed; do not commit real credentials.

## Scope

This is a competition prototype to which the portfolio owner contributed. It is not presented as a production deployment or as a redistribution of third-party Live2D models.
'@
  Write-PublicFile "NOTICE_THIRD_PARTY.md" @'
# Third-party and excluded assets

The original working directory referenced Cubism/Live2D runtimes and model assets under `frontend/assets/live2d` and `frontend/assets/vendor/live2d`. Their redistribution license was not established for this public package, so neither the files nor their runtime bundles are included.

The replacement `frontend/assets/avatars/guide-fallback.svg` is an original static fallback created for this package. Node.js dependencies are declared in `backend/package.json` and must be installed by the recipient from their own package registry environment.
'@
  Write-PublicFile "start_public_demo.ps1" @'
param([switch]$OpenBrowser)
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
Start-Process node -ArgumentList "server.js" -WorkingDirectory (Join-Path $root "backend")
Start-Process node -ArgumentList "local_frontend_server.js" -WorkingDirectory (Join-Path $root "frontend")
if ($OpenBrowser) { Start-Process "http://127.0.0.1:8010/" }
'@

  if (Test-Path -LiteralPath $Destination) { Remove-Item -LiteralPath $Destination -Force }
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Destination) | Out-Null
  Compress-Archive -Path (Join-Path $Staging "*") -DestinationPath $Destination -CompressionLevel Optimal
  Write-Host "Created $Destination"
}
finally {
  if (Test-Path -LiteralPath $Staging) { Remove-Item -LiteralPath $Staging -Recurse -Force }
}
