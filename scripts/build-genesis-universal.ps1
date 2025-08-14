#!/usr/bin/env pwsh
# Script Automatizado para Compilação do Core Genesis Plus GX Universal
# Autor: Universal Asset Studio Team
# Data: $(Get-Date -Format 'yyyy-MM-dd')
# Versão: 1.0

<#
.SYNOPSIS
    Compila o core Genesis Plus GX com exportações de memória para o Universal Asset Studio

.DESCRIPTION
    Este script automatiza todo o processo de compilação do core Genesis Plus GX,
    incluindo configuração do ambiente Emscripten, aplicação de patches e geração
    do arquivo JavaScript/WASM final com as funções de exportação necessárias.

.PARAMETER Clean
    Remove arquivos de compilação anteriores antes de iniciar

.PARAMETER SkipClone
    Pula o clone do repositório se já existir

.PARAMETER OutputDir
    Diretório de saída para o core compilado (padrão: public/emulators)

.EXAMPLE
    .\build-genesis-universal.ps1 -Clean
    Compila o core com limpeza prévia

.EXAMPLE
    .\build-genesis-universal.ps1 -SkipClone -OutputDir "dist/cores"
    Compila sem clonar novamente, salvando em diretório customizado
#>

param(
    [switch]$Clean,
    [switch]$SkipClone,
    [string]$OutputDir = "public/emulators"
)

# Configurações
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Caminhos
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$TempDir = Join-Path $ProjectRoot "temp\manual-build"
$SourceDir = Join-Path $TempDir "genesis-plus-gx-source"
$EmsdkDir = Join-Path $TempDir "emsdk"
$OutputPath = if ($OutputDir -match '^[A-Za-z]:') { $OutputDir } else { Join-Path $ProjectRoot $OutputDir }

# Cores e configurações
$RepoUrl = "https://github.com/ekeeke/Genesis-Plus-GX.git"
$CoreName = "genesis_plus_gx_universal"
$ExportsFile = "emscripten_exports.c"

# Funções auxiliares
function Write-Status {
    param([string]$Message, [string]$Color = "Green")
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $Color
}

function Write-Error-Status {
    param([string]$Message)
    Write-Status $Message "Red"
}

function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Invoke-SafeCommand {
    param(
        [string]$Command,
        [string]$WorkingDirectory = $PWD,
        [string]$ErrorMessage = "Comando falhou"
    )
    
    Write-Status "Executando: $Command"
    try {
        Push-Location $WorkingDirectory
        Invoke-Expression $Command
        if ($LASTEXITCODE -ne 0) {
            throw "Código de saída: $LASTEXITCODE"
        }
    } catch {
        Write-Error-Status "$ErrorMessage : $_"
        throw
    } finally {
        Pop-Location
    }
}

# Início do script
Write-Status "=== Iniciando Compilação do Core Genesis Plus GX Universal ===" "Cyan"

# 1. Verificação de pré-requisitos
Write-Status "Verificando pré-requisitos..."

if (-not (Test-Command "git")) {
    Write-Error-Status "Git não encontrado. Instale o Git e tente novamente."
    exit 1
}

if (-not (Test-Command "make")) {
    Write-Error-Status "Make não encontrado. Instale o MSYS2/MinGW e tente novamente."
    exit 1
}

# 2. Limpeza (se solicitada)
if ($Clean) {
    Write-Status "Limpando arquivos anteriores..." "Yellow"
    
    # Remove arquivos de teste redundantes
    $TestFiles = @(
        "test_core.html",
        "test_core_simple.html", 
        "test_simple_core.html",
        "test_working_core.html"
    )
    
    foreach ($file in $TestFiles) {
        $filePath = Join-Path $ProjectRoot $file
        if (Test-Path $filePath) {
            Remove-Item $filePath -Force
            Write-Status "Removido: $file"
        }
    }
    
    # Remove cores antigos (mantém apenas o universal)
    $OldCores = @(
        "genesis_plus_gx.js",
        "genesis_plus_gx.wasm",
        "genesis_plus_gx_working.js",
        "genesis_plus_gx_working.wasm",
        "genesis_plus_gx_universal.bc"
    )
    
    foreach ($core in $OldCores) {
        $corePath = Join-Path $OutputPath $core
        if (Test-Path $corePath) {
            Remove-Item $corePath -Force
            Write-Status "Removido core antigo: $core"
        }
    }
    
    # Limpa diretório de build temporário
    if (Test-Path $TempDir) {
        Remove-Item $TempDir -Recurse -Force
        Write-Status "Diretório temporário limpo"
    }
}

# 3. Preparação do ambiente
Write-Status "Preparando ambiente de compilação..."

# Cria diretórios necessários
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null

# 4. Configuração do Emscripten
Write-Status "Configurando Emscripten..."

