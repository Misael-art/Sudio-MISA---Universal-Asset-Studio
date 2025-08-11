# Lista Completa de Implementações Pendentes - Universal Asset Studio

## STATUS ATUAL DO PROJETO

### ✅ O que já está implementado:
- Interface básica com sistema de abas
- Upload de ROMs via drag & drop
- Detecção automática de sistema (Mega Drive)
- Worker para processamento de ROMs
- Estrutura básica do EmulatorJS
- Sistema de logging
- Componentes de visualização (CoreExportsPanel, Analyzer)

### ❌ PROBLEMAS CRÍTICOS IDENTIFICADOS:
1. **Core Genesis Plus GX corrompido** - arquivo muito pequeno (12.9KB)
2. **Exports ausentes** - funções necessárias não estão disponíveis
3. **EmulatorJS não inicializa** - erro "Emulador não inicializado"
4. **Falta de decodificadores** - sprites não são extraídos
5. **Interface incompleta** - muitas funcionalidades são mock

---

## FASE 1: CORREÇÃO DE PROBLEMAS CRÍTICOS (PRIORIDADE MÁXIMA)

### 1.1 Recompilação do Core Genesis Plus GX

**PROBLEMA:** O arquivo `genesis_plus_gx.js` atual tem apenas 12.9KB e não contém os exports necessários.

**AÇÃO IMEDIATA:**
```bash
# Usar o script Docker existente para recompilação
docker build -f docker/Dockerfile.genesis-build -t genesis-builder .
docker run --rm -v "$(pwd)/public/emulatorjs-data/cores:/output" genesis-builder
```

**EXPORTS OBRIGATÓRIOS A IMPLEMENTAR:**
```c
extern "C" {
    // Ponteiros de memória essenciais
    uint8_t* _get_frame_buffer_ref();
    uint8_t* _get_vram_ptr();
    uint8_t* _get_cram_ptr();
    uint8_t* _get_vsram_ptr();
    uint8_t* _get_oam_ptr();
    
    // Tamanhos das regiões
    uint32_t _get_vram_size();
    uint32_t _get_cram_size();
    uint32_t _get_vsram_size();
    uint32_t _get_oam_size();
    
    // Controle de execução
    void _force_frame_update();
    uint32_t _get_frame_count();
}
```

**DELIVERABLES:**
- [ ] Core recompilado com tamanho >500KB
- [ ] Todos os exports funcionais
- [ ] Validação automática na inicialização
- [ ] Backup do core anterior

### 1.2 Correção da Inicialização do EmulatorJS

**PROBLEMA:** `window.EJS_emulator` não está sendo inicializado corretamente.

**ARQUIVOS A MODIFICAR:**
- `src/hooks/useEmulator.ts` - função `initEmulator`
- `src/hooks/useEmulator.ts` - função `loadRomFile`
- `src/components/MainInterface.tsx` - tratamento de erros

**IMPLEMENTAÇÕES NECESSÁRIAS:**
```typescript
// Em useEmulator.ts
const initEmulator = async () => {
  try {
    // Aguardar carregamento completo do script
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/emulatorjs-data/loader.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    
    // Aguardar inicialização do EJS_emulator
    let attempts = 0;
    while (!window.EJS_emulator && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.EJS_emulator) {
      throw new Error('EmulatorJS failed to initialize after 5 seconds');
    }
    
    setIsReady(true);
  } catch (error) {
    setError(`Initialization failed: ${error.message}`);
  }
};
```

**DELIVERABLES:**
- [ ] Inicialização robusta com timeout
- [ ] Tratamento de erros detalhado
- [ ] Logging de debug para diagnóstico
- [ ] Validação de dependências

### 1.3 Implementação dos Decodificadores de Assets

**PROBLEMA:** Não existem decodificadores reais para extrair sprites da memória.

**ARQUIVOS A CRIAR/MODIFICAR:**
- `src/lib/decoders/megadrive/` - pasta completa
- `src/lib/decoders/megadrive/spriteDecoder.ts`
- `src/lib/decoders/megadrive/paletteDecoder.ts`
- `src/lib/decoders/megadrive/tileDecoder.ts`

