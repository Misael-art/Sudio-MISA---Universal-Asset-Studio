# Guia de Integração do Genesis Plus GX ao Universal Asset Studio

## Status Atual

✅ **Build Concluído**: Genesis Plus GX compilado com sucesso via Docker  
✅ **Exportações Funcionais**: Todas as funções de memória exportadas e validadas  
✅ **Artefatos Gerados**: `genesis_plus_gx.js` e `genesis_plus_gx.wasm` disponíveis  

## Próximas Fases de Desenvolvimento

### Fase 1: Integração do Core na UI React

#### 1.1 Estrutura de Componentes React

```typescript
// src/components/EmulatorCore.tsx
// Implementando o Pilar 0: Integração do Core Compilado
import React, { useEffect, useState, useRef } from 'react';

interface EmulatorCoreProps {
  romData?: Uint8Array;
  onMemoryUpdate?: (memoryData: MemorySnapshot) => void;
}

interface MemorySnapshot {
  workRam: Uint8Array;
  vram: Uint8Array;
  cram: Uint8Array;
  vsram: Uint8Array;
  vdpRegs: Uint8Array;
  sat: Uint8Array;
  framebuffer: Uint8Array;
  systemCode: number;
}

/**
 * Componente principal para integração do Genesis Plus GX
 * Gerencia inicialização do core e exposição de memória
 */
export const EmulatorCore: React.FC<EmulatorCoreProps> = ({ 
  romData, 
  onMemoryUpdate 
}) => {
  const [coreInstance, setCoreInstance] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [memorySnapshot, setMemorySnapshot] = useState<MemorySnapshot | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Inicialização do core via Web Worker
  useEffect(() => {
    initializeCore();
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const initializeCore = async () => {
    try {
      // Carregar o core Genesis Plus GX
      const createCore = (window as any).genesis_plus_gx;
      if (!createCore) {
        throw new Error('Genesis Plus GX core não encontrado');
      }

      const core = await createCore();
      setCoreInstance(core);
      setIsInitialized(true);

      // Configurar funções de acesso à memória
      setupMemoryAccess(core);
    } catch (error) {
      console.error('Erro ao inicializar core:', error);
    }
  };

  const setupMemoryAccess = (core: any) => {
    // Configurar wrappers para funções exportadas
    const memoryFunctions = {
      getWorkRamPtr: core.cwrap('_get_work_ram_ptr', 'number', []),
      getWorkRamSize: core.cwrap('_get_work_ram_size', 'number', []),
      getVramPtr: core.cwrap('_get_vram_ptr', 'number', []),
      getVramSize: core.cwrap('_get_vram_size', 'number', []),
      getCramPtr: core.cwrap('_get_cram_ptr', 'number', []),
      getCramSize: core.cwrap('_get_cram_size', 'number', []),
      getVsramPtr: core.cwrap('_get_vsram_ptr', 'number', []),
      getVsramSize: core.cwrap('_get_vsram_size', 'number', []),
      getVdpRegsPtr: core.cwrap('_get_vdp_regs_ptr', 'number', []),
      getVdpRegsSize: core.cwrap('_get_vdp_regs_size', 'number', []),
      getSatPtr: core.cwrap('_get_sat_ptr', 'number', []),
      getSatSize: core.cwrap('_get_sat_size', 'number', []),
      getFrameBufferRef: core.cwrap('_get_frame_buffer_ref', 'number', []),
      getFrameBufferWidth: core.cwrap('_get_frame_buffer_width', 'number', []),
      getFrameBufferHeight: core.cwrap('_get_frame_buffer_height', 'number', []),
      getFrameBufferPitch: core.cwrap('_get_frame_buffer_pitch', 'number', []),
      getActiveSystemCode: core.cwrap('_get_active_system_code', 'number', []),
      isCoreInitialized: core.cwrap('_is_core_initialized', 'number', [])
    };

    // Armazenar funções no contexto do componente
    (core as any).memoryFunctions = memoryFunctions;
  };

  const captureMemorySnapshot = (): MemorySnapshot | null => {
    if (!coreInstance || !isInitialized) return null;

    const funcs = coreInstance.memoryFunctions;
    const heap = coreInstance.HEAPU8;

    try {
      // Capturar Work RAM
      const workRamPtr = funcs.getWorkRamPtr();
      const workRamSize = funcs.getWorkRamSize();
      const workRam = new Uint8Array(heap.buffer, workRamPtr, workRamSize);

      // Capturar VRAM
      const vramPtr = funcs.getVramPtr();
      const vramSize = funcs.getVramSize();
      const vram = new Uint8Array(heap.buffer, vramPtr, vramSize);

      // Capturar CRAM (paleta de cores)
      const cramPtr = funcs.getCramPtr();
      const cramSize = funcs.getCramSize();
      const cram = new Uint8Array(heap.buffer, cramPtr, cramSize);

      // Capturar VSRAM (scroll vertical)
      const vsramPtr = funcs.getVsramPtr();
      const vsramSize = funcs.getVsramSize();
      const vsram = new Uint8Array(heap.buffer, vsramPtr, vsramSize);

      // Capturar registradores VDP
      const vdpRegsPtr = funcs.getVdpRegsPtr();
      const vdpRegsSize = funcs.getVdpRegsSize();
      const vdpRegs = new Uint8Array(heap.buffer, vdpRegsPtr, vdpRegsSize);

      // Capturar SAT (Sprite Attribute Table)
      const satPtr = funcs.getSatPtr();
      const satSize = funcs.getSatSize();
      const sat = new Uint8Array(heap.buffer, satPtr, satSize);

      // Capturar framebuffer
      const fbPtr = funcs.getFrameBufferRef();
      const fbWidth = funcs.getFrameBufferWidth();
      const fbHeight = funcs.getFrameBufferHeight();
      const fbPitch = funcs.getFrameBufferPitch();
      const framebuffer = new Uint8Array(heap.buffer, fbPtr, fbPitch * fbHeight);

      // Obter código do sistema ativo
      const systemCode = funcs.getActiveSystemCode();

      const snapshot: MemorySnapshot = {
        workRam: new Uint8Array(workRam),
        vram: new Uint8Array(vram),
        cram: new Uint8Array(cram),
        vsram: new Uint8Array(vsram),
        vdpRegs: new Uint8Array(vdpRegs),
        sat: new Uint8Array(sat),
        framebuffer: new Uint8Array(framebuffer),
        systemCode
      };

      setMemorySnapshot(snapshot);
      onMemoryUpdate?.(snapshot);
      return snapshot;
    } catch (error) {
      console.error('Erro ao capturar snapshot de memória:', error);
      return null;
    }
  };

  return (
    <div className="emulator-core">
      <div className="core-status">
        <span className={`status-indicator ${isInitialized ? 'active' : 'inactive'}`}>
          Core: {isInitialized ? 'Inicializado' : 'Carregando...'}
        </span>
        {isInitialized && (
          <button onClick={captureMemorySnapshot}>
            Capturar Memória
          </button>
        )}
      </div>
      
      {memorySnapshot && (
        <div className="memory-info">
          <p>Sistema: {getSystemName(memorySnapshot.systemCode)}</p>
          <p>Work RAM: {memorySnapshot.workRam.length} bytes</p>
          <p>VRAM: {memorySnapshot.vram.length} bytes</p>
          <p>CRAM: {memorySnapshot.cram.length} bytes</p>
        </div>
      )}
    </div>
  );
};

// Função auxiliar para identificar o sistema
function getSystemName(systemCode: number): string {
  switch (systemCode) {
    case 0: return 'Master System';
    case 1: return 'Game Gear';
    case 2: return 'Mega Drive/Genesis';
    case 3: return 'Sega CD/Mega CD';
    default: return 'Desconhecido';
  }
}
```

