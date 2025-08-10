import type { FrameIR, Sprite, Layer } from '@/emulation/ir';

export async function imageDataToPNGBlob(image: ImageData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context não disponível');
  ctx.putImageData(image, 0, 0);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Falha ao gerar PNG'));
    }, 'image/png');
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function buildFrameMetadata(frame: FrameIR) {
  return {
    system: frame.system,
    palettes: frame.palettes?.map(p => ({ id: p.id, colors: p.colors })),
    tilesets: frame.tilesets?.map(ts => ({ count: ts.tiles.length, tileSize: ts.tileSize })),
    layers: frame.layers?.map((l: Layer) => ({ kind: l.kind, w: l.tilemap.width, h: l.tilemap.height })),
    sprites: frame.sprites?.map((s: Sprite) => ({ id: s.id, w: s.width, h: s.height, x: s.x, y: s.y, paletteIndex: s.paletteIndex })),
  };
}

