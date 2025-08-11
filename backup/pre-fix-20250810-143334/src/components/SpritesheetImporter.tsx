import React, { useCallback, useMemo, useRef, useState } from 'react';
import { validateSpritesheetMeta, type ImportedSpritesheetMeta } from '@/emulation/import';
import { sliceSpritesFromImage } from '@/emulation/image';
import { useAssetsStore } from '@/state/assets';

interface SpritesheetImporterProps {
  onLoaded?: (image: HTMLImageElement, meta: ImportedSpritesheetMeta) => void;
}

export const SpritesheetImporter: React.FC<SpritesheetImporterProps> = ({ onLoaded }) => {
  const [jsonMeta, setJsonMeta] = useState<ImportedSpritesheetMeta | null>(null);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const addImported = useAssetsStore(s => s.addImportedSprites);

  const handleJson = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const meta = JSON.parse(text) as ImportedSpritesheetMeta;
      const result = validateSpritesheetMeta(meta);
      setErrors(result.errors);
      setWarnings(result.warnings);
      if (result.ok) setJsonMeta(meta);
    } catch (e) {
      setErrors([`Falha ao ler JSON: ${(e as Error).message}`]);
    }
  }, []);

  const handleImage = useCallback(async (file: File) => {
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setImageEl(img);
        URL.revokeObjectURL(url);
      };
      img.onerror = () => setErrors([`Falha ao carregar imagem ${file.name}`]);
      img.src = url;
    } catch (e) {
      setErrors([`Falha ao processar imagem: ${(e as Error).message}`]);
    }
  }, []);

  const canPreview = useMemo(() => !!jsonMeta && !!imageEl, [jsonMeta, imageEl]);

  const renderPreview = useCallback(() => {
    if (!jsonMeta || !imageEl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = jsonMeta.imageWidth;
    canvas.height = jsonMeta.imageHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageEl, 0, 0);
    // desenhar boxes de debug
    ctx.save();
    ctx.strokeStyle = 'rgba(255,0,0,0.7)';
    jsonMeta.sprites.forEach(s => {
      ctx.strokeRect(s.x, s.y, s.w, s.h);
    });
    ctx.restore();
  }, [jsonMeta, imageEl]);

  React.useEffect(() => { renderPreview(); }, [renderPreview]);

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-700">Importar Spritesheet</div>
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-sm">JSON</label>
        <input type="file" accept="application/json" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleJson(f);
        }} />
        <label className="text-sm ml-2">PNG</label>
        <input type="file" accept="image/png" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImage(f);
        }} />
        <button
          className="ml-auto px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          disabled={!canPreview}
          onClick={() => {
            if (imageEl && jsonMeta) {
              onLoaded?.(imageEl, jsonMeta);
              // fatia e injeta no store
              const sprites = sliceSpritesFromImage(imageEl, jsonMeta);
              addImported(sprites);
            }
          }}
        >Confirmar</button>
      </div>
      {(errors.length > 0 || warnings.length > 0) && (
        <div className="text-sm">
          {errors.length > 0 && (
            <div className="text-red-600">Erros: {errors.join('; ')}</div>
          )}
          {warnings.length > 0 && (
            <div className="text-yellow-700">Avisos: {warnings.join('; ')}</div>
          )}
        </div>
      )}
      <div>
        <canvas ref={canvasRef} className="border rounded bg-white" />
      </div>
    </div>
  );
};

export default SpritesheetImporter;

