import React from 'react';
import { useAssetsStore } from '@/state/assets';

export const PixelEditor: React.FC = () => {
  const sprites = useAssetsStore(s => s.importedSprites);
  const sel = useAssetsStore(s => s.selectedImportedIndex);
  const setSel = useAssetsStore(s => s.setSelectedImportedIndex);
  const update = useAssetsStore(s => s.updateImportedSprite);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const scale = 8;

  const image = sel !== null ? sprites[sel] : undefined;

  React.useEffect(() => {
    const c = canvasRef.current; if (!c || !image) return;
    c.width = image.width * scale; c.height = image.height * scale;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const tmp = new OffscreenCanvas(image.width, image.height);
    const tctx = tmp.getContext('2d'); if (!tctx) return;
    tctx.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, c.width, c.height);
    // desenha a imagem escalada
    ctx.drawImage(tmp, 0, 0, c.width, c.height);
    // grid
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    for (let x = 0; x <= image.width; x++) {
      ctx.beginPath(); ctx.moveTo(x * scale, 0); ctx.lineTo(x * scale, c.height); ctx.stroke();
    }
    for (let y = 0; y <= image.height; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * scale); ctx.lineTo(c.width, y * scale); ctx.stroke();
    }
  }, [image]);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!image || sel === null) return;
    const c = e.currentTarget;
    const rect = c.getBoundingClientRect();
    const px = Math.floor((e.clientX - rect.left) / scale);
    const py = Math.floor((e.clientY - rect.top) / scale);
    if (px < 0 || py < 0 || px >= image.width || py >= image.height) return;
    const idx = (py * image.width + px) * 4;
    const data = new Uint8ClampedArray(image.data); // copy
    // exemplo: pintar de magenta e opaco (placeholder)
    data[idx] = 255; data[idx + 1] = 0; data[idx + 2] = 255; data[idx + 3] = 255;
    update(sel, new ImageData(data, image.width, image.height));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-700">Sprites importados:</span>
        {sprites.map((s, i) => (
          <button
            key={i}
            className={`px-2 py-1 rounded border ${sel === i ? 'bg-blue-600 text-white' : 'bg-white'}`}
            onClick={() => setSel(i)}
          >#{i}</button>
        ))}
      </div>
      <div>
        <canvas ref={canvasRef} className="border bg-white" onClick={onClick} />
      </div>
      {!image && <div className="text-gray-500">Selecione um sprite para editar</div>}
    </div>
  );
};

export default PixelEditor;

