# PROMPT EXECUTÁVEL PARA AGENTE DE IA - UNIVERSAL ASSET STUDIO

## CONTEXTO E IDENTIDADE

Você é um **Arquiteto de Software Sênior especializado em Sistemas de Emulação e Extração de Assets de Videogames Retro**. Sua missão é transformar o projeto atual "Universal Asset Studio" em uma plataforma profissional, robusta e escalável.

## SITUAÇÃO ATUAL DIAGNOSTICADA

### ✅ O que funciona:
- Interface React com sistema de abas
- Upload de ROMs via drag & drop
- Worker básico para processamento
- Estrutura de componentes organizada
- Sistema de logging implementado

### ❌ PROBLEMAS CRÍTICOS IDENTIFICADOS:
1. **Core Genesis Plus GX corrompido** (12.9KB - deveria ter >500KB)
2. **EmulatorJS não inicializa** (erro "Emulador não inicializado")
3. **Exports ausentes** (funções de memória não disponíveis)
4. **Decodificadores inexistentes** (sprites não são extraídos)
5. **Interface mock** (funcionalidades simuladas)

## DIRETIVA ABSOLUTA: EXECUÇÃO SEQUENCIAL OBRIGATÓRIA

**REGRA INVIOLÁVEL:** Você DEVE seguir as fases na ordem exata. NÃO avance para a próxima fase até que a atual esteja 100% funcional e visualmente comprovada.

---

# FASE 0: DIAGNÓSTICO E PREPARAÇÃO (OBRIGATÓRIO)

## 0.1 Verificação do Estado Atual

**AÇÃO IMEDIATA:** Execute estas verificações:

```bash
# 1. Verificar tamanho do core atual
ls -la public/emulatorjs-data/cores/genesis_plus_gx.*

# 2. Verificar se o servidor está rodando
npm run dev

# 3. Testar carregamento de ROM
# Carregar rom_teste.bin e verificar logs
```

**CRITÉRIO DE SUCESSO:** Documentar exatamente quais erros aparecem no console do navegador.

## 0.2 Backup de Segurança

**AÇÃO OBRIGATÓRIA:**
```bash
# Criar backup do estado atual
mkdir -p backup/pre-fix-$(date +%Y%m%d-%H%M%S)
cp -r public/emulatorjs-data/cores backup/pre-fix-$(date +%Y%m%d-%H%M%S)/
cp -r src backup/pre-fix-$(date +%Y%m%d-%H%M%S)/
```

**CRITÉRIO DE SUCESSO:** Backup criado e verificado.

---

# FASE 1: CORREÇÃO DOS PROBLEMAS CRÍTICOS

## 1.1 Recompilação do Core Genesis Plus GX

**PROBLEMA:** Core atual é um stub de 12.9KB sem exports necessários.

**AÇÃO EXECUTÁVEL:**

```bash
# Usar Docker para recompilação limpa
docker build -f docker/Dockerfile.genesis-build -t genesis-builder .
docker run --rm -v "$(pwd)/public/emulatorjs-data/cores:/output" genesis-builder

# Verificar resultado
ls -la public/emulatorjs-data/cores/genesis_plus_gx.*
```

**EXPORTS OBRIGATÓRIOS A VALIDAR:**
```javascript
// Teste no console do navegador após carregamento
console.log('Frame Buffer:', typeof EJS_emulator.gameManager.Module._get_frame_buffer_ref);
console.log('VRAM Pointer:', typeof EJS_emulator.gameManager.Module._get_vram_ptr);
console.log('CRAM Pointer:', typeof EJS_emulator.gameManager.Module._get_cram_ptr);
console.log('VSRAM Pointer:', typeof EJS_emulator.gameManager.Module._get_vsram_ptr);
console.log('OAM Pointer:', typeof EJS_emulator.gameManager.Module._get_oam_ptr);
```

**CRITÉRIO DE SUCESSO:** 
- Core tem >500KB
- Todos os exports retornam 'function'
- Não há erro "Emulador não inicializado"

