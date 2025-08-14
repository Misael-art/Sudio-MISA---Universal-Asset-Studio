<#
.SYNOPSIS
    Script completo para compilação do Genesis Plus GX com Emscripten e funções de exportação para extração de sprites

.DESCRIPTION
    Este script automatiza todo o processo de:
    1. Verificação e instalação do Git
    2. Download e configuração do Emscripten SDK
    3. Clonagem do Genesis Plus GX
    4. Criação das funções de exportação necessárias
    5. Modificação do Makefile
    6. Compilação completa do core
    7. Verificação das funções exportadas

.PARAMETER Clean
    Remove diretórios temporários antes de iniciar

.PARAMETER Verbose
    Exibe informações detalhadas durante a execução

.PARAMETER OutputDir
    Diretório onde os arquivos finais serão copiados (padrão: ./output)

.EXAMPLE
    .\compile-genesis-with-exports.ps1 -Clean -Verbose
    .\compile-genesis-with-exports.ps1 -OutputDir "C:\MyProject\cores"
#>

param(
    [switch]$Clean,
    [switch]$Verbose,
    [string]$OutputDir = "./output"
)

# Configurações globais
$ErrorActionPreference = "Stop"
$ProgressPreference = "Continue"

# Caminhos e URLs (usar caminhos absolutos para evitar duplicações ao trocar de diretório)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
$TempDir = Join-Path $ProjectRoot "temp"
$BuildDir = Join-Path $TempDir "genesis-build"
$EmsdkDir = Join-Path $BuildDir "emsdk"
$GenesisDir = Join-Path $BuildDir "genesis-plus-gx"
$EmsdkUrl = "https://github.com/emscripten-core/emsdk.git"
$GenesisUrl = "https://github.com/libretro/Genesis-Plus-GX.git"

# Função para logging com timestamp
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "WARN" { "Yellow" }
        "SUCCESS" { "Green" }
        default { "White" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
    if ($Verbose) {
        Write-Host ""
    }
}

# Função para verificar se um comando existe
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

# Função para executar comando com verificação de erro
function Invoke-SafeCommand {
    param(
        [string]$Command,
        [string]$Arguments = "",
        [string]$WorkingDirectory = $null,
        [string]$Description = "Executando comando",
        [int]$TimeoutMinutes = 30
    )
    
    Write-Log "$Description..." "INFO"
    if ($Verbose) {
        Write-Log "Comando: $Command $Arguments" "INFO"
    }
    
    try {
        $processInfo = New-Object System.Diagnostics.ProcessStartInfo
        $processInfo.FileName = $Command
        $processInfo.Arguments = $Arguments
        $processInfo.UseShellExecute = $false
        $processInfo.RedirectStandardOutput = $true
        $processInfo.RedirectStandardError = $true
        $processInfo.CreateNoWindow = $true
        
        if ($WorkingDirectory) {
            $processInfo.WorkingDirectory = $WorkingDirectory
        }
        
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $processInfo
        $process.Start() | Out-Null
        
        # Implementa timeout para evitar travamentos
        $timeoutMs = $TimeoutMinutes * 60 * 1000
        $completed = $process.WaitForExit($timeoutMs)
        
        if (-not $completed) {
            Write-Log "Comando excedeu timeout de $TimeoutMinutes minutos" "ERROR"
            try {
                $process.Kill()
                $process.WaitForExit(5000) # Aguarda 5s para finalizar
            } catch {
                Write-Log "Erro ao finalizar processo: $($_.Exception.Message)" "WARN"
            }
            throw "Comando excedeu timeout de $TimeoutMinutes minutos"
        }
        
        $stdout = $process.StandardOutput.ReadToEnd()
        $stderr = $process.StandardError.ReadToEnd()
        
        if ($process.ExitCode -ne 0) {
            Write-Log "Comando falhou com código $($process.ExitCode)" "ERROR"
            if ($stderr) {
                Write-Log "Erro: $stderr" "ERROR"
            }
            throw "Falha na execução do comando"
        }
        
        if ($Verbose -and $stdout) {
            Write-Log "Saída: $stdout" "INFO"
        }
        
        return $stdout
    } catch {
        Write-Log "Erro ao executar comando: $($_.Exception.Message)" "ERROR"
        throw
    } finally {
        if ($process -and -not $process.HasExited) {
            try {
                $process.Kill()
            } catch {}
        }
        if ($process) {
            $process.Dispose()
        }
    }
}

