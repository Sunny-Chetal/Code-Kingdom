# Code Kingdom - Development Shutdown

$root = $PSScriptRoot
$pidFile = Join-Path $root ".dev-logs\processes.json"

# Stop frontend and backend services
if (Test-Path $pidFile) {
    $processes = Get-Content $pidFile -Raw | ConvertFrom-Json

    foreach ($name in @("frontend", "gateway", "core")) {
        $processId = $processes.$name

        if ($processId) {
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue

            if ($process) {
                Stop-Process -Id $processId -Force
                Write-Host "Stopped $name (PID: $processId)"
            }
        }
    }

    Remove-Item $pidFile
}
else {
    Write-Host "No saved development processes found."
}

# Stop PostgreSQL without deleting database data
Push-Location $root

try {
    docker compose stop postgres
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "Code Kingdom development services stopped."