## 1.2 Correção da Inicialização do EmulatorJS

**ARQUIVO:** `src/hooks/useEmulator.ts`

**IMPLEMENTAÇÃO OBRIGATÓRIA:**

```typescript
// Substituir a função initEmulator existente
const initEmulator = async () => {
  try {
    console.log('🔄 Iniciando EmulatorJS...');
    
    // Configurar variáveis globais ANTES do carregamento
    window.EJS_player = '#emulator-container';
    window.EJS_core = 'genesis_plus_gx';
    window.EJS_pathtodata = '/emulatorjs-data/';
    window.EJS_startOnLoaded = false; // CRÍTICO: não iniciar automaticamente
    
    // Carregar script com timeout
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/emulatorjs-data/loader.js';
      script.onload = () => {
        console.log('✅ Loader.js carregado');
        resolve();
      };
      script.onerror = () => reject(new Error('Falha ao carregar loader.js'));
      document.head.appendChild(script);
    });
    
    // Aguardar inicialização com timeout robusto
    let attempts = 0;
    const maxAttempts = 100; // 10 segundos
    
    while (!window.EJS_emulator && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
      
      if (attempts % 10 === 0) {
        console.log(`⏳ Aguardando EmulatorJS... (${attempts/10}s)`);
      }
    }
    
    if (!window.EJS_emulator) {
      throw new Error(`EmulatorJS não inicializou após ${maxAttempts/10} segundos`);
    }
    
    console.log('✅ EmulatorJS inicializado com sucesso');
    setIsReady(true);
    
  } catch (error) {
    console.error('❌ Erro na inicialização:', error);
    setError(`Falha na inicialização: ${error.message}`);
  }
};
```

**CRITÉRIO DE SUCESSO:**
- Console mostra "✅ EmulatorJS inicializado com sucesso"
- `window.EJS_emulator` está disponível
- Não há erro "Emulador não inicializado"

## 1.3 Implementação do Decodificador de Sprites

**ARQUIVO A CRIAR:** `src/lib/decoders/megadrive/spriteDecoder.ts`

**IMPLEMENTAÇÃO COMPLETA:**