# Função para verificar e instalar Git
function Install-Git {
    Write-Log "Verificando instalação do Git..." "INFO"
    
    if (Test-Command "git") {
        $gitVersion = git --version
        Write-Log "Git já está instalado: $gitVersion" "SUCCESS"
        return
    }
    
    Write-Log "Git não encontrado. Iniciando instalação..." "WARN"
    
    # Verifica se o winget está disponível
    if (Test-Command "winget") {
        Write-Log "Instalando Git via winget..." "INFO"
        try {
            Invoke-SafeCommand "winget" "install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements" -Description "Instalando Git"
            Write-Log "Git instalado com sucesso via winget" "SUCCESS"
            
            # Atualiza o PATH
            $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
            
            # Verifica se a instalação foi bem-sucedida
            if (-not (Test-Command "git")) {
                throw "Git não foi encontrado após a instalação"
            }
            return
        } catch {
            Write-Log "Falha na instalação via winget: $($_.Exception.Message)" "WARN"
        }
    }
    
    # Fallback: download manual
    Write-Log "Tentando download manual do Git..." "INFO"
    $gitInstallerUrl = "https://github.com/git-for-windows/git/releases/latest/download/Git-2.43.0-64-bit.exe"
    $gitInstallerPath = "$env:TEMP\git-installer.exe"
    
    try {
        Write-Log "Baixando instalador do Git..." "INFO"
        Invoke-WebRequest -Uri $gitInstallerUrl -OutFile $gitInstallerPath -UseBasicParsing
        
        Write-Log "Executando instalador do Git..." "INFO"
        Start-Process -FilePath $gitInstallerPath -ArgumentList "/VERYSILENT", "/NORESTART" -Wait
        
        # Atualiza o PATH
        $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
        
        # Verifica se a instalação foi bem-sucedida
        if (Test-Command "git") {
            Write-Log "Git instalado com sucesso" "SUCCESS"
        } else {
            throw "Git não foi encontrado após a instalação"
        }
    } catch {
        Write-Log "Falha na instalação manual do Git: $($_.Exception.Message)" "ERROR"
        Write-Log "Por favor, instale o Git manualmente de https://git-scm.com/download/win" "ERROR"
        throw "Instalação do Git falhou"
    } finally {
        if (Test-Path $gitInstallerPath) {
            Remove-Item $gitInstallerPath -Force
        }
    }
}

# Função para configurar Emscripten SDK
function Install-EmscriptenSDK {
    Write-Log "Configurando Emscripten SDK..." "INFO"

    New-Item -ItemType Directory -Path $BuildDir -Force | Out-Null

    if (Test-Path $EmsdkDir) {
        Write-Log "Diretório Emscripten já existe, tentando atualizar..." "INFO"
        Push-Location $EmsdkDir
        try {
            if (Test-Path (Join-Path $EmsdkDir ".git")) {
                Invoke-SafeCommand "git" "pull" -Description "Atualizando emsdk existente"
            } else {
                Write-Log "Diretório emsdk sem repositório Git. Recriando..." "WARN"
                Pop-Location
                Remove-Item $EmsdkDir -Recurse -Force -ErrorAction SilentlyContinue
                Invoke-SafeCommand "git" "clone $EmsdkUrl" -WorkingDirectory $BuildDir -Description "Clonando Emscripten SDK" -TimeoutMinutes 15
                Push-Location $EmsdkDir
            }
        } finally {}
    } else {
        Write-Log "Clonando Emscripten SDK..." "INFO"
        Invoke-SafeCommand "git" "clone $EmsdkUrl" -WorkingDirectory $BuildDir -Description "Clonando Emscripten SDK"
        Push-Location $EmsdkDir
    }

    try {
        Write-Log "Instalando e ativando Emscripten..." "INFO"
        Invoke-SafeCommand "cmd" "/c .\emsdk.bat install latest" -WorkingDirectory $EmsdkDir -Description "Instalando Emscripten latest"
        Invoke-SafeCommand "cmd" "/c .\emsdk.bat activate latest" -WorkingDirectory $EmsdkDir -Description "Ativando Emscripten latest"
        Write-Log "Emscripten SDK instalado/atualizado com sucesso" "SUCCESS"
    } finally {
        Pop-Location
    }
}

