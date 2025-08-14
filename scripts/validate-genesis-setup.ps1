# Script de Validação do Ambiente Genesis Plus GX
# Verifica se todo o ambiente está configurado corretamente
# Autor: Assistente IA - Universal Asset Studio
# Data: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

param(
    [string]$WorkDir = "C:\Users\misae\Desktop\Sudio Misa\temp\manual-build",
    [string]$OutputDir = "C:\Users\misae\Desktop\Sudio Misa\public\emulators",
    [switch]$Detailed = $false,
    [switch]$FixIssues = $false
)

# Função para logging com cores
function Write-ValidationLog {
    param(
        [string]$Message, 
        [string]$Status = "INFO",
        [int]$Indent = 0
    )
    
    $indentStr = "  " * $Indent
    $timestamp = Get-Date -Format "HH:mm:ss"
    
    $color = switch ($Status) {
        "PASS"    { "Green" }
        "FAIL"    { "Red" }
        "WARN"    { "Yellow" }
        "INFO"    { "Cyan" }
        "FIX"     { "Magenta" }
        default   { "White" }
    }
    
    $icon = switch ($Status) {
        "PASS"    { "✅" }
        "FAIL"    { "❌" }
        "WARN"    { "⚠️" }
        "INFO"    { "ℹ️" }
        "FIX"     { "🔧" }
        default   { "📋" }
    }
    
    Write-Host "$indentStr$icon $Message" -ForegroundColor $color
}

# Função para testar comando
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

# Função para testar arquivo com detalhes
function Test-FileDetailed {
    param(
        [string]$Path,
        [string]$Description,
        [long]$MinSize = 0,
        [string[]]$RequiredContent = @()
    )
    
    $result = @{
        Exists = $false
        Size = 0
        SizeFormatted = "0 bytes"
        ContentValid = $true
        Issues = @()
    }
    
    if (Test-Path $Path) {
        $result.Exists = $true
        $file = Get-Item $Path
        $result.Size = $file.Length
        
        if ($file.Length -lt 1KB) {
            $result.SizeFormatted = "$($file.Length) bytes"
        } elseif ($file.Length -lt 1MB) {
            $result.SizeFormatted = "{0:N1} KB" -f ($file.Length / 1KB)
        } else {
            $result.SizeFormatted = "{0:N2} MB" -f ($file.Length / 1MB)
        }
        
        if ($MinSize -gt 0 -and $file.Length -lt $MinSize) {
            $result.Issues += "Arquivo muito pequeno (mínimo: $MinSize bytes)"
        }
        
        if ($RequiredContent.Count -gt 0) {
            try {
                $content = Get-Content $Path -Raw -ErrorAction Stop
                foreach ($required in $RequiredContent) {
                    if (-not $content.Contains($required)) {
                        $result.ContentValid = $false
                        $result.Issues += "Conteúdo obrigatório não encontrado: '$required'"
                    }
                }
            } catch {
                $result.ContentValid = $false
                $result.Issues += "Erro ao ler arquivo: $($_.Exception.Message)"
            }
        }
    } else {
        $result.Issues += "Arquivo não existe"
    }
    
    return $result
}

# Início da validação
Write-ValidationLog "VALIDAÇÃO DO AMBIENTE GENESIS PLUS GX" "INFO"
Write-ValidationLog "Iniciando verificação completa..." "INFO"
Write-ValidationLog "" "INFO"

$validationResults = @{
    Prerequisites = @{}
    Environment = @{}
    SourceCode = @{}
    CompiledFiles = @{}
    Integration = @{}
    Overall = @{ Passed = 0; Failed = 0; Warnings = 0 }
}

# 1. VERIFICAÇÃO DE PRÉ-REQUISITOS
Write-ValidationLog "1. PRÉ-REQUISITOS DO SISTEMA" "INFO"

# Git
$gitAvailable = Test-Command "git"
if ($gitAvailable) {
    $gitVersion = & git --version 2>&1
    Write-ValidationLog "Git: $gitVersion" "PASS" 1
    $validationResults.Prerequisites.Git = @{ Status = "PASS"; Version = $gitVersion }
    $validationResults.Overall.Passed++
} else {
    Write-ValidationLog "Git: Não instalado" "FAIL" 1
    $validationResults.Prerequisites.Git = @{ Status = "FAIL"; Issue = "Não instalado" }
    $validationResults.Overall.Failed++
}

