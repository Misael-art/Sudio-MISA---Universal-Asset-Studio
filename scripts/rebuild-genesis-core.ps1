# Script PowerShell para Recompilação do Core Genesis Plus GX
# Universal Asset Studio - Rebuild Automation

param(
    [switch]$UseDocker = $true,
    [switch]$Backup = $true,
    [string]$OutputDir = "./temp-build"
)

# Configurações
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$CoresDir = Join-Path $ProjectRoot "public\emulatorjs-data\cores"
$TempDir = Join-Path $ProjectRoot $OutputDir
$RepoUrl = "https://github.com/EmulatorJS/Genesis-Plus-GX.git"

Write-Host "=== Universal Asset Studio - Genesis Plus GX Core Rebuild ===" -ForegroundColor Cyan
Write-Host "Projeto: $ProjectRoot" -ForegroundColor Gray
Write-Host "Cores: $CoresDir" -ForegroundColor Gray
Write-Host "Temp: $TempDir" -ForegroundColor Gray
Write-Host ""

# Função para logging
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "WARN" { "Yellow" }
        "SUCCESS" { "Green" }
        default { "White" }
    }
    Write-Host "[$timestamp] $Message" -ForegroundColor $color
}

# Verificar se Docker está disponível
if ($UseDocker) {
    try {
        docker --version | Out-Null
        Write-Log "Docker detectado, usando containerização" "SUCCESS"
    }
    catch {
        Write-Log "Docker não encontrado, considere instalação local do Emscripten" "WARN"
        $UseDocker = $false
    }
}

