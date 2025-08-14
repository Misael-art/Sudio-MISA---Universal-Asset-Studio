# PROMPT PARA COMPILAÇÃO DEFINITIVA DO CORE GENESIS PLUS GX

## CONTEXTO E OBJETIVO

Você é um agente de IA especializado em compilação de emuladores. Sua missão é compilar o core Genesis Plus GX com **compatibilidade total** para o projeto EmulatorJS, garantindo suporte completo para múltiplas plataformas Sega e preservando todas as correções críticas já implementadas.

## ESTADO ATUAL DO PROJETO

### ✅ SUCESSOS ALCANÇADOS (NÃO REGREDIR)
- **EJS_Runtime**: 100% funcional - carregamento sequencial resolvido
- **Sistema de Testes**: 5 de 6 testes passando (83% funcionalidade)
- **Estrutura de Memória**: Exportações customizadas implementadas
- **Ambiente Docker**: Configurado e funcional

### ❌ PROBLEMA A RESOLVER
- **Teste 6 (Canvas)**: Falha por incompatibilidade JS/WASM
- **Erro Específico**: `WebAssembly.instantiate(): Import #0 "a": module is not an object or function`

## INSTRUÇÕES CRÍTICAS - NÃO VIOLAR

### 1. PRESERVAÇÃO OBRIGATÓRIA

**ARQUIVOS QUE NÃO DEVEM SER ALTERADOS:**
- `index.html` - Contém correções críticas do EJS_Runtime
- `test/` - Sistema de testes automatizado
- `src/emulation/adapters/` - Decodificadores de memória
- `CORRECOES_CRITICAS_PRESERVACAO.md` - Documentação das correções

**CONFIGURAÇÕES A PRESERVAR:**
```html
<!-- CRÍTICO: Carregamento imediato do EJS_Runtime -->
<script src="/emulatorjs-data/cores/genesis_plus_gx.js"></script>

<!-- CRÍTICO: Configuração do Module.locateFile -->
window.Module = {
  locateFile: function(path) {
    if (path.endsWith('.wasm')) {
      return '/emulatorjs-data/cores/genesis_plus_gx.wasm';
    }
    return path;
  }
};
```

### 2. ESPECIFICAÇÕES TÉCNICAS OBRIGATÓRIAS

#### Plataformas Suportadas <mcreference link="https://docs.libretro.com/library/genesis_plus_gx/" index="1">1</mcreference>
```c
// Sistemas a suportar (system.h)
#define SYSTEM_SG           0x01  // SG-1000
#define SYSTEM_SGII         0x02  // SG-1000 II
#define SYSTEM_MARKIII      0x10  // Mark III
#define SYSTEM_SMS          0x20  // Master System
#define SYSTEM_SMS2         0x21  // Master System 2
#define SYSTEM_GG           0x40  // Game Gear
#define SYSTEM_GGMS         0x41  // Game Gear (SMS mode)
#define SYSTEM_MD           0x80  // Mega Drive/Genesis
#define SYSTEM_MCD          0x84  // Mega CD/Sega CD
#define SYSTEM_PICO         0x82  // Sega Pico
// NOTA: 32X não é suportado pelo Genesis Plus GX
```

#### Flags de Compilação Obrigatórias <mcreference link="https://github.com/libretro/Genesis-Plus-GX/blob/master/Makefile.libretro" index="1">1</mcreference>
```bash
# Configurações para máxima compatibilidade
HAVE_CHD=1          # Suporte a arquivos CHD (Sega CD)
HAVE_CDROM=1        # Suporte a CD-ROM
DEBUG=0             # Build otimizado
LOW_MEMORY=0        # Sem limitações de memória
MAX_ROM_SIZE=33554432  # 32MB para Sega CD
FRONTEND_SUPPORTS_RGB565=1
USE_PER_SOUND_CHANNELS_CONFIG=1
```

