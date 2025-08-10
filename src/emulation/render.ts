import type { FrameIR, Layer, Tilemap, Tileset, Sprite, TilemapCell } from '@/emulation/ir';

function createImageData(width: number, height: number): ImageData {
  return new ImageData(width, height);
}

function blitImageData(dst: ImageData, src: ImageData, dx: number, dy: number): void {
  const { width: dw, height: dh, data: dd } = dst;
  const { width: sw, height: sh, data: sd } = src;
  for (let y = 0; y < sh; y++) {
    const ty = dy + y;
    if (ty < 0 || ty >= dh) continue;
    for (let x = 0; x < sw; x++) {
      const tx = dx + x;
      if (tx < 0 || tx >= dw) continue;
      const si = (y * sw + x) * 4;
      const di = (ty * dw + tx) * 4;
      const a = sd[si + 3];
      if (a === 0) continue; // transparent
      dd[di] = sd[si];
      dd[di + 1] = sd[si + 1];
      dd[di + 2] = sd[si + 2];
      dd[di + 3] = a;
    }
  }
}

function colorizeIndexedTile(
  dst: ImageData,
  pixelIndices: Uint8Array,
  dx: number,
  dy: number,
  tileWidth: number,
  tileHeight: number,
  palette: string[]
): void {
  const { width: dw, height: dh, data: dd } = dst;
  for (let y = 0; y < tileHeight; y++) {
    const ty = dy + y;
    if (ty < 0 || ty >= dh) continue;
    for (let x = 0; x < tileWidth; x++) {
      const tx = dx + x;
      if (tx < 0 || tx >= dw) continue;
      const pi = y * tileWidth + x;
      const palIndex = pixelIndices[pi] & 0x0F; // 4bpp
      if (palIndex === 0) continue; // transparente
      const colorHex = palette[palIndex] || '#000000';
      const r = parseInt(colorHex.slice(1, 3), 16) || 0;
      const g = parseInt(colorHex.slice(3, 5), 16) || 0;
      const b = parseInt(colorHex.slice(5, 7), 16) || 0;
      const di = (ty * dw + tx) * 4;
      dd[di] = r;
      dd[di + 1] = g;
      dd[di + 2] = b;
      dd[di + 3] = 255;
    }
  }
}

function drawTilemap(
  dst: ImageData,
  layer: Layer,
  frame: FrameIR,
  cellFilter?: (cell: TilemapCell) => boolean
): void {
  const map: Tilemap = layer.tilemap;
  const tileset: Tileset = layer.tileset;
  const tw = tileset.tileSize.width;
  const th = tileset.tileSize.height;
  const W = map.width;
  const H = map.height;
  const palettes = frame.palettes;
  const scrollXFull = Math.trunc(layer.scroll?.x ?? 0);
  const scrollYFull = Math.trunc(layer.scroll?.y ?? 0);
  const viewportW = dst.width;
  const viewportH = dst.height;
  const mapPixW = W * tw;
  const mapPixH = H * th;
  const norm = (v: number, m: number) => ((v % m) + m) % m;
  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < W; tx++) {
      const cell = map.cells[ty * W + tx];
      if (cellFilter && !cellFilter(cell)) continue;
      const tile = tileset.tiles[cell.tileIndex];
      if (!tile) continue;
      // posição destino com scroll e wrap
      // Scroll por linha/coluna (se disponível) — aplica offset adicional
      let sx = scrollXFull;
      let sy = scrollYFull;
      if (layer.lineScrollX) {
        const startY = ty * th;
        // Seleciona o valor da primeira linha do tile (aproximação)
        sx = Math.trunc(layer.lineScrollX[Math.min(startY, layer.lineScrollX.length - 1)] ?? scrollXFull);
      }
      if (layer.columnScrollY) {
        const startX = tx * tw;
        const col = Math.floor(startX / tw);
        sy = Math.trunc(layer.columnScrollY[Math.min(col, layer.columnScrollY.length - 1)] ?? scrollYFull);
      }
      const baseDx = tx * tw - norm(sx, mapPixW);
      const baseDy = ty * th - norm(sy, mapPixH);
      const targets = [
        { dx: baseDx, dy: baseDy },
        { dx: baseDx + mapPixW, dy: baseDy },
        { dx: baseDx - mapPixW, dy: baseDy },
        { dx: baseDx, dy: baseDy + mapPixH },
        { dx: baseDx, dy: baseDy - mapPixH },
        { dx: baseDx + mapPixW, dy: baseDy + mapPixH },
        { dx: baseDx - mapPixW, dy: baseDy - mapPixH },
        { dx: baseDx + mapPixW, dy: baseDy - mapPixH },
        { dx: baseDx - mapPixW, dy: baseDy + mapPixH },
      ];
      // Se tivermos índices, aplicamos paleta por tile dinamicamente
      if (tile.pixelIndices && palettes && palettes.length > 0) {
        // MD: paletteIndex seleciona uma das paletas de 16 cores
        const chosenPalIdx = (cell.paletteIndex ?? 0);
        const palette = palettes[chosenPalIdx]?.colors || new Array(16).fill('#000000');
        // Construir buffer de índices aplicando flips
        const srcW = tw, srcH = th;
        const flipped = new Uint8Array(srcW * srcH);
        for (let y = 0; y < srcH; y++) {
          for (let x = 0; x < srcW; x++) {
            const sx = cell.flipH ? (srcW - 1 - x) : x;
            const sy = cell.flipV ? (srcH - 1 - y) : y;
            flipped[y * srcW + x] = tile.pixelIndices[sy * srcW + sx];
          }
        }
        for (const t of targets) {
          if (t.dx + tw < 0 || t.dx >= viewportW || t.dy + th < 0 || t.dy >= viewportH) continue;
          colorizeIndexedTile(dst, flipped, t.dx, t.dy, tw, th, palette);
        }
      } else {
        // fallback: já colorizado em imageData
        // Handle flips por cópia para buffer temporário
        let src = tile.imageData;
        if (cell.flipH || cell.flipV) {
          const tmp = createImageData(src.width, src.height);
          const sw = src.width, sh = src.height;
          for (let y = 0; y < sh; y++) {
            for (let x = 0; x < sw; x++) {
              const sx = cell.flipH ? (sw - 1 - x) : x;
              const sy = cell.flipV ? (sh - 1 - y) : y;
              const si = (sy * sw + sx) * 4;
              const di = (y * sw + x) * 4;
              tmp.data[di] = src.data[si];
              tmp.data[di + 1] = src.data[si + 1];
              tmp.data[di + 2] = src.data[si + 2];
              tmp.data[di + 3] = src.data[si + 3];
            }
          }
          src = tmp;
        }
        for (const t of targets) {
          if (t.dx + tw < 0 || t.dx >= viewportW || t.dy + th < 0 || t.dy >= viewportH) continue;
          blitImageData(dst, src, t.dx, t.dy);
        }
      }
    }
  }
}