# Python
$pythonAvailable = Test-Command "python"
if (-not $pythonAvailable) {
    $pythonAvailable = Test-Command "python3"
    $pythonCmd = "python3"
} else {
    $pythonCmd = "python"
}

if ($pythonAvailable) {
    $pythonVersion = & $pythonCmd --version 2>&1
    Write-ValidationLog "Python: $pythonVersion" "PASS" 1
    $validationResults.Prerequisites.Python = @{ Status = "PASS"; Version = $pythonVersion }
    $validationResults.Overall.Passed++
} else {
    Write-ValidationLog "Python: Não instalado" "FAIL" 1
    $validationResults.Prerequisites.Python = @{ Status = "FAIL"; Issue = "Não instalado" }
    $validationResults.Overall.Failed++
}

# PowerShell
$psVersion = $PSVersionTable.PSVersion.ToString()
Write-ValidationLog "PowerShell: $psVersion" "PASS" 1
$validationResults.Prerequisites.PowerShell = @{ Status = "PASS"; Version = $psVersion }
$validationResults.Overall.Passed++

Write-ValidationLog "" "INFO"

# 2. VERIFICAÇÃO DO AMBIENTE EMSCRIPTEN
Write-ValidationLog "2. AMBIENTE EMSCRIPTEN" "INFO"

$emsdkPath = Join-Path $WorkDir "emsdk"
$emsdkBat = Join-Path $emsdkPath "emsdk.bat"
$emsdkEnv = Join-Path $emsdkPath "emsdk_env.bat"

if (Test-Path $emsdkPath) {
    Write-ValidationLog "Diretório Emsdk: Encontrado" "PASS" 1
    $validationResults.Environment.EmsdkDir = @{ Status = "PASS"; Path = $emsdkPath }
    $validationResults.Overall.Passed++
    
    if (Test-Path $emsdkBat) {
        Write-ValidationLog "emsdk.bat: Encontrado" "PASS" 1
        $validationResults.Environment.EmsdkBat = @{ Status = "PASS" }
        $validationResults.Overall.Passed++
    } else {
        Write-ValidationLog "emsdk.bat: Não encontrado" "FAIL" 1
        $validationResults.Environment.EmsdkBat = @{ Status = "FAIL" }
        $validationResults.Overall.Failed++
    }
    
    if (Test-Path $emsdkEnv) {
        Write-ValidationLog "emsdk_env.bat: Encontrado" "PASS" 1
        $validationResults.Environment.EmsdkEnv = @{ Status = "PASS" }
        $validationResults.Overall.Passed++
    } else {
        Write-ValidationLog "emsdk_env.bat: Não encontrado" "FAIL" 1
        $validationResults.Environment.EmsdkEnv = @{ Status = "FAIL" }
        $validationResults.Overall.Failed++
    }
} else {
    Write-ValidationLog "Diretório Emsdk: Não encontrado" "FAIL" 1
    $validationResults.Environment.EmsdkDir = @{ Status = "FAIL"; ExpectedPath = $emsdkPath }
    $validationResults.Overall.Failed++
}

# Verificar se emcc está disponível
$emccAvailable = Test-Command "emcc"
if ($emccAvailable) {
    $emccVersion = & emcc --version 2>&1 | Select-Object -First 1
    Write-ValidationLog "emcc: $emccVersion" "PASS" 1
    $validationResults.Environment.Emcc = @{ Status = "PASS"; Version = $emccVersion }
    $validationResults.Overall.Passed++
} else {
    Write-ValidationLog "emcc: Não disponível (execute emsdk_env.bat)" "WARN" 1
    $validationResults.Environment.Emcc = @{ Status = "WARN"; Issue = "Não no PATH" }
    $validationResults.Overall.Warnings++
}

Write-ValidationLog "" "INFO"

# 3. VERIFICAÇÃO DO CÓDIGO FONTE
Write-ValidationLog "3. CÓDIGO FONTE GENESIS PLUS GX" "INFO"

$genesisPath = Join-Path $WorkDir "genesis-plus-gx"
$makefileLibretro = Join-Path $genesisPath "Makefile.libretro"
$makefileCommon = Join-Path $genesisPath "Makefile.common"
$emscriptenExports = Join-Path $genesisPath "emscripten_exports.c"

