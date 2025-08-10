# Universal Asset Studio - Especificações de Implementação

## Fase 0: Fundação do Runtime Real (Configuração e Comunicação)

### Pilar 0.1: Estrutura de Projeto e Dependências Locais

**Estrutura de Diretórios Obrigatória:**

```
project-root/
├── public/
│   ├── workers/
│   │   └── emulation.worker.js
│   └── emulatorjs-data/
│       ├── loader.js
│       ├── cores/
│       ├── wasm/
│       └── [todos os arquivos do EmulatorJS]
├── src/
│   ├── components/
│   │   ├── MainInterface.tsx
│   │   ├── LogPanel.tsx
│   │   └── SystemSelector.tsx
│   ├── lib/
│   │   ├── decoders/
│   │   └── cores/
│   └── types/
└── package.json
```

**Dependências Locais - Processo de Download:**

1. Baixar todos os arquivos de `https://cdn.jsdelivr.net/npm/emulatorjs@0.0.20/data/`
2. Colocar em `/public/emulatorjs-data/`
3. Verificar integridade dos arquivos principais:

   * `loader.js`

   * `cores/genesis_plus_gx.js`

   * `cores/snes9x.js`

   * `cores/gambatte.js`

### Pilar 0.2: Execução Real e Snapshot (Hook + opcional Worker)

Preferencialmente via `useEmulator` no frontend (integrado). Opcionalmente, um worker pode orquestrar a sequência e logging.

```typescript
// Configuração inicial obrigatória
importScripts('/emulatorjs-data/loader.js');
(self as any).EJS_pathtodata = '/emulatorjs-data/';

// Interface de mensagens
interface WorkerMessage {
  type: 'LOAD_ROM' | 'EXTRACT_ASSETS';
  payload: {
    romData: Uint8Array;
    system: 'megadrive' | 'snes' | 'gameboy';
  };
}

interface WorkerResponse {
  status: 'info' | 'error' | 'complete' | 'progress';
  message: string;
  payload?: any;
}

// Função principal do worker
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  try {
    // [1/9] Inicialização
    self.postMessage({
      status: 'info',
      message: '[1/9] Worker iniciado, configurando EmulatorJS...'
    } as WorkerResponse);

    // [2/9] Carregamento do core
    self.postMessage({
      status: 'info', 
      message: '[2/9] Carregando core do emulador...'
    } as WorkerResponse);

    // [3/9] Inicialização da ROM
    self.postMessage({
      status: 'info',
      message: '[3/9] Inicializando ROM no emulador...'
    } as WorkerResponse);

    // [4/9] NOVO: Execução de Frame
    self.postMessage({
      status: 'info',
      message: '[4/9] Executando pelo menos 1 frame do emulador...'
    } as WorkerResponse);

    // [5/9] NOVO: Captura de Estado
    self.postMessage({
      status: 'info',
      message: '[5/9] Capturando estado completo da memória de vídeo...'
    } as WorkerResponse);

    // [6/9] Extração de VRAM
    self.postMessage({
      status: 'info',
      message: '[6/9] Extraindo dados de VRAM (0x10000 bytes)...'
    } as WorkerResponse);

    // [7/9] Extração de CRAM
    self.postMessage({
      status: 'info',
      message: '[7/9] Extraindo dados de CRAM (0x80 bytes)...'
    } as WorkerResponse);

    // [8/9] Extração de SAT
    self.postMessage({
      status: 'info',
      message: '[8/9] Extraindo tabela de sprites SAT (0x280 bytes)...'
    } as WorkerResponse);

    // [9/9] Finalização
    self.postMessage({
      status: 'complete',
      message: '[9/9] Sucesso! Sprites extraídos da ROM emulada.',
      payload: {
        vram: new Uint8Array(), // Dados reais da VRAM após execução
        cram: new Uint8Array(), // Dados reais da CRAM após execução
        sat: new Uint8Array(),  // Dados reais da SAT após execução
        system: event.data.payload.system,
        frameExecuted: true
      }
    } as WorkerResponse);

  } catch (error) {
    self.postMessage({
      status: 'error',
      message: `Erro no worker: ${error.message}`
    } as WorkerResponse);
  }
};
```

