import type { SystemId, MemorySnapshot } from '@/emulation/types';

export interface ExtractedMemory {
  vram?: Uint8Array;
  cram?: Uint8Array;
  vsram?: Uint8Array;
  oam?: Uint8Array;
  sat?: Uint8Array;
  regs?: Uint8Array;
}

// Removido o fallback de extração por SaveState para cumprir a regra "Sem dados mock/simulados".
export async function fallbackExtractFromSaveState(_system: SystemId, _state: Uint8Array): Promise<ExtractedMemory | null> {
  throw new Error('Extração por SaveState está desativada. Use apenas ponteiros reais do core (VRAM/CRAM/VSRAM/SAT).');
}

// Rotas de extração via SaveState foram desativadas para evitar ambiguidade de dados.
async function extractMegaDrive(_state: Uint8Array): Promise<ExtractedMemory | null> { return null; }

async function extractSNES(_state: Uint8Array): Promise<ExtractedMemory | null> { return null; }

