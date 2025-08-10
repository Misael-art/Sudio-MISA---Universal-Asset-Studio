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
}

export function parseVDPRegisters(regs?: Uint8Array): VDPRegisters {
  // Se disponível, parse simples dos registradores do VDP; caso contrário, defaults
  if (!regs || regs.length < 0x20) {
    return {
      planeABase: 0xC000,
      planeBBase: 0xE000,
      windowBase: 0xB000,
      satBase: 0xD800,
      hScroll: 0,
      vScroll: 0,
      modeSet1: 0,
      modeSet2: 0,
      scrollMode: { h: 'full', v: 'full' },
    };
  }
  // Exemplo: VDP regs layout (parcial e simplificado)
  const r2 = regs[2]; // Name table A base (bits relevantes) — simplificado
  const r4 = regs[4]; // Name table B base
  const r3 = regs[3]; // Window base
  const r5 = regs[5]; // SAT base
  const r0 = regs[0];
  const r1 = regs[1];
  const r11 = regs[11]; // Scroll mode
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
  return {
    planeABase,
    planeBBase,
    windowBase,
    satBase,
    hScroll: 0,
    vScroll: 0,
    modeSet1: r0,
    modeSet2: r1,
    scrollMode: { h, v },
  };
}

