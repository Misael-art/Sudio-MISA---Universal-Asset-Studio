import type { FrameIR, Palette, Tileset, Tile, Tilemap, TilemapCell, Layer, Sprite } from '@/emulation/ir';
import { parseVDPRegisters } from './vdp';
import { MegaDrivePaletteDecoder as MDPaletteDecoder } from '@/lib/decoders/MegaDrivePaletteDecoder';
import { MegaDriveSpriteDecoder as MDSpriteDecoder } from '@/lib/decoders/MegaDriveSpriteDecoder';

interface MDMemorySnapshot {
  vram?: Uint8Array; // 64KB
  cram?: Uint8Array; // 128B
  vsram?: Uint8Array; // 80 words
  sat?: Uint8Array;   // 0x280 bytes (SAT) se disponível diretamente
  framebuffer?: Uint8ClampedArray; // 320x224x4
  width?: number; height?: number;
  regs?: Uint8Array;
}

export class MegaDriveAdapter {
  private readonly width: number = 320;
  private readonly height: number = 224;

  public buildFrameIR(snapshot: MDMemorySnapshot): FrameIR {
    const diagnostics: string[] = [];

    const palettes = this.decodePalettes(snapshot.cram, diagnostics);
    const tileset = this.decodeTiles(snapshot.vram, palettes, diagnostics);
    const layers = this.reconstructLayers(snapshot, palettes, tileset, diagnostics);
    const sprites = this.extractSprites(snapshot, palettes, tileset, diagnostics);

    const framebuffer = this.toImageData(snapshot.framebuffer, snapshot.width, snapshot.height);

    return {
      system: 'megadrive',
      palettes,
      tilesets: [tileset],
      layers,
      sprites,
      framebuffer: framebuffer ? { image: framebuffer } : undefined,
      diagnostics,
    };
  }

  private decodePalettes(cram?: Uint8Array, diagnostics?: string[]): Palette[] {
    if (!cram || cram.length < 128) {
      diagnostics?.push('CRAM ausente ou inválida; usando paleta vazia');
      return [{ id: 'PAL0', colors: new Array(16).fill('#000000'), system: 'megadrive', source: 'CRAM' }];
    }
    const mdPalettes = MDPaletteDecoder.decode(cram);
    return mdPalettes.map((p, idx) => ({ id: `PAL${idx}`, colors: p, system: 'megadrive', source: 'CRAM' }));
  }

