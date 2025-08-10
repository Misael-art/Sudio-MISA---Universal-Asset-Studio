import React from 'react';
import SpritesheetImporter from '@/components/SpritesheetImporter';
import ImportedSpritesGrid from '@/components/ImportedSpritesGrid';
import PixelEditor from '@/components/PixelEditor';

export const ImportEditor: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <SpritesheetImporter />
        <PixelEditor />
      </div>
      <div className="space-y-4">
        <ImportedSpritesGrid />
      </div>
    </div>
  );
};

export default ImportEditor;

