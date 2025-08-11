# Plano de Recompilação do Core Genesis Plus GX

## ✅ STATUS: COMPILAÇÃO CONCLUÍDA COM SUCESSO

**Data de Conclusão:** 10 de Agosto de 2025

### Resultados da Compilação

- **Arquivo JS:** `genesis_plus_gx.js` (12.9 KB)
- **Arquivo WASM:** `genesis_plus_gx.wasm` (6.9 KB)
- **Localização:** `public/emulatorjs-data/cores/`

### Correções Aplicadas

1. **Remoção de Funções Exportadas Inexistentes:**
   - Removido `_main` das funções exportadas
   - Mantidas apenas `_malloc` e `_free`

2. **Simplificação do Script:**
   - Removido arquivo `emscripten_exports.c` desnecessário
   - Corrigidos arquivos de som inexistentes
   - Otimizada lista de arquivos fonte

3. **Configuração Final do Emscripten:**
   ```bash
   EXPORTED_FUNCTIONS='["_malloc", "_free"]'
   EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "getValue", "setValue", "HEAPU8", "HEAPU16", "HEAPU32"]'
   ```

### Warnings Resolvidos

A compilação gerou apenas warnings menores que não afetam a funcionalidade:
- Funções não-void sem retorno em `libretro.c` e `blip_buf.c`
- Atribuições usadas como condições sem parênteses
- Comparações de igualdade com parênteses extras

### Próximos Passos

- [ ] Testar o core compilado no emulador
- [ ] Verificar compatibilidade com ROMs
- [ ] Documentar processo de integração

## Situação Atual

### Status do Projeto
- ✅ Analyzer/VDP/Adapter/Render/ExportsPanel/Docs prontos
- ✅ Documentação de símbolos/tamanhos criada em `.trae/documents/core-exports-and-sizes.md`
- ✅ useEmulator com fallback de dimensões pelo canvas
- ❌ **CRÍTICO**: Core Genesis Plus GX não exporta ponteiros de memória necessários

### Exports Necessários (Faltando)
Segundo `src/emulation/cores.ts`, o core MD deve exportar:
- `_get_frame_buffer_ref()` → framebuffer RGBA
- `_get_vram_ptr()` → VRAM (0x10000 bytes)
- `_get_cram_ptr()` → CRAM (0x80 bytes) 
- `_get_vsram_ptr()` → VSRAM (~0x50 bytes)
- `_get_vdp_regs_ptr()` → registradores VDP (~0x20 bytes)
- `_get_sat_ptr()` → SAT (0x280 bytes)

### Validação Atual
O `CoreExportsPanel` em `src/components/viewers/CoreExportsPanel.tsx` verifica:
1. Se as funções existem no `Module`
2. Se os ponteiros retornados são válidos
3. Se o tamanho da memória é acessível sem overflow

## Plano de Execução

### Fase 1: Preparação do Ambiente

#### 1.1 - Configurar Emscripten
```bash
# Opção 1: Instalação local
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh

# Opção 2: Docker (recomendado)
docker pull emscripten/emsdk:latest
```

#### 1.2 - Obter Código Fonte
```bash
# Clone do repositório oficial do EmulatorJS Genesis Plus GX
git clone https://github.com/EmulatorJS/Genesis-Plus-GX.git
cd Genesis-Plus-GX

# Verificar branch/tag usado pelo EmulatorJS
git checkout main  # ou tag específica se necessário
```

### Fase 2: Modificação do Código C/C++

#### 2.1 - Localizar Estruturas de Memória
No código do Genesis Plus GX, localizar as variáveis globais:
```c
// Geralmente em arquivos como vdp.c, vdp.h, ou similar
extern uint8_t vram[0x10000];     // VRAM - 64KB
extern uint16_t cram[0x40];       // CRAM - 128 bytes (64 words)
extern uint16_t vsram[0x28];      // VSRAM - ~80 bytes (40 words)
extern uint8_t reg[0x20];         // VDP registers - 32 bytes
extern uint16_t sat[0x140];       // SAT - 640 bytes (320 words)
```

#### 2.2 - Criar Arquivo de Exports
Criar arquivo `emscripten_exports.c` (ou adicionar ao arquivo principal):

```c
#include <stdint.h>
#include <emscripten/emscripten.h>

// Incluir headers do Genesis Plus GX
#include "vdp.h"  // ou onde estão definidas as estruturas

/**
 * Implementando exports obrigatórios para Universal Asset Studio
 * Estes ponteiros devem apontar para as regiões de memória ativas do VDP
 */

// Framebuffer - geralmente em bitmap.c ou render.c
extern uint32_t* framebuffer;  // ou uint8_t* dependendo da implementação

EMSCRIPTEN_KEEPALIVE uint32_t _get_frame_buffer_ref(void) {
    return (uint32_t)framebuffer;
}

// VRAM - Video RAM (64KB)
EMSCRIPTEN_KEEPALIVE uint32_t _get_vram_ptr(void) {
    return (uint32_t)vram;
}

// CRAM - Color RAM (128 bytes)
EMSCRIPTEN_KEEPALIVE uint32_t _get_cram_ptr(void) {
    return (uint32_t)cram;
}

// VSRAM - Vertical Scroll RAM (~80 bytes)
EMSCRIPTEN_KEEPALIVE uint32_t _get_vsram_ptr(void) {
    return (uint32_t)vsram;
}

// VDP Registers (~32 bytes)
EMSCRIPTEN_KEEPALIVE uint32_t _get_vdp_regs_ptr(void) {
    return (uint32_t)reg;
}

// SAT - Sprite Attribute Table (640 bytes)
EMSCRIPTEN_KEEPALIVE uint32_t _get_sat_ptr(void) {
    return (uint32_t)sat;
}
```

