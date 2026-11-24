# Code Kingdom - Development Startup
[CmdletBinding()]
param([switch]$NoBrowser)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$python = Join-Path $root '.venv\Scripts\python.exe'
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$vite = Join-Path $root 'frontend\node_modules\vite\bin\vite.js'
$logDir = Join-Path $root '.dev-logs'
$pidFile = Join-Path $logDir 'processes.json'

if (!(Test-Path $python)) { throw 'Python virtual environment not found. Create .venv first.' }
if (!$nodeCommand -or !(Test-Path $vite)) { throw 'Node.js or frontend dependencies missing. Run npm install in frontend.' }
if (!(Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker is missing. Install and start Docker Desktop.' }
foreach ($file in @('.env', 'backend\.env')) {
    if (!(Test-Path (Join-Path $root $file))) { throw "Missing $file. Copy its .env.example and configure your database credentials first." }
}
foreach ($port in @(5173, 8000, 8001, 8002)) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
        throw "Port $port is already in use. Run .\stop-dev.ps1 before starting again."
    }
}
if (Test-Path $pidFile) { throw 'Saved development processes found. Run .\stop-dev.ps1 first.' }

# Apply the shared requirements on every start, including newly added login dependencies.
Write-Host 'Checking Python dependencies...'
& $python -m pip install --quiet --disable-pip-version-check -r (Join-Path $root 'backend\requirements.txt')
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed. Check the output above and your internet connection.' }
& $python -B -c 'from starlette.middleware.sessions import SessionMiddleware; from pwdlib import PasswordHash; PasswordHash.recommended()'
if ($LASTEXITCODE -ne 0) { throw 'Login dependency verification failed. Check backend/requirements.txt and the Python environment.' }

Push-Location $root
try {
    docker compose up -d postgres
    if ($LASTEXITCODE -ne 0) { throw 'Failed to start PostgreSQL. Make sure Docker Desktop is running.' }
    $databaseReady = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        docker compose exec -T postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' *> $null
        if ($LASTEXITCODE -eq 0) { $databaseReady = $true; break }
        Start-Sleep -Seconds 1
    }
    if (!$databaseReady) { throw 'PostgreSQL did not become ready within 30 seconds. Check docker compose logs postgres.' }
}
finally { Pop-Location }

New-Item -ItemType Directory -Force -Path $logDir | Out-Null
# Give background servers EOF instead of access to the interactive terminal.
$stdinFile = Join-Path $logDir 'stdin.txt'
[System.IO.File]::WriteAllText($stdinFile, '')
$started = @{}
function Start-DevService {
    param([string]$Name, [string]$Executable, [string]$Arguments, [string]$WorkingDirectory)
    $process = Start-Process -FilePath $Executable -ArgumentList $Arguments `
        -WorkingDirectory $WorkingDirectory -WindowStyle Hidden -PassThru `
        -RedirectStandardInput $stdinFile `
        -RedirectStandardOutput (Join-Path $logDir "$Name.out.log") `
        -RedirectStandardError (Join-Path $logDir "$Name.err.log")
    $started[$Name] = $process
    # Save each successful launch so the stop script can recover from interruption.
    $ids = @{}
    foreach ($key in $started.Keys) { $ids[$key] = $started[$key].Id }
    $ids | ConvertTo-Json | Set-Content $pidFile
    Write-Host "Started $Name (PID: $($process.Id))"
}

function Wait-DevService {
    param([string]$Name, [string]$Url)
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if ($started[$Name].HasExited) { throw "$Name exited during startup. See $logDir\$Name.err.log" }
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) { return }
        }
        catch { }
        Start-Sleep -Milliseconds 500
    }
    throw "$Name did not become ready. See $logDir\$Name.err.log and check database credentials if the core or login service failed."
}

try {
    Start-DevService 'core' $python '-B -m uvicorn services.core.main:app --port 8001' (Join-Path $root 'backend')
    Wait-DevService 'core' 'http://127.0.0.1:8001/health'
    Start-DevService 'login' $python '-B -m uvicorn login:app --port 8002' (Join-Path $root 'frontend\login')
    Wait-DevService 'login' 'http://127.0.0.1:8002/login'
    Start-DevService 'gateway' $python '-B -m uvicorn gateway.main:app --port 8000' (Join-Path $root 'backend')
    Wait-DevService 'gateway' 'http://127.0.0.1:8000/api/health'
    Start-DevService 'frontend' $nodeCommand.Source "`"$vite`" --host 127.0.0.1 --port 5173 --strictPort" (Join-Path $root 'frontend')
    Wait-DevService 'frontend' 'http://127.0.0.1:5173/'
}
catch {
    foreach ($process in $started.Values) {
        if (!$process.HasExited) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue }
    }
    Remove-Item $pidFile -ErrorAction SilentlyContinue
    throw
}

Write-Host ''
Write-Host 'Code Kingdom services are ready.'
Write-Host 'Login:    http://127.0.0.1:8002/login'
Write-Host 'Game:     http://127.0.0.1:5173'
Write-Host "Logs:     $logDir"
if (!$NoBrowser) { Start-Process 'http://127.0.0.1:8002/login' }