if (Test-Path $genesisPath) {
    Write-ValidationLog "Diretório Genesis: Encontrado" "PASS" 1
    $validationResults.SourceCode.GenesisDir = @{ Status = "PASS"; Path = $genesisPath }
    $validationResults.Overall.Passed++
    
    # Verificar arquivos essenciais
    $essentialFiles = @{
        "Makefile.libretro" = $makefileLibretro
        "Makefile.common" = $makefileCommon
        "emscripten_exports.c" = $emscriptenExports
    }
    
    foreach ($fileName in $essentialFiles.Keys) {
        $filePath = $essentialFiles[$fileName]
        if (Test-Path $filePath) {
            Write-ValidationLog "$fileName`: Encontrado" "PASS" 1
            $validationResults.SourceCode[$fileName] = @{ Status = "PASS" }
            $validationResults.Overall.Passed++
        } else {
            Write-ValidationLog "$fileName`: Não encontrado" "FAIL" 1
            $validationResults.SourceCode[$fileName] = @{ Status = "FAIL" }
            $validationResults.Overall.Failed++
        }
    }
} else {
    Write-ValidationLog "Diretório Genesis: Não encontrado" "FAIL" 1
    $validationResults.SourceCode.GenesisDir = @{ Status = "FAIL"; ExpectedPath = $genesisPath }
    $validationResults.Overall.Failed++
}

Write-ValidationLog "" "INFO"

# 4. VERIFICAÇÃO DOS ARQUIVOS COMPILADOS
Write-ValidationLog "4. ARQUIVOS COMPILADOS" "INFO"

$jsFile = Join-Path $OutputDir "genesis_plus_gx.js"
$wasmFile = Join-Path $OutputDir "genesis_plus_gx.wasm"

# Verificar arquivo JavaScript
$jsResult = Test-FileDetailed -Path $jsFile -Description "JavaScript" -MinSize 1KB -RequiredContent @("GenesisCore", "WebAssembly")
if ($jsResult.Exists) {
    if ($jsResult.Issues.Count -eq 0) {
        Write-ValidationLog "genesis_plus_gx.js: $($jsResult.SizeFormatted)" "PASS" 1
        $validationResults.CompiledFiles.JavaScript = @{ Status = "PASS"; Size = $jsResult.Size }
        $validationResults.Overall.Passed++
    } else {
        Write-ValidationLog "genesis_plus_gx.js: Problemas encontrados" "FAIL" 1
        foreach ($issue in $jsResult.Issues) {
            Write-ValidationLog $issue "FAIL" 2
        }
        $validationResults.CompiledFiles.JavaScript = @{ Status = "FAIL"; Issues = $jsResult.Issues }
        $validationResults.Overall.Failed++
    }
} else {
    Write-ValidationLog "genesis_plus_gx.js: Não encontrado" "FAIL" 1
    $validationResults.CompiledFiles.JavaScript = @{ Status = "FAIL"; Issue = "Não existe" }
    $validationResults.Overall.Failed++
}

# Verificar arquivo WASM
$wasmResult = Test-FileDetailed -Path $wasmFile -Description "WebAssembly" -MinSize 100KB
if ($wasmResult.Exists) {
    if ($wasmResult.Issues.Count -eq 0) {
        Write-ValidationLog "genesis_plus_gx.wasm: $($wasmResult.SizeFormatted)" "PASS" 1
        $validationResults.CompiledFiles.WebAssembly = @{ Status = "PASS"; Size = $wasmResult.Size }
        $validationResults.Overall.Passed++
    } else {
        Write-ValidationLog "genesis_plus_gx.wasm: Problemas encontrados" "FAIL" 1
        foreach ($issue in $wasmResult.Issues) {
            Write-ValidationLog $issue "FAIL" 2
        }
        $validationResults.CompiledFiles.WebAssembly = @{ Status = "FAIL"; Issues = $wasmResult.Issues }
        $validationResults.Overall.Failed++
    }
} else {
    Write-ValidationLog "genesis_plus_gx.wasm: Não encontrado" "FAIL" 1
    $validationResults.CompiledFiles.WebAssembly = @{ Status = "FAIL"; Issue = "Não existe" }
    $validationResults.Overall.Failed++
}