**IMPLEMENTAÇÃO DO SPRITE DECODER:**
```typescript
// src/lib/decoders/megadrive/spriteDecoder.ts
export class MegaDriveSpriteDecoder {
  /**
   * Decodifica sprites da OAM (Object Attribute Memory)
   * OAM no Mega Drive: 80 sprites × 8 bytes = 640 bytes
   */
  static decodeSprites(oamData: Uint8Array, vramData: Uint8Array): Sprite[] {
    const sprites: Sprite[] = [];
    
    for (let i = 0; i < 80; i++) {
      const offset = i * 8;
      
      // Ler atributos do sprite
      const yPos = (oamData[offset] << 8) | oamData[offset + 1];
      const size = oamData[offset + 2];
      const link = oamData[offset + 3];
      const tileIndex = (oamData[offset + 4] << 8) | oamData[offset + 5];
      const xPos = (oamData[offset + 6] << 8) | oamData[offset + 7];
      
      // Extrair dados do tile da VRAM
      const tileData = this.extractTileData(vramData, tileIndex);
      
      sprites.push({
        id: i,
        x: xPos & 0x1FF,
        y: yPos & 0x1FF,
        width: this.getSpriteWidth(size),
        height: this.getSpriteHeight(size),
        tileIndex,
        imageData: this.renderSprite(tileData, size),
        visible: (yPos & 0x8000) === 0
      });
    }
    
    return sprites.filter(sprite => sprite.visible);
  }
  
  private static extractTileData(vramData: Uint8Array, tileIndex: number): Uint8Array {
    // Cada tile = 32 bytes (8x8 pixels, 4 bits por pixel)
    const tileOffset = tileIndex * 32;
    return vramData.slice(tileOffset, tileOffset + 32);
  }
  
  private static renderSprite(tileData: Uint8Array, size: number): ImageData {
    const width = this.getSpriteWidth(size);
    const height = this.getSpriteHeight(size);
    const imageData = new ImageData(width, height);
    
    // Renderizar pixels do tile
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIndex = this.getPixelFromTile(tileData, x, y);
        const color = this.getColorFromPalette(pixelIndex);
        
        const dataIndex = (y * width + x) * 4;
        imageData.data[dataIndex] = color.r;
        imageData.data[dataIndex + 1] = color.g;
        imageData.data[dataIndex + 2] = color.b;
        imageData.data[dataIndex + 3] = color.a;
      }
    }
    
    return imageData;
  }
}
```

**DELIVERABLES:**
- [ ] Decodificador de sprites funcional
- [ ] Decodificador de paletas
- [ ] Decodificador de tiles
- [ ] Testes unitários para cada decodificador

---

## FASE 2: IMPLEMENTAÇÃO DE FUNCIONALIDADES CORE

### 2.1 Sistema de Extração de Assets em Tempo Real

**ARQUIVOS A IMPLEMENTAR:**
- `src/services/AssetExtractor.ts`
- `src/services/MemoryWatcher.ts`
- `src/hooks/useAssetExtraction.ts`

**FUNCIONALIDADES:**
```typescript
interface AssetExtractor {
  // Extração automática
  extractAllAssets(): Promise<ExtractedAssets>;
  extractSprites(): Promise<Sprite[]>;
  extractPalettes(): Promise<Palette[]>;
  extractTiles(): Promise<Tile[]>;
  
  // Monitoramento em tempo real
  startRealTimeExtraction(): void;
  stopRealTimeExtraction(): void;
  onAssetsChanged(callback: (assets: ExtractedAssets) => void): void;
}
```

**DELIVERABLES:**
- [ ] Extração automática na inicialização
- [ ] Monitoramento de mudanças na memória
- [ ] Cache inteligente de assets
- [ ] Notificações de novos assets

### 2.2 Editor de Sprites Profissional

**ARQUIVOS A IMPLEMENTAR:**
- `src/components/editors/SpriteEditor/`
- `src/components/editors/SpriteEditor/Canvas.tsx`
- `src/components/editors/SpriteEditor/Toolbar.tsx`
- `src/components/editors/SpriteEditor/PalettePanel.tsx`
- `src/components/editors/SpriteEditor/LayersPanel.tsx`