#### 1.2 Hook Customizado para Gerenciamento de Memória

```typescript
// src/hooks/useGenesisCore.ts
// Implementando o Pilar 0: Hook para gerenciamento do core
import { useState, useEffect, useCallback } from 'react';

interface CoreMemoryAccess {
  workRam: Uint8Array | null;
  vram: Uint8Array | null;
  cram: Uint8Array | null;
  vsram: Uint8Array | null;
  vdpRegs: Uint8Array | null;
  sat: Uint8Array | null;
  framebuffer: Uint8Array | null;
  systemCode: number;
}

interface UseCoreReturn {
  isInitialized: boolean;
  memoryAccess: CoreMemoryAccess;
  captureMemory: () => void;
  loadRom: (romData: Uint8Array) => Promise<boolean>;
  error: string | null;
}

/**
 * Hook customizado para gerenciar o Genesis Plus GX core
 * Fornece acesso simplificado às áreas de memória
 */
export const useGenesisCore = (): UseCoreReturn => {
  const [coreInstance, setCoreInstance] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memoryAccess, setMemoryAccess] = useState<CoreMemoryAccess>({
    workRam: null,
    vram: null,
    cram: null,
    vsram: null,
    vdpRegs: null,
    sat: null,
    framebuffer: null,
    systemCode: 0
  });

  useEffect(() => {
    initializeCore();
  }, []);

  const initializeCore = async () => {
    try {
      setError(null);
      
      // Verificar se o core está disponível
      if (!(window as any).genesis_plus_gx) {
        throw new Error('Genesis Plus GX core não carregado');
      }

      const createCore = (window as any).genesis_plus_gx;
      const core = await createCore();
      
      // Configurar funções de acesso
      setupCoreAccess(core);
      setCoreInstance(core);
      setIsInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  };

  const setupCoreAccess = (core: any) => {
    // Configurar todas as funções de acesso à memória
    core.memoryAPI = {
      getWorkRam: () => {
        const ptr = core.cwrap('_get_work_ram_ptr', 'number', [])();
        const size = core.cwrap('_get_work_ram_size', 'number', [])();
        return new Uint8Array(core.HEAPU8.buffer, ptr, size);
      },
      getVram: () => {
        const ptr = core.cwrap('_get_vram_ptr', 'number', [])();
        const size = core.cwrap('_get_vram_size', 'number', [])();
        return new Uint8Array(core.HEAPU8.buffer, ptr, size);
      },
      getCram: () => {
        const ptr = core.cwrap('_get_cram_ptr', 'number', [])();
        const size = core.cwrap('_get_cram_size', 'number', [])();
        return new Uint8Array(core.HEAPU8.buffer, ptr, size);
      },
      getVsram: () => {
        const ptr = core.cwrap('_get_vsram_ptr', 'number', [])();
        const size = core.cwrap('_get_vsram_size', 'number', [])();
        return new Uint8Array(core.HEAPU8.buffer, ptr, size);
      },
      getVdpRegs: () => {
        const ptr = core.cwrap('_get_vdp_regs_ptr', 'number', [])();
        const size = core.cwrap('_get_vdp_regs_size', 'number', [])();
        return new Uint8Array(core.HEAPU8.buffer, ptr, size);
      },
      getSat: () => {
        const ptr = core.cwrap('_get_sat_ptr', 'number', [])();
        const size = core.cwrap('_get_sat_size', 'number', [])();
        return new Uint8Array(core.HEAPU8.buffer, ptr, size);
      },
      getFramebuffer: () => {
        const ptr = core.cwrap('_get_frame_buffer_ref', 'number', [])();
        const width = core.cwrap('_get_frame_buffer_width', 'number', [])();
        const height = core.cwrap('_get_frame_buffer_height', 'number', [])();
        const pitch = core.cwrap('_get_frame_buffer_pitch', 'number', [])();
        return {
          data: new Uint8Array(core.HEAPU8.buffer, ptr, pitch * height),
          width,
          height,
          pitch
        };
      },
      getSystemCode: () => {
        return core.cwrap('_get_active_system_code', 'number', [])();
      }
    };
  };

  const captureMemory = useCallback(() => {
    if (!coreInstance || !isInitialized) return;

    try {
      const api = coreInstance.memoryAPI;
      
      setMemoryAccess({
        workRam: api.getWorkRam(),
        vram: api.getVram(),
        cram: api.getCram(),
        vsram: api.getVsram(),
        vdpRegs: api.getVdpRegs(),
        sat: api.getSat(),
        framebuffer: api.getFramebuffer().data,
        systemCode: api.getSystemCode()
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao capturar memória');
    }
  }, [coreInstance, isInitialized]);

  const loadRom = useCallback(async (romData: Uint8Array): Promise<boolean> => {
    if (!coreInstance || !isInitialized) return false;

    try {
      // Implementar carregamento de ROM
      // (depende da API específica do Genesis Plus GX)
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar ROM');
      return false;
    }
  }, [coreInstance, isInitialized]);

  return {
    isInitialized,
    memoryAccess,
    captureMemory,
    loadRom,
    error
  };
};
```

