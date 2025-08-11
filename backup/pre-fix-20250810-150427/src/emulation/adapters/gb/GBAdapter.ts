import type { FrameIR, Palette, Tileset, Layer, Sprite } from '@/emulation/ir';

interface Snapshot {
  framebuffer?: Uint8ClampedArray;
  width?: number;
  height?: number;
  vram?: Uint8Array;     // 8KB
  palettes?: Uint8Array; // GB original: 4 tons (via regs), aqui placeholder
  oam?: Uint8Array;      // 160B
  regs?: Uint8Array;     // LCDC/SCX/SCY/LY/BGP/OBP0/OBP1 etc.
}

export class GBAdapter {
  buildFrameIR(snapshot: Snapshot): FrameIR {
    const diagnostics: string[] = [];
    const palettes: Palette[] = [];
    const tilesets: Tileset[] = [];
    const layers: Layer[] = [];
    const sprites: Sprite[] = [];

    if (!snapshot.vram) diagnostics.push('GB: VRAM indisponível');
    if (!snapshot.oam) diagnostics.push('GB: OAM indisponível');
    if (!snapshot.regs) diagnostics.push('GB: registradores LCD indisponíveis');

    let framebuffer;
    if (snapshot.framebuffer && snapshot.width && snapshot.height) {
      try {
        const img = new ImageData(snapshot.width, snapshot.height);
        img.data.set(snapshot.framebuffer);
        framebuffer = { image: img };
      } catch {
        diagnostics.push('GB: falha ao montar framebuffer');
      }
    }

    return {
      system: 'gb',
      palettes,
      tilesets,
      layers,
      sprites,
      framebuffer,
      diagnostics,
    };
  }
}

