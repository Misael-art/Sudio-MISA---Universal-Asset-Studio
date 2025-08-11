import type { FrameIR, Palette, Tileset, Layer, Sprite } from '@/emulation/ir';

interface Snapshot {
  framebuffer?: Uint8ClampedArray;
  width?: number;
  height?: number;
  vram?: Uint8Array;
  palettes?: Uint8Array; // CGRAM
  oam?: Uint8Array;      // OAM
  regs?: Uint8Array;     // PPU regs
}

export class SNESAdapter {
  buildFrameIR(snapshot: Snapshot): FrameIR {
    const diagnostics: string[] = [];
    const palettes: Palette[] = [];
    const tilesets: Tileset[] = [];
    const layers: Layer[] = [];
    const sprites: Sprite[] = [];

    if (!snapshot.vram) diagnostics.push('SNES: VRAM indisponível');
    if (!snapshot.palettes) diagnostics.push('SNES: CGRAM indisponível');
    if (!snapshot.oam) diagnostics.push('SNES: OAM indisponível');
    if (!snapshot.regs) diagnostics.push('SNES: registradores PPU indisponíveis');

    let framebuffer;
    if (snapshot.framebuffer && snapshot.width && snapshot.height) {
      try {
        const img = new ImageData(snapshot.width, snapshot.height);
        img.data.set(snapshot.framebuffer);
        framebuffer = { image: img };
      } catch {
        diagnostics.push('SNES: falha ao montar framebuffer');
      }
    }

    return {
      system: 'snes',
      palettes,
      tilesets,
      layers,
      sprites,
      framebuffer,
      diagnostics,
    };
  }
}