### Fase 2: Implementação dos Decodificadores

#### 2.1 Decodificador de Paletas (CRAM)

```typescript
// src/lib/decoders/MegaDrivePaletteDecoder.ts
// Implementando o Pilar 1.2: Decodificador de paletas do Mega Drive

export interface PaletteColor {
  r: number;
  g: number;
  b: number;
  hex: string;
}

export interface DecodedPalette {
  colors: PaletteColor[];
  paletteIndex: number;
  systemType: 'megadrive' | 'sms' | 'gamegear';
}

/**
 * Decodificador de paletas para sistemas Sega
 * Suporta Mega Drive, Master System e Game Gear
 */
export class MegaDrivePaletteDecoder {
  /**
   * Decodifica CRAM do Mega Drive para paletas CSS
   * Formato: 16 paletas de 16 cores cada (128 bytes total)
   */
  static decode(cramData: Uint8Array, systemType: 'megadrive' | 'sms' | 'gamegear' = 'megadrive'): DecodedPalette[] {
    const palettes: DecodedPalette[] = [];
    
    switch (systemType) {
      case 'megadrive':
        return this.decodeMegaDrive(cramData);
      case 'sms':
        return this.decodeMasterSystem(cramData);
      case 'gamegear':
        return this.decodeGameGear(cramData);
      default:
        throw new Error(`Sistema não suportado: ${systemType}`);
    }
  }

  private static decodeMegaDrive(cramData: Uint8Array): DecodedPalette[] {
    const palettes: DecodedPalette[] = [];
    
    // Mega Drive: 4 paletas de 16 cores (64 cores total, 128 bytes)
    for (let paletteIndex = 0; paletteIndex < 4; paletteIndex++) {
      const colors: PaletteColor[] = [];
      
      for (let colorIndex = 0; colorIndex < 16; colorIndex++) {
        const offset = (paletteIndex * 16 + colorIndex) * 2;
        
        if (offset + 1 < cramData.length) {
          // Formato BGR de 9 bits (3 bits por componente)
          const colorWord = (cramData[offset + 1] << 8) | cramData[offset];
          
          const b = (colorWord & 0x0F00) >> 8;
          const g = (colorWord & 0x00F0) >> 4;
          const r = (colorWord & 0x000F);
          
          // Expandir de 3 bits para 8 bits
          const r8 = (r << 4) | r;
          const g8 = (g << 4) | g;
          const b8 = (b << 4) | b;
          
          const hex = `#${r8.toString(16).padStart(2, '0')}${g8.toString(16).padStart(2, '0')}${b8.toString(16).padStart(2, '0')}`;
          
          colors.push({ r: r8, g: g8, b: b8, hex });
        }
      }
      
      palettes.push({
        colors,
        paletteIndex,
        systemType: 'megadrive'
      });
    }
    
    return palettes;
  }

  private static decodeMasterSystem(cramData: Uint8Array): DecodedPalette[] {
    const colors: PaletteColor[] = [];
    
    // Master System: 32 cores (32 bytes)
    for (let i = 0; i < Math.min(32, cramData.length); i++) {
      const colorByte = cramData[i];
      
      // Formato: --BBGGRR (6 bits)
      const r = (colorByte & 0x03) << 6;
      const g = ((colorByte & 0x0C) >> 2) << 6;
      const b = ((colorByte & 0x30) >> 4) << 6;
      
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      
      colors.push({ r, g, b, hex });
    }
    
    return [{
      colors,
      paletteIndex: 0,
      systemType: 'sms'
    }];
  }

  private static decodeGameGear(cramData: Uint8Array): DecodedPalette[] {
    const colors: PaletteColor[] = [];
    
    // Game Gear: 32 cores de 12 bits (64 bytes)
    for (let i = 0; i < Math.min(32, cramData.length / 2); i++) {
      const offset = i * 2;
      const colorWord = (cramData[offset + 1] << 8) | cramData[offset];
      
      // Formato: ----BBBBGGGGRRRR (12 bits)
      const r = (colorWord & 0x000F) << 4;
      const g = ((colorWord & 0x00F0) >> 4) << 4;
      const b = ((colorWord & 0x0F00) >> 8) << 4;
      
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      
      colors.push({ r, g, b, hex });
    }
    
    return [{
      colors,
      paletteIndex: 0,
      systemType: 'gamegear'
    }];
  }
}
```

#### 2.2 Decodificador de Sprites

```typescript
// src/lib/decoders/MegaDriveSpriteDecoder.ts
// Implementando o Pilar 1.1: Decodificador de sprites do Mega Drive