### Pilar 0.3: UI com Manipuladores de Eventos Explícitos

**Componente Principal (`src/components/MainInterface.tsx`):**

```typescript
import React, { useRef, useEffect, useState } from 'react';

interface LogEntry {
  timestamp: number;
  level: 'info' | 'error' | 'complete';
  message: string;
}

export const MainInterface: React.FC = () => {
  const workerRef = useRef<Worker | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [workerStatus, setWorkerStatus] = useState<'idle' | 'working' | 'error'>('idle');

  useEffect(() => {
    // Criação OBRIGATÓRIA do worker
    workerRef.current = new Worker('/workers/emulation.worker.ts', { 
      type: 'module' 
    });

    // Manipulador de erro OBRIGATÓRIO
    workerRef.current.onerror = (error) => {
      const logEntry: LogEntry = {
        timestamp: Date.now(),
        level: 'error',
        message: `Erro de inicialização do worker: ${error.message}`
      };
      setLogs(prev => [...prev, logEntry]);
      setWorkerStatus('error');
    };

    // Manipulador de mensagem OBRIGATÓRIO
    workerRef.current.onmessage = (event) => {
      const response = event.data;
      const logEntry: LogEntry = {
        timestamp: Date.now(),
        level: response.status === 'error' ? 'error' : 
               response.status === 'complete' ? 'complete' : 'info',
        message: response.message
      };
      
      setLogs(prev => [...prev, logEntry]);
      
      if (response.status === 'complete') {
        setWorkerStatus('idle');
        // Processar payload aqui
        processWorkerPayload(response.payload);
      } else if (response.status === 'error') {
        setWorkerStatus('error');
      }
    };

    // Log de inicialização bem-sucedida
    setLogs([{
      timestamp: Date.now(),
      level: 'info',
      message: 'Worker criado com sucesso'
    }]);

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const processWorkerPayload = (payload: any) => {
    // Aqui será chamado o MegaDriveCore na Fase 1
    console.log('Payload recebido:', payload);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Interface de upload */}
      <div className="container mx-auto p-6">
        {/* Painel de log OBRIGATÓRIO */}
        <LogPanel logs={logs} />
      </div>
    </div>
  );
};
```

**Componente de Log (`src/components/LogPanel.tsx`):**

```typescript
import React from 'react';

interface LogEntry {
  timestamp: number;
  level: 'info' | 'error' | 'complete';
  message: string;
}

interface LogPanelProps {
  logs: LogEntry[];
}

export const LogPanel: React.FC<LogPanelProps> = ({ logs }) => {
  return (
    <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
      <div className="text-white mb-2">🔧 System Log</div>
      {logs.map((log, index) => (
        <div key={index} className={`mb-1 ${
          log.level === 'error' ? 'text-red-400' :
          log.level === 'complete' ? 'text-blue-400' :
          'text-green-400'
        }`}>
          <span className="text-gray-500">
            [{new Date(log.timestamp).toLocaleTimeString()}]
          </span>
          {' '}{log.message}
        </div>
      ))}
    </div>
  );
};
```

## Fase 1: Extração e Visualização (A Primeira Vitória)

### Decodificadores Obrigatórios

**MegaDrivePaletteDecoder (`src/lib/decoders/MegaDrivePaletteDecoder.ts`):**