#### Exportações de Memória Obrigatórias
```c
// USAR: docker/emscripten_exports_corrected.c
// Exportações críticas para Universal Asset Studio:

// Framebuffer
_get_frame_buffer_ref
_get_frame_buffer_width
_get_frame_buffer_height
_get_frame_buffer_pitch

// Memória Principal
_get_work_ram_ptr      // 64KB Work RAM (68000)
_get_zram_ptr          // 8KB Z80 RAM

// VDP (Video Display Processor)
_get_vram_ptr          // 64KB Video RAM
_get_cram_ptr          // 128B Color RAM (paletas)
_get_vsram_ptr         // 128B Vertical Scroll RAM
_get_vdp_regs_ptr      // 32B VDP Registers
_get_sat_ptr           // 1KB Sprite Attribute Table

// Detecção de Sistema
_get_active_system_code // Identifica SMS/GG/MD/MCD
_is_core_initialized
_get_total_memory_size
```

### 3. PROCESSO DE COMPILAÇÃO

#### Ambiente Docker (RECOMENDADO)
```bash
# 1. Build da imagem
docker build -f docker/Dockerfile.genesis-build -t genesis-build .

# 2. Compilação
docker run --rm -v $(pwd):/output genesis-build

# 3. Verificação dos arquivos gerados
ls -la genesis_plus_gx.js genesis_plus_gx.wasm
```

#### Comando Emscripten Direto
```bash
# Clone do repositório
git clone https://github.com/ekeeke/Genesis-Plus-GX.git
cd Genesis-Plus-GX

# Copiar exportações
cp ../docker/emscripten_exports_corrected.c ./emscripten_exports.c

# Compilação para bytecode
emmake make -f Makefile.libretro platform=emscripten \
  TARGET_NAME=genesis_plus_gx \
  HAVE_CHD=1 HAVE_CDROM=1 DEBUG=0 LOW_MEMORY=0

# Conversão para JS/WASM
emcc genesis_plus_gx_libretro_emscripten.bc emscripten_exports.c \
  -o genesis_plus_gx.js \
  -s WASM=1 \
  -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME='"genesis_plus_gx"' \
  -s EXPORTED_FUNCTIONS='["_malloc", "_free", "_get_frame_buffer_ref", "_get_frame_buffer_width", "_get_frame_buffer_height", "_get_frame_buffer_pitch", "_get_work_ram_ptr", "_get_work_ram_size", "_get_zram_ptr", "_get_zram_size", "_get_vram_ptr", "_get_vram_size", "_get_cram_ptr", "_get_cram_size", "_get_vsram_ptr", "_get_vsram_size", "_get_vdp_regs_ptr", "_get_vdp_regs_size", "_get_sat_ptr", "_get_sat_size", "_is_core_initialized", "_get_total_memory_size", "_get_active_system_code"]' \
  -O2
```

### 4. CONFIGURAÇÕES ESPECÍFICAS POR PLATAFORMA

#### Master System (SMS) <mcreference link="https://docs-test-retroa.readthedocs.io/en/latest/library/genesis_plus_gx/" index="2">2</mcreference>
- **FM Chip**: Habilitar suporte ao chip FM para áudio aprimorado
- **Resolução**: 256x192 (modo padrão)
- **Memória**: Work RAM reduzida comparado ao Mega Drive

#### Game Gear (GG) <mcreference link="https://docs.libretro.com/library/genesis_plus_gx/" index="1">1</mcreference>
- **Modo SMS**: Forçar execução em modo SMS com resolução 256x192
- **Paleta**: Suporte a paleta estendida do Game Gear
- **Tela**: Viewport ajustado para proporção do Game Gear

#### Sega CD/Mega CD <mcreference link="https://docs.libretro.com/library/genesis_plus_gx/" index="2">2</mcreference>
- **CHD Support**: Obrigatório HAVE_CHD=1 para arquivos comprimidos
- **CUE Sheets**: Suporte a arquivos .cue para múltiplas faixas
- **Memória Estendida**: MAX_ROM_SIZE=33554432 (32MB)

#### Mega Drive/Genesis
- **Modo Padrão**: Configuração principal do emulador
- **Compatibilidade**: 100% com jogos licenciados e não-licenciados
- **SVP**: Suporte ao chip SVP (Virtua Racing)

### 5. VALIDAÇÃO PÓS-COMPILAÇÃO