export interface SpriteData {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  tileIndex: number;
  palette: number;
  priority: boolean;
  hFlip: boolean;
  vFlip: boolean;
  imageData: ImageData;
}

/**
 * Decodificador de sprites para Mega Drive
 * Extrai sprites da SAT (Sprite Attribute Table) e VRAM
 */
export class MegaDriveSpriteDecoder {
  /**
   * Decodifica sprites da SAT e VRAM
   */
  static decode(
    satData: Uint8Array,
    vramData: Uint8Array,
    cramData: Uint8Array,
    maxSprites: number = 80
  ): SpriteData[] {
    const sprites: SpriteData[] = [];
    const palettes = MegaDrivePaletteDecoder.decode(cramData, 'megadrive');
    
    for (let i = 0; i < Math.min(maxSprites, satData.length / 8); i++) {
      const satOffset = i * 8;
      
      // Ler atributos do sprite da SAT
      const yPos = (satData[satOffset + 1] << 8) | satData[satOffset];
      const size = satData[satOffset + 2];
      const link = satData[satOffset + 3];
      const tileAttr = (satData[satOffset + 5] << 8) | satData[satOffset + 4];
      const xPos = (satData[satOffset + 7] << 8) | satData[satOffset + 6];
      
      // Extrair informações do tile
      const tileIndex = tileAttr & 0x07FF;
      const hFlip = (tileAttr & 0x0800) !== 0;
      const vFlip = (tileAttr & 0x1000) !== 0;
      const palette = (tileAttr & 0x6000) >> 13;
      const priority = (tileAttr & 0x8000) !== 0;
      
      // Calcular dimensões do sprite
      const width = ((size & 0x0C) >> 2) + 1;
      const height = (size & 0x03) + 1;
      
      // Gerar ImageData do sprite
      const imageData = this.generateSpriteImage(
        vramData,
        tileIndex,
        width * 8,
        height * 8,
        palettes[palette]?.colors || [],
        hFlip,
        vFlip
      );
      
      sprites.push({
        id: i,
        x: xPos - 128,
        y: yPos - 128,
        width: width * 8,
        height: height * 8,
        tileIndex,
        palette,
        priority,
        hFlip,
        vFlip,
        imageData
      });
    }
    
    return sprites;
  }

