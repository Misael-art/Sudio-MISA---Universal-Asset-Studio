import type { FrameIR, Palette, Tileset, Layer, Sprite } from '@/emulation/ir';

interface Snapshot {
  framebuffer?: Uint8ClampedArray;
  width?: number;
  height?: number;
  vram?: Uint8Array;     // 96KB aprox. (modos diversos)
  palettes?: Uint8Array; // BG/OAM paletas
  oam?: Uint8Array;      // 1KB
  regs?: Uint8Array;     // DISPCNT/BLDCNT etc.
}

export class GBAAdapter {
  buildFrameIR(snapshot: Snapshot): FrameIR {
    const diagnostics: string[] = [];
    const palettes: Palette[] = [];
    const tilesets: Tileset[] = [];
    const layers: Layer[] = [];
    const sprites: Sprite[] = [];

    if (!snapshot.vram) diagnostics.push('GBA: VRAM indisponível');
    if (!snapshot.palettes) diagnostics.push('GBA: paletas BG/OAM indisponíveis');
    if (!snapshot.oam) diagnostics.push('GBA: OAM indisponível');

    let framebuffer;
    if (snapshot.framebuffer && snapshot.width && snapshot.height) {
      try {
        const img = new ImageData(snapshot.width, snapshot.height);
        img.data.set(snapshot.framebuffer);
        framebuffer = { image: img };
      } catch {
        diagnostics.push('GBA: falha ao montar framebuffer');
      }
    }

    return {
      system: 'gba',
      palettes,
      tilesets,
      layers,
      sprites,
      framebuffer,
      diagnostics,
    };
  }
}

