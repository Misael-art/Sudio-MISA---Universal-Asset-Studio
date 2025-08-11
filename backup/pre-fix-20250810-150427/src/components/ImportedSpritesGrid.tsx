import React from 'react';
import { useAssetsStore } from '@/state/assets';

export const ImportedSpritesGrid: React.FC = () => {
  const sprites = useAssetsStore(s => s.importedSprites);
  if (!sprites || sprites.length === 0) {
    return <div className="text-gray-500">Nenhum sprite importado</div>;
  }
  return (
    <div className="grid grid-cols-4 gap-4">
      {sprites.map((img, idx) => (
        <div key={idx} className="p-2 border rounded bg-white">
          <div className="text-xs text-gray-600 mb-1">#{idx} {img.width}x{img.height}</div>
          <canvas
            ref={(el) => {
              if (!el) return;
              el.width = img.width;
              el.height = img.height;
              const ctx = el.getContext('2d');
              if (ctx) ctx.putImageData(img, 0, 0);
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default ImportedSpritesGrid;