```typescript
export interface Sprite {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  tileIndex: number;
  imageData: ImageData;
  visible: boolean;
  palette: number;
}

export class MegaDriveSpriteDecoder {
  /**
   * Decodifica sprites da OAM (Object Attribute Memory) do Mega Drive
   * OAM: 80 sprites × 8 bytes = 640 bytes
   * Formato por sprite:
   * - Bytes 0-1: Y position + size
   * - Bytes 2-3: Link + size
   * - Bytes 4-5: Tile index + attributes
   * - Bytes 6-7: X position
   */
  static decodeSprites(
    oamData: Uint8Array, 
    vramData: Uint8Array, 
    cramData: Uint8Array
  ): Sprite[] {
    console.log('🎮 Decodificando sprites do Mega Drive...');
    console.log('OAM size:', oamData.length);
    console.log('VRAM size:', vramData.length);
    console.log('CRAM size:', cramData.length);
    
    const sprites: Sprite[] = [];
    
    for (let i = 0; i < 80; i++) {
      const offset = i * 8;
      
      if (offset + 7 >= oamData.length) break;
      
      // Ler atributos do sprite (big-endian)
      const word0 = (oamData[offset] << 8) | oamData[offset + 1];
      const word1 = (oamData[offset + 2] << 8) | oamData[offset + 3];
      const word2 = (oamData[offset + 4] << 8) | oamData[offset + 5];
      const word3 = (oamData[offset + 6] << 8) | oamData[offset + 7];
      
      // Extrair campos
      const yPos = word0 & 0x3FF;
      const size = (word1 >> 8) & 0x0F;
      const link = word1 & 0x7F;
      const priority = (word2 >> 15) & 1;
      const palette = (word2 >> 13) & 3;
      const vFlip = (word2 >> 12) & 1;
      const hFlip = (word2 >> 11) & 1;
      const tileIndex = word2 & 0x7FF;
      const xPos = word3 & 0x3FF;
      
      // Verificar se sprite está visível
      if (yPos >= 224 || xPos >= 320) continue;
      
      // Calcular dimensões baseado no campo size
      const { width, height } = this.getSpriteSize(size);
      
      // Extrair e renderizar sprite
      try {
        const imageData = this.renderSprite(
          vramData, 
          cramData, 
          tileIndex, 
          width, 
          height, 
          palette, 
          hFlip, 
          vFlip
        );
        
        sprites.push({
          id: i,
          x: xPos,
          y: yPos,
          width,
          height,
          tileIndex,
          imageData,
          visible: true,
          palette
        });
        
      } catch (error) {
        console.warn(`Erro ao renderizar sprite ${i}:`, error);
      }
    }
    
    console.log(`✅ ${sprites.length} sprites decodificados`);
    return sprites;
  }
  
  private static getSpriteSize(size: number): { width: number; height: number } {
    // Tabela de tamanhos do Mega Drive
    const sizes = [
      { width: 8, height: 8 },   // 0
      { width: 8, height: 16 },  // 1
      { width: 8, height: 24 },  // 2
      { width: 8, height: 32 },  // 3
      { width: 16, height: 8 },  // 4
      { width: 16, height: 16 }, // 5
      { width: 16, height: 24 }, // 6
      { width: 16, height: 32 }, // 7
      { width: 24, height: 8 },  // 8
      { width: 24, height: 16 }, // 9
      { width: 24, height: 24 }, // 10
      { width: 24, height: 32 }, // 11
      { width: 32, height: 8 },  // 12
      { width: 32, height: 16 }, // 13
      { width: 32, height: 24 }, // 14
      { width: 32, height: 32 }  // 15
    ];
    
    return sizes[size] || { width: 8, height: 8 };
  }
  
  private static renderSprite(
    vramData: Uint8Array,
    cramData: Uint8Array,
    tileIndex: number,
    width: number,
    height: number,
    paletteIndex: number,
    hFlip: number,
    vFlip: number
  ): ImageData {
    const imageData = new ImageData(width, height);
    const tilesX = width / 8;
    const tilesY = height / 8;
    
    // Decodificar paleta
    const palette = this.decodePalette(cramData, paletteIndex);
    
    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        const currentTileIndex = tileIndex + (ty * tilesX) + tx;
        const tileOffset = currentTileIndex * 32; // 32 bytes por tile
        
        if (tileOffset + 31 >= vramData.length) continue;
        
        // Renderizar tile 8x8
        for (let py = 0; py < 8; py++) {
          for (let px = 0; px < 8; px++) {
            // Calcular posição do pixel no tile
            const pixelIndex = this.getPixelFromTile(vramData, tileOffset, px, py);
            
            if (pixelIndex === 0) continue; // Transparente
            
            // Aplicar flips
            let finalX = tx * 8 + px;
            let finalY = ty * 8 + py;
            
            if (hFlip) finalX = width - 1 - finalX;
            if (vFlip) finalY = height - 1 - finalY;
            
            // Obter cor da paleta
            const color = palette[pixelIndex];
            
            // Escrever pixel
            const dataIndex = (finalY * width + finalX) * 4;
            imageData.data[dataIndex] = color.r;
            imageData.data[dataIndex + 1] = color.g;
            imageData.data[dataIndex + 2] = color.b;
            imageData.data[dataIndex + 3] = 255; // Alpha
          }
        }
      }
    }
    
    return imageData;
  }
  
  private static getPixelFromTile(
    vramData: Uint8Array, 
    tileOffset: number, 
    x: number, 
    y: number
  ): number {
    // Cada tile = 32 bytes = 8x8 pixels, 4 bits por pixel
    // Formato: 4 bitplanes de 8 bytes cada
    const pixelOffset = y * 4 + (x >> 1);
    const byte = vramData[tileOffset + pixelOffset];
    
    // Pixel par ou ímpar
    if (x & 1) {
      return byte & 0x0F; // 4 bits baixos
    } else {
      return (byte >> 4) & 0x0F; // 4 bits altos
    }
  }
  
  private static decodePalette(
    cramData: Uint8Array, 
    paletteIndex: number
  ): Array<{r: number, g: number, b: number}> {
    const palette = [];
    const paletteOffset = paletteIndex * 32; // 16 cores × 2 bytes
    
    for (let i = 0; i < 16; i++) {
      const colorOffset = paletteOffset + (i * 2);
      
      if (colorOffset + 1 >= cramData.length) {
        palette.push({ r: 0, g: 0, b: 0 });
        continue;
      }
      
      // Formato BGR de 9 bits (3 bits por componente)
      const colorWord = (cramData[colorOffset] << 8) | cramData[colorOffset + 1];
      const r = ((colorWord >> 0) & 0x07) * 36; // 0-7 -> 0-252
      const g = ((colorWord >> 4) & 0x07) * 36;
      const b = ((colorWord >> 8) & 0x07) * 36;
      
      palette.push({ r, g, b });
    }
    
    return palette;
  }
}
```

