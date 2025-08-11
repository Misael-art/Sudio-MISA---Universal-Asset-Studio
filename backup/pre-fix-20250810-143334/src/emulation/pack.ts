import type { Sprite } from '@/emulation/ir';

export interface PackedSpritesheetResult {
  image: ImageData;
  meta: { id: number; x: number; y: number; w: number; h: number }[];
}

export function packSpritesToGrid(sprites: Sprite[], cols: number = 8, padding: number = 1): PackedSpritesheetResult {
  const valid = sprites.filter(s => s.image && s.width && s.height) as Required<Sprite>[];
  if (valid.length === 0) {
    return { image: new ImageData(1, 1), meta: [] };
  }
  const maxW = Math.max(...valid.map(s => s.width));
  const maxH = Math.max(...valid.map(s => s.height));
  const colCount = Math.max(1, cols);
  const rowCount = Math.ceil(valid.length / colCount);
  const cellW = maxW + padding;
  const cellH = maxH + padding;
  const sheetW = colCount * cellW + padding;
  const sheetH = rowCount * cellH + padding;
  const out = new ImageData(sheetW, sheetH);

  const meta: { id: number; x: number; y: number; w: number; h: number }[] = [];

  valid.forEach((s, idx) => {
    const col = idx % colCount;
    const row = Math.floor(idx / colCount);
    const dx = padding + col * cellW;
    const dy = padding + row * cellH;
    blit(out, s.image, dx, dy);
    meta.push({ id: s.id, x: dx, y: dy, w: s.width, h: s.height });
  });

  return { image: out, meta };
}

function blit(dst: ImageData, src: ImageData, dx: number, dy: number) {
  const dd = dst.data; const sd = src.data;
  const sw = src.width; const sh = src.height;
  const dw = dst.width; const dh = dst.height;
  for (let y = 0; y < sh; y++) {
    const ty = dy + y;
    if (ty < 0 || ty >= dh) continue;
    for (let x = 0; x < sw; x++) {
      const tx = dx + x;
      if (tx < 0 || tx >= dw) continue;
      const si = (y * sw + x) * 4;
      const di = (ty * dw + tx) * 4;
      const a = sd[si + 3];
      if (a === 0) continue;
      dd[di] = sd[si];
      dd[di + 1] = sd[si + 1];
      dd[di + 2] = sd[si + 2];
      dd[di + 3] = a;
    }
  }
}