Write-ValidationLog "" "INFO"

# 5. VERIFICAÇÃO DE INTEGRAÇÃO
Write-ValidationLog "5. INTEGRAÇÃO COM PROJETO" "INFO"

# Verificar estrutura do projeto
$projectStructure = @{
    "public/emulators" = $OutputDir
    "scripts" = "C:\Users\misae\Desktop\Sudio Misa\scripts"
    "test-genesis-emulator.html" = "C:\Users\misae\Desktop\Sudio Misa\test-genesis-emulator.html"
    "GENESIS_EMULATOR_INTEGRATION.md" = "C:\Users\misae\Desktop\Sudio Misa\GENESIS_EMULATOR_INTEGRATION.md"
}

foreach ($item in $projectStructure.Keys) {
    $path = $projectStructure[$item]
    if (Test-Path $path) {
        Write-ValidationLog "$item`: Encontrado" "PASS" 1
        $validationResults.Integration[$item] = @{ Status = "PASS" }
        $validationResults.Overall.Passed++
    } else {
        Write-ValidationLog "$item`: Não encontrado" "WARN" 1
        $validationResults.Integration[$item] = @{ Status = "WARN" }
        $validationResults.Overall.Warnings++
    }
}

Write-ValidationLog "" "INFO"

# RELATÓRIO FINAL
$totalChecks = $validationResults.Overall.Passed + $validationResults.Overall.Failed + $validationResults.Overall.Warnings
$successRate = if ($totalChecks -gt 0) { [math]::Round(($validationResults.Overall.Passed / $totalChecks) * 100, 1) } else { 0 }

Write-ValidationLog "RELATÓRIO FINAL" "INFO"
Write-ValidationLog "═══════════════════════════════════════" "INFO"
Write-ValidationLog "Total de verificações: $totalChecks" "INFO"
Write-ValidationLog "Passou: $($validationResults.Overall.Passed)" "PASS"
Write-ValidationLog "Falhou: $($validationResults.Overall.Failed)" "FAIL"
Write-ValidationLog "Avisos: $($validationResults.Overall.Warnings)" "WARN"
Write-ValidationLog "Taxa de sucesso: $successRate%" "INFO"
Write-ValidationLog "" "INFO"

# Determinar status geral
if ($validationResults.Overall.Failed -eq 0) {
    if ($validationResults.Overall.Warnings -eq 0) {
        Write-ValidationLog "STATUS: ✅ AMBIENTE TOTALMENTE FUNCIONAL" "PASS"
        $overallStatus = "PERFECT"
    } else {
        Write-ValidationLog "STATUS: ⚠️ AMBIENTE FUNCIONAL COM AVISOS" "WARN"
        $overallStatus = "FUNCTIONAL"
    }
} else {
    Write-ValidationLog "STATUS: ❌ AMBIENTE COM PROBLEMAS" "FAIL"
    $overallStatus = "BROKEN"
}

# Recomendações
Write-ValidationLog "" "INFO"
Write-ValidationLog "RECOMENDAÇÕES:" "INFO"

if ($validationResults.Overall.Failed -gt 0) {
    Write-ValidationLog "1. Execute a compilação: .\scripts\build-genesis-universal.ps1 -Clean" "FIX"
}

if ($validationResults.Environment.Emcc.Status -eq "WARN") {
    Write-ValidationLog "3. Ative o ambiente: .\temp\manual-build\emsdk\emsdk_env.bat" "FIX"
}

if ($overallStatus -eq "PERFECT" -or $overallStatus -eq "FUNCTIONAL") {
    Write-ValidationLog "✅ Ambiente pronto! Execute: .\scripts\build-genesis-universal.ps1" "PASS"
}

# Salvar relatório detalhado
if ($Detailed) {
    $reportFile = "validation-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    $validationResults | ConvertTo-Json -Depth 4 | Set-Content -Path $reportFile -Encoding UTF8
    Write-ValidationLog "" "INFO"
    Write-ValidationLog "Relatório detalhado salvo: $reportFile" "INFO"
}

# Código de saída
if ($validationResults.Overall.Failed -gt 0) {
    exit 1
} else {
    exit 0
}