# Função para configurar ambiente Emscripten
function Set-EmscriptenEnvironment {
    Write-Log "Configurando ambiente Emscripten..." "INFO"
    
    $emsdkEnvPath = Join-Path $EmsdkDir "emsdk_env.bat"
    if (-not (Test-Path $emsdkEnvPath)) {
        throw "Arquivo emsdk_env.bat não encontrado em $EmsdkDir"
    }
    
    # Executa o script de ambiente e captura TODAS as variáveis com `set`
    $envScript = @"
@echo off
call "$emsdkEnvPath" >nul 2>&1
set
"@
    
    $tempBat = "$env:TEMP\setup_emsdk.bat"
    $envScript | Out-File -FilePath $tempBat -Encoding ASCII
    
    try {
        $envOutput = & cmd /c $tempBat
        foreach ($line in $envOutput) {
            if ($line -match "^(\w+)=(.*)$") {
                $varName = $matches[1]
                $varValue = $matches[2]
                try { Set-Item -Path "env:$varName" -Value $varValue } catch {}
            }
        }
        
        # Injetar Python do emsdk no PATH (algumas versões exigem)
        try {
            $pyRoot = Join-Path $EmsdkDir "python"
            if (Test-Path $pyRoot) {
                $pyDirs = Get-ChildItem -Path $pyRoot -Directory | Sort-Object Name -Descending
                $firstPy = $pyDirs | Select-Object -First 1
                if ($firstPy) {
                    $pyPath = $firstPy.FullName
                    $pyScripts = Join-Path $pyPath "Scripts"
                    $currentPath = [System.Environment]::GetEnvironmentVariable('PATH', 'Process')
                    if ($currentPath -notlike "*${pyPath}*") { $currentPath = "$currentPath;$pyPath" }
                    if (Test-Path $pyScripts -and $currentPath -notlike "*${pyScripts}*") { $currentPath = "$currentPath;$pyScripts" }
                    Set-Item -Path env:PATH -Value $currentPath
                }
            }
        } catch {}
        
        # Validar emcc via cmd (evitar wrapper PowerShell que usa py.exe)
        $validated = $false
        try {
            Invoke-SafeCommand "cmd" "/c emcc --version" -Description "Validando emcc"
            $validated = $true
        } catch {
            Write-Log "emcc falhou na validação inicial, tentando gerar configuração..." "WARN"
            try {
                Invoke-SafeCommand "cmd" "/c emcc --generate-config" -Description "Gerando configuração do emcc"
                Invoke-SafeCommand "cmd" "/c emcc --version" -Description "Validando emcc (2ª tentativa)"
                $validated = $true
            } catch {
                $validated = $false
            }
        }
        if (-not $validated) { throw "emcc não está disponível após configuração do ambiente" }
        Write-Log "Ambiente Emscripten configurado e validado" "SUCCESS"
    } finally {
        if (Test-Path $tempBat) {
            Remove-Item $tempBat -Force
        }
    }
}

