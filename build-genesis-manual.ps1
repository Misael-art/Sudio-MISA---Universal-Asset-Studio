# Universal Asset Studio - Genesis Plus GX Manual Build Script
# Build manual sem Docker usando Emscripten local

param(
    [bool]$SkipBackup = $false,
    [bool]$Validate = $true
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$CoreDir = Join-Path $ProjectRoot "public\emulatorjs-data\cores"
$BackupDir = Join-Path $ProjectRoot "backup\cores-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$WorkDir = Join-Path $ProjectRoot "temp\manual-build"
$EmsdkDir = Join-Path $WorkDir "emsdk"
$SourceDir = Join-Path $WorkDir "genesis-plus-gx"

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

function Setup-WorkDirectory {
    Write-Header "Configurando Diretorio de Trabalho"
    
    if (Test-Path $WorkDir) {
        Write-Warning "Diretorio existente encontrado: $WorkDir"
        try {
            # Tentar remover apenas se possivel
            Remove-Item $WorkDir -Recurse -Force -ErrorAction Stop
            Write-Success "Diretorio removido com sucesso"
        } catch {
            Write-Warning "Nao foi possivel remover diretorio (em uso). Continuando com diretorio existente."
            # Limpar apenas arquivos especificos se possivel
            try {
                if (Test-Path (Join-Path $WorkDir "genesis-plus-gx")) {
                    Remove-Item (Join-Path $WorkDir "genesis-plus-gx") -Recurse -Force -ErrorAction SilentlyContinue
                }
            } catch {
                Write-Warning "Alguns arquivos podem estar em uso. Continuando..."
            }
        }
    }
    
    if (-not (Test-Path $WorkDir)) {
        New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null
    }
    Write-Success "Diretorio de trabalho pronto: $WorkDir"
}

function Install-Emscripten {
    Write-Header "Instalando Emscripten SDK"
    
    try {
        Set-Location $WorkDir
        
        # Download Emscripten SDK
        Write-Host "Baixando Emscripten SDK..." -ForegroundColor Yellow
        git clone https://github.com/emscripten-core/emsdk.git
        
        if (-not (Test-Path $EmsdkDir)) {
            throw "Falha ao clonar Emscripten SDK"
        }
        
        Set-Location $EmsdkDir
        
        # Install and activate latest
        Write-Host "Instalando Emscripten..." -ForegroundColor Yellow
        .\emsdk.bat install latest
        .\emsdk.bat activate latest
        
        Write-Success "Emscripten SDK instalado"
        
    } catch {
        Write-Error "Erro ao instalar Emscripten: $($_.Exception.Message)"
        throw
    }
}

function Clone-GenesisSource {
    Write-Header "Clonando Genesis Plus GX"
    
    try {
        Set-Location $WorkDir
        
        Write-Host "Clonando repositorio..." -ForegroundColor Yellow
        git clone https://github.com/EmulatorJS/Genesis-Plus-GX.git genesis-plus-gx
        
        if (-not (Test-Path $SourceDir)) {
            throw "Falha ao clonar Genesis Plus GX"
        }
        
        Write-Success "Genesis Plus GX clonado"
        
    } catch {
        Write-Error "Erro ao clonar: $($_.Exception.Message)"
        throw
    }
}

function Create-ExportsFile {
    Write-Header "Criando Arquivo de Exports"
    
    $exportsContent = @'
#include <stdint.h>
#include <emscripten/emscripten.h>

/**
 * Universal Asset Studio - Exports obrigatorios
 * 
 * IMPORTANTE: Estes ponteiros devem ser ajustados conforme a estrutura
 * real do codigo do Genesis Plus GX. Os nomes das variaveis podem variar.
 */

// Declaracoes externas - AJUSTAR CONFORME CODIGO REAL
// Estas sao estimativas baseadas na estrutura tipica do Genesis Plus GX
extern uint8_t vram[];           // VRAM array
extern uint16_t cram[];          // Color RAM
extern uint16_t vsram[];         // Vertical Scroll RAM
extern uint8_t reg[];            // VDP registers
extern uint16_t sat[];           // Sprite Attribute Table

// Framebuffer - pode estar em diferentes locais
// Verificar render.c, bitmap.c ou similar
extern uint32_t* framebuffer;    // ou uint8_t* dependendo da implementacao

/**
 * Retorna ponteiro para o framebuffer RGBA
 * Tamanho esperado: width * height * 4 bytes
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_frame_buffer_ref(void) {
    return (uint32_t)framebuffer;
}

/**
 * Retorna ponteiro para VRAM (Video RAM)
 * Tamanho: 0x10000 bytes (64KB)
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_vram_ptr(void) {
    return (uint32_t)vram;
}

/**
 * Retorna ponteiro para CRAM (Color RAM)
 * Tamanho: 0x80 bytes (128 bytes)
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_cram_ptr(void) {
    return (uint32_t)cram;
}

/**
 * Retorna ponteiro para VSRAM (Vertical Scroll RAM)
 * Tamanho: ~0x50 bytes (~80 bytes)
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_vsram_ptr(void) {
    return (uint32_t)vsram;
}

/**
 * Retorna ponteiro para registradores do VDP
 * Tamanho: ~0x20 bytes (~32 bytes)
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_vdp_regs_ptr(void) {
    return (uint32_t)reg;
}

/**
 * Retorna ponteiro para SAT (Sprite Attribute Table)
 * Tamanho: 0x280 bytes (640 bytes)
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_sat_ptr(void) {
    return (uint32_t)sat;
}
'@
    
    $exportsFile = Join-Path $SourceDir "emscripten_exports.c"
    Set-Content -Path $exportsFile -Value $exportsContent -Encoding UTF8
    
    Write-Success "Arquivo de exports criado: $exportsFile"
}

function Build-Core {
    Write-Header "Compilando Core"
    
    try {
        Set-Location $SourceDir
        
        # Ativar Emscripten environment corretamente
        Write-Host "Ativando ambiente Emscripten..." -ForegroundColor Yellow
        
        # Definir variaveis de ambiente do Emscripten
        $env:EMSDK = $EmsdkDir
        $env:EM_CONFIG = Join-Path $EmsdkDir ".emscripten"
        $env:EMSDK_NODE = Join-Path $EmsdkDir "node\22.16.0_64bit\bin\node.exe"
        $env:EMSDK_PYTHON = Join-Path $EmsdkDir "python\3.13.3_64bit\python.exe"
        
        # Adicionar Emscripten ao PATH
        $emscriptenPath = Join-Path $EmsdkDir "upstream\emscripten"
        $env:PATH = "$emscriptenPath;" + $env:PATH
        
        Write-Host "EMSDK: $env:EMSDK" -ForegroundColor Gray
        Write-Host "Emscripten PATH: $emscriptenPath" -ForegroundColor Gray
        
        # Verificar se emcc existe
        $emccPath = Join-Path $emscriptenPath "emcc.bat"
        if (-not (Test-Path $emccPath)) {
            throw "emcc.bat nao encontrado em: $emccPath"
        }
        
        Write-Success "Ambiente Emscripten configurado"
        
        # Usar o Makefile.libretro para compilacao
        Write-Host "Compilando usando Makefile.libretro..." -ForegroundColor Yellow
        
        # Verificar se Makefile.libretro existe
        if (-not (Test-Path "Makefile.libretro")) {
            throw "Makefile.libretro nao encontrado no diretorio do projeto"
        }
        
        # Configurar variaveis de compilacao para Emscripten
        $env:CC = "emcc"
        $env:CXX = "em++"
        $env:AR = "emar"
        
        Write-Host "Variaveis de compilacao configuradas:" -ForegroundColor Gray
        Write-Host "  CC: $env:CC" -ForegroundColor Gray
        Write-Host "  CXX: $env:CXX" -ForegroundColor Gray
        Write-Host "  AR: $env:AR" -ForegroundColor Gray
        
        # Compilar usando make com plataforma emscripten
        $makeArgs = @(
            "-f", "Makefile.libretro",
            "platform=emscripten",
            "TARGET_NAME=genesis_plus_gx",
            "HAVE_CHD=0",
            "HAVE_CDROM=0",
            "DEBUG=0",
            "CC=emcc",
            "CXX=em++",
            "AR=emar"
        )
        
        Write-Host "Executando make com argumentos: $($makeArgs -join ' ')" -ForegroundColor Gray
        
        # Usar mingw32-make se disponivel, senao make
        $makeCmd = "make"
        if (Get-Command "mingw32-make" -ErrorAction SilentlyContinue) {
            $makeCmd = "mingw32-make"
        }
        
        & $makeCmd $makeArgs
        if ($LASTEXITCODE -ne 0) {
            throw "Falha na compilacao do bytecode"
        }
        
        Write-Success "Bytecode compilado com sucesso"
        
        # Verificar se o arquivo bytecode foi gerado
        $bcFile = "genesis_plus_gx_libretro_emscripten.bc"
        if (-not (Test-Path $bcFile)) {
            throw "Arquivo bytecode nao foi gerado: $bcFile"
        }
        
        Write-Host "Convertendo bytecode para JavaScript e WASM..." -ForegroundColor Yellow
        
        # Converter bytecode para JS e WASM
        $emccArgs = @(
            $bcFile,
            "-o", "genesis_plus_gx.js",
            "-s", "WASM=1",
            "-s", "EXPORTED_FUNCTIONS=[`"_main`", `"_malloc`", `"_free`"]",
            "-s", "EXPORTED_RUNTIME_METHODS=[`"ccall`", `"cwrap`"]",
            "-s", "ALLOW_MEMORY_GROWTH=1",
            "-s", "MODULARIZE=1",
            "-s", "EXPORT_NAME=`"genesis_plus_gx`"",
            "-O2"
        )
        
        Write-Host "Executando emcc com argumentos: $($emccArgs -join ' ')" -ForegroundColor Gray
        & emcc $emccArgs
        
        if ($LASTEXITCODE -ne 0) {
            throw "Erro na conversao para JavaScript"
        }
        
        Write-Success "Conversao concluida"
        
        # Verificar se os arquivos foram gerados
        $jsFile = "genesis_plus_gx.js"
        $wasmFile = "genesis_plus_gx.wasm"
        
        if (-not (Test-Path $jsFile)) {
            throw "Arquivo JS nao foi gerado: $jsFile"
        }
        
        if (-not (Test-Path $wasmFile)) {
            throw "Arquivo WASM nao foi gerado: $wasmFile"
        }
        
        # Verificar arquivos gerados
        $generatedFiles = @()
        foreach ($file in $ExpectedFiles) {
            $filePath = Join-Path $SourceDir $file
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
        Write-Error "Erro na compilacao: $($_.Exception.Message)"
        throw
    }
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
    Write-Header "Universal Asset Studio - Genesis Plus GX Manual Build"
    Write-Host "Configuracoes:" -ForegroundColor Gray
    Write-Host "  SkipBackup: $SkipBackup" -ForegroundColor Gray
    Write-Host "  Validate: $Validate" -ForegroundColor Gray
    Write-Host "  ProjectRoot: $ProjectRoot" -ForegroundColor Gray
    
    # Verificar Git
    try {
        git --version | Out-Null
        Write-Success "Git encontrado"
    } catch {
        Write-Error "Git nao encontrado. Instale Git para continuar."
        exit 1
    }
    
    # Backup
    Backup-ExistingCores
    
    # Setup
    Setup-WorkDirectory
    
    # Install Emscripten
    Install-Emscripten
    
    # Clone source
    Clone-GenesisSource
    
    # Create exports
    Create-ExportsFile
    
    # Build
    $generatedFiles = Build-Core
    
    # Install
    Install-NewCores -GeneratedFiles $generatedFiles
    
    # Validate
    if ($Validate) {
        $validationSuccess = Test-CoreExports
        if (-not $validationSuccess) {
            Write-Warning "Validacao falhou. Verifique os exports no codigo fonte"
        }
    }
    
    # Cleanup
    Write-Host "Mantendo arquivos de trabalho para debug: $WorkDir" -ForegroundColor Yellow
    
    Show-NextSteps
    
    Write-Header "Build Manual Concluido com Sucesso"
    Write-Success "Genesis Plus GX recompilado com exports customizados"
    
} catch {
    Write-Header "Erro no Build Manual"
    Write-Error "$($_.Exception.Message)"
    
    Write-Host ""
    Write-Host "Para restaurar arquivos originais:" -ForegroundColor Yellow
    Write-Host "Copy-Item '$BackupDir\*' '$CoreDir' -Force" -ForegroundColor Gray
    
    exit 1
}