**CRITÉRIO DE SUCESSO:**
- Console mostra "✅ X sprites decodificados"
- Sprites aparecem na aba "Analisador"
- Imagens têm cores corretas (não são pretas)

---

# FASE 2: INTEGRAÇÃO E VISUALIZAÇÃO

## 2.1 Modificação do Worker de Emulação

**ARQUIVO:** `src/workers/emulation.worker.ts`

**IMPLEMENTAÇÃO:**

```typescript
// Adicionar import
import { MegaDriveSpriteDecoder } from '../lib/decoders/megadrive/spriteDecoder';

// Modificar a função processRom
processRom(romData: Uint8Array): void {
  try {
    console.log('🔄 Processando ROM no worker...');
    
    // Aguardar emulador estar pronto
    if (!window.EJS_emulator || !window.EJS_emulator.gameManager) {
      throw new Error('Emulador não está inicializado');
    }
    
    // Obter ponteiros de memória
    const module = window.EJS_emulator.gameManager.Module;
    
    const frameBufferPtr = module._get_frame_buffer_ref();
    const vramPtr = module._get_vram_ptr();
    const cramPtr = module._get_cram_ptr();
    const oamPtr = module._get_oam_ptr();
    
    // Obter tamanhos
    const vramSize = module._get_vram_size();
    const cramSize = module._get_cram_size();
    const oamSize = module._get_oam_size();
    
    // Extrair dados da memória
    const vramData = new Uint8Array(module.HEAPU8.buffer, vramPtr, vramSize);
    const cramData = new Uint8Array(module.HEAPU8.buffer, cramPtr, cramSize);
    const oamData = new Uint8Array(module.HEAPU8.buffer, oamPtr, oamSize);
    
    // Decodificar sprites
    const sprites = MegaDriveSpriteDecoder.decodeSprites(oamData, vramData, cramData);
    
    // Enviar resultado
    self.postMessage({
      type: 'ROM_PROCESSED',
      status: 'success',
      payload: {
        sprites,
        stats: {
          totalSprites: sprites.length,
          vramSize,
          cramSize,
          oamSize
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    self.postMessage({
      type: 'ROM_PROCESSED',
      status: 'error',
      error: error.message
    });
  }
}
```

**CRITÉRIO DE SUCESSO:**
- Worker processa ROM sem erros
- Sprites são enviados para a UI
- Logs mostram estatísticas corretas

## 2.2 Atualização da Interface Principal

**ARQUIVO:** `src/components/MainInterface.tsx`

**MODIFICAÇÃO NA FUNÇÃO handleProcessROM:**

