export interface VDPRegisters {
  planeABase?: number;
  planeBBase?: number;
  windowBase?: number;
  satBase?: number;
  hScroll?: number;
  vScroll?: number;
  modeSet1?: number;
  modeSet2?: number;
  scrollMode?: { h: 'full' | 'cell' | 'line'; v: 'full' | 'cell'; };
  hScrollTableBase?: number;
  planeASize?: { widthTiles: number; heightTiles: number };
  planeBSize?: { widthTiles: number; heightTiles: number };
}

export function parseVDPRegisters(regs?: Uint8Array, vsram?: Uint8Array): VDPRegisters {
  // Se disponível, parse simples dos registradores do VDP; caso contrário, defaults
  if (!regs || regs.length < 0x20) {
    const def = {
      planeABase: 0xC000,
      planeBBase: 0xE000,
      windowBase: 0xB000,
      satBase: 0xD800,
      hScroll: 0,
      vScroll: ((vsram?.[0] ?? 0) | ((vsram?.[1] ?? 0) << 8)) & 0x3FF,
      modeSet1: 0,
      modeSet2: 0,
      scrollMode: { h: 'full', v: 'full' },
      hScrollTableBase: 0,
      planeASize: { widthTiles: 64, heightTiles: 32 },
      planeBSize: { widthTiles: 64, heightTiles: 32 },
    } as VDPRegisters;
    return def;
  }
  // Exemplo: VDP regs layout (parcial e simplificado)
  const r2 = regs[2]; // Name table A base (bits relevantes) — simplificado
  const r4 = regs[4]; // Name table B base
  const r3 = regs[3]; // Window base
  const r5 = regs[5]; // SAT base
  const r0 = regs[0];
  const r1 = regs[1];
  const r11 = regs[11]; // Scroll mode
  const r13 = regs[13]; // HScroll table base
  const r16 = regs[16]; // Plane sizes (simplificado)
  const planeABase = (r2 & 0x38) << 10; // mapeamento simplificado
  const planeBBase = (r4 & 0x07) << 13;
  const windowBase = (r3 & 0x3E) << 10;
  const satBase = (r5 & 0x7E) << 9;
  // Scroll mode (simplificado): bits em r11
  // h: 00 full, 01 cell, 11 line; v: 0 full, 1 cell
  const hModeBits = (r11 & 0x03);
  const vModeBit = (r11 & 0x04) >>> 2;
  const h: 'full' | 'cell' | 'line' = hModeBits === 0 ? 'full' : (hModeBits === 1 ? 'cell' : 'line');
  const v: 'full' | 'cell' = vModeBit === 0 ? 'full' : 'cell';
  const hScrollTableBase = (r13 & 0x3F) << 10;
  // vScroll (plano) básico via VSRAM primeira palavra
  const vScroll = ((vsram?.[0] ?? 0) | ((vsram?.[1] ?? 0) << 8)) & 0x3FF;
  // Tamanho dos planos (simplificado):
  // bits 0-1: Plane A, bits 4-5: Plane B
  const sizeBitsToWH = (bits: number) => {
    switch (bits & 0x3) {
      case 0: return { widthTiles: 32, heightTiles: 32 };
      case 1: return { widthTiles: 64, heightTiles: 32 };
      case 2: return { widthTiles: 32, heightTiles: 64 };
      case 3: return { widthTiles: 64, heightTiles: 64 };
      default: return { widthTiles: 64, heightTiles: 32 };
    }
  };
  const planeASize = sizeBitsToWH(r16 & 0x3);
  const planeBSize = sizeBitsToWH((r16 >> 4) & 0x3);
  return {
    planeABase,
    planeBBase,
    windowBase,
    satBase,
    hScroll: 0,
    vScroll,
    modeSet1: r0,
    modeSet2: r1,
    scrollMode: { h, v },
    hScrollTableBase,
    planeASize,
    planeBSize,
  };
}

