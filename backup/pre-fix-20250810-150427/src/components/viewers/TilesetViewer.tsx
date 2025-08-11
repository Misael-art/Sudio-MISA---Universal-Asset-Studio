import React, { useEffect, useMemo, useRef } from 'react';
import type { Tileset } from '@/emulation/ir';

interface TilesetViewerProps {
  tileset: Tileset;
  columns?: number;
  gap?: number;
}

export const TilesetViewer: React.FC<TilesetViewerProps> = ({ tileset, columns = 16, gap = 1 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const layout = useMemo(() => {
    const tw = tileset.tileSize.width;
    const th = tileset.tileSize.height;
    const cols = Math.max(1, columns);
    const rows = Math.ceil(tileset.tiles.length / cols);
    const width = cols * (tw + gap) + gap;
    const height = rows * (th + gap) + gap;
    return { tw, th, cols, rows, width, height };
  }, [tileset, columns, gap]);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const { width, height, cols, tw, th } = layout;
    c.width = width; c.height = height;
    ctx.clearRect(0, 0, width, height);
    tileset.tiles.forEach((t, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const dx = gap + col * (tw + gap);
      const dy = gap + row * (th + gap);
      ctx.putImageData(t.imageData, dx, dy);
    });
  }, [tileset, layout, gap]);

  return (
    <div>
      <div className="text-sm text-gray-600 mb-1">Tileset • {tileset.tiles.length} tiles • {tileset.tileSize.width}x{tileset.tileSize.height}</div>
      <canvas ref={canvasRef} className="border rounded bg-white" />
    </div>
  );
};

export default TilesetViewer;