# Função para clonar Genesis Plus GX
function Get-GenesisPlusGX {
    Write-Log "Obtendo código fonte do Genesis Plus GX..." "INFO"
    
    if (Test-Path $GenesisDir) {
        if (Test-Path (Join-Path $GenesisDir ".git")) {
            Write-Log "Diretório Genesis Plus GX já existe, atualizando..." "INFO"
            Push-Location $GenesisDir
            try {
                Invoke-SafeCommand "git" "fetch --all --prune" -Description "Fetch Genesis Plus GX"
                # Determinar HEAD do remoto (branch padrão)
                $originHead = ""
                try {
                    $remoteShow = & git remote show origin 2>$null
                    if ($remoteShow) {
                        foreach ($line in $remoteShow) {
                            if ($line -match "HEAD branch:\s*(\S+)") {
                                $originHead = "origin/" + $matches[1]
                                break
                            }
                        }
                    }
                } catch {}
                if ([string]::IsNullOrWhiteSpace($originHead)) {
                    $remoteBranches = (& git branch -r 2>$null | Out-String)
                    if ($remoteBranches -match "origin/main") { $originHead = "origin/main" }
                    elseif ($remoteBranches -match "origin/master") { $originHead = "origin/master" }
                    else {
                        # Escolhe o primeiro branch remoto listado
                        $lines = $remoteBranches -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
                        $first = $lines | Select-Object -First 1
                        if ($first -and $first -match "origin/\S+") { $originHead = $first }
                    }
                }
                if ([string]::IsNullOrWhiteSpace($originHead)) { $originHead = "origin/main" }
                try {
                    Invoke-SafeCommand "git" "reset --hard $originHead" -Description "Reset para $originHead"
                } catch {
                    Write-Log "Falha ao resetar para $originHead. Continuando no branch atual após fetch." "WARN"
                }
            } finally {
                Pop-Location
            }
        } else {
            Write-Log "Diretório Genesis Plus GX inválido (sem .git). Recriando..." "WARN"
            Remove-Item $GenesisDir -Recurse -Force -ErrorAction SilentlyContinue
            Invoke-SafeCommand "git" "clone $GenesisUrl" -WorkingDirectory $BuildDir -Description "Clonando Genesis Plus GX" -TimeoutMinutes 15
        }
    } else {
        Invoke-SafeCommand "git" "clone $GenesisUrl" -WorkingDirectory $BuildDir -Description "Clonando Genesis Plus GX"
    }
    
    Write-Log "Genesis Plus GX obtido com sucesso" "SUCCESS"
}