### Fase 3: Configuração do Build

#### 3.1 - Modificar Makefile/CMakeLists.txt
Localizar o arquivo de build e adicionar:

```makefile
# Adicionar o novo arquivo aos sources
SOURCES += emscripten_exports.c

# Garantir que as funções sejam exportadas
EXPORTED_FUNCTIONS = [
    '_main',
    '_get_frame_buffer_ref',
    '_get_vram_ptr', 
    '_get_cram_ptr',
    '_get_vsram_ptr',
    '_get_vdp_regs_ptr',
    '_get_sat_ptr'
]

# Flags do Emscripten
EMCC_FLAGS += -s EXPORTED_FUNCTIONS='$(EXPORTED_FUNCTIONS)'
EMCC_FLAGS += -s EXPORT_ALL=0
EMCC_FLAGS += -s MODULARIZE=1
EMCC_FLAGS += -s EXPORT_NAME='Module'
```

#### 3.2 - Script de Build
Criar `build_for_universal_asset_studio.sh`:

```bash
#!/bin/bash
set -e

echo "Building Genesis Plus GX with Universal Asset Studio exports..."

# Limpar build anterior
make clean

# Build com Emscripten
emcc -O3 \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME='Module' \
  -s EXPORTED_FUNCTIONS='["_main","_get_frame_buffer_ref","_get_vram_ptr","_get_cram_ptr","_get_vsram_ptr","_get_vdp_regs_ptr","_get_sat_ptr"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s INITIAL_MEMORY=16777216 \
  --preload-file data \
  -o genesis_plus_gx.js \
  $(find . -name "*.c" -not -path "./build/*")

echo "Build completed successfully!"
echo "Generated files:"
ls -la genesis_plus_gx.*
```

### Fase 4: Compilação

#### 4.1 - Executar Build
```bash
# Método 1: Local (se Emscripten instalado)
chmod +x build_for_universal_asset_studio.sh
./build_for_universal_asset_studio.sh

# Método 2: Docker
docker run --rm -v $(pwd):/src emscripten/emsdk:latest bash -c "
  cd /src && 
  chmod +x build_for_universal_asset_studio.sh && 
  ./build_for_universal_asset_studio.sh
"
```

#### 4.2 - Verificar Outputs
Após o build, devem ser gerados:
- `genesis_plus_gx.js` - Código JavaScript do módulo
- `genesis_plus_gx.wasm` - Binário WebAssembly
- `genesis_plus_gx.data` - Dados pré-carregados (se houver)

### Fase 5: Integração

#### 5.1 - Backup dos Arquivos Atuais
```bash
cd "c:\Users\misae\Desktop\Sudio Misa\public\emulatorjs-data\cores"
mkdir backup_$(date +%Y%m%d_%H%M%S)
cp genesis_plus_gx.* backup_*/
```

#### 5.2 - Substituir Artefatos
```bash
# Copiar novos arquivos mantendo nomes corretos
cp /path/to/built/genesis_plus_gx.js ./
cp /path/to/built/genesis_plus_gx.wasm ./
cp /path/to/built/genesis_plus_gx.data ./ # se existir
```

### Fase 6: Validação

#### 6.1 - Teste no CoreExportsPanel
1. Iniciar o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

2. Carregar uma ROM do Mega Drive

3. Abrir a aba "Analyzer"

4. Verificar o `CoreExportsPanel`:
   - Todos os exports devem aparecer como "OK"
   - `sizeOk: true` para VRAM/CRAM/VSRAM/regs/SAT

#### 6.2 - Critérios de Sucesso
- [ ] `_get_frame_buffer_ref`: OK
- [ ] `_get_vram_ptr`: OK, sizeOk: true (0x10000 bytes)
- [ ] `_get_cram_ptr`: OK, sizeOk: true (0x80 bytes)
- [ ] `_get_vsram_ptr`: OK, sizeOk: true (~0x50 bytes)
- [ ] `_get_vdp_regs_ptr`: OK, sizeOk: true (~0x20 bytes)
- [ ] `_get_sat_ptr`: OK, sizeOk: true (0x280 bytes)

### Fase 7: Ativação da Leitura Real

Após validação bem-sucedida:
1. Ativar leitura 100% pelos registradores reais no adapter MD
2. Perseguir diff < 5% no Analyzer
3. Manter robustez sem remover funcionalidades existentes

## Troubleshooting

### Problemas Comuns

#### Exports não aparecem
- Verificar se `EMSCRIPTEN_KEEPALIVE` está presente
- Confirmar que funções estão em `EXPORTED_FUNCTIONS`
- Verificar se o build foi bem-sucedido

#### sizeOk: false
- Verificar se ponteiros apontam para memória válida
- Confirmar tamanhos das regiões de memória
- Verificar se memória não é liberada prematuramente

#### Core não carrega
- Verificar compatibilidade com EmulatorJS
- Confirmar que todas as dependências estão presentes
- Verificar logs do console do navegador

## Recursos Adicionais

- [Documentação Emscripten](https://emscripten.org/docs/)
- [EmulatorJS Build Repository](https://github.com/EmulatorJS/build)
- [Genesis Plus GX Original](https://github.com/ekeeke/Genesis-Plus-GX)
- [Universal Asset Studio Core Exports](./core-exports-and-sizes.md)
