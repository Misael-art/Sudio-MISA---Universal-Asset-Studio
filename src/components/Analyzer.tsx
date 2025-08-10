import React, { useMemo } from 'react';
import type { FrameIR } from '@/emulation/ir';
import PaletteViewer from '@/components/viewers/PaletteViewer';
import TilemapViewer from '@/components/viewers/TilemapViewer';
import SpriteViewer from '@/components/viewers/SpriteViewer';
import FramePreview from '@/components/viewers/FramePreview';
import DiagnosticsPanel from '@/components/viewers/DiagnosticsPanel';
import { renderFrameIRToImage, diffImages, diffScore } from '@/emulation/render';
import { imageDataToPNGBlob, downloadBlob, buildFrameMetadata } from '@/emulation/export';
import SpritesheetExporter from '@/components/SpritesheetExporter';
import TilesetViewer from '@/components/viewers/TilesetViewer';
import CoreExportsPanel from '@/components/viewers/CoreExportsPanel';
import { useAssetsStore } from '@/state/assets';

interface AnalyzerProps {
  frame?: FrameIR | null;
  captureState?: () => Promise<Uint8Array | null>;
}

export const Analyzer: React.FC<AnalyzerProps> = ({ frame, captureState }) => {
  const hasData = !!frame;
  const firstLayer = useMemo(() => frame?.layers?.[0], [frame]);
  const diffCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const renderedRef = React.useRef<ImageData | null>(null);
  const addImportedSprites = useAssetsStore(s => s.addImportedSprites);
  const [selectedLayers, setSelectedLayers] = React.useState<number[]>([0,1,2]);
  const [score, setScore] = React.useState<{ total: number; diff: number; percent: number } | null>(null);

  React.useEffect(() => {
    if (!frame?.framebuffer?.image) return;
    const rendered = renderFrameIRToImage(frame, undefined, undefined, { layerIndices: selectedLayers });
    if (!rendered) return;
    renderedRef.current = rendered;
    const diff = diffImages(frame.framebuffer.image, rendered);
    setScore(diffScore(frame.framebuffer.image, rendered));
    const c = diffCanvasRef.current;
    if (!c) return;
    c.width = diff.width; c.height = diff.height;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(diff, 0, 0);
  }, [frame, selectedLayers]);
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="space-y-4 xl:col-span-2">
        {/* Toolbar de Exportação */}
        <div className="flex flex-wrap gap-2 items-center mb-2">
          <button
            className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            disabled={!hasData}
            onClick={async () => {
              if (!frame) return;
              const rendered = renderedRef.current || renderFrameIRToImage(frame);
              if (!rendered) return;
              const blob = await imageDataToPNGBlob(rendered);
              downloadBlob(blob, `${frame.system}-reconstrucao.png`);
            }}
          >Exportar PNG (Reconstrução)</button>
          <button
            className="px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
            disabled={!frame?.framebuffer?.image}
            onClick={async () => {
              if (!frame?.framebuffer?.image) return;
              const blob = await imageDataToPNGBlob(frame.framebuffer.image);
              downloadBlob(blob, `${frame.system}-framebuffer.png`);
            }}
          >Exportar PNG (FrameBuffer)</button>
          <button
            className="px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm"
            disabled={!hasData}
            onClick={async () => {
              if (!frame) return;
              const meta = buildFrameMetadata(frame);
              const blob = new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' });
              downloadBlob(blob, `${frame.system}-metadata.json`);
            }}
          >Exportar Metadados (JSON)</button>
          <button
            className="px-3 py-1.5 bg-gray-700 text-white rounded hover:bg-gray-800 text-sm"
            onClick={async () => {
              if (!captureState) return;
              const state = await captureState();
              if (!state) return;
              const blob = new Blob([state], { type: 'application/octet-stream' });
              downloadBlob(blob, `${frame?.system || 'unknown'}-savestate.bin`);
            }}
          >Capturar SaveState</button>
          <SpritesheetExporter frame={frame || undefined} />
          {hasData && (
            <button
              className="px-3 py-1.5 bg-slate-600 text-white rounded hover:bg-slate-700 text-sm"
              onClick={() => {
                if (!frame?.sprites) return;
                const imgs = frame.sprites.filter(s => s.image).map(s => s.image);
                addImportedSprites(imgs as ImageData[]);
              }}
            >Enviar sprites para Importados</button>
          )}
        </div>
        {hasData && frame?.layers && frame.layers.length > 0 && (
          <div className="flex flex-wrap gap-3 items-center mb-2 text-sm">
            <span className="text-gray-700">Camadas:</span>
            {frame.layers.map((_, idx) => (
              <label key={idx} className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={selectedLayers.includes(idx)}
                  onChange={(e) => {
                    setSelectedLayers(prev => {
                      if (e.target.checked) return Array.from(new Set([...prev, idx])).sort();
                      return prev.filter(i => i !== idx);
                    });
                  }}
                />
                <span>L{idx}</span>
              </label>
            ))}
          </div>
        )}
        {hasData && frame?.framebuffer && <FramePreview frame={frame} />}
        {hasData && frame?.palettes && <PaletteViewer palettes={frame.palettes} />}
        {hasData && frame?.tilesets && frame.tilesets[0] && <TilesetViewer tileset={frame.tilesets[0]} />}
        {hasData && firstLayer && firstLayer.tilemap?.cells?.length > 0 && <TilemapViewer layer={firstLayer} />}
        {hasData && frame?.sprites && <SpriteViewer sprites={frame.sprites} />}
        {!hasData && <div className="text-gray-500">Nenhum frame disponível. Inicie a emulação.</div>}
      </div>
      <div>
        <DiagnosticsPanel frame={frame} snapshot={{
          vram: (frame as any)?.snapshot?.vram,
          cram: (frame as any)?.snapshot?.cram,
          vsram: (frame as any)?.snapshot?.vsram,
          regs: (frame as any)?.snapshot?.regs,
          width: frame?.framebuffer?.image?.width,
          height: frame?.framebuffer?.image?.height,
        }} />
        <div className="mt-4">
          <div className="text-sm text-gray-600 mb-1">Diff (FrameBuffer vs Reconstrução)</div>
          <canvas ref={diffCanvasRef} className="border rounded bg-white" />
          {score && (
            <div className="text-xs text-gray-600 mt-1">Pixels dif: {score.diff}/{score.total} ({score.percent.toFixed(2)}%)</div>
          )}
        </div>
        {frame?.system && <CoreExportsPanel system={frame.system as any} />}
      </div>
    </div>
  );
};

export default Analyzer;