if (-not (Test-Path $EmsdkDir) -or $Clean) {
    Write-Status "Clonando Emscripten SDK..."
    Invoke-SafeCommand "git clone https://github.com/emscripten-core/emsdk.git emsdk" $TempDir "Falha ao clonar Emscripten"
}

# Ativa Emscripten
Invoke-SafeCommand ".\emsdk.ps1 install latest" $EmsdkDir "Falha ao instalar Emscripten"
Invoke-SafeCommand ".\emsdk.ps1 activate latest" $EmsdkDir "Falha ao ativar Emscripten"

# Carrega variáveis de ambiente
$EmscriptenEnv = Join-Path $EmsdkDir "emsdk_env.ps1"
if (Test-Path $EmscriptenEnv) {
    & $EmscriptenEnv
} else {
    Write-Error-Status "Arquivo de ambiente do Emscripten não encontrado"
    exit 1
}

# 5. Clone do código fonte
if (-not $SkipClone -or -not (Test-Path $SourceDir)) {
    Write-Status "Clonando Genesis Plus GX..."
    
    if (Test-Path $SourceDir) {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Removendo diretório existente..." -ForegroundColor Yellow
        try {
            # Tentar remover normalmente primeiro
            Remove-Item $SourceDir -Recurse -Force -ErrorAction Stop
        } catch {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Falha na remoção normal, tentando com robocopy..." -ForegroundColor Yellow
            # Criar diretório temporário vazio
            $EmptyDir = Join-Path $env:TEMP "empty_$(Get-Random)"
            New-Item -ItemType Directory -Path $EmptyDir -Force | Out-Null
            # Usar robocopy para "limpar" o diretório
            robocopy $EmptyDir $SourceDir /MIR /R:0 /W:0 | Out-Null
            Remove-Item $EmptyDir -Force
            Remove-Item $SourceDir -Force
        }
    }
    
    Invoke-SafeCommand "git clone $RepoUrl genesis-plus-gx-source" $TempDir "Falha ao clonar Genesis Plus GX"
}

# 6. Criação do arquivo de exportações
Write-Status "Criando arquivo de exportações..."

$ExportsContent = @'
#include <emscripten.h>
#include <stdint.h>

// Declarações externas das variáveis de memória do Genesis Plus GX
extern uint8_t vram[0x10000];     // Video RAM
extern uint16_t cram[0x40];       // Color RAM  
extern uint16_t vsram[0x40];      // Vertical Scroll RAM
extern uint8_t reg[0x20];         // VDP Registers
extern uint16_t sat[0x140];       // Sprite Attribute Table
extern uint32_t *bitmap;          // Framebuffer

