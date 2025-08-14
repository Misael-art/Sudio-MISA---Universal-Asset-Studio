# Guia de Compilação do Genesis Plus GX Core

## Visão Geral

Este guia explica como usar o script `compile-genesis-with-exports.ps1` para compilar automaticamente o Genesis Plus GX Core com funções de exportação necessárias para extração de sprites. O script automatiza todo o processo, desde a instalação de dependências até a geração dos arquivos finais.

## 🚀 Início Rápido

### Execução Básica
```powershell
# Compilação padrão
.\scripts\compile-genesis-with-exports.ps1

# Compilação com limpeza (recomendado para primeira execução)
.\scripts\compile-genesis-with-exports.ps1 -Clean

# Compilação com saída detalhada
.\scripts\compile-genesis-with-exports.ps1 -Verbose

# Compilação com diretório de saída personalizado
.\scripts\compile-genesis-with-exports.ps1 -OutputDir "C:\MeuProjeto\cores"
```

## 📋 Parâmetros do Script

| Parâmetro | Tipo | Descrição | Padrão |
|-----------|------|-----------|--------|
| `-Clean` | Switch | Remove diretórios temporários antes de iniciar | Desabilitado |
| `-Verbose` | Switch | Exibe informações detalhadas durante execução | Desabilitado |
| `-OutputDir` | String | Diretório onde os arquivos finais serão copiados | `"./output"` |

## 🔧 Dependências Instaladas Automaticamente

O script verifica e instala automaticamente as seguintes dependências:

### 1. Git for Windows
- **Verificação**: Testa se o comando `git` está disponível
- **Instalação**: Via `winget` (preferencial) ou download direto
- **Versão**: Última versão estável disponível
- **Localização**: Instalação global no sistema

### 2. Emscripten SDK
- **Verificação**: Verifica se `emcc` e `emmake` estão disponíveis
- **Instalação**: Clone do repositório oficial do Emscripten
- **Configuração**: Instalação e ativação da versão mais recente
- **Localização**: `./temp/genesis-build/emsdk/`

### 3. Genesis Plus GX Source
- **Origem**: Clone do repositório oficial
- **URL**: `https://github.com/ekeeke/Genesis-Plus-GX.git`
- **Localização**: `./temp/genesis-build/genesis-plus-gx/`

## 🎯 Funções de Exportação para Extração de Sprites

O core compilado inclui as seguintes funções exportadas para acessar regiões de memória:

### Funções de Ponteiro de Memória

| Função | Descrição | Tamanho | Uso |
|--------|-----------|---------|-----|
| `_get_work_ram_ptr()` | Work RAM (68000 main RAM) | 64KB | Dados principais do programa |
| `_get_z80_ram_ptr()` | Z80 RAM | 8KB | Memória do processador de som |
| `_get_cram_ptr()` | Color RAM | 128 bytes | Paletas de cores (64 cores × 2 bytes) |
| `_get_vram_ptr()` | Video RAM | 64KB | Padrões de tiles e nametables |
| `_get_vsram_ptr()` | Vertical Scroll RAM | 80 bytes | Valores de scroll vertical |
| `_get_vdp_regs_ptr()` | VDP Registers | 32 bytes | Registradores do processador de vídeo |
| `_get_sat_ptr()` | Sprite Attribute Table | 640 bytes | Definições de sprites |

### Funções de Tamanho

| Função | Retorna |
|--------|----------|
| `_get_work_ram_size()` | Tamanho da Work RAM (65536 bytes) |
| `_get_z80_ram_size()` | Tamanho da Z80 RAM (8192 bytes) |
| `_get_cram_size()` | Tamanho da Color RAM (128 bytes) |
| `_get_vram_size()` | Tamanho da Video RAM (65536 bytes) |
| `_get_vsram_size()` | Tamanho da Vertical Scroll RAM (80 bytes) |
| `_get_vdp_regs_size()` | Tamanho dos VDP Registers (32 bytes) |
| `_get_sat_size()` | Tamanho da Sprite Attribute Table (640 bytes) |

## 📁 Estrutura dos Arquivos Gerados

Após a compilação bem-sucedida, os seguintes arquivos são gerados:

```
output/
├── genesis_plus_gx_libretro.js    # Core JavaScript (módulo Emscripten)
└── genesis_plus_gx_libretro.wasm  # Core WebAssembly (binário compilado)
```

### Características dos Arquivos