  private decodeTiles(vram?: Uint8Array, palettes?: Palette[], diagnostics?: string[]): Tileset {
    const width = 8, height = 8, tileSizeBytes = 32;
    if (!vram || vram.length < 0x1000) {
      diagnostics?.push('VRAM ausente ou insuficiente; tileset vazio gerado');
      return { tiles: [], tileSize: { width, height } };
    }
    const tiles: Tile[] = [];
    const tilesCount = Math.floor(vram.length / tileSizeBytes);
    for (let t = 0; t < tilesCount; t++) {
      const img = new ImageData(width, height);
      const indices = new Uint8Array(width * height);
      const base = t * tileSizeBytes;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < 8; x += 2) {
          const byte = vram[base + y * 4 + (x >> 1)];
          const left = (byte & 0xF0) >> 4;
          const right = byte & 0x0F;
          const li = (y * width + x) * 4;
          const ri = (y * width + x + 1) * 4;
          indices[y * width + x] = left;
          indices[y * width + x + 1] = right;
          // Preenche uma visualização padrão usando paleta 0 como fallback (não usada na composição final)
          const lc = this.hexToRgb((palettes?.[0]?.colors[left]) || '#000000');
          const rc = this.hexToRgb((palettes?.[0]?.colors[right]) || '#000000');
          img.data[li] = lc.r; img.data[li + 1] = lc.g; img.data[li + 2] = lc.b; img.data[li + 3] = left === 0 ? 0 : 255;
          img.data[ri] = rc.r; img.data[ri + 1] = rc.g; img.data[ri + 2] = rc.b; img.data[ri + 3] = right === 0 ? 0 : 255;
        }
      }
      tiles.push({ id: t, width, height, imageData: img, pixelIndices: indices, hash: this.hashImageData(img) });
    }
    return { tiles, tileSize: { width, height } };
  }

  private reconstructLayers(snapshot: MDMemorySnapshot, palettes: Palette[], tileset: Tileset, diagnostics?: string[]): Layer[] {
    const vdp = parseVDPRegisters(snapshot.regs);
    const width = 64, height = 32; // grids típicos para 320x224
    const layers: Layer[] = [];

    // Plane A
    if (snapshot.vram && typeof vdp.planeABase === 'number') {
      const tmA = this.reconstructTilemapFromVRAM(snapshot.vram, vdp.planeABase, width, height, diagnostics);
      layers.push({ kind: 'BG', tileset, tilemap: tmA, paletteGroup: [0], scroll: { x: vdp.hScroll || 0, y: vdp.vScroll || 0 }, priorityOrder: 0 });
      diagnostics?.push(`Plane A base=0x${vdp.planeABase.toString(16)}`);
    }

    // Plane B
    if (snapshot.vram && typeof vdp.planeBBase === 'number') {
      const tmB = this.reconstructTilemapFromVRAM(snapshot.vram, vdp.planeBBase, width, height, diagnostics);
      layers.push({ kind: 'BG', tileset, tilemap: tmB, paletteGroup: [0], scroll: { x: 0, y: 0 }, priorityOrder: 1 });
      diagnostics?.push(`Plane B base=0x${vdp.planeBBase.toString(16)}`);
    }

    // Window (opcional)
    if (snapshot.vram && typeof vdp.windowBase === 'number' && vdp.windowBase !== 0) {
      const tmW = this.reconstructTilemapFromVRAM(snapshot.vram, vdp.windowBase, width, height, diagnostics);
      layers.push({ kind: 'WINDOW', tileset, tilemap: tmW, paletteGroup: [0], scroll: { x: 0, y: 0 }, priorityOrder: 2 });
      diagnostics?.push(`Window base=0x${vdp.windowBase.toString(16)}`);
    }

    if (layers.length === 0) {
      const cells: TilemapCell[] = new Array(width * height).fill(0).map(() => ({ tileIndex: 0, paletteIndex: 0, flipH: false, flipV: false }));
      layers.push({ kind: 'BG', tileset, tilemap: { width, height, cells }, paletteGroup: [0], scroll: { x: 0, y: 0 }, priorityOrder: 0 });
      diagnostics?.push('Layers placeholders criados (VRAM/regs não disponíveis)');
    }

    // Ordenar por prioridade declarada (placeholder até ler prioridade real)
    layers.sort((a, b) => (a.priorityOrder ?? 0) - (b.priorityOrder ?? 0));
    return layers;
  }

  private extractSprites(snapshot: MDMemorySnapshot, palettes: Palette[], tileset: Tileset, diagnostics?: string[]): Sprite[] {
    if (!snapshot.vram) {
      diagnostics?.push('VRAM indisponível; não é possível extrair sprites');
      return [];
    }
    // Ler SAT da VRAM usando base do VDP (assume 0x280 bytes)
    const vdp2 = parseVDPRegisters(snapshot.regs);
    const sat = snapshot.sat ?? (snapshot.vram ? this.sliceSatFromVRAM(snapshot.vram, vdp2.satBase ?? 0xD800, diagnostics) : undefined);
    // Converter paletas IR -> formato esperado pelo decoder
    const mdPalettes = palettes.map(p => ({ colors: p.colors } as any));
    try {
      const mdSprites = MDSpriteDecoder.decode(sat, snapshot.vram, mdPalettes);
      const sprites: Sprite[] = mdSprites.map((s: any, idx: number) => ({
        id: idx,
        x: s.x ?? 0,
        y: s.y ?? 0,
        width: s.imageData?.width ?? 0,
        height: s.imageData?.height ?? 0,
        image: s.imageData,
        priority: s.priority,
        paletteIndex: s.paletteIndex,
      }));
      diagnostics?.push(`Sprites extraídos: ${sprites.length}`);
      return sprites;
    } catch (e) {
      diagnostics?.push('Falha ao decodificar sprites via MDSpriteDecoder');
      return [];
    }
  }

  private toImageData(buf?: Uint8ClampedArray, w?: number, h?: number): ImageData | undefined {
    if (!buf || !w || !h) return undefined;
    try {
      const out = new ImageData(w, h);
      out.data.set(buf.slice(0, w * h * 4));
      return out;
    } catch {
      return undefined;
    }
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 0, g: 0, b: 0 };
  }

  private hashImageData(img: ImageData): string {
    // Simples hash FNV-1a para deduplicação (placeholder)
    let hash = 2166136261;
    const d = img.data;
    for (let i = 0; i < d.length; i++) {
      hash ^= d[i];
      hash = (hash * 16777619) >>> 0;
    }
    return hash.toString(16);
  }

  private reconstructTilemapFromVRAM(vram: Uint8Array, base: number, widthTiles: number, heightTiles: number, diagnostics?: string[]): Tilemap {
    const cells: TilemapCell[] = new Array(widthTiles * heightTiles);
    const vramLen = vram.length;
    const entrySize = 2; // 2 bytes por entrada no MD
    for (let ty = 0; ty < heightTiles; ty++) {
      for (let tx = 0; tx < widthTiles; tx++) {
        const offset = base + (ty * widthTiles + tx) * entrySize;
        let word = 0;
        if (offset + 1 < vramLen) {
          word = vram[offset] | (vram[offset + 1] << 8);
        }
        const tileIndex = word & 0x07FF;        // bits 0-10
        const flipH = (word & 0x0800) !== 0;    // bit 11
        const flipV = (word & 0x1000) !== 0;    // bit 12
        const paletteIndex = (word & 0x6000) >> 13; // bits 13-14
        const priority = (word & 0x8000) !== 0; // bit 15
        cells[ty * widthTiles + tx] = { tileIndex, paletteIndex, flipH, flipV, priority };
      }
    }
    return { width: widthTiles, height: heightTiles, cells };
  }

  private sliceSatFromVRAM(vram: Uint8Array, satBase: number, diagnostics?: string[]): Uint8Array | undefined {
    const satSize = 0x280;
    if (satBase + satSize > vram.length) {
      diagnostics?.push(`SAT fora dos limites da VRAM (base=0x${satBase.toString(16)})`);
      return undefined;
    }
    return vram.slice(satBase, satBase + satSize);
  }
}

