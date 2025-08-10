import React from 'react';
import type { Sprite } from '@/emulation/ir';

interface SpriteViewerProps {
  sprites: Sprite[];
}

export const SpriteViewer: React.FC<SpriteViewerProps> = ({ sprites }) => {
  if (!sprites || sprites.length === 0) {
    return <div className="text-gray-500">Sem sprites extraídos</div>;
  }
  return (
    <div className="grid grid-cols-4 gap-4">
      {sprites.map((s) => (
        <div key={s.id} className="p-2 border rounded bg-white">
          <div className="text-xs text-gray-600 mb-1">#{s.id} {s.width}x{s.height}</div>
          <canvas ref={(el) => {
            if (!el) return;
            el.width = s.image.width;
            el.height = s.image.height;
            const ctx = el.getContext('2d');
            if (ctx) ctx.putImageData(s.image, 0, 0);
          }} />
        </div>
      ))}
    </div>
  );
};

export default SpriteViewer;

