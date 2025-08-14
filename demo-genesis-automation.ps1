# Script de Demonstracao da Automacao Genesis Plus GX
# Executa todo o processo automatizado e valida o resultado
# Autor: Assistente IA - Universal Asset Studio
# Data: 2024-12-19

param(
    [switch]$SkipSetup = $false,
    [switch]$QuickDemo = $false,
    [switch]$ShowBrowser = $true
)

# Funcao para logging com cores
function Write-DemoLog {
    param(
        [string]$Message, 
        [string]$Type = "INFO",
        [switch]$Animate = $false
    )
    
    $color = switch ($Type) {
        "TITLE"   { "Cyan" }
        "SUCCESS" { "Green" }
        "ERROR"   { "Red" }
        "WARN"    { "Yellow" }
        "STEP"    { "Magenta" }
        "RESULT"  { "White" }
        default   { "Gray" }
    }
    
    $icon = switch ($Type) {
        "TITLE"   { "[TITLE]" }
        "SUCCESS" { "[OK]" }
        "ERROR"   { "[ERROR]" }
        "WARN"    { "[WARN]" }
        "STEP"    { "[STEP]" }
        "RESULT"  { "[RESULT]" }
        default   { "[INFO]" }
    }
    
    Write-Host "$icon $Message" -ForegroundColor $color
}

# Funcao para mostrar progresso
function Show-Progress {
    param([string]$Activity, [int]$Percent)
    if (-not $QuickDemo) {
        Write-Progress -Activity $Activity -PercentComplete $Percent
        Start-Sleep -Milliseconds 500
    }
}

# Configuracoes
$startTime = Get-Date
$workDir = Get-Location
$jsFile = "$workDir\public\emulators\genesis_plus_gx.js"
$wasmFile = "$workDir\public\emulators\genesis_plus_gx.wasm"
$testFile = "$workDir\test-genesis-emulator.html"

# Cabecalho
Clear-Host
Write-Host "" 
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "           DEMONSTRACAO GENESIS PLUS GX AUTOMATION              " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# ETAPA 1: Validacao do ambiente
Write-DemoLog "ETAPA 1: Validacao do Ambiente" "STEP"
Show-Progress "Validando ambiente..." 10

# Verificar se os scripts existem
$scriptsExist = $true
$requiredScripts = @(
    @{Name="build-genesis-universal.ps1"; Path="scripts\build-genesis-universal.ps1"},
    @{Name="validate-genesis-setup.ps1"; Path="scripts\validate-genesis-setup.ps1"}
)

foreach ($script in $requiredScripts) {
    if (Test-Path $script.Path) {
        Write-DemoLog "Script encontrado: $($script.Name)" "SUCCESS"
    } else {
        Write-DemoLog "Script nao encontrado: $($script.Name)" "ERROR"
        $scriptsExist = $false
    }
}

if (-not $scriptsExist) {
    Write-DemoLog "Alguns scripts necessarios nao foram encontrados" "ERROR"
    exit 1
}

# ETAPA 2: Verificacao da configuracao
Write-DemoLog "ETAPA 2: Verificacao da Configuracao" "STEP"
Show-Progress "Verificando configuracao..." 25

if (Test-Path "genesis-automation-config.json") {
    Write-DemoLog "Arquivo de configuracao encontrado" "SUCCESS"
} else {
    Write-DemoLog "Arquivo de configuracao nao encontrado" "WARN"
}

# ETAPA 3: Execucao da compilacao (se necessario)
Write-DemoLog "ETAPA 3: Verificacao dos Arquivos Compilados" "STEP"
Show-Progress "Verificando arquivos compilados..." 50

if ((Test-Path $jsFile) -and (Test-Path $wasmFile)) {
    Write-DemoLog "Arquivos compilados ja existem" "SUCCESS"
    
    # Verificar tamanhos
    $jsSize = (Get-Item $jsFile).Length
    $wasmSize = (Get-Item $wasmFile).Length
    
    if ($jsSize -gt 10KB -and $wasmSize -gt 1MB) {
        Write-DemoLog "Tamanhos dos arquivos parecem corretos" "SUCCESS"
    } else {
        Write-DemoLog "Tamanhos dos arquivos parecem incorretos" "WARN"
    }
} else {
    Write-DemoLog "Arquivos compilados nao encontrados" "WARN"
    Write-DemoLog "Executando compilacao automatica..." "INFO"
    
    if (-not $SkipSetup) {
        try {
            & ".\scripts\build-genesis-universal.ps1" -Clean
            Write-DemoLog "Compilacao executada com sucesso" "SUCCESS"
        } catch {
            Write-DemoLog "Erro na compilacao: $($_.Exception.Message)" "ERROR"
        }
    }
}