function drawSprites(dst: ImageData, sprites: Sprite[]): void {
  for (const s of sprites) {
    if (!s.image) continue;
    blitImageData(dst, s.image, Math.round(s.x || 0), Math.round(s.y || 0));
  }
}

export interface RenderOptions {
  layerIndices?: number[]; // quais camadas desenhar; default: [0]
}

export function renderFrameIRToImage(frame: FrameIR, width?: number, height?: number, options?: RenderOptions): ImageData | null {
  const fw = width ?? frame.framebuffer?.image?.width ?? 320;
  const fh = height ?? frame.framebuffer?.image?.height ?? 224;
  const out = createImageData(fw, fh);
  // Draw layers in order
  if (frame.layers && frame.layers.length > 0) {
    const indices = options?.layerIndices && options.layerIndices.length > 0
      ? options.layerIndices
      : [0];
    // Ordenar por prioridade declarada, manter pipeline de prioridade por célula
    const orderedLayers = indices
      .filter(idx => idx >= 0 && idx < frame.layers.length)
      .map(idx => frame.layers[idx])
      .sort((a, b) => (a.priorityOrder ?? 0) - (b.priorityOrder ?? 0));
    // 1) BG low-priority cells
    for (const layer of orderedLayers) drawTilemap(out, layer, frame, (cell) => cell.priority !== true);
    // 2) Sprites desenhados depois dos BG low
    if (frame.sprites && frame.sprites.length > 0) {
      drawSprites(out, frame.sprites);
    }
    // 3) BG high-priority cells acima dos sprites
    for (const layer of orderedLayers) drawTilemap(out, layer, frame, (cell) => cell.priority === true);
  }
  return out;
}

export function diffImages(a: ImageData, b: ImageData): ImageData {
  const w = Math.min(a.width, b.width);
  const h = Math.min(a.height, b.height);
  const out = new ImageData(w, h);
  const ad = a.data;
  const bd = b.data;
  const od = out.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const dr = Math.abs(ad[i] - bd[i]);
      const dg = Math.abs(ad[i + 1] - bd[i + 1]);
      const db = Math.abs(ad[i + 2] - bd[i + 2]);
      const da = Math.abs(ad[i + 3] - bd[i + 3]);
      // visualize diff in magenta-ish; alpha shows difference magnitude
      od[i] = dr;
      od[i + 1] = dg * 0.3;
      od[i + 2] = db;
      od[i + 3] = Math.max(dr, dg, db, da);
    }
  }
  return out;
}

export function diffScore(a: ImageData, b: ImageData): { total: number; diff: number; percent: number } {
  const w = Math.min(a.width, b.width);
  const h = Math.min(a.height, b.height);
  const ad = a.data; const bd = b.data;
  let diff = 0;
  const total = w * h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (ad[i] !== bd[i] || ad[i+1] !== bd[i+1] || ad[i+2] !== bd[i+2] || ad[i+3] !== bd[i+3]) {
        diff++;
      }
    }
  }
  return { total, diff, percent: total ? (diff / total) * 100 : 0 };
}