  private static generateSpriteImage(
    vramData: Uint8Array,
    tileIndex: number,
    width: number,
    height: number,
    paletteColors: PaletteColor[],
    hFlip: boolean,
    vFlip: boolean
  ): ImageData {
    const imageData = new ImageData(width, height);
    const tilesPerRow = width / 8;
    const tilesPerCol = height / 8;
    
    for (let tileY = 0; tileY < tilesPerCol; tileY++) {
      for (let tileX = 0; tileX < tilesPerRow; tileX++) {
        const currentTileIndex = tileIndex + (tileY * tilesPerRow) + tileX;
        const tileOffset = currentTileIndex * 32; // 32 bytes por tile
        
        // Decodificar tile 8x8
        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 8; x++) {
            const pixelOffset = tileOffset + (y * 4) + Math.floor(x / 2);
            
            if (pixelOffset < vramData.length) {
              const pixelByte = vramData[pixelOffset];
              const pixelValue = (x % 2 === 0) ? 
                (pixelByte & 0x0F) : 
                ((pixelByte & 0xF0) >> 4);
              
              if (pixelValue > 0 && pixelValue < paletteColors.length) {
                const color = paletteColors[pixelValue];
                
                let finalX = (tileX * 8) + x;
                let finalY = (tileY * 8) + y;
                
                if (hFlip) finalX = width - 1 - finalX;
                if (vFlip) finalY = height - 1 - finalY;
                
                const pixelIndex = (finalY * width + finalX) * 4;
                
                imageData.data[pixelIndex] = color.r;
                imageData.data[pixelIndex + 1] = color.g;
                imageData.data[pixelIndex + 2] = color.b;
                imageData.data[pixelIndex + 3] = 255;
              }
            }
          }
        }
      }
    }
    
    return imageData;
  }
}
```

### Fase 3: Preparação Multi-Sistema

#### 3.1 Sistema de Detecção e Configuração

```typescript
// src/lib/systems/SystemDetector.ts
// Implementando preparação para expansão multi-sistema