# Criar diretório temporário
if (Test-Path $TempDir) {
    Write-Log "Removendo build anterior..."
    Remove-Item $TempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

# Backup dos arquivos atuais
if ($Backup) {
    $BackupDir = Join-Path $CoresDir "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Write-Log "Criando backup em: $BackupDir"
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    
    $filesToBackup = @("genesis_plus_gx.js", "genesis_plus_gx.wasm", "genesis_plus_gx.data")
    foreach ($file in $filesToBackup) {
        $sourcePath = Join-Path $CoresDir $file
        if (Test-Path $sourcePath) {
            Copy-Item $sourcePath $BackupDir
            Write-Log "Backup: $file"
        }
    }
}

# Clone do repositório
Write-Log "Clonando Genesis Plus GX..."
Set-Location $TempDir
git clone $RepoUrl genesis-plus-gx
if ($LASTEXITCODE -ne 0) {
    Write-Log "Erro ao clonar repositório" "ERROR"
    exit 1
}

Set-Location "genesis-plus-gx"

# Criar arquivo de exports
Write-Log "Criando arquivo de exports..."
$exportsCode = @'
#include <stdint.h>
#include <emscripten/emscripten.h>

// Incluir headers do Genesis Plus GX
// Nota: Ajustar paths conforme estrutura real do projeto
#include "vdp.h"

/**
 * Universal Asset Studio - Exports obrigatórios
 * Implementando ponteiros para regiões de memória do VDP
 */

// Declarações externas (ajustar conforme código real)
extern uint8_t vram[0x10000];     // VRAM - 64KB
extern uint16_t cram[0x40];       // CRAM - 128 bytes
extern uint16_t vsram[0x28];      // VSRAM - ~80 bytes  
extern uint8_t reg[0x20];         // VDP registers
extern uint16_t sat[0x140];       // SAT - 640 bytes
extern uint32_t* framebuffer;     // Framebuffer

EMSCRIPTEN_KEEPALIVE uint32_t _get_frame_buffer_ref(void) {
    return (uint32_t)framebuffer;
}

EMSCRIPTEN_KEEPALIVE uint32_t _get_vram_ptr(void) {
    return (uint32_t)vram;
}

EMSCRIPTEN_KEEPALIVE uint32_t _get_cram_ptr(void) {
    return (uint32_t)cram;
}

EMSCRIPTEN_KEEPALIVE uint32_t _get_vsram_ptr(void) {
    return (uint32_t)vsram;
}

EMSCRIPTEN_KEEPALIVE uint32_t _get_vdp_regs_ptr(void) {
    return (uint32_t)reg;
}

EMSCRIPTEN_KEEPALIVE uint32_t _get_sat_ptr(void) {
    return (uint32_t)sat;
}
'@

$exportsCode | Out-File -FilePath "emscripten_exports.c" -Encoding UTF8
Write-Log "Arquivo emscripten_exports.c criado"

# Criar script de build
$buildScript = @'
#!/bin/bash
set -e

echo "Building Genesis Plus GX with Universal Asset Studio exports..."

# Verificar se existe Makefile ou usar build manual
if [ -f "Makefile" ]; then
    echo "Usando Makefile existente..."
    make clean || true
fi

# Build com Emscripten
echo "Compilando com Emscripten..."
emcc -O3 \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME="Module" \
  -s EXPORTED_FUNCTIONS="[\"_main\",\"_get_frame_buffer_ref\",\"_get_vram_ptr\",\"_get_cram_ptr\",\"_get_vsram_ptr\",\"_get_vdp_regs_ptr\",\"_get_sat_ptr\"]" \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s INITIAL_MEMORY=16777216 \
  -s EXPORTED_RUNTIME_METHODS="[\"cwrap\",\"ccall\"]" \
  -I. \
  -o genesis_plus_gx.js \
  $(find . -name "*.c" -not -path "./build/*" | head -20)

echo "Build completed!"
echo "Generated files:"
ls -la genesis_plus_gx.*
'@

$buildScript | Out-File -FilePath "build_uas.sh" -Encoding UTF8

# Executar build
Write-Log "Iniciando compilação..."

if ($UseDocker) {
    Write-Log "Usando Docker para build..."
    $dockerCmd = "docker run --rm -v `"$(pwd):/src`" emscripten/emsdk:latest bash -c `"cd /src && chmod +x build_uas.sh && ./build_uas.sh`"
    Invoke-Expression $dockerCmd
} else {
    Write-Log "Executando build local (requer Emscripten instalado)..."
    bash build_uas.sh
}

if ($LASTEXITCODE -ne 0) {
    Write-Log "Erro durante compilação" "ERROR"
    exit 1
}

# Verificar arquivos gerados
$generatedFiles = @("genesis_plus_gx.js", "genesis_plus_gx.wasm")
$allFilesExist = $true

foreach ($file in $generatedFiles) {
    if (Test-Path $file) {
        $size = (Get-Item $file).Length
        Write-Log "Gerado: $file ($([math]::Round($size/1KB, 2)) KB)" "SUCCESS"
    } else {
        Write-Log "Arquivo não encontrado: $file" "ERROR"
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Log "Build incompleto, verifique erros acima" "ERROR"
    exit 1
}

# Copiar arquivos para o projeto
Write-Log "Copiando arquivos para o projeto..."
foreach ($file in $generatedFiles) {
    $destPath = Join-Path $CoresDir $file
    Copy-Item $file $destPath -Force
    Write-Log "Copiado: $file -> $destPath" "SUCCESS"
}

# Verificar se existe arquivo .data
if (Test-Path "genesis_plus_gx.data") {
    $dataFile = Join-Path $CoresDir "genesis_plus_gx.data"
    Copy-Item "genesis_plus_gx.data" $dataFile -Force
    Write-Log "Copiado: genesis_plus_gx.data" "SUCCESS"
}

# Limpeza
Set-Location $ProjectRoot
Write-Log "Limpando arquivos temporários..."
Remove-Item $TempDir -Recurse -Force

Write-Log "=== REBUILD CONCLUÍDO COM SUCESSO ===" "SUCCESS"
Write-Log ""
Write-Log "Próximos passos:"
Write-Log "1. Execute: npm run dev"
Write-Log "2. Carregue uma ROM do Mega Drive"
Write-Log "3. Abra a aba 'Analyzer'"
Write-Log "4. Verifique o CoreExportsPanel - todos devem estar 'OK'"
Write-Log "5. Confirme sizeOk: true para VRAM/CRAM/VSRAM/regs/SAT"
Write-Log ""
Write-Log "Se houver problemas, verifique o backup em: $CoresDir\backup_*"