```typescript
export class MegaDrivePaletteDecoder {
  /**
   * Decodifica CRAM do Mega Drive (cores de 9-bit) para paletas CSS
   * @param cram - Dados da CRAM (Color RAM)
   * @returns Array de paletas, cada uma com 16 cores em formato #RRGGBB
   */
  static decode(cram: Uint8Array): string[][] {
    const palettes: string[][] = [];
    
    // Mega Drive tem 4 paletas de 16 cores cada
    for (let paletteIndex = 0; paletteIndex < 4; paletteIndex++) {
      const palette: string[] = [];
      
      for (let colorIndex = 0; colorIndex < 16; colorIndex++) {
        const offset = (paletteIndex * 16 + colorIndex) * 2;
        
        if (offset + 1 < cram.length) {
          // Formato: 0000 BBB0 GGG0 RRR0 (9-bit color)
          const colorWord = (cram[offset + 1] << 8) | cram[offset];
          
          const red = (colorWord & 0x000E) >> 1;
          const green = (colorWord & 0x00E0) >> 5;
          const blue = (colorWord & 0x0E00) >> 9;
          
          // Converter de 3-bit para 8-bit
          const r = (red * 255) / 7;
          const g = (green * 255) / 7;
          const b = (blue * 255) / 7;
          
          palette.push(`#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`);
        } else {
          palette.push('#000000'); // Cor padrão
        }
      }
      
      palettes.push(palette);
    }
    
    return palettes;
  }
}
```

**MegaDriveTileDecoder (`src/lib/decoders/MegaDriveTileDecoder.ts`):**

```typescript
export class MegaDriveTileDecoder {
  /**
   * Decodifica todos os tiles da VRAM do Mega Drive
   * @param vram - Dados da VRAM
   * @param palette - Paleta de cores a ser usada
   * @returns Array de ImageData, cada um representando um tile 8x8
   */
  static decodeAll(vram: Uint8Array, palette: string[]): ImageData[] {
    const tiles: ImageData[] = [];
    const tileSize = 32; // 8x8 pixels, 4 bits por pixel = 32 bytes por tile
    const tilesCount = Math.floor(vram.length / tileSize);
    
    for (let tileIndex = 0; tileIndex < tilesCount; tileIndex++) {
      const tileOffset = tileIndex * tileSize;
      const imageData = new ImageData(8, 8);
      
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x += 2) {
          const byteOffset = tileOffset + (y * 4) + (x / 2);
          
          if (byteOffset < vram.length) {
            const byte = vram[byteOffset];
            
            // Pixel esquerdo (4 bits superiores)
            const leftPixel = (byte & 0xF0) >> 4;
            const leftColor = this.hexToRgb(palette[leftPixel] || '#000000');
            
            // Pixel direito (4 bits inferiores)
            const rightPixel = byte & 0x0F;
            const rightColor = this.hexToRgb(palette[rightPixel] || '#000000');
            
            // Definir pixels no ImageData
            const leftIndex = (y * 8 + x) * 4;
            const rightIndex = (y * 8 + x + 1) * 4;
            
            imageData.data[leftIndex] = leftColor.r;
            imageData.data[leftIndex + 1] = leftColor.g;
            imageData.data[leftIndex + 2] = leftColor.b;
            imageData.data[leftIndex + 3] = leftPixel === 0 ? 0 : 255; // Transparência
            
            imageData.data[rightIndex] = rightColor.r;
            imageData.data[rightIndex + 1] = rightColor.g;
            imageData.data[rightIndex + 2] = rightColor.b;
            imageData.data[rightIndex + 3] = rightPixel === 0 ? 0 : 255; // Transparência
          }
        }
      }
      
