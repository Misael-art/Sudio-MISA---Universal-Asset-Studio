import type { FrameIR, Palette, Tileset, Layer, Sprite } from '@/emulation/ir';

interface Snapshot {
  framebuffer?: Uint8ClampedArray;
  width?: number;
  height?: number;
  vram?: Uint8Array;     // CHR RAM/ROM mapped snapshot if available
  palettes?: Uint8Array; // PPU palettes (32B)
  oam?: Uint8Array;      // 256B
  regs?: Uint8Array;     // PPU regs
}

export class NESAdapter {
  buildFrameIR(snapshot: Snapshot): FrameIR {
    const diagnostics: string[] = [];
    const palettes: Palette[] = [];
    const tilesets: Tileset[] = [];
    const layers: Layer[] = [];
    const sprites: Sprite[] = [];

    if (!snapshot.vram) diagnostics.push('NES: VRAM/CHR indisponível');
    if (!snapshot.palettes) diagnostics.push('NES: Paletas PPU indisponíveis');
    if (!snapshot.oam) diagnostics.push('NES: OAM indisponível');

    let framebuffer;
    if (snapshot.framebuffer && snapshot.width && snapshot.height) {
      try {
        const img = new ImageData(snapshot.width, snapshot.height);
        img.data.set(snapshot.framebuffer);
        framebuffer = { image: img };
      } catch {
        diagnostics.push('NES: falha ao montar framebuffer');
      }
    }

    return {
      system: 'nes',
      palettes,
      tilesets,
      layers,
      sprites,
      framebuffer,
      diagnostics,
    };
  }
}