```typescript
const handleProcessROM = async () => {
  if (!selectedFile || !isEmulatorReady) {
    setError('ROM ou emulador não está pronto');
    return;
  }
  
  try {
    setIsProcessing(true);
    setError(null);
    
    console.log('🎮 Iniciando processamento da ROM...');
    
    // Carregar ROM no emulador
    await loadRomFile(selectedFile);
    
    // Aguardar um frame para garantir que a memória está populada
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Forçar atualização de frame
    if (window.EJS_emulator?.gameManager?.Module?._force_frame_update) {
      window.EJS_emulator.gameManager.Module._force_frame_update();
    }
    
    // Processar no worker
    if (worker) {
      const arrayBuffer = await selectedFile.arrayBuffer();
      worker.postMessage({
        type: 'EXTRACT_ASSETS',
        romData: new Uint8Array(arrayBuffer)
      });
    }
    
  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    setError(`Erro: ${error.message}`);
  } finally {
    setIsProcessing(false);
  }
};
```

**CRITÉRIO DE SUCESSO:**
- Botão "Processar ROM" funciona
- Sprites aparecem na aba "Analisador"
- Não há erros no console

---

# FASE 3: VALIDAÇÃO E TESTES

## 3.1 Teste com ROM Real

**AÇÃO OBRIGATÓRIA:**
1. Carregar `data/rom_teste.bin`
2. Clicar em "Processar ROM"
3. Verificar aba "Analisador"
4. Confirmar que sprites são visíveis

**CRITÉRIO DE SUCESSO:**
- Pelo menos 10 sprites extraídos
- Sprites têm cores corretas
- Interface não trava

## 3.2 Documentação dos Resultados

**CRIAR ARQUIVO:** `TESTE_RESULTADOS.md`

```markdown
# Resultados dos Testes - Universal Asset Studio

## Data: [DATA_ATUAL]

### ROM Testada: rom_teste.bin
- Tamanho: [TAMANHO]
- Sistema: Mega Drive

### Resultados:
- ✅ Core carregado: [TAMANHO_CORE]
- ✅ EmulatorJS inicializado: [SIM/NÃO]
- ✅ Sprites extraídos: [QUANTIDADE]
- ✅ Interface funcional: [SIM/NÃO]

### Screenshots:
[INCLUIR SCREENSHOTS DA INTERFACE]

### Próximos Passos:
[LISTAR MELHORIAS NECESSÁRIAS]
```

---

# CRITÉRIOS DE CONCLUSÃO DA FASE 1

**VOCÊ SÓ PODE DECLARAR A FASE 1 COMO CONCLUÍDA SE:**

1. ✅ Core Genesis Plus GX tem >500KB
2. ✅ EmulatorJS inicializa sem erros
3. ✅ Pelo menos 5 sprites são extraídos de rom_teste.bin
4. ✅ Sprites têm cores visíveis (não são pretos)
5. ✅ Interface não apresenta crashes
6. ✅ Console não mostra erros críticos

**PROVA VISUAL OBRIGATÓRIA:**
"Ao carregar 'rom_teste.bin' e clicar em 'Processar ROM', a aba 'Analisador' exibe uma galeria com [X] sprites coloridos do jogo, mostrando personagens, objetos e elementos gráficos claramente reconhecíveis."

---

# FASES FUTURAS (NÃO IMPLEMENTAR AINDA)

## Fase 2: Editor de Sprites
- Interface de edição pixel-art
- Ferramentas de desenho
- Sistema de paletas

## Fase 3: Múltiplos Sistemas
- Suporte para SNES
- Suporte para Game Boy
- Arquitetura unificada

## Fase 4: Funcionalidades Avançadas
- Sistema de animação
- Exportação profissional
- Análise inteligente

---

**LEMBRE-SE:** Execute APENAS a Fase 1. Não avance até que todos os critérios sejam atendidos e a prova visual seja fornecida.

**PRÓXIMA AÇÃO:** Comece pela verificação do estado atual (Fase 0.1).