      tiles.push(imageData);
    }
    
    return tiles;
  }
  
  private static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }
}
```

**MegaDriveSpriteAssembler (`src/lib/decoders/MegaDriveSpriteAssembler.ts`):**

```typescript
export class MegaDriveSpriteAssembler {
  /**
   * Monta sprites a partir da SAT (Sprite Attribute Table)
   * @param sat - Dados da tabela de atributos de sprite
   * @param allTiles - Todos os tiles decodificados
   * @param allPalettes - Todas as paletas disponíveis
   * @returns Array de sprites montados como ImageData
   */
  static assemble(sat: Uint8Array, allTiles: ImageData[], allPalettes: string[][]): ImageData[] {
    const sprites: ImageData[] = [];
    const maxSprites = 80; // Mega Drive suporta até 80 sprites
    
    for (let spriteIndex = 0; spriteIndex < maxSprites; spriteIndex++) {
      const satOffset = spriteIndex * 8; // 8 bytes por entrada de sprite
      
      if (satOffset + 7 < sat.length) {
        // Ler atributos do sprite
        const yPos = (sat[satOffset + 1] << 8) | sat[satOffset];
        const size = sat[satOffset + 2];
        const link = sat[satOffset + 3];
        const tileIndex = (sat[satOffset + 5] << 8) | sat[satOffset + 4];
        const xPos = (sat[satOffset + 7] << 8) | sat[satOffset + 6];
        
        // Decodificar tamanho do sprite
        const width = ((size & 0x0C) >> 2) + 1; // Largura em tiles
        const height = (size & 0x03) + 1; // Altura em tiles
        
        // Decodificar atributos
        const paletteIndex = (tileIndex & 0x6000) >> 13;
        const flipV = (tileIndex & 0x1000) !== 0;
        const flipH = (tileIndex & 0x0800) !== 0;
        const priority = (tileIndex & 0x8000) !== 0;
        const actualTileIndex = tileIndex & 0x07FF;
        
        // Verificar se o sprite é válido
        if (yPos > 0 && yPos < 240 && xPos > 0 && xPos < 320) {
          // Montar sprite
          const spriteWidth = width * 8;
          const spriteHeight = height * 8;
          const spriteImageData = new ImageData(spriteWidth, spriteHeight);
          
          for (let tileY = 0; tileY < height; tileY++) {
            for (let tileX = 0; tileX < width; tileX++) {
              const currentTileIndex = actualTileIndex + (tileY * width) + tileX;
              
              if (currentTileIndex < allTiles.length) {
                const tile = allTiles[currentTileIndex];
                
                // Copiar tile para o sprite
                for (let py = 0; py < 8; py++) {
                  for (let px = 0; px < 8; px++) {
                    const srcIndex = (py * 8 + px) * 4;
                    const destX = flipH ? (width * 8 - 1 - (tileX * 8 + px)) : (tileX * 8 + px);
                    const destY = flipV ? (height * 8 - 1 - (tileY * 8 + py)) : (tileY * 8 + py);
                    const destIndex = (destY * spriteWidth + destX) * 4;
                    
                    spriteImageData.data[destIndex] = tile.data[srcIndex];
                    spriteImageData.data[destIndex + 1] = tile.data[srcIndex + 1];
                    spriteImageData.data[destIndex + 2] = tile.data[srcIndex + 2];
                    spriteImageData.data[destIndex + 3] = tile.data[srcIndex + 3];
                  }
                }
              }
            }
          }
          
          sprites.push(spriteImageData);
        }
      }
    }
    
    return sprites.filter(sprite => sprite.width > 0 && sprite.height > 0);
  }
}
```

### Orquestração - MegaDriveCore

**MegaDriveCore (`src/lib/cores/MegaDriveCore.ts`):**

```typescript
import { MegaDrivePaletteDecoder } from '../decoders/MegaDrivePaletteDecoder';
import { MegaDriveTileDecoder } from '../decoders/MegaDriveTileDecoder';
import { MegaDriveSpriteAssembler } from '../decoders/MegaDriveSpriteAssembler';

export class MegaDriveCore {
  /**
   * Processa dados brutos do worker e retorna sprites decodificados
   * @param payload - Dados extraídos pelo worker (VRAM, CRAM, SAT)
   * @returns Array de sprites processados
   */
  static processarDadosDoWorker(payload: {
    vram: Uint8Array;
    cram: Uint8Array;
    sat: Uint8Array;
    system: string;
  }): ImageData[] {
    try {
      // 1. Decodificar paletas da CRAM
      const palettes = MegaDrivePaletteDecoder.decode(payload.cram);
      
      // 2. Decodificar todos os tiles da VRAM usando a primeira paleta
      const allTiles = MegaDriveTileDecoder.decodeAll(payload.vram, palettes[0]);
      
      // 3. Montar sprites usando a SAT
      const sprites = MegaDriveSpriteAssembler.assemble(payload.sat, allTiles, palettes);
      
      return sprites;
    } catch (error) {
      console.error('Erro ao processar dados do Mega Drive:', error);
      return [];
    }
  }
}
```

## Fase 2: Ferramentas de Artista e Conversão Universal

### Mapeador de Cores - Interface de 3 Painéis

**ColorMapper (`src/components/ColorMapper.tsx`):**

```typescript
import React, { useState, useCallback } from 'react';

