import React, { useEffect, useRef } from 'react';
import type { Layer } from '@/emulation/ir';

interface TilemapViewerProps {
  layer: Layer;
}

export const TilemapViewer: React.FC<TilemapViewerProps> = ({ layer }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { tilemap, tileset } = layer;
    const tw = tileset.tileSize.width;
    const th = tileset.tileSize.height;
    const W = tilemap.width * tw;
    const H = tilemap.height * th;
    canvas.width = W; canvas.height = H;
    ctx.clearRect(0, 0, W, H);
    for (let ty = 0; ty < tilemap.height; ty++) {
      for (let tx = 0; tx < tilemap.width; tx++) {
        const cell = tilemap.cells[ty * tilemap.width + tx];
        const tile = tileset.tiles[cell.tileIndex];
        if (!tile) continue;
        const img = tile.imageData;
        // flips (H/V) simples: desenhar em offscreen e transformar
        const off = new OffscreenCanvas(img.width, img.height);
        const offctx = off.getContext('2d');
        if (offctx) {
          offctx.putImageData(img, 0, 0);
          ctx.save();
          ctx.translate(tx * tw + (cell.flipH ? tw : 0), ty * th + (cell.flipV ? th : 0));
          ctx.scale(cell.flipH ? -1 : 1, cell.flipV ? -1 : 1);
          ctx.drawImage(off, 0, 0);
          ctx.restore();
        }
      }
    }
  }, [layer]);

  return (
    <div>
      <div className="text-sm text-gray-600 mb-1">Layer: {layer.kind} • {layer.tilemap.width}x{layer.tilemap.height} tiles</div>
      <canvas ref={canvasRef} className="border rounded bg-white" />
    </div>
  );
};

export default TilemapViewer;

