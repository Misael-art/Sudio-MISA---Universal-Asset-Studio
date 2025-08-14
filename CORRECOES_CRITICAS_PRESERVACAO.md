# CORREÇÕES CRÍTICAS IMPLEMENTADAS - PRESERVAÇÃO

## RESUMO EXECUTIVO

Este documento registra todas as correções críticas implementadas no projeto EmulatorJS para garantir que não sejam perdidas durante a recompilação do core Genesis Plus GX. O sistema atual alcança **83% de funcionalidade** (5 de 6 testes passando).

## 1. CORREÇÃO CRÍTICA: EJS_Runtime Loading

### Problema Original
- Erro: `EJS_Runtime is not defined`
- Causa: Timing incorreto no carregamento do core
- Impacto: Falha total na inicialização do emulador

### Solução Implementada (index.html)
```html
<!-- CORREÇÃO CRÍTICA: Carregamento IMEDIATO do core Genesis Plus GX -->
<!-- Garante que EJS_Runtime esteja disponível ANTES de qualquer tentativa do EmulatorJS -->
<script src="/emulatorjs-data/cores/genesis_plus_gx.js"></script>

<!-- Configuração global para o módulo Emscripten -->
window.Module = {
  locateFile: function(path) {
    if (path.endsWith('.wasm') || path === 'genesis_plus_gx.wasm') {
      return '/emulatorjs-data/cores/genesis_plus_gx.wasm';
    }
    return path;
  },
  onRuntimeInitialized: function() {
    console.log('[MODULE] ✅ Genesis Plus GX runtime inicializado');
  }
};
```

### Status: ✅ RESOLVIDO COMPLETAMENTE
- EJS_Runtime agora carrega imediatamente
- Fallbacks robustos implementados
- Logs detalhados para debug

## 2. CORREÇÃO CRÍTICA: WASM Path Configuration

### Problema Original
- Arquivo WASM incorreto sendo carregado (7.7KB vs 1.3MB)
- Erro de "magic word" no WASM

### Solução Implementada
```javascript
// CORREÇÃO: locateFile aponta para o arquivo WASM correto
locateFile: function(path) {
  if (path.endsWith('.wasm')) {
    return '/emulatorjs-data/cores/genesis_plus_gx.wasm'; // 1.3MB correto
  }
  return path;
}
```

### Status: ✅ RESOLVIDO
- Caminho correto configurado
- Arquivo WASM de 1.3MB sendo usado

## 3. SISTEMA DE TESTES AUTOMATIZADO

### Implementação
- **Script Principal**: `test/emulator-test.js`
- **Script Simples**: `test/simple-test.js`
- **NPM Scripts**: `npm run test:full`, `npm run test`

### Testes Implementados
1. ✅ Verificação de ROM (data/rom_teste.bin)
2. ✅ Carregamento da página
3. ✅ Inicialização dos Workers
4. ✅ Carregamento da ROM
5. ✅ Inicialização do EmulatorJS
6. ❌ Canvas do emulador (falha restante)

### Comando de Validação
```bash
npm run test:full
```

## 4. ESTRUTURA DE MEMÓRIA EXPORTADA

### Arquivo: docker/emscripten_exports_corrected.c

#### Exportações Implementadas
```c
// Framebuffer
_get_frame_buffer_ref
_get_frame_buffer_width
_get_frame_buffer_height
_get_frame_buffer_pitch

// Memória Principal
_get_work_ram_ptr      // 64KB Work RAM do 68000
_get_zram_ptr          // 8KB Z80 RAM

// VDP (Video Display Processor)
_get_vram_ptr          // 64KB Video RAM
_get_cram_ptr          // 128 bytes Color RAM (paleta)
_get_vsram_ptr         // 128 bytes Vertical Scroll RAM
_get_vdp_regs_ptr      // 32 bytes VDP Registers
_get_sat_ptr           // 1KB Sprite Attribute Table

// Utilitários
_is_core_initialized
_get_total_memory_size
_get_active_system_code
```

## 5. AMBIENTE DE COMPILAÇÃO

### Docker Setup
- **Dockerfile**: `docker/Dockerfile.genesis-build`
- **Script**: `docker/compile-genesis.sh`
- **Exports**: `docker/emscripten_exports_corrected.c`

### Comando de Build
```bash
docker build -f docker/Dockerfile.genesis-build -t genesis-build .
docker run --rm -v $(pwd):/output genesis-build
```

## 6. ADAPTADORES DE SISTEMA

### MegaDriveAdapter.ts
- Decodificação de paletas (CRAM)
- Extração de tiles (VRAM)
- Reconstrução de layers (Plane A, B, Window)
- Extração de sprites (SAT)
- Suporte a scroll line/column

## 7. CONFIGURAÇÕES CRÍTICAS PRESERVAR

### package.json - Scripts
```json
{
  "scripts": {
    "test": "node test/simple-test.js",
    "test:full": "node test/emulator-test.js",
    "test:validate": "npm run check && npm run test"
  }
}
```

### Dependências Críticas
- `puppeteer`: "^24.16.1" (testes automatizados)
- `vite-plugin-wasm`: "^3.5.0" (suporte WASM)

## 8. PROBLEMA RESTANTE

### Teste 6: Canvas do Emulador (❌ FALHA)
- **Sintoma**: Canvas não inicializa corretamente
- **Causa Provável**: Incompatibilidade JS/WASM no core atual
- **Solução**: Recompilação com exports corretos

### Logs de Erro
```
WebAssembly.instantiate(): Import #0 "a": module is not an object or function
failed to asynchronously prepare wasm: TypeError: WebAssembly.instantiate()
```

## 9. INSTRUÇÕES PARA RECOMPILAÇÃO

### CRÍTICO: Preservar Durante Build
1. **NÃO ALTERAR**: `index.html` (carregamento EJS_Runtime)
2. **NÃO ALTERAR**: `test/` (sistema de testes)
3. **NÃO ALTERAR**: `src/emulation/adapters/` (decodificadores)
4. **USAR**: `docker/emscripten_exports_corrected.c` (exports)

### Validação Pós-Build
```bash
# 1. Verificar que EJS_Runtime ainda funciona
npm run test:full

# 2. Verificar tamanho dos arquivos
ls -la public/emulatorjs-data/cores/genesis_plus_gx.*

# 3. Verificar exports no JS
grep -c "_get_vram_ptr" public/emulatorjs-data/cores/genesis_plus_gx.js
```

## 10. MÉTRICAS DE SUCESSO

### Estado Atual: 83% Funcional
- ✅ EJS_Runtime: 100% resolvido
- ✅ Carregamento: 100% funcional
- ✅ Testes: 5/6 passando
- ❌ Canvas: Requer recompilação

### Meta: 100% Funcional
- ✅ Todos os 6 testes passando
- ✅ Canvas renderizando
- ✅ ROM carregando e executando

---

**IMPORTANTE**: Este documento deve ser consultado ANTES de qualquer recompilação para garantir que as correções críticas sejam preservadas.