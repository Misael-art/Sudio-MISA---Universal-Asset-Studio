# Universal Asset Studio - Genesis Plus GX Core Rebuild Script
# Script automatizado para recompilar o core Genesis Plus GX com exports customizados

param(
    [bool]$UseDocker = $true,
    [bool]$SkipBackup = $false,
    [bool]$Validate = $true
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$CoreDir = Join-Path $ProjectRoot "public\emulatorjs-data\cores"
$DockerDir = Join-Path $ProjectRoot "docker"
$BackupDir = Join-Path $ProjectRoot "backup\cores-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$TempDir = Join-Path $ProjectRoot "temp\genesis-build"

$ExpectedFiles = @(
    "genesis_plus_gx.js",
    "genesis_plus_gx.wasm"
)

$RequiredExports = @(
    "_get_frame_buffer_ref",
    "_get_vram_ptr",
    "_get_cram_ptr",
    "_get_vsram_ptr",
    "_get_vdp_regs_ptr",
    "_get_sat_ptr"
)

function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "=== $Title ===" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Test-Prerequisites {
    Write-Header "Verificando Pre-requisitos"
    
    if ($UseDocker) {
        try {
            $dockerVersion = docker --version 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Docker encontrado: $dockerVersion"
            } else {
                throw "Docker nao encontrado"
            }
        } catch {
            Write-Error "Docker nao esta disponivel. Instale Docker Desktop ou use -UseDocker false"
            return $false
        }
        
        try {
            docker info 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Docker esta rodando"
            } else {
                throw "Docker nao esta rodando"
            }
        } catch {
            Write-Error "Docker nao esta rodando. Inicie Docker Desktop"
            return $false
        }
    }
    
    if (-not (Test-Path $CoreDir)) {
        Write-Error "Diretorio de cores nao encontrado: $CoreDir"
        return $false
    }
    
    Write-Success "Estrutura do projeto verificada"
    return $true
}

function Backup-ExistingCores {
    if ($SkipBackup) {
        Write-Warning "Backup pulado conforme solicitado"
        return
    }
    
    Write-Header "Backup dos Cores Existentes"
    
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }
    
    $backedUpFiles = 0
    Get-ChildItem -Path $CoreDir -Filter "genesis*" | ForEach-Object {
        $destPath = Join-Path $BackupDir $_.Name
        Copy-Item $_.FullName $destPath -Force
        Write-Success "Backup: $($_.Name)"
        $backedUpFiles++
    }
    
    if ($backedUpFiles -gt 0) {
        Write-Success "$backedUpFiles arquivos salvos em: $BackupDir"
    } else {
        Write-Warning "Nenhum arquivo Genesis encontrado para backup"
    }
}