export type SystemType = 'megadrive' | 'sms' | 'gamegear' | 'segacd';

export interface SystemConfig {
  type: SystemType;
  name: string;
  memoryLayout: MemoryLayout;
  decoders: SystemDecoders;
}

export interface MemoryLayout {
  workRam: { size: number; description: string };
  vram: { size: number; description: string };
  cram: { size: number; description: string };
  vsram?: { size: number; description: string };
  extraRam?: { [key: string]: { size: number; description: string } };
}

export interface SystemDecoders {
  palette: typeof MegaDrivePaletteDecoder;
  sprite: typeof MegaDriveSpriteDecoder;
  // Adicionar outros decodificadores conforme necessário
}

/**
 * Detector e configurador de sistemas Sega
 * Mapeia system_hw do Genesis Plus GX para configurações específicas
 */
export class SystemDetector {
  private static readonly SYSTEM_CONFIGS: Record<number, SystemConfig> = {
    0: { // Master System
      type: 'sms',
      name: 'Master System',
      memoryLayout: {
        workRam: { size: 0x2000, description: '8KB Work RAM' },
        vram: { size: 0x4000, description: '16KB Video RAM' },
        cram: { size: 0x20, description: '32 bytes Color RAM' }
      },
      decoders: {
        palette: MegaDrivePaletteDecoder,
        sprite: MegaDriveSpriteDecoder // Será substituído por SMSSpriteDecoder
      }
    },
    1: { // Game Gear
      type: 'gamegear',
      name: 'Game Gear',
      memoryLayout: {
        workRam: { size: 0x2000, description: '8KB Work RAM' },
        vram: { size: 0x4000, description: '16KB Video RAM' },
        cram: { size: 0x40, description: '64 bytes Color RAM (4096 colors)' }
      },
      decoders: {
        palette: MegaDrivePaletteDecoder,
        sprite: MegaDriveSpriteDecoder // Será substituído por GameGearSpriteDecoder
      }
    },
    2: { // Mega Drive/Genesis
      type: 'megadrive',
      name: 'Mega Drive/Genesis',
      memoryLayout: {
        workRam: { size: 0x10000, description: '64KB Work RAM' },
        vram: { size: 0x10000, description: '64KB Video RAM' },
        cram: { size: 0x80, description: '128 bytes Color RAM' },
        vsram: { size: 0x80, description: '128 bytes Vertical Scroll RAM' }
      },
      decoders: {
        palette: MegaDrivePaletteDecoder,
        sprite: MegaDriveSpriteDecoder
      }
    },
    3: { // Sega CD/Mega CD
      type: 'segacd',
      name: 'Sega CD/Mega CD',
      memoryLayout: {
        workRam: { size: 0x10000, description: '64KB Work RAM' },
        vram: { size: 0x10000, description: '64KB Video RAM' },
        cram: { size: 0x80, description: '128 bytes Color RAM' },
        vsram: { size: 0x80, description: '128 bytes Vertical Scroll RAM' },
        extraRam: {
          prgRam: { size: 0x80000, description: '512KB PRG-RAM' },
          wordRam: { size: 0x40000, description: '256KB Word RAM' },
          pcmRam: { size: 0x10000, description: '64KB PCM RAM' },
          bram: { size: 0x2000, description: '8KB Backup RAM' }
        }
      },
      decoders: {
        palette: MegaDrivePaletteDecoder,
        sprite: MegaDriveSpriteDecoder
      }
    }
  };