# Função para criar arquivo de exportações
function New-ExportsFile {
    Write-Log "Criando arquivo de exportações para extração de sprites..." "INFO"
    
    $exportsContent = @'
/*
 * Emscripten exports for Genesis Plus GX
 * Provides access to memory regions for sprite extraction
 */

#include <emscripten.h>
#include <stdint.h>

// External declarations for Genesis Plus GX memory regions
extern uint8_t work_ram[0x10000];     // 64KB work RAM
extern uint8_t zram[0x2000];          // 8KB Z80 RAM  
extern uint8_t cram[0x80];            // 128 bytes color RAM
extern uint16_t vram[0x8000];         // 64KB video RAM
extern uint16_t vsram[0x40];          // 128 bytes vertical scroll RAM
extern uint16_t reg[0x20];            // 64 bytes VDP registers
extern uint16_t sat[0x400];           // 2KB sprite attribute table
extern uint32_t *bitmap;              // Framebuffer pointer (RGB565 or similar)

// Framebuffer access function (returns raw pointer)
EMSCRIPTEN_KEEPALIVE
uint32_t _get_frame_buffer_ref(void) {
    return (uint32_t)bitmap;
}

// Work RAM access functions
EMSCRIPTEN_KEEPALIVE
uint8_t* get_work_ram_ptr() {
    return work_ram;
}

EMSCRIPTEN_KEEPALIVE
int get_work_ram_size() {
    return 0x10000; // 64KB
}

// Z80 RAM access functions
EMSCRIPTEN_KEEPALIVE
uint8_t* get_z80_ram_ptr() {
    return zram;
}

EMSCRIPTEN_KEEPALIVE
int get_z80_ram_size() {
    return 0x2000; // 8KB
}

// Color RAM access functions
EMSCRIPTEN_KEEPALIVE
uint8_t* get_cram_ptr() {
    return cram;
}

EMSCRIPTEN_KEEPALIVE
int get_cram_size() {
    return 0x80; // 128 bytes
}

// Video RAM access functions
EMSCRIPTEN_KEEPALIVE
uint16_t* get_vram_ptr() {
    return vram;
}

EMSCRIPTEN_KEEPALIVE
int get_vram_size() {
    return 0x8000 * 2; // 64KB (32K words * 2 bytes)
}

// Vertical Scroll RAM access functions
EMSCRIPTEN_KEEPALIVE
uint16_t* get_vsram_ptr() {
    return vsram;
}

EMSCRIPTEN_KEEPALIVE
int get_vsram_size() {
    return 0x40 * 2; // 128 bytes (64 words * 2 bytes)
}

// VDP Registers access functions
EMSCRIPTEN_KEEPALIVE
uint16_t* get_vdp_regs_ptr() {
    return reg;
}

EMSCRIPTEN_KEEPALIVE
int get_vdp_regs_size() {
    return 0x20 * 2; // 64 bytes (32 words * 2 bytes)
}

// Sprite Attribute Table access functions
EMSCRIPTEN_KEEPALIVE
uint16_t* get_sat_ptr() {
    return sat;
}

EMSCRIPTEN_KEEPALIVE
int get_sat_size() {
    return 0x400 * 2; // 2KB (1K words * 2 bytes)
}
'@
    
    $exportsPath = Join-Path $GenesisDir "emscripten_exports.c"
    $exportsContent | Out-File -FilePath $exportsPath -Encoding UTF8
    
    Write-Log "Arquivo de exportações criado: $exportsPath" "SUCCESS"
}

# Função para modificar Makefile
function Update-Makefile {
    Write-Log "Modificando Makefile para incluir exportações..." "INFO"
    
    $makefilePath = Join-Path $GenesisDir "libretro\Makefile.common"
    
    if (-not (Test-Path $makefilePath)) {
        throw "Makefile não encontrado: $makefilePath"
    }
    
    # Lê o conteúdo do Makefile
    $makefileContent = Get-Content $makefilePath -Raw
    
    # Verifica se já foi modificado
    if ($makefileContent -match "emscripten_exports\.c") {
        Write-Log "Makefile já foi modificado" "INFO"
        return
    }
    
    # Adiciona o arquivo de exportações após libretro.c
    $pattern = "(SOURCES_C \+= \$\(LIBRETRO_DIR\)/libretro\.c)"
    $replacement = "`$1`r`nSOURCES_C += `$(CORE_DIR)/emscripten_exports.c"
    
    $newContent = $makefileContent -replace $pattern, $replacement
    
    if ($newContent -eq $makefileContent) {
        throw "Falha ao modificar Makefile - padrão não encontrado"
    }
    
    # Salva o arquivo modificado
    $newContent | Out-File -FilePath $makefilePath -Encoding UTF8
    
    Write-Log "Makefile modificado com sucesso" "SUCCESS"
}

