import React from 'react';
import type { FrameIR } from '@/emulation/ir';
import { packSpritesToGrid } from '@/emulation/pack';
import { imageDataToPNGBlob, downloadBlob } from '@/emulation/export';

interface SpritesheetExporterProps {
  frame?: FrameIR | null;
}

export const SpritesheetExporter: React.FC<SpritesheetExporterProps> = ({ frame }) => {
  const handleExport = async () => {
    if (!frame?.sprites || frame.sprites.length === 0) return;
    const packed = packSpritesToGrid(frame.sprites);
    const blob = await imageDataToPNGBlob(packed.image);
    downloadBlob(blob, `${frame.system}-spritesheet.png`);
    const meta = {
      sprites: packed.meta,
      imageWidth: packed.image.width,
      imageHeight: packed.image.height,
      system: frame.system,
    };
    const metaBlob = new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' });
    downloadBlob(metaBlob, `${frame.system}-spritesheet.json`);
  };

  return (
    <button
      className="px-3 py-1.5 bg-teal-600 text-white rounded hover:bg-teal-700 text-sm"
      disabled={!frame?.sprites || frame.sprites.length === 0}
      onClick={handleExport}
    >Exportar Spritesheet (PNG+JSON)</button>
  );
};

export default SpritesheetExporter;

