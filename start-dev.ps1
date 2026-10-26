# Code Kingdom - Development Startup

$root = $PSScriptRoot
$python = Join-Path $root ".venv\Scripts\python.exe"
$node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
$vite = Join-Path $root "frontend\node_modules\vite\bin\vite.js"
$logDir = Join-Path $root ".dev-logs"
$pidFile = Join-Path $logDir "processes.json"

if (!(Test-Path $python)) {
    throw "Python virtual environment not found."
}

if (!$node -or !(Test-Path $vite)) {
    throw "Node.js or frontend dependencies not found."
}

# Avoid launching duplicate servers
foreach ($port in @(5173, 8000, 8001, 8002)) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
        throw "Port $port is already in use. Stop existing servers first."
    }
}

# Start PostgreSQL
Push-Location $root
try {
    docker compose up -d postgres
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to start PostgreSQL."
    }
}
finally {
    Pop-Location
}

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Start-DevService {
    param(
        [string]$Name,
        [string]$Executable,
        [string]$Arguments,
        [string]$WorkingDirectory
    )

    $info = New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName = $Executable
    $info.Arguments = $Arguments
    $info.WorkingDirectory = $WorkingDirectory
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardInput = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $info

    if (!$process.Start()) {
        throw "Failed to start $Name."
    }

    $process.StandardInput.Close()

    Write-Host "Started $Name (PID: $($process.Id))"
    return $process.Id
}

$core = Start-DevService `
    -Name "Core" `
    -Executable $python `
    -Arguments "-m uvicorn services.core.main:app --port 8001" `
    -WorkingDirectory (Join-Path $root "backend")

$login = Start-DevService `
    -Name "StartHere" `
    -Executable $python `
    -Arguments "-m uvicorn login:app --port 8002" `
    -WorkingDirectory (Join-Path $root "frontend\login")

$gateway = Start-DevService `
    -Name "Gateway" `
    -Executable $python `
    -Arguments "-m uvicorn gateway.main:app --port 8000" `
    -WorkingDirectory (Join-Path $root "backend")

$frontend = Start-DevService `
    -Name "Frontend" `
    -Executable $node `
    -Arguments "`"$vite`" --strictPort" `
    -WorkingDirectory (Join-Path $root "frontend")

@{
    core = $core
    gateway = $gateway
    frontend = $frontend
    login = $login
} | ConvertTo-Json | Set-Content $pidFile

Write-Host ""
Write-Host "Code Kingdom development services started."
Write-Host "StartHere:    http://127.0.0.1:8002"
Write-Host "Gateway:  http://127.0.0.1:8000/api/health"
Write-Host "Core:     http://127.0.0.1:8001/health"

# Automatically launch the login portal in your default browser
Start-Process "http://127.0.0.1:8002"