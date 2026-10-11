$ErrorActionPreference = 'Stop'
try {
    $appRoot = $PSScriptRoot
    if (-not (Test-Path -LiteralPath (Join-Path $appRoot 'ffmpeg.exe'))) { throw 'ffmpeg.exeがありません。README.mdの準備方法を確認してください。' }
    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($nodeCommand) { $nodePath = $nodeCommand.Source }
    else {
        $nodePath = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
        if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Node.jsが見つかりません。Node.jsのLTS版をインストールしてください。' }
    }
    $urlFile = Join-Path $appRoot '起動URL.txt'
    if (Test-Path -LiteralPath $urlFile) {
        $oldUrl = (Get-Content -LiteralPath $urlFile -Raw).Trim()
        try {
            $page = Invoke-WebRequest -Uri $oldUrl -UseBasicParsing -TimeoutSec 2
            if ($page.Content -match "const token='[a-f0-9]{48}'") { Start-Process $oldUrl; exit }
        } catch { }
        Remove-Item -LiteralPath $urlFile
    }
    $serverPath = Join-Path $appRoot 'server.cjs'
    $process = Start-Process -FilePath $nodePath -ArgumentList ('"' + $serverPath + '"') -WorkingDirectory $appRoot -WindowStyle Hidden -PassThru
    Set-Content -LiteralPath (Join-Path $appRoot 'プロセスID.txt') -Value $process.Id
    for ($i=0; $i -lt 100; $i++) {
        Start-Sleep -Milliseconds 100
        if (Test-Path -LiteralPath $urlFile) { break }
        if ($process.HasExited) { throw '変換アプリを起動できませんでした。' }
    }
    if (-not (Test-Path -LiteralPath $urlFile)) { throw '起動がタイムアウトしました。' }
    Start-Process (Get-Content -LiteralPath $urlFile -Raw)
} catch { Write-Host $_.Exception.Message; Read-Host 'Enterキーで閉じます' }
