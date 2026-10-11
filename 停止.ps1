$ErrorActionPreference = 'Stop'
try {
    $url = (Get-Content -LiteralPath (Join-Path $PSScriptRoot '起動URL.txt') -Raw).Trim()
    $page = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
    if ($page.Content -match "const token='([a-f0-9]{48})'") {
        Invoke-WebRequest -Uri ($url + 'shutdown?token=' + $Matches[1]) -Method Post -UseBasicParsing -TimeoutSec 3 | Out-Null
    }
} catch { Write-Host 'アプリは停止済み、または接続できません。' }