# ETAPA 4: Validacao dos arquivos gerados
Write-DemoLog "ETAPA 4: Validacao dos Arquivos Gerados" "STEP"
Show-Progress "Validando arquivos..." 75

if (Test-Path $jsFile) {
    $jsSize = (Get-Item $jsFile).Length
    $jsSizeMB = [math]::Round($jsSize / 1MB, 2)
    Write-DemoLog "genesis_plus_gx.js: $jsSizeMB MB" "RESULT"
} else {
    Write-DemoLog "genesis_plus_gx.js: Nao encontrado" "ERROR"
}

if (Test-Path $wasmFile) {
    $wasmSize = (Get-Item $wasmFile).Length
    $wasmSizeMB = [math]::Round($wasmSize / 1MB, 2)
    Write-DemoLog "genesis_plus_gx.wasm: $wasmSizeMB MB" "RESULT"
} else {
    Write-DemoLog "genesis_plus_gx.wasm: Nao encontrado" "ERROR"
}

Write-Host ""

# ETAPA 5: Verificacao do servidor de desenvolvimento
Write-DemoLog "ETAPA 5: Verificacao do Servidor de Desenvolvimento" "STEP"
Show-Progress "Verificando servidor..." 90

# Verificar se o servidor esta rodando
$serverRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 5 -ErrorAction Stop
    $serverRunning = $true
    Write-DemoLog "Servidor de desenvolvimento esta rodando" "SUCCESS"
} catch {
    Write-DemoLog "Servidor de desenvolvimento nao esta rodando" "WARN"
    Write-DemoLog "Execute 'npm run dev' para iniciar o servidor" "INFO"
}

# ETAPA 6: Demonstracao do resultado
Write-DemoLog "ETAPA 6: Demonstracao do Resultado" "STEP"
Show-Progress "Finalizando demonstracao..." 100

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Green
Write-DemoLog "DEMONSTRACAO CONCLUIDA COM SUCESSO!" "SUCCESS"
Write-Host "===============================================================" -ForegroundColor Green
Write-Host ""

# Relatorio final
$endTime = Get-Date
$duration = $endTime - $startTime

Write-DemoLog "RELATORIO DA DEMONSTRACAO" "TITLE"
Write-DemoLog "Inicio: $($startTime.ToString('HH:mm:ss'))" "RESULT"
Write-DemoLog "Fim: $($endTime.ToString('HH:mm:ss'))" "RESULT"
Write-DemoLog "Duracao: $($duration.ToString('mm\:ss'))" "RESULT"
Write-Host ""

Write-DemoLog "ARQUIVOS GERADOS:" "TITLE"
if ((Test-Path $jsFile) -and (Test-Path $wasmFile)) {
    Write-DemoLog "Localizacao: public/emulators/" "RESULT"
    $jsSizeMB = [math]::Round((Get-Item $jsFile).Length / 1MB, 2)
    $wasmSizeMB = [math]::Round((Get-Item $wasmFile).Length / 1MB, 2)
    Write-DemoLog "genesis_plus_gx.js: $jsSizeMB MB" "RESULT"
    Write-DemoLog "genesis_plus_gx.wasm: $wasmSizeMB MB" "RESULT"
} else {
    Write-DemoLog "Alguns arquivos nao foram gerados corretamente" "ERROR"
}

Write-Host ""

# Abrir navegador se solicitado e servidor estiver rodando
if ($serverRunning -and $ShowBrowser) {
    Write-DemoLog "Abrindo pagina de teste no navegador..." "INFO"
    Start-Process "http://localhost:5173/test-genesis-emulator.html"
}

# Gerar relatorio JSON
$report = @{
    timestamp = $startTime.ToString('yyyy-MM-dd HH:mm:ss')
    duration = $duration.TotalSeconds
    success = (Test-Path $jsFile) -and (Test-Path $wasmFile)
    files = @{
        js = @{
            exists = Test-Path $jsFile
            size = if (Test-Path $jsFile) { (Get-Item $jsFile).Length } else { 0 }
        }
        wasm = @{
            exists = Test-Path $wasmFile
            size = if (Test-Path $wasmFile) { (Get-Item $wasmFile).Length } else { 0 }
        }
    }
    server_running = $serverRunning
    environment = @{
        scripts_available = $scriptsExist
        config_available = Test-Path "genesis-automation-config.json"
    }
}

$report | ConvertTo-Json -Depth 3 | Out-File "demo-report.json" -Encoding UTF8
Write-DemoLog "Relatorio salvo em: demo-report.json" "INFO"

if ($report.success) {
    Write-DemoLog "DEMONSTRACAO CONCLUIDA COM SUCESSO!" "SUCCESS"
    exit 0
} else {
    Write-DemoLog "DEMONSTRACAO COM PROBLEMAS" "ERROR"
    exit 1
}