function Build-WithDocker {
    Write-Header "Build com Docker"
    
    if (Test-Path $TempDir) {
        Remove-Item $TempDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
    
    try {
        Write-Host "Construindo imagem Docker..." -ForegroundColor Yellow
        $dockerBuildCmd = "docker build -t genesis-build -f `"$DockerDir\Dockerfile.genesis-build`" `"$DockerDir`""
        Write-Host "Executando: $dockerBuildCmd" -ForegroundColor Gray
        
        Invoke-Expression $dockerBuildCmd
        if ($LASTEXITCODE -ne 0) {
            throw "Falha na construcao da imagem Docker"
        }
        Write-Success "Imagem Docker construida"
        
        Write-Host "Executando build do core..." -ForegroundColor Yellow
        $dockerRunCmd = "docker run --rm -v `"$TempDir`:/output genesis-build"
        Write-Host "Executando: $dockerRunCmd" -ForegroundColor Gray
        
        Invoke-Expression $dockerRunCmd
        if ($LASTEXITCODE -ne 0) {
            throw "Falha no build do core"
        }
        
        $generatedFiles = @()
        foreach ($file in $ExpectedFiles) {
            $filePath = Join-Path $TempDir $file
            if (Test-Path $filePath) {
                $fileSize = (Get-Item $filePath).Length
                $fileSizeKB = [math]::Round($fileSize / 1024, 1)
                Write-Success "Gerado: $file ($fileSizeKB KB)"
                $generatedFiles += $filePath
            } else {
                Write-Error "Arquivo nao gerado: $file"
            }
        }
        
        if ($generatedFiles.Count -eq 0) {
            throw "Nenhum arquivo foi gerado com sucesso"
        }
        
        return $generatedFiles
        
    } catch {
        Write-Error "Erro no build Docker: $($_.Exception.Message)"
        throw
    }
}

function Build-Local {
    Write-Header "Build Local (Nao Implementado)"
    Write-Error "Build local nao implementado. Use Docker (-UseDocker true) ou implemente build local"
    Write-Host "Para implementar build local, voce precisara:" -ForegroundColor Yellow
    Write-Host "1. Instalar Emscripten SDK" -ForegroundColor Yellow
    Write-Host "2. Clonar Genesis Plus GX" -ForegroundColor Yellow
    Write-Host "3. Adicionar exports customizados" -ForegroundColor Yellow
    Write-Host "4. Compilar com emcc" -ForegroundColor Yellow
    throw "Build local nao disponivel"
}

function Install-NewCores {
    param([string[]]$GeneratedFiles)
    
    Write-Header "Instalando Novos Cores"
    
    $installedFiles = 0
    foreach ($sourceFile in $GeneratedFiles) {
        $fileName = Split-Path $sourceFile -Leaf
        $destPath = Join-Path $CoreDir $fileName
        
        try {
            Copy-Item $sourceFile $destPath -Force
            $fileSize = (Get-Item $destPath).Length
            $fileSizeKB = [math]::Round($fileSize / 1024, 1)
            Write-Success "Instalado: $fileName ($fileSizeKB KB)"
            $installedFiles++
        } catch {
            Write-Error "Falha ao instalar $fileName : $($_.Exception.Message)"
        }
    }
    
    if ($installedFiles -eq $GeneratedFiles.Count) {
        Write-Success "Todos os $installedFiles arquivos instalados com sucesso"
    } else {
        Write-Warning "$installedFiles de $($GeneratedFiles.Count) arquivos instalados"
    }
}

function Test-CoreExports {
    Write-Header "Validacao dos Exports"
    
    $jsFile = Join-Path $CoreDir "genesis_plus_gx.js"
    if (-not (Test-Path $jsFile)) {
        Write-Error "Arquivo JS nao encontrado: $jsFile"
        return $false
    }
    
    $jsContent = Get-Content $jsFile -Raw
    $foundExports = @()
    $missingExports = @()
    
    foreach ($export in $RequiredExports) {
        if ($jsContent -match [regex]::Escape($export)) {
            Write-Success "Export encontrado: $export"
            $foundExports += $export
        } else {
            Write-Error "Export ausente: $export"
            $missingExports += $export
        }
    }
    
    Write-Host ""
    Write-Host "Resumo da Validacao:" -ForegroundColor Cyan
    if ($foundExports.Count -eq $RequiredExports.Count) {
        Write-Host "  Exports encontrados: $($foundExports.Count)/$($RequiredExports.Count)" -ForegroundColor Green
    } else {
        Write-Host "  Exports encontrados: $($foundExports.Count)/$($RequiredExports.Count)" -ForegroundColor Yellow
    }
    
    if ($missingExports.Count -gt 0) {
        Write-Host "  Exports ausentes: $($missingExports -join ', ')" -ForegroundColor Red
        return $false
    }
    
    return $true
}

function Show-NextSteps {
    Write-Header "Proximos Passos"
    
    Write-Host "1. Abra o Universal Asset Studio" -ForegroundColor Yellow
    Write-Host "2. Carregue uma ROM do Mega Drive" -ForegroundColor Yellow
    Write-Host "3. Abra o Analyzer" -ForegroundColor Yellow
    Write-Host "4. Verifique o CoreExportsPanel:" -ForegroundColor Yellow
    Write-Host "   - Todos os exports devem mostrar 'OK'" -ForegroundColor Green
    Write-Host "   - sizeOk deve ser 'true' para VRAM/CRAM/VSRAM/regs/SAT" -ForegroundColor Green
    Write-Host "5. Se tudo estiver OK, ative leitura 100% real no adapter MD" -ForegroundColor Yellow
    Write-Host "6. Persiga diff menor que 5% no Analyzer" -ForegroundColor Yellow
    
    Write-Host ""
    Write-Host "Arquivos de backup em: $BackupDir" -ForegroundColor Cyan
    Write-Host "Em caso de problemas, restaure os arquivos originais" -ForegroundColor Cyan
}

# === EXECUCAO PRINCIPAL ===

try {
    Write-Header "Universal Asset Studio - Genesis Plus GX Core Rebuild"
    Write-Host "Configuracoes:" -ForegroundColor Gray
    Write-Host "  UseDocker: $UseDocker" -ForegroundColor Gray
    Write-Host "  SkipBackup: $SkipBackup" -ForegroundColor Gray
    Write-Host "  Validate: $Validate" -ForegroundColor Gray
    Write-Host "  ProjectRoot: $ProjectRoot" -ForegroundColor Gray
    
    if (-not (Test-Prerequisites)) {
        exit 1
    }
    
    Backup-ExistingCores
    
    $generatedFiles = if ($UseDocker) {
        Build-WithDocker
    } else {
        Build-Local
    }
    
    Install-NewCores -GeneratedFiles $generatedFiles
    
    if ($Validate) {
        $validationSuccess = Test-CoreExports
        if (-not $validationSuccess) {
            Write-Warning "Validacao falhou. Verifique os exports no codigo fonte"
        }
    }
    
    if (Test-Path $TempDir) {
        Remove-Item $TempDir -Recurse -Force
        Write-Success "Arquivos temporarios removidos"
    }
    
    Show-NextSteps
    
    Write-Header "Build Concluido com Sucesso"
    Write-Success "Genesis Plus GX recompilado com exports customizados"
    
} catch {
    Write-Header "Erro no Build"
    Write-Error "$($_.Exception.Message)"
    
    if (Test-Path $TempDir) {
        Write-Host "Arquivos temporarios mantidos para debug: $TempDir" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Para restaurar arquivos originais:" -ForegroundColor Yellow
    Write-Host "Copy-Item '$BackupDir\*' '$CoreDir' -Force" -ForegroundColor Gray
    
    exit 1
}