# OneClickSetup.ps1
$ErrorActionPreference = "Stop"

# Configuration
$NodeVersion = "v20.18.0" # LTS Version
$NodeDistUrl = "https://nodejs.org/dist/$NodeVersion/node-$NodeVersion-win-x64.zip"
$LocalNodeDir = Join-Path $PSScriptRoot "local_node"
$ZipPath = Join-Path $PSScriptRoot "node.zip"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   角色關係圖應用程式 - 一鍵安裝精靈" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check for existing Node.js
Write-Host "[1/3] 檢查執行環境..." -ForegroundColor Yellow

$NodePath = ""
if (Test-Path $LocalNodeDir) {
    Write-Host "      偵測到本地 Node.js 環境。" -ForegroundColor Green
    $NodePath = Join-Path $LocalNodeDir "node-$NodeVersion-win-x64"
} else {
    try {
        $sysNode = Get-Command node -ErrorAction SilentlyContinue
        if ($sysNode) {
            Write-Host "      偵測到系統 Node.js 環境。" -ForegroundColor Green
            # Even if system node exists, we might want to prioritize local if we want strict control,
            # but for now let's respect system node if acceptable.
            # user demanded "automatic install if missing", so system node is fine.
        } else {
            Write-Host "      未偵測到 Node.js，準備下載免安裝版..." -ForegroundColor Yellow
            
            # 2. Download Node.js
            Write-Host "[2/3] 下載 Node.js ($NodeVersion)..." -ForegroundColor Yellow
            try {
                Invoke-WebRequest -Uri $NodeDistUrl -OutFile $ZipPath -UseBasicParsing
                Write-Host "      下載完成，正在解壓縮..." -ForegroundColor Yellow
                
                Expand-Archive -Path $ZipPath -DestinationPath $LocalNodeDir -Force
                
                # Cleanup zip
                Remove-Item $ZipPath -Force
                Write-Host "      Node.js 安裝完成！" -ForegroundColor Green
                
                $NodePath = Join-Path $LocalNodeDir "node-$NodeVersion-win-x64"
            } catch {
                Write-Error "下載或安裝 Node.js 失敗。請檢查網路連線。"
                Write-Host "錯誤詳情: $_" -ForegroundColor Red
                Pause
                Exit 1
            }
        }
    } catch {
        Write-Host "      檢查過程發生錯誤。" -ForegroundColor Red
        Exit 1
    }
}

# Add local node to PATH for this session if we are using it
if ($NodePath) {
    $env:PATH = "$NodePath;$env:PATH"
    Write-Host "      已暫時將本地 Node 加入 PATH。" -ForegroundColor Gray
}

# Verify Node availability
try {
    $currentVer = node -v
    Write-Host "      目前 Node 版本: $currentVer" -ForegroundColor Gray
} catch {
    Write-Error "無法執行 Node.js。安裝可能失敗。"
    Pause
    Exit 1
}

# 3. Install Dependencies
Write-Host ""
Write-Host "[3/3] 安裝應用程式依賴套件 (npm install)..." -ForegroundColor Yellow
Write-Host "      這可能需要幾分鐘，請勿關閉視窗..." -ForegroundColor Gray

try {
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host "      安裝成功！所有準備工作已完成。" -ForegroundColor Green
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "現在請執行「點我開始APP.bat」來啟動程式。"
    } else {
        throw "npm install failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "      安裝失敗！" -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "錯誤訊息: $_"
    Write-Host "請截圖此畫面並聯繫開發者。"
}

Write-Host ""
Pause