#### Testes Obrigatórios
```bash
# 1. Verificar que EJS_Runtime ainda funciona
npm run test:full

# 2. Verificar tamanhos dos arquivos
ls -la public/emulatorjs-data/cores/genesis_plus_gx.*
# Esperado: .js > 100KB, .wasm > 1MB

# 3. Verificar exports no JS
grep -c "_get_vram_ptr" public/emulatorjs-data/cores/genesis_plus_gx.js
# Esperado: > 0

# 4. Teste de integridade WASM
file public/emulatorjs-data/cores/genesis_plus_gx.wasm
# Esperado: WebAssembly (wasm) binary module
```

#### Critérios de Sucesso
- ✅ **6/6 testes passando** (incluindo Canvas)
- ✅ **EJS_Runtime carregando** sem erros
- ✅ **Arquivo WASM > 1MB** (não corrompido)
- ✅ **Todas as exportações presentes** no JS
- ✅ **Canvas renderizando** corretamente

### 6. ESTRUTURA DE EXPORTAÇÃO DE GRÁFICOS

#### Para Universal Asset Studio
```javascript
// Estrutura de dados esperada pelo sistema
interface GenesisMemorySnapshot {
  // Framebuffer
  framebuffer: Uint8ClampedArray;  // Dados RGB
  width: number;                   // Largura (320 para MD, 256 para SMS)
  height: number;                  // Altura (224/240 para MD, 192 para SMS)
  
  // Memória de Vídeo
  vram: Uint8Array;               // 64KB Video RAM
  cram: Uint8Array;               // 128B Color RAM (paletas)
  vsram: Uint8Array;              // 128B Vertical Scroll RAM
  sat: Uint8Array;                // 1KB Sprite Attribute Table
  regs: Uint8Array;               // 32B VDP Registers
  
  // Memória Principal
  workRam: Uint8Array;            // 64KB Work RAM (68000)
  zRam: Uint8Array;               // 8KB Z80 RAM
  
  // Metadados
  systemCode: number;             // SYSTEM_SMS, SYSTEM_GG, SYSTEM_MD, etc.
}
```

### 7. RESOLUÇÃO DE PROBLEMAS CONHECIDOS

#### Erro: "Import #0 'a': module is not an object"
**Causa**: Incompatibilidade entre exports do JS e imports do WASM
**Solução**: Garantir que `emscripten_exports.c` seja linkado corretamente

#### Erro: "EJS_Runtime is not defined"
**Causa**: Timing de carregamento
**Solução**: PRESERVAR o carregamento imediato no `index.html`

#### Arquivo WASM muito pequeno (<1MB)
**Causa**: Compilação incompleta ou exports ausentes
**Solução**: Verificar que `emscripten_exports.c` foi incluído no build

### 8. ENTREGA FINAL

#### Arquivos a Gerar
1. `genesis_plus_gx.js` - Core JavaScript (>100KB)
2. `genesis_plus_gx.wasm` - Core WebAssembly (>1MB)

#### Localização de Deploy
```
public/emulatorjs-data/cores/
├── genesis_plus_gx.js    # Substituir arquivo existente
└── genesis_plus_gx.wasm  # Substituir arquivo existente
```

#### Validação Final
```bash
# Executar teste completo
npm run test:full

# Resultado esperado: 6/6 testes passando
# ✅ ROM existe
# ✅ Página carrega
# ✅ Workers inicializam
# ✅ ROM carrega
# ✅ EmulatorJS inicializa
# ✅ Canvas renderiza
```

## RESUMO EXECUTIVO

**MISSÃO**: Compilar Genesis Plus GX com 100% compatibilidade para EmulatorJS
**PLATAFORMAS**: SMS, Game Gear, Mega Drive, Sega CD (32X não suportado)
**PRESERVAR**: Todas as correções do EJS_Runtime e sistema de testes
**OBJETIVO**: Alcançar 6/6 testes passando (100% funcionalidade)
**VALIDAÇÃO**: Canvas deve renderizar sem erros de WebAssembly

---

**IMPORTANTE**: Este prompt é autossuficiente. Siga todas as instruções na ordem apresentada para garantir uma compilação bem-sucedida sem regressões.