  /**
   * Detecta o sistema baseado no código retornado pelo core
   */
  static detectSystem(systemCode: number): SystemConfig {
    const config = this.SYSTEM_CONFIGS[systemCode];
    if (!config) {
      throw new Error(`Sistema não suportado: código ${systemCode}`);
    }
    return config;
  }

  /**
   * Retorna todas as configurações de sistema disponíveis
   */
  static getAllSystems(): SystemConfig[] {
    return Object.values(this.SYSTEM_CONFIGS);
  }

  /**
   * Verifica se um sistema específico é suportado
   */
  static isSystemSupported(systemType: SystemType): boolean {
    return Object.values(this.SYSTEM_CONFIGS)
      .some(config => config.type === systemType);
  }
}
```

#### 3.2 Componente de Interface Adaptável

```typescript
// src/components/SystemAwareInterface.tsx
// Implementando interface adaptável para múltiplos sistemas
import React, { useMemo } from 'react';
import { SystemDetector, SystemConfig } from '../lib/systems/SystemDetector';
import { useGenesisCore } from '../hooks/useGenesisCore';

interface SystemAwareInterfaceProps {
  systemCode: number;
  memorySnapshot: any;
}

/**
 * Interface que se adapta automaticamente ao sistema detectado
 * Exibe painéis de memória específicos para cada sistema
 */
export const SystemAwareInterface: React.FC<SystemAwareInterfaceProps> = ({
  systemCode,
  memorySnapshot
}) => {
  const systemConfig = useMemo(() => {
    try {
      return SystemDetector.detectSystem(systemCode);
    } catch (error) {
      console.error('Sistema não detectado:', error);
      return null;
    }
  }, [systemCode]);

  if (!systemConfig) {
    return (
      <div className="system-error">
        <h3>Sistema Não Suportado</h3>
        <p>Código do sistema: {systemCode}</p>
      </div>
    );
  }

  return (
    <div className="system-interface">
      <div className="system-header">
        <h2>{systemConfig.name}</h2>
        <span className="system-type">{systemConfig.type.toUpperCase()}</span>
      </div>

      <div className="memory-panels">
        {/* Painel de Work RAM */}
        <MemoryPanel
          title="Work RAM"
          data={memorySnapshot?.workRam}
          config={systemConfig.memoryLayout.workRam}
        />

        {/* Painel de VRAM */}
        <MemoryPanel
          title="Video RAM"
          data={memorySnapshot?.vram}
          config={systemConfig.memoryLayout.vram}
        />

        {/* Painel de CRAM */}
        <MemoryPanel
          title="Color RAM"
          data={memorySnapshot?.cram}
          config={systemConfig.memoryLayout.cram}
        />

        {/* VSRAM (apenas para Mega Drive/Sega CD) */}
        {systemConfig.memoryLayout.vsram && (
          <MemoryPanel
            title="Vertical Scroll RAM"
            data={memorySnapshot?.vsram}
            config={systemConfig.memoryLayout.vsram}
          />
        )}

        {/* RAM adicional (Sega CD) */}
        {systemConfig.memoryLayout.extraRam && (
          <div className="extra-ram-panels">
            <h3>Memória Adicional (Sega CD)</h3>
            {Object.entries(systemConfig.memoryLayout.extraRam).map(([key, config]) => (
              <MemoryPanel
                key={key}
                title={config.description}
                data={null} // Será implementado quando Sega CD for suportado
                config={config}
              />
            ))}
          </div>
        )}
      </div>

      {/* Painel de decodificação específico do sistema */}
      <DecodingPanel
        systemConfig={systemConfig}
        memorySnapshot={memorySnapshot}
      />
    </div>
  );
};