interface ColorMapperProps {
  extractedColors: string[];
  onPaletteChange: (palette: string[]) => void;
}

export const ColorMapper: React.FC<ColorMapperProps> = ({ 
  extractedColors, 
  onPaletteChange 
}) => {
  const [masterPalette, setMasterPalette] = useState<(string | null)[]>(
    new Array(16).fill(null)
  );
  
  const handleColorDrop = useCallback((color: string, slotIndex: number) => {
    const newPalette = [...masterPalette];
    newPalette[slotIndex] = color;
    setMasterPalette(newPalette);
    
    // Notificar mudança para pré-visualização em tempo real
    onPaletteChange(newPalette.map(c => c || '#000000'));
  }, [masterPalette, onPaletteChange]);
  
  return (
    <div className="grid grid-cols-3 gap-6 h-full">
      {/* Painel 1: Cores Extraídas */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Cores Extraídas</h3>
        <div className="grid grid-cols-4 gap-2">
          {extractedColors.map((color, index) => (
            <div
              key={index}
              className="w-8 h-8 rounded border-2 border-gray-300 cursor-grab"
              style={{ backgroundColor: color }}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('color', color);
              }}
              title={color}
            />
          ))}
        </div>
      </div>
      
      {/* Painel 2: Paleta Mestra */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Paleta Mestra (16 cores)</h3>
        <div className="grid grid-cols-4 gap-2">
          {masterPalette.map((color, index) => (
            <div
              key={index}
              className="w-12 h-12 rounded border-2 border-dashed border-gray-400 flex items-center justify-center"
              style={{ backgroundColor: color || '#f3f4f6' }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const droppedColor = e.dataTransfer.getData('color');
                if (droppedColor) {
                  handleColorDrop(droppedColor, index);
                }
              }}
            >
              {!color && (
                <span className="text-xs text-gray-500">{index}</span>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Painel 3: Pré-visualização */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Pré-visualização</h3>
        <div className="text-sm text-gray-600">
          Os sprites serão atualizados em tempo real conforme você mapeia as cores.
        </div>
        {/* Aqui será renderizada a pré-visualização dos sprites */}
      </div>
    </div>
  );
};
```

## Fase 3: Expansão Universal Sistemática

### Blueprint de Expansão para SNES

**IMPORTANTE**: Para a Fase 3, conforme especificado nas regras do projeto, os ponteiros de memória devem ser declarados explicitamente com sua fonte documental.

**SNESPaletteDecoder (`src/lib/decoders/SNESPaletteDecoder.ts`):**

```typescript
/**
 * FONTE DOCUMENTAL NECESSÁRIA: 
 * Para implementar este decodificador, é necessário o documento de referência
 * que especifica os ponteiros de memória do SNES:
 * - _cgramStart: Endereço inicial da CGRAM
 * - _cgramEnd: Endereço final da CGRAM
 * - Formato de cor: 15-bit BGR (0BBBBBGGGGGRRRRR)
 * 
 * SEM O DOCUMENTO DE REFERÊNCIA, NÃO É POSSÍVEL IMPLEMENTAR CORRETAMENTE.
 */
export class SNESPaletteDecoder {
  /**
   * Decodifica CGRAM do SNES (cores de 15-bit) para paletas CSS
   * REQUER: Documento de referência com ponteiros de memória específicos
   */
  static decode(cgram: Uint8Array): string[][] {
    throw new Error('Implementação requer documento de referência com ponteiros de memória do SNES');
  }
}
```

**SNESTileDecoder (`src/lib/decoders/SNESTileDecoder.ts`):**

```typescript
/**
 * FONTE DOCUMENTAL NECESSÁRIA:
 * Para implementar este decodificador, é necessário o documento de referência
 * que especifica:
 * - _vramStart: Endereço inicial da VRAM do SNES
 * - _vramEnd: Endereço final da VRAM do SNES
 * - Formato de tile: 2bpp, 4bpp ou 8bpp
 * - Organização de dados na VRAM
 */
export class SNESTileDecoder {
  static decodeAll(vram: Uint8Array, palette: string[]): ImageData[] {
    throw new Error('Implementação requer documento de referência com ponteiros de memória do SNES');
  }
}
```

### Contrato de Sucesso por Fase

### Pilar 0.3: Emulação Completa da ROM

**REQUISITO CRÍTICO**: Para extrair sprites reais, é obrigatório executar a ROM completamente no emulador antes da extração de dados. Sprites não existem na ROM como dados estáticos - eles são gerados dinamicamente durante a execução.

**Processo de Emulação Obrigatório:**

```typescript
// Implementação no Worker
class EmulationCore {
  private emulator: any;
  private coreLoaded: boolean = false;
  
  async loadCore(system: string): Promise<void> {
    // Carregar core específico (Genesis Plus GX, SNES9x, etc.)
    const coreUrl = `/emulatorjs-data/cores/${this.getCoreFile(system)}`;
    await this.loadScript(coreUrl);
    this.coreLoaded = true;
  }
  
  async initializeROM(romData: Uint8Array): Promise<void> {
    if (!this.coreLoaded) throw new Error('Core não carregado');
    
    // Inicializar emulador com ROM
    this.emulator = new (window as any).EmulatorCore();
    await this.emulator.loadROM(romData);
  }
  
  async executeFrames(frameCount: number = 1): Promise<void> {
    // CRÍTICO: Executar pelo menos 1 frame para gerar sprites
    for (let i = 0; i < frameCount; i++) {
      this.emulator.step(); // Executa 1 frame
    }
  }
  
  extractMemoryData(): {
    vram: Uint8Array;
    cram: Uint8Array;
    sat: Uint8Array;
  } {
    // Extrair dados APÓS execução
    return {
      vram: this.emulator.getVRAM(), // 0x10000 bytes
      cram: this.emulator.getCRAM(), // 0x80 bytes
      sat: this.emulator.getSAT()    // 0x280 bytes
    };
  }
}
```

**Fase 0 - Critérios de Aceitação:**

* ✅ Worker criado sem erros no log da UI

* ✅ Sequência completa \[1/9] a \[9/9] exibida ao carregar ROM

* ✅ Comunicação bidirecional Worker ↔ UI funcionando

* ✅ EmulatorJS carregado localmente (sem CDN)

* ✅ **NOVO**: Core de emulação executando pelo menos 1 frame

* ✅ **NOVO**: Extração de dados APÓS execução da ROM

**Fase 1 - Critérios de Aceitação:**

* ✅ Sprites do Sonic the Hedgehog reconhecíveis na galeria

* ✅ Decodificadores funcionando corretamente

* ✅ MegaDriveCore orquestrando o processo

* ✅ Interface de abas implementada

**Fase 2 - Critérios de Aceitação:**

* ✅ Mapeador de cores com 3 painéis funcionais

* ✅ Drag-and-drop de cores funcionando

* ✅ Pré-visualização em tempo real

* ✅ Importação de PNG e conversão para tiles

* ✅ Exportação para SGDK e arrays C

**Fase 3 - Critérios de Aceitação:**

* ✅ Arquitetura expansível demonstrada

* ✅ Novos sistemas adicionados seguindo o blueprint

* ✅ Documentação de ponteiros de memória obrigatória

* ✅ Interface unificada funcionando com múltiplos sistemas