/**
 * Função para obter referência do framebuffer
 * @return Ponteiro para o framebuffer RGB565
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_frame_buffer_ref(void) {
    return (uint32_t)bitmap;
}

/**
 * Função para obter ponteiro da VRAM
 * @return Ponteiro para Video RAM (65536 bytes)
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_vram_ptr(void) {
    return (uint32_t)vram;
}

/**
 * Função para obter ponteiro da CRAM
 * @return Ponteiro para Color RAM (128 bytes)
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_cram_ptr(void) {
    return (uint32_t)cram;
}

/**
 * Função para obter ponteiro da VSRAM
 * @return Ponteiro para Vertical Scroll RAM (80 bytes)
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_vsram_ptr(void) {
    return (uint32_t)vsram;
}

/**
 * Função para obter ponteiro dos registradores VDP
 * @return Ponteiro para registradores VDP (32 bytes)
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_vdp_regs_ptr(void) {
    return (uint32_t)reg;
}

/**
 * Função para obter ponteiro da SAT
 * @return Ponteiro para Sprite Attribute Table (640 bytes)
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_sat_ptr(void) {
    return (uint32_t)sat;
}
'@

$ExportsPath = Join-Path $SourceDir $ExportsFile
Set-Content -Path $ExportsPath -Value $ExportsContent -Encoding UTF8
Write-Status "Arquivo de exportações criado: $ExportsFile"

# 7. Modificação dos Makefiles
Write-Status "Aplicando patches nos Makefiles..."

# Patch no Makefile.common
$MakefileCommon = Join-Path $SourceDir "libretro\Makefile.common"
$commonContent = Get-Content $MakefileCommon -Raw

if ($commonContent -notmatch "emscripten_exports.c") {
    $patchedContent = $commonContent -replace 
        '(SOURCES_C \+= \$\(GENPLUS_SRC_DIR\)/core/sound/blip_buf.c)',
        '$1`nifeq ($(platform), emscripten)`n   SOURCES_C += emscripten_exports.c`nendif'
    
    Set-Content -Path $MakefileCommon -Value $patchedContent -Encoding UTF8
    Write-Status "Makefile.common atualizado"
}

# Patch no Makefile.libretro
$MakefileLibretro = Join-Path $SourceDir "Makefile.libretro"
$libretroContent = Get-Content $MakefileLibretro -Raw

# Atualiza seção Emscripten
$emscriptenSection = @'
ifeq ($(platform), emscripten)
   TARGET := $(TARGET_NAME)_libretro_emscripten.js
   CC = emcc
   CXX = em++
   AR = emar
   STATIC_LINKING = 1
   LDFLAGS += -s WASM=1 -s MODULARIZE=1 -s EXPORT_NAME="Module" \
              -s EXPORTED_FUNCTIONS="[\"_malloc\",\"_free\",\"_get_frame_buffer_ref\",\"_get_vram_ptr\",\"_get_cram_ptr\",\"_get_vsram_ptr\",\"_get_vdp_regs_ptr\",\"_get_sat_ptr\"]" \
              -s EXPORTED_RUNTIME_METHODS="[\"ccall\",\"cwrap\",\"getValue\",\"setValue\",\"HEAPU8\",\"HEAPU16\",\"HEAPU32\"]" \
              -s ALLOW_MEMORY_GROWTH=1
   CFLAGS += -DHAVE_STDINT_H -DLSB_FIRST -DALIGN_LONG
   CXXFLAGS += -DHAVE_STDINT_H -DLSB_FIRST -DALIGN_LONG
'@

$updatedContent = $libretroContent -replace 
    'ifeq \(\$\(platform\), emscripten\)[\s\S]*?endif',
    "$emscriptenSection`nendif"

Set-Content -Path $MakefileLibretro -Value $updatedContent -Encoding UTF8
Write-Status "Makefile.libretro atualizado"

# 8. Compilação
Write-Status "Iniciando compilação..." "Yellow"

$CompileCommand = "emmake make -f Makefile.libretro platform=emscripten TARGET_NAME=$CoreName HAVE_CHD=0 HAVE_CDROM=0 DEBUG=0"
Invoke-SafeCommand $CompileCommand $SourceDir "Falha na compilação"

# 9. Cópia do resultado
Write-Status "Copiando arquivos compilados..."

$CompiledJs = Join-Path $SourceDir "${CoreName}_libretro_emscripten.js"
$CompiledWasm = Join-Path $SourceDir "${CoreName}_libretro_emscripten.wasm"

if (Test-Path $CompiledJs) {
    Copy-Item $CompiledJs (Join-Path $OutputPath "${CoreName}.js") -Force
    Write-Status "Copiado: ${CoreName}.js"
} else {
    Write-Error-Status "Arquivo JS não encontrado: $CompiledJs"
    exit 1
}

if (Test-Path $CompiledWasm) {
    Copy-Item $CompiledWasm (Join-Path $OutputPath "${CoreName}.wasm") -Force
    Write-Status "Copiado: ${CoreName}.wasm"
}

# 10. Validação
Write-Status "Validando compilação..."

$FinalJs = Join-Path $OutputPath "${CoreName}.js"
$FinalWasm = Join-Path $OutputPath "${CoreName}.wasm"

if (Test-Path $FinalJs) {
    $jsSize = (Get-Item $FinalJs).Length
    Write-Status "✅ Core JS: ${CoreName}.js ($([math]::Round($jsSize/1MB, 1)) MB)"
} else {
    Write-Error-Status "❌ Arquivo JS final não encontrado"
    exit 1
}

if (Test-Path $FinalWasm) {
    $wasmSize = (Get-Item $FinalWasm).Length
    Write-Status "✅ Core WASM: ${CoreName}.wasm ($([math]::Round($wasmSize/1MB, 1)) MB)"
}

# 11. Atualização da documentação
Write-Status "Atualizando documentação..."

$DocPath = Join-Path $ProjectRoot ".trae\documents\genesis-plus-gx-rebuild-plan.md"
if (Test-Path $DocPath) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $updateNote = "`n`n---`n**✅ ÚLTIMA COMPILAÇÃO AUTOMATIZADA**`n*Data: $timestamp*`n*Script: build-genesis-universal.ps1*`n*Core: ${CoreName}.js*`n"
    Add-Content -Path $DocPath -Value $updateNote
    Write-Status "Documentação atualizada"
}

# 12. Conclusão
Write-Status "=== Compilação Concluída com Sucesso! ===" "Green"
Write-Status "Core disponível em: $OutputPath" "Cyan"
Write-Status "Próximo passo: Execute test_universal_core.html para validar as exportações" "Yellow"

# Exibe resumo
Write-Host "`n📋 RESUMO DA COMPILAÇÃO" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ Core: ${CoreName}.js" -ForegroundColor Green
Write-Host "✅ Exportações: 6 funções de memória" -ForegroundColor Green
Write-Host "✅ Localização: $OutputPath" -ForegroundColor Green
Write-Host "🧪 Teste: test_universal_core.html" -ForegroundColor Yellow
Write-Host '📚 Docs: .trae\documents\genesis-plus-gx-rebuild-plan.md' -ForegroundColor Blue