// Componente auxiliar para exibir painéis de memória
interface MemoryPanelProps {
  title: string;
  data: Uint8Array | null;
  config: { size: number; description: string };
}

const MemoryPanel: React.FC<MemoryPanelProps> = ({ title, data, config }) => {
  const formatSize = (bytes: number) => {
    if (bytes >= 1024) {
      return `${bytes / 1024}KB`;
    }
    return `${bytes} bytes`;
  };

  return (
    <div className="memory-panel">
      <h4>{title}</h4>
      <div className="memory-info">
        <span className="size">{formatSize(config.size)}</span>
        <span className="description">{config.description}</span>
      </div>
      <div className="memory-status">
        {data ? (
          <span className="status-active">✓ Dados carregados</span>
        ) : (
          <span className="status-inactive">⚠ Sem dados</span>
        )}
      </div>
    </div>
  );
};

// Componente para decodificação específica do sistema
interface DecodingPanelProps {
  systemConfig: SystemConfig;
  memorySnapshot: any;
}

const DecodingPanel: React.FC<DecodingPanelProps> = ({ systemConfig, memorySnapshot }) => {
  const decodedPalettes = useMemo(() => {
    if (!memorySnapshot?.cram) return [];
    
    try {
      return systemConfig.decoders.palette.decode(
        memorySnapshot.cram,
        systemConfig.type
      );
    } catch (error) {
      console.error('Erro ao decodificar paletas:', error);
      return [];
    }
  }, [memorySnapshot?.cram, systemConfig]);

  return (
    <div className="decoding-panel">
      <h3>Assets Decodificados</h3>
      
      {/* Paletas */}
      <div className="palette-section">
        <h4>Paletas de Cores</h4>
        <div className="palette-grid">
          {decodedPalettes.map((palette, index) => (
            <div key={index} className="palette-item">
              <h5>Paleta {palette.paletteIndex}</h5>
              <div className="color-row">
                {palette.colors.map((color, colorIndex) => (
                  <div
                    key={colorIndex}
                    className="color-swatch"
                    style={{ backgroundColor: color.hex }}
                    title={`${color.hex} (R:${color.r} G:${color.g} B:${color.b})`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sprites (será implementado) */}
      <div className="sprite-section">
        <h4>Sprites</h4>
        <p>Decodificação de sprites será implementada na próxima fase</p>
      </div>
    </div>
  );
};
```

## Próximos Passos

### Fase 4: Implementação Completa da UI
1. **Galeria de Sprites**: Componente para exibir sprites decodificados
2. **Editor de Paletas**: Interface para modificar cores
3. **Visualizador de Tiles**: Exibição de tiles individuais
4. **Exportação de Assets**: Funcionalidade para salvar sprites/paletas

### Fase 5: Otimização e Performance
1. **Web Workers**: Mover decodificação para workers
2. **Caching**: Sistema de cache para assets decodificados
3. **Lazy Loading**: Carregamento sob demanda de sprites

### Fase 6: Expansão Multi-Sistema
1. **SMS/Game Gear**: Implementar decodificadores específicos
2. **Sega CD**: Suporte para RAM adicional
3. **Detecção Automática**: Identificação automática do sistema

## Estrutura de Arquivos Recomendada

```
src/
├── components/
│   ├── EmulatorCore.tsx
│   ├── SystemAwareInterface.tsx
│   ├── MemoryViewer.tsx
│   └── SpriteGallery.tsx
├── hooks/
│   ├── useGenesisCore.ts
│   └── useMemorySnapshot.ts
├── lib/
│   ├── decoders/
│   │   ├── MegaDrivePaletteDecoder.ts
│   │   ├── MegaDriveSpriteDecoder.ts
│   │   ├── SMSPaletteDecoder.ts
│   │   └── GameGearPaletteDecoder.ts
│   └── systems/
│       ├── SystemDetector.ts
│       └── MemoryLayoutManager.ts
└── types/
    ├── EmulatorTypes.ts
    └── SystemTypes.ts
```

Esta documentação fornece uma base sólida para continuar o desenvolvimento do Universal Asset Studio, integrando o Genesis Plus GX compilado com uma interface React moderna e preparando o terreno para expans