# Função para compilar o core
function Build-GenesisCore {
    Write-Log "Compilando Genesis Plus GX core..." "INFO"
    
    Push-Location $GenesisDir
    try {
        # Limpa builds anteriores
        if (Test-Path "*.o") {
            Remove-Item "*.o" -Force
        }
        if (Test-Path "*.bc") {
            Remove-Item "*.bc" -Force
        }
        if (Test-Path "*.js") {
            Remove-Item "*.js" -Force
        }
        if (Test-Path "*.wasm") {
            Remove-Item "*.wasm" -Force
        }
        
        # Compila com emmake
        Write-Log "Executando emmake make..." "INFO"
        $makeArgs = "-f Makefile.libretro platform=emscripten TARGET_NAME=genesis_plus_gx HAVE_CHD=0 HAVE_CDROM=0 DEBUG=0"
        Invoke-SafeCommand "cmd" "/c emmake make $makeArgs" -WorkingDirectory $GenesisDir -Description "Compilando com emmake" -TimeoutMinutes 45
        
        # Verifica se o bytecode foi criado
        $bytecodeFile = "genesis_plus_gx_libretro_emscripten.bc"
        if (-not (Test-Path $bytecodeFile)) {
            throw "Arquivo bytecode não foi criado: $bytecodeFile"
        }
        
        Write-Log "Bytecode criado com sucesso" "SUCCESS"
        
        # Converte para JavaScript e WASM
        Write-Log "Convertendo para JavaScript e WASM..." "INFO"
        
        # Alguns Makefiles geram um arquivo de biblioteca (ar) com extensão .bc.
        # Se for um arquivo de biblioteca (assinatura !<arch>), renomear para .a para o emcc tratar como lib.
        # Usar sempre a forma .a (arquivo de biblioteca) para linkedição com emcc
        $bcInput = "genesis_plus_gx_libretro_emscripten.a"
        Copy-Item -Path $bytecodeFile -Destination $bcInput -Force
        Write-Log "Preparando entrada para emcc: $bcInput" "INFO"
        
        $exportedFunctions = @(
            "'_get_frame_buffer_ref'",
            "'_retro_init'",
            "'_retro_deinit'",
            "'_retro_api_version'",
            "'_retro_get_system_info'",
            "'_retro_get_system_av_info'",
            "'_retro_set_controller_port_device'",
            "'_retro_reset'",
            "'_retro_run'",
            "'_retro_serialize_size'",
            "'_retro_serialize'",
            "'_retro_unserialize'",
            "'_retro_cheat_reset'",
            "'_retro_cheat_set'",
            "'_retro_load_game'",
            "'_retro_load_game_special'",
            "'_retro_unload_game'",
            "'_retro_get_region'",
            "'_retro_get_memory_data'",
            "'_retro_get_memory_size'",
            "'_retro_set_environment'",
            "'_retro_set_video_refresh'",
            "'_retro_set_audio_sample'",
            "'_retro_set_audio_sample_batch'",
            "'_retro_set_input_poll'",
            "'_retro_set_input_state'",
            "'_get_work_ram_ptr'",
            "'_get_work_ram_size'",
            "'_get_z80_ram_ptr'",
            "'_get_z80_ram_size'",
            "'_get_cram_ptr'",
            "'_get_cram_size'",
            "'_get_vram_ptr'",
            "'_get_vram_size'",
            "'_get_vsram_ptr'",
            "'_get_vsram_size'",
            "'_get_vdp_regs_ptr'",
            "'_get_vdp_regs_size'",
            "'_get_sat_ptr'",
            "'_get_sat_size'"
        )
        
        $exportsList = "[" + ($exportedFunctions -join ",") + "]"
        
        $emccArgs = @(
            $bcInput,
            "-o", "genesis_plus_gx_libretro.js",
            "-s", "EXPORTED_FUNCTIONS=`"$exportsList`"",
            "-s", "EXPORTED_RUNTIME_METHODS=['ccall','cwrap']",
            "-s", "MODULARIZE=1",
            "-s", "EXPORT_NAME='GenesisCore'",
            "-s", "ALLOW_MEMORY_GROWTH=1",
            "-s", "INITIAL_MEMORY=33554432",
            "-s", "MAXIMUM_MEMORY=134217728",
            "-O3"
        )
        
        Invoke-SafeCommand "cmd" "/c emcc $($emccArgs -join ' ')" -WorkingDirectory $GenesisDir -Description "Convertendo para JavaScript e WASM" -TimeoutMinutes 45
        
        # Verifica se os arquivos finais foram criados
        $jsFile = "genesis_plus_gx_libretro.js"
        $wasmFile = "genesis_plus_gx_libretro.wasm"
        
        if (-not (Test-Path $jsFile)) {
            throw "Arquivo JavaScript não foi criado: $jsFile"
        }
        
        if (-not (Test-Path $wasmFile)) {
            throw "Arquivo WASM não foi criado: $wasmFile"
        }
        
        Write-Log "Compilação concluída com sucesso" "SUCCESS"
        Write-Log "Arquivos gerados: $jsFile, $wasmFile" "SUCCESS"
        
    } finally {
        Pop-Location
    }
}

# Função para verificar funções exportadas
function Test-ExportedFunctions {
    Write-Log "Verificando funções exportadas..." "INFO"
    
    $jsFile = Join-Path $GenesisDir "genesis_plus_gx_libretro.js"
    
    if (-not (Test-Path $jsFile)) {
        throw "Arquivo JavaScript não encontrado: $jsFile"
    }
    
    $jsContent = Get-Content $jsFile -Raw
    
    $expectedFunctions = @(
        "get_work_ram_ptr",
        "get_work_ram_size",
        "get_z80_ram_ptr",
        "get_z80_ram_size",
        "get_cram_ptr",
        "get_cram_size",
        "get_vram_ptr",
        "get_vram_size",
        "get_vsram_ptr",
        "get_vsram_size",
        "get_vdp_regs_ptr",
        "get_vdp_regs_size",
        "get_sat_ptr",
        "get_sat_size"
    )
    
    $missingFunctions = @()
    foreach ($func in $expectedFunctions) {
        if ($jsContent -notmatch "_$func") {
            $missingFunctions += $func
        }
    }
    
    if ($missingFunctions.Count -gt 0) {
        Write-Log "Funções não encontradas: $($missingFunctions -join ', ')" "WARN"
    } else {
        Write-Log "Todas as funções de exportação foram encontradas" "SUCCESS"
    }
}

# Função para copiar arquivos finais
function Copy-OutputFiles {
    Write-Log "Copiando arquivos para diretório de saída..." "INFO"
    
    # Cria diretório de saída
    if (-not (Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    }
    
    $jsFile = Join-Path $GenesisDir "genesis_plus_gx_libretro.js"
    $wasmFile = Join-Path $GenesisDir "genesis_plus_gx_libretro.wasm"
    
    # Detectar se é diretório de cores do EmulatorJS e renomear para os nomes esperados (genplusgx.*)
    $normalizedOut = ($OutputDir -replace '\\','/').TrimEnd('/')
    $isEJSCores = $normalizedOut -like '*/emulatorjs-data/cores' -or $normalizedOut -like 'public/emulatorjs-data/cores'
    
    if (Test-Path $jsFile) {
        if ($isEJSCores) {
            Copy-Item $jsFile (Join-Path $OutputDir 'genplusgx.js') -Force
            Write-Log "Copiado: genplusgx.js" "SUCCESS"
        } else {
            Copy-Item $jsFile $OutputDir -Force
            Write-Log "Copiado: $(Split-Path $jsFile -Leaf)" "SUCCESS"
        }
    }
    
    if (Test-Path $wasmFile) {
        if ($isEJSCores) {
            Copy-Item $wasmFile (Join-Path $OutputDir 'genplusgx.wasm') -Force
            Write-Log "Copiado: genplusgx.wasm" "SUCCESS"
        } else {
            Copy-Item $wasmFile $OutputDir -Force
            Write-Log "Copiado: $(Split-Path $wasmFile -Leaf)" "SUCCESS"
        }
    }
    
    Write-Log "Arquivos copiados para: $OutputDir" "SUCCESS"
}

# Função para verificar dependências críticas
function Test-Prerequisites {
    Write-Log "Verificando pré-requisitos..." "INFO"
    
    # Verifica espaço em disco (mínimo 2GB) - versão simplificada
    try {
        $currentDrive = (Get-Location).Drive.Name
        $disk = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='$currentDrive'" -ErrorAction SilentlyContinue
        if ($disk) {
            $freeSpaceGB = [math]::Round($disk.FreeSpace / 1GB, 2)
            if ($freeSpaceGB -lt 2) {
                Write-Log "Aviso: Pouco espaço em disco. Disponível: ${freeSpaceGB}GB" "WARN"
            } else {
                Write-Log "Espaço em disco: ${freeSpaceGB}GB disponível" "SUCCESS"
            }
        }
    } catch {
        Write-Log "Aviso: Não foi possível verificar espaço em disco" "WARN"
    }
    
    # Verifica conectividade de rede
    try {
        $ping = New-Object System.Net.NetworkInformation.Ping
        $result = $ping.Send("8.8.8.8", 3000)
        if ($result.Status -eq "Success") {
            Write-Log "Conectividade de rede: OK" "SUCCESS"
        } else {
            Write-Log "Aviso: Problemas de conectividade detectados" "WARN"
        }
    } catch {
        Write-Log "Aviso: Não foi possível verificar conectividade" "WARN"
    }
    
    Write-Log "Verificação de pré-requisitos concluída" "SUCCESS"
}

# Função principal
function Main {
    try {
        Write-Log "=== Iniciando compilação do Genesis Plus GX com Emscripten ===" "INFO"
        Write-Log "Diretório de trabalho: $(Get-Location)" "INFO"
        Write-Log "Diretório de saída: $OutputDir" "INFO"
        
        # Verifica pré-requisitos
        Test-Prerequisites
        
        # Limpeza se solicitada
        if ($Clean -and (Test-Path $TempDir)) {
            Write-Log "Limpando diretórios temporários..." "INFO"
            Remove-Item $TempDir -Recurse -Force
        }
        
        # Cria diretório temporário
        if (-not (Test-Path $TempDir)) {
            New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
        }
        
        # Executa todas as etapas com verificação de progresso
        $steps = @(
            { Install-Git },
            { Install-EmscriptenSDK },
            { Set-EmscriptenEnvironment },
            { Get-GenesisPlusGX },
            { New-ExportsFile },
            { Update-Makefile },
            { Build-GenesisCore },
            { Test-ExportedFunctions },
            { Copy-OutputFiles }
        )
        
        $stepNames = @(
            "Instalação do Git",
            "Instalação do Emscripten SDK",
            "Configuração do ambiente Emscripten",
            "Obtenção do Genesis Plus GX",
            "Criação do arquivo de exportações",
            "Atualização do Makefile",
            "Compilação do core",
            "Teste das funções exportadas",
            "Cópia dos arquivos finais"
        )
        
        for ($i = 0; $i -lt $steps.Count; $i++) {
            $stepName = $stepNames[$i]
            $stepFunction = $steps[$i]
            
            Write-Log "[$($i+1)/$($steps.Count)] Executando: $stepName" "INFO"
            try {
                & $stepFunction
                Write-Log "[$($i+1)/$($steps.Count)] Concluído: $stepName" "SUCCESS"
            } catch {
                Write-Log "[$($i+1)/$($steps.Count)] Falhou: $stepName - $($_.Exception.Message)" "ERROR"
                throw
            }
        }
        
        Write-Log "=== Compilação concluída com sucesso! ===" "SUCCESS"
        Write-Log "Arquivos disponíveis em: $OutputDir" "SUCCESS"
        
    } catch {
        Write-Log "Erro durante a compilação: $($_.Exception.Message)" "ERROR"
        Write-Log "Stack trace: $($_.ScriptStackTrace)" "ERROR"
        
        # Cleanup em caso de erro
        try {
            Get-Process | Where-Object { $_.ProcessName -like '*emcc*' -or $_.ProcessName -like '*emmake*' } | Stop-Process -Force -ErrorAction SilentlyContinue
        } catch {}
        
        exit 1
    }
}

# Executa o script principal
Main