#### `genesis_plus_gx_libretro.js`
- **Tipo**: Módulo JavaScript Emscripten
- **Formato**: Modularizado (`MODULARIZE=1`)
- **Nome de Exportação**: `GenesisCore`
- **Funções Exportadas**: Todas as funções libretro + funções de extração de sprites
- **Tamanho Típico**: ~200-400 KB

#### `genesis_plus_gx_libretro.wasm`
- **Tipo**: WebAssembly binário
- **Otimização**: `-O3` (máxima otimização)
- **Memória**: Crescimento dinâmico habilitado
- **Tamanho Típico**: ~1-2 MB

## 🔗 Integração no Projeto

### 1. Carregamento do Core

```javascript
// Importar o módulo do core
import GenesisCore from './output/genesis_plus_gx_libretro.js';

// Inicializar o core
const core = await GenesisCore();

// Verificar se as funções de exportação estão disponíveis
if (core._get_vram_ptr && core._get_cram_ptr && core._get_sat_ptr) {
    console.log('Funções de extração de sprites disponíveis!');
}
```

### 2. Acessando Memória para Extração de Sprites

```javascript
// Obter ponteiros de memória
const vramPtr = core._get_vram_ptr();
const cramPtr = core._get_cram_ptr();
const satPtr = core._get_sat_ptr();

// Obter tamanhos
const vramSize = core._get_vram_size();
const cramSize = core._get_cram_size();
const satSize = core._get_sat_size();

// Acessar dados da memória
const vramData = new Uint8Array(core.HEAPU8.buffer, vramPtr, vramSize);
const cramData = new Uint16Array(core.HEAPU16.buffer, cramPtr / 2, cramSize / 2);
const satData = new Uint8Array(core.HEAPU8.buffer, satPtr, satSize);

// Agora você pode processar os dados para extrair sprites
console.log('VRAM:', vramData);
console.log('Color RAM:', cramData);
console.log('Sprite Attribute Table:', satData);
```

### 3. Exemplo de Extração de Paleta

```javascript
/**
 * Extrai paletas de cores da CRAM
 * @param {Object} core - Core Genesis Plus GX carregado
 * @returns {Array} Array de paletas (cada paleta tem 16 cores)
 */
function extractPalettes(core) {
    const cramPtr = core._get_cram_ptr();
    const cramSize = core._get_cram_size();
    const cramData = new Uint16Array(core.HEAPU16.buffer, cramPtr / 2, cramSize / 2);
    
    const palettes = [];
    
    // CRAM contém 4 paletas de 16 cores cada
    for (let paletteIndex = 0; paletteIndex < 4; paletteIndex++) {
        const palette = [];
        
        for (let colorIndex = 0; colorIndex < 16; colorIndex++) {
            const cramIndex = (paletteIndex * 16) + colorIndex;
            const color16 = cramData[cramIndex];
            
            // Converter de BGR para RGB
            const b = (color16 & 0x0F00) >> 8;
            const g = (color16 & 0x00F0) >> 4;
            const r = (color16 & 0x000F);
            
            // Expandir de 4-bit para 8-bit
            const rgb = {
                r: (r * 255) / 15,
                g: (g * 255) / 15,
                b: (b * 255) / 15
            };
            
            palette.push(rgb);
        }
        
        palettes.push(palette);
    }
    
    return palettes;
}
```

## 🛠️ Troubleshooting

### Problemas Comuns e Soluções

#### 1. Erro: "Git não encontrado"
**Sintoma**: Script falha ao tentar clonar repositórios
**Solução**:
```powershell
# Instalar Git manualmente
winget install --id Git.Git -e --source winget

# Ou baixar de https://git-scm.com/download/win
# Depois executar o script novamente
```

#### 2. Erro: "Emscripten não encontrado"
**Sintoma**: Comandos `emcc` ou `emmake` não são reconhecidos
**Solução**:
```powershell
# Limpar e reinstalar
.\scripts\compile-genesis-with-exports.ps1 -Clean

# Verificar se o PATH foi atualizado
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
```

#### 3. Erro: "Falha na compilação do bytecode"
**Sintoma**: Erro durante `emmake make`
**Solução**:
```powershell
# Verificar se todas as dependências estão instaladas
Get-Command git, emcc, emmake

# Limpar cache e tentar novamente
Remove-Item ./temp -Recurse -Force
.\scripts\compile-genesis-with-exports.ps1 -Clean -Verbose
```

#### 4. Erro: "Arquivo não encontrado após compilação"
**Sintoma**: Arquivos .js ou .wasm não são criados
**Solução**:
```powershell
# Verificar logs detalhados
.\scripts\compile-genesis-with-exports.ps1 -Verbose

# Verificar espaço em disco
Get-PSDrive C

# Verificar permissões de escrita
Test-Path ./temp -PathType Container
```