**FERRAMENTAS OBRIGATÓRIAS:**
- [ ] Pixel art canvas com zoom até 32x
- [ ] Ferramentas de desenho (pincel, lápis, balde)
- [ ] Seleção (retângulo, laço, varinha mágica)
- [ ] Transformações (rotação, espelhamento)
- [ ] Sistema de layers
- [ ] Undo/Redo ilimitado
- [ ] Grid e guides
- [ ] Onion skinning para animação

**DELIVERABLES:**
- [ ] Interface similar ao Aseprite
- [ ] Performance otimizada para sprites grandes
- [ ] Shortcuts de teclado
- [ ] Salvamento automático

### 2.3 Gerenciador de Assets

**ARQUIVOS A IMPLEMENTAR:**
- `src/components/AssetManager/`
- `src/components/AssetManager/AssetGrid.tsx`
- `src/components/AssetManager/AssetTree.tsx`
- `src/components/AssetManager/SearchBar.tsx`
- `src/services/AssetDatabase.ts`

**FUNCIONALIDADES:**
```typescript
interface AssetManager {
  // Organização
  createFolder(name: string): void;
  moveAsset(assetId: string, folderId: string): void;
  deleteAsset(assetId: string): void;
  
  // Busca e filtros
  searchAssets(query: string): Asset[];
  filterByType(type: AssetType): Asset[];
  filterBySize(min: number, max: number): Asset[];
  
  // Metadados
  addTag(assetId: string, tag: string): void;
  setDescription(assetId: string, description: string): void;
  
  // Operações em lote
  batchExport(assetIds: string[]): void;
  batchDelete(assetIds: string[]): void;
}
```

**DELIVERABLES:**
- [ ] Interface tipo Windows Explorer
- [ ] Thumbnails em alta qualidade
- [ ] Busca instantânea
- [ ] Sistema de tags
- [ ] Operações em lote

### 2.4 Sistema de Exportação Universal

**ARQUIVOS A IMPLEMENTAR:**
- `src/services/ExportManager.ts`
- `src/components/ExportDialog.tsx`
- `src/lib/exporters/`

**FORMATOS SUPORTADOS:**
- [ ] PNG (individual e spritesheet)
- [ ] GIF (animações)
- [ ] JSON (metadados)
- [ ] CSV (dados tabulares)
- [ ] Aseprite (.ase)
- [ ] Unity (TextureAtlas)
- [ ] Godot (.tres)

**DELIVERABLES:**
- [ ] Templates configuráveis
- [ ] Preview antes da exportação
- [ ] Compressão otimizada
- [ ] Progress bar para exports grandes

---

## FASE 3: SUPORTE PARA MÚLTIPLOS SISTEMAS

### 3.1 Arquitetura de Cores Unificada

**ARQUIVOS A IMPLEMENTAR:**
- `src/cores/CoreRegistry.ts`
- `src/cores/CoreManager.ts`
- `src/cores/descriptors/`

**SISTEMAS A IMPLEMENTAR:**
1. **Super Nintendo (SNES)**
   - Core: SNES9x
   - VRAM: 64KB
   - CGRAM: 512 bytes
   - Modos de vídeo: 0-7

2. **Game Boy/Game Boy Color**
   - Core: SameBoy
   - VRAM: 8KB/16KB
   - Paletas: 4 cores/32 paletas

3. **Nintendo Entertainment System**
   - Core: QuickNES
   - Pattern Tables: 8KB
   - Sprite RAM: 256 bytes

**DELIVERABLES:**
- [ ] Sistema de detecção automática
- [ ] Carregamento dinâmico de cores
- [ ] Interface unificada
- [ ] Validação de integridade

### 3.2 Decodificadores Específicos por Sistema

**ESTRUTURA DE PASTAS:**
```
src/lib/decoders/
├── megadrive/
│   ├── spriteDecoder.ts
│   ├── paletteDecoder.ts
│   └── tileDecoder.ts
├── snes/
│   ├── spriteDecoder.ts
│   ├── paletteDecoder.ts
│   └── backgroundDecoder.ts
├── gameboy/
│   ├── spriteDecoder.ts
│   ├── paletteDecoder.ts
│   └── tileDecoder.ts
└── nes/
    ├── spriteDecoder.ts
    ├── paletteDecoder.ts
    └── patternDecoder.ts
```

**DELIVERABLES:**
- [ ] Decodificadores para cada sistema
- [ ] Testes com ROMs reais
- [ ] Documentação técnica
- [ ] Benchmarks de performance

