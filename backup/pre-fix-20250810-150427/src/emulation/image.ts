import type { ImportedSpritesheetMeta } from '@/emulation/import';

export function imageToImageData(img: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context não disponível');
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function cropToImageData(src: ImageData, x: number, y: number, w: number, h: number): ImageData {
  const out = new ImageData(w, h);
  const sd = src.data; const od = out.data;
  const sw = src.width; const sh = src.height;
  for (let yy = 0; yy < h; yy++) {
    const sy = y + yy; if (sy < 0 || sy >= sh) continue;
    for (let xx = 0; xx < w; xx++) {
      const sx = x + xx; if (sx < 0 || sx >= sw) continue;
      const si = (sy * sw + sx) * 4;
      const oi = (yy * w + xx) * 4;
      od[oi] = sd[si];
      od[oi + 1] = sd[si + 1];
      od[oi + 2] = sd[si + 2];
      od[oi + 3] = sd[si + 3];
    }
  }
  return out;
}

export function sliceSpritesFromImage(imageEl: HTMLImageElement, meta: ImportedSpritesheetMeta): ImageData[] {
  const full = imageToImageData(imageEl);
  return meta.sprites.map(s => cropToImageData(full, s.x, s.y, s.w, s.h));
}

