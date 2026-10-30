$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Test-Path '.env')) {
    $email = Read-Host 'Administrator email'
    if ($email -notmatch '^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') { throw 'Enter a valid email address' }
    function New-Secret {
        $bytes = New-Object byte[] 32
        $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
        return ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
    }
    $adminPassword = New-Secret
    @("POSTGRES_PASSWORD=$(New-Secret)", "JWT_SECRET=$(New-Secret)", "ADMIN_EMAIL=$email", "ADMIN_PASSWORD=$adminPassword") | Set-Content -Encoding ASCII '.env'
    Write-Host "Administrator: $email"
    Write-Host "Generated password: $adminPassword"
    Write-Host 'Save this password. The local .env also contains it; do not share that file.'
}
docker compose up --build -d
if ($LASTEXITCODE -ne 0) { throw 'Docker startup failed. Check Docker Desktop and the output above.' }
Write-Host 'Services are starting. Open http://localhost:5173 after the backend is ready.'
Write-Host 'Check progress with: docker compose logs -f backend'