---

## FASE 4: FUNCIONALIDADES AVANÇADAS

### 4.1 Sistema de Animação

**ARQUIVOS A IMPLEMENTAR:**
- `src/components/AnimationEditor/`
- `src/services/AnimationManager.ts`
- `src/lib/animation/`

**FUNCIONALIDADES:**
- [ ] Timeline com keyframes
- [ ] Interpolação automática
- [ ] Preview em tempo real
- [ ] Export para GIF/MP4
- [ ] Sprite sheets animados

### 4.2 Análise Inteligente de Assets

**ARQUIVOS A IMPLEMENTAR:**
- `src/services/AssetAnalyzer.ts`
- `src/lib/ai/`

**FUNCIONALIDADES:**
- [ ] Detecção automática de tipo
- [ ] Categorização inteligente
- [ ] Detecção de duplicatas
- [ ] Sugestões de agrupamento

### 4.3 Ferramentas de Desenvolvimento

**ARQUIVOS A IMPLEMENTAR:**
- `src/tools/CodeGenerator.ts`
- `src/tools/AssetOptimizer.ts`

**FUNCIONALIDADES:**
- [ ] Geração de código (C, Assembly)
- [ ] Otimização de paletas
- [ ] Compressão de sprites
- [ ] Validação de formatos

---

## FASE 5: QUALIDADE E PERFORMANCE

### 5.1 Testes Automatizados

**ARQUIVOS A IMPLEMENTAR:**
- `tests/unit/` - Testes unitários
- `tests/integration/` - Testes de integração
- `tests/e2e/` - Testes end-to-end

**COBERTURA OBRIGATÓRIA:**
- [ ] Decodificadores: >95%
- [ ] Componentes React: >90%
- [ ] Serviços: >95%
- [ ] Hooks: >90%

### 5.2 Otimização de Performance

**IMPLEMENTAÇÕES:**
- [ ] Web Workers para processamento pesado
- [ ] Lazy loading de componentes
- [ ] Virtual scrolling
- [ ] Caching inteligente
- [ ] Compressão de dados

### 5.3 Documentação

**DOCUMENTOS A CRIAR:**
- [ ] Manual do usuário
- [ ] Documentação da API
- [ ] Guias de desenvolvimento
- [ ] Tutoriais interativos

---

## CRONOGRAMA ESTIMADO

### Semana 1-2: Correção de Problemas Críticos
- Recompilação do core Genesis Plus GX
- Correção da inicialização do EmulatorJS
- Implementação dos decodificadores básicos

### Semana 3-4: Funcionalidades Core
- Sistema de extração de assets
- Editor de sprites básico
- Gerenciador de assets
- Sistema de exportação

### Semana 5-6: Múltiplos Sistemas
- Arquitetura de cores unificada
- Implementação do SNES
- Implementação do Game Boy

### Semana 7-8: Funcionalidades Avançadas
- Sistema de animação
- Análise inteligente
- Ferramentas de desenvolvimento

### Semana 9-10: Qualidade e Performance
- Testes automatizados
- Otimização de performance
- Documentação completa

---

## MÉTRICAS DE SUCESSO

### Funcionalidade
- ✅ Carrega ROMs de 4+ sistemas
- ✅ Extrai assets em <10 segundos
- ✅ Interface responsiva
- ✅ Zero crashes críticos

### Performance
- ✅ Carregamento <3 segundos
- ✅ Interface 60fps
- ✅ Memória <500MB
- ✅ Suporte ROMs até 32MB

### Qualidade
- ✅ Cobertura de testes >90%
- ✅ Documentação completa
- ✅ Acessibilidade WCAG 2.1
- ✅ Cross-browser support

---

**PRÓXIMOS PASSOS IMEDIATOS:**

1. **URGENTE:** Recompilar o core Genesis Plus GX
2. **CRÍTICO:** Corrigir inicialização do EmulatorJS
3. **ESSENCIAL:** Implementar decodificadores de sprites
4. **IMPORTANTE:** Criar interface de extração de assets
5. **NECESSÁRIO:** Implementar editor de sprites básico

Este documento serve como roadmap completo para transformar o projeto atual em um sistema profissional e funcional.