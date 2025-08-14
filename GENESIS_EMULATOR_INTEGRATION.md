# Integração do Emulador Genesis Plus GX

## Resumo da Compilação

O emulador Genesis Plus GX foi compilado com sucesso para JavaScript/WebAssembly usando Emscripten. Os arquivos gerados estão localizados em `public/emulators/`:

- **genesis_plus_gx.js** (63 KB) - Módulo JavaScript principal
- **genesis_plus_gx.wasm** (2.1 MB) - Código WebAssembly otimizado

## Funções Exportadas

O emulador exporta as seguintes funções para acesso às memórias internas:

### Funções de Acesso à Memória
- `_get_frame_buffer_ref()` - Ponteiro para o framebuffer (dados de vídeo)
- `_get_vram_ptr()` - Ponteiro para VRAM (Video RAM)
- `_get_cram_ptr()` - Ponteiro para CRAM (Color RAM - paletas)
- `_get_vsram_ptr()` - Ponteiro para VSRAM (Vertical Scroll RAM)
- `_get_sat_ptr()` - Ponteiro para SAT (Sprite Attribute Table)
- `_get_vdp_regs_ptr()` - Ponteiro para registradores VDP

### Funções LibRetro
- `_retro_init()` - Inicializar emulador
- `_retro_deinit()` - Finalizar emulador
- `_retro_load_game()` - Carregar ROM
- `_retro_run()` - Executar um frame
- `_retro_reset()` - Resetar sistema
- `_retro_get_system_info()` - Informações do sistema
- `_retro_get_system_av_info()` - Informações de áudio/vídeo
- `_retro_set_video_refresh()` - Callback de vídeo
- `_retro_set_audio_sample()` - Callback de áudio
- `_retro_set_audio_sample_batch()` - Callback de áudio em lote
- `_retro_set_input_poll()` - Callback de entrada
- `_retro_set_input_state()` - Estado de entrada

## Como Usar no Universal Asset Studio

### 1. Carregamento do Módulo

```javascript
// Carregar o módulo Genesis Plus GX
const GenesisCore = await import('/emulators/genesis_plus_gx.js');
const genesis = await GenesisCore.default();
```

### 2. Inicialização

```javascript
// Inicializar o emulador
genesis.ccall('retro_init', null, [], []);

// Configurar callbacks (opcional para extração de assets)
genesis.ccall('retro_set_video_refresh', null, ['number'], [0]);
genesis.ccall('retro_set_audio_sample', null, ['number'], [0]);
genesis.ccall('retro_set_input_poll', null, ['number'], [0]);
genesis.ccall('retro_set_input_state', null, ['number'], [0]);
```

### 3. Carregamento de ROM

```javascript
// Carregar ROM do Mega Drive/Genesis
const romData = new Uint8Array(romBuffer); // Buffer da ROM
const romPtr = genesis._malloc(romData.length);
genesis.HEAPU8.set(romData, romPtr);

// Estrutura retro_game_info
const gameInfo = genesis._malloc(16); // sizeof(retro_game_info)
genesis.setValue(gameInfo, romPtr, 'i32');      // data
genesis.setValue(gameInfo + 4, romData.length, 'i32'); // size
genesis.setValue(gameInfo + 8, 0, 'i32');       // path (null)
genesis.setValue(gameInfo + 12, 0, 'i32');      // meta (null)

const success = genesis.ccall('retro_load_game', 'number', ['number'], [gameInfo]);
if (success) {
    console.log('ROM carregada com sucesso!');
}
```

### 4. Extração de Assets

```javascript
// Executar alguns frames para inicializar as memórias
for (let i = 0; i < 60; i++) {
    genesis.ccall('retro_run', null, [], []);
}

// Acessar VRAM (tiles e sprites)
const vramPtr = genesis.ccall('get_vram_ptr', 'number', [], []);
const vramData = new Uint8Array(genesis.HEAPU8.buffer, vramPtr, 65536); // 64KB VRAM

// Acessar CRAM (paletas de cores)
const cramPtr = genesis.ccall('get_cram_ptr', 'number', [], []);
const cramData = new Uint16Array(genesis.HEAPU16.buffer, cramPtr / 2, 64); // 64 cores

// Acessar SAT (sprites)
const satPtr = genesis.ccall('get_sat_ptr', 'number', [], []);
const satData = new Uint8Array(genesis.HEAPU8.buffer, satPtr, 640); // Sprite Attribute Table

// Acessar framebuffer (imagem renderizada)
const fbPtr = genesis.ccall('get_frame_buffer_ref', 'number', [], []);
const framebuffer = new Uint8Array(genesis.HEAPU8.buffer, fbPtr, 320 * 240 * 2); // RGB565
```

### 5. Decodificação de Paletas

```javascript
// Converter paletas CRAM para CSS
function decodeMegaDrivePalette(cramData) {
    const palette = [];
    for (let i = 0; i < cramData.length; i++) {
        const color = cramData[i];
        const r = ((color >> 1) & 0x07) * 36; // 3 bits -> 8 bits
        const g = ((color >> 5) & 0x07) * 36; // 3 bits -> 8 bits  
        const b = ((color >> 9) & 0x07) * 36; // 3 bits -> 8 bits
        palette.push(`rgb(${r}, ${g}, ${b})`);
    }
    return palette;
}
```

### 6. Extração de Tiles

```javascript
// Extrair tiles de 8x8 pixels da VRAM
function extractTiles(vramData, palette) {
    const tiles = [];
    const tileSize = 32; // 8x8 pixels, 4 bits por pixel
    
    for (let tileIndex = 0; tileIndex < vramData.length / tileSize; tileIndex++) {
        const tileData = vramData.slice(tileIndex * tileSize, (tileIndex + 1) * tileSize);
        const canvas = document.createElement('canvas');
        canvas.width = 8;
        canvas.height = 8;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(8, 8);
        
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const byteIndex = (y * 4) + Math.floor(x / 2);
                const nibble = (x % 2) ? (tileData[byteIndex] & 0x0F) : ((tileData[byteIndex] & 0xF0) >> 4);
                
                if (nibble > 0 && nibble < palette.length) {
                    const color = palette[nibble];
                    const pixelIndex = (y * 8 + x) * 4;
                    // Converter RGB string para valores
                    const rgb = color.match(/\d+/g);
                    imageData.data[pixelIndex] = parseInt(rgb[0]);     // R
                    imageData.data[pixelIndex + 1] = parseInt(rgb[1]); // G
                    imageData.data[pixelIndex + 2] = parseInt(rgb[2]); // B
                    imageData.data[pixelIndex + 3] = 255;              // A
                }
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        tiles.push({
            index: tileIndex,
            canvas: canvas,
            dataURL: canvas.toDataURL()
        });
    }
    
    return tiles;
}
```

## Configurações de Compilação

O emulador foi compilado com as seguintes configurações:

- **Otimização**: O2 (otimização de tamanho e velocidade)
- **Formato**: WebAssembly modular
- **Memória**: 64MB inicial com crescimento dinâmico
- **Dependências**: CHD desabilitado para reduzir complexidade
- **Exports**: Funções LibRetro + funções customizadas de acesso à memória

## Próximos Passos

1. **Integrar no Web Worker**: Mover a lógica do emulador para um Web Worker
2. **Implementar UI**: Criar interface para carregar ROMs e visualizar assets
3. **Otimizar Extração**: Implementar algoritmos eficientes para detectar sprites
4. **Adicionar Filtros**: Permitir filtrar assets por tipo (tiles, sprites, paletas)
5. **Exportar Assets**: Implementar exportação em formatos padrão (PNG, JSON)

## Arquivos de Referência

- `temp/manual-build/genesis-plus-gx/emscripten_exports.c` - Funções exportadas customizadas
- `temp/manual-build/genesis-plus-gx/build_direct.ps1` - Script de compilação
- `public/emulators/genesis_plus_gx.js` - Módulo JavaScript
- `public/emulators/genesis_plus_gx.wasm` - Binário WebAssembly