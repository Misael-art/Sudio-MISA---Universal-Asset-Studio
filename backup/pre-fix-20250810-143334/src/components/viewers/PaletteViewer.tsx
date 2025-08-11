import React from 'react';
import type { Palette } from '@/emulation/ir';

interface PaletteViewerProps {
  palettes: Palette[];
}

const swatchSize = 20;

export const PaletteViewer: React.FC<PaletteViewerProps> = ({ palettes }) => {
  if (!palettes || palettes.length === 0) {
    return <div className="text-gray-500">Sem paletas disponíveis</div>;
  }
  return (
    <div className="space-y-4">
      {palettes.map((pal, idx) => (
        <div key={pal.id || idx}>
          <div className="text-sm text-gray-600 mb-1">{pal.id} • {pal.system} • {pal.colors.length} cores</div>
          <div className="flex flex-wrap gap-1">
            {pal.colors.map((c, i) => (
              <div key={i} className="border border-gray-300" title={`${c} #${i}`}
                   style={{ width: swatchSize, height: swatchSize, backgroundColor: c }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PaletteViewer;

