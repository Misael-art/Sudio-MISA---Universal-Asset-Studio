import type { SystemId, MemorySnapshot } from '@/emulation/types';

export interface ExtractedMemory {
  vram?: Uint8Array;
  cram?: Uint8Array;
  vsram?: Uint8Array;
  oam?: Uint8Array;
  sat?: Uint8Array;
  regs?: Uint8Array;
}

export async function fallbackExtractFromSaveState(system: SystemId, state: Uint8Array): Promise<ExtractedMemory | null> {
  try {
    // Estrutura extensível: despacha por sistema.
    switch (system) {
      case 'megadrive':
      case 'genesis':
      case 'segaMD':
        return extractMegaDrive(state);
      case 'snes':
      case 'sfc':
        return extractSNES(state);
      default:
        return null;
    }
  } catch {
    return null;
  }
}

async function extractMegaDrive(_state: Uint8Array): Promise<ExtractedMemory | null> {
  // TODO: Implementar parsing de SaveState do core atual.
  // Sem especificação formal do formato, retornar null de forma segura.
  return null;
}

async function extractSNES(_state: Uint8Array): Promise<ExtractedMemory | null> {
  // TODO: Implementar parsing de SaveState do core SNES.
  return null;
}

