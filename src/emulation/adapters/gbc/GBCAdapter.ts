import type { FrameIR, Palette, Tileset, Layer, Sprite } from '@/emulation/ir';

interface Snapshot {
  framebuffer?: Uint8ClampedArray;
  width?: number;
  height?: number;
  vram?: Uint8Array;     // 16KB (2 bancos)
  palettes?: Uint8Array; // Paletas CGB
  oam?: Uint8Array;      // 160B
  regs?: Uint8Array;     // LCDC/SCX/SCY/LY/BCPS/BCPD/OCPS/OCPD etc.
}

export class GBCAdapter {
  buildFrameIR(snapshot: Snapshot): FrameIR {
    const diagnostics: string[] = [];
    const palettes: Palette[] = [];
    const tilesets: Tileset[] = [];
    const layers: Layer[] = [];
    const sprites: Sprite[] = [];

    if (!snapshot.vram) diagnostics.push('GBC: VRAM indisponível');
    if (!snapshot.palettes) diagnostics.push('GBC: Paletas CGB indisponíveis');
    if (!snapshot.oam) diagnostics.push('GBC: OAM indisponível');

    let framebuffer;
    if (snapshot.framebuffer && snapshot.width && snapshot.height) {
      try {
        const img = new ImageData(snapshot.width, snapshot.height);
        img.data.set(snapshot.framebuffer);
        framebuffer = { image: img };
      } catch {
        diagnostics.push('GBC: falha ao montar framebuffer');
      }
    }

    return {
      system: 'gbc',
      palettes,
      tilesets,
      layers,
      sprites,
      framebuffer,
      diagnostics,
    };
  }
}