#### 5. Erro: "Funções de exportação não encontradas"
**Sintoma**: Funções como `_get_vram_ptr` não estão disponíveis
**Solução**:
```powershell
# Verificar se o arquivo emscripten_exports.c foi criado
Get-Content ./temp/genesis-build/genesis-plus-gx/emscripten_exports.c

# Recompilar com limpeza
.\scripts\compile-genesis-with-exports.ps1 -Clean
```

### Verificação de Integridade

```powershell
# Verificar se os arquivos foram gerados corretamente
Get-ChildItem ./output/*.js, ./output/*.wasm | ForEach-Object {
    Write-Host "$($_.Name): $([math]::Round($_.Length / 1KB, 1)) KB"
}

# Verificar se as funções estão exportadas
$jsContent = Get-Content ./output/genesis_plus_gx_libretro.js -Raw
if ($jsContent -match "_get_vram_ptr") {
    Write-Host "✅ Funções de extração encontradas"
} else {
    Write-Host "❌ Funções de extração não encontradas"
}
```

## 📊 Logs e Debugging

### Habilitando Logs Detalhados

```powershell
# Executar com máximo de detalhes
.\scripts\compile-genesis-with-exports.ps1 -Verbose -Clean
```

### Interpretando Logs

- **[INFO]**: Informações gerais sobre o progresso
- **[SUCCESS]**: Operação concluída com sucesso
- **[WARN]**: Aviso que não impede a execução
- **[ERROR]**: Erro que interrompe a execução

### Arquivos de Log

O script não gera arquivos de log por padrão, mas você pode redirecionar a saída:

```powershell
# Salvar logs em arquivo
.\scripts\compile-genesis-with-exports.ps1 -Verbose 2>&1 | Tee-Object -FilePath "compilation.log"
```

## 🔄 Processo de Compilação Detalhado

### Etapas Executadas pelo Script

1. **Verificação de Dependências**
   - Testa presença do Git
   - Verifica instalação do Emscripten
   - Instala dependências ausentes

2. **Preparação do Ambiente**
   - Cria diretórios temporários
   - Configura variáveis de ambiente do Emscripten
   - Clone dos repositórios necessários

3. **Criação de Arquivos de Exportação**
   - Gera `emscripten_exports.c` com funções KEEPALIVE
   - Modifica `Makefile.libretro` para incluir exportações

4. **Compilação**
   - Compila para bytecode com `emmake make`
   - Converte para JavaScript/WASM com `emcc`
   - Aplica otimizações (-O3)

5. **Verificação e Cópia**
   - Verifica presença das funções exportadas
   - Copia arquivos para diretório de saída
   - Valida integridade dos arquivos

### Tempo de Execução Esperado

- **Primeira execução (com instalação)**: 10-20 minutos
- **Execuções subsequentes**: 3-5 minutos
- **Com cache (sem -Clean)**: 1-2 minutos

## 📚 Recursos Adicionais

### Documentação Relacionada

- [Genesis Plus GX GitHub](https://github.com/ekeeke/Genesis-Plus-GX)
- [Emscripten Documentation](https://emscripten.org/docs/)
- [Mega Drive/Genesis Technical Documentation](https://www.plutiedev.com/)

### Estrutura de Memória do Mega Drive

- **Work RAM**: Memória principal do 68000 (64KB)
- **VRAM**: Memória de vídeo para tiles e nametables (64KB)
- **CRAM**: Memória de cores/paletas (128 bytes)
- **SAT**: Tabela de atributos de sprites (1KB)
- **VDP Registers**: Registradores de configuração do VDP (32 bytes)

### Formato dos Dados

#### Color RAM (CRAM)
- **Formato**: 16-bit por cor (0x0BGR)
- **Organização**: 4 paletas × 16 cores
- **Endereçamento**: Palavra (16-bit) alinhado

#### Sprite Attribute Table (SAT)
- **Formato**: 8 bytes por sprite
- **Campos**: Y, Size/Link, Pattern, X
- **Máximo**: 80 sprites (640 bytes usados)

#### Video RAM (VRAM)
- **Organização**: Tiles de 8×8 pixels
- **Formato**: 4 bits por pixel (16 cores)
- **Nametables**: Plane A, Plane B, Window

---

**Versão do Guia**: 1.0  
**Última Atualização**: Janeiro 2025  
**Compatibilidade**: Windows 10/11, PowerShell 5.1+