import React from 'react';
import type { FrameIR } from '@/emulation/ir';

interface DiagnosticsPanelProps {
  frame?: FrameIR | null;
  snapshot?: {
    vram?: Uint8Array;
    cram?: Uint8Array;
    vsram?: Uint8Array;
    regs?: Uint8Array;
    width?: number;
    height?: number;
  } | null;
}

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({ frame, snapshot }) => {
  const diags = frame?.diagnostics || [];
  const entries = [
    ['Framebuffer', frame?.framebuffer?.image ? `${frame.framebuffer.image.width}x${frame.framebuffer.image.height}` : 'indisponível'],
    ['Paletas', frame?.palettes?.length ?? 0],
    ['Tilesets', frame?.tilesets?.length ?? 0],
    ['Layers', frame?.layers?.length ?? 0],
    ['Sprites', frame?.sprites?.length ?? 0],
    ['VRAM', snapshot?.vram ? `${snapshot.vram.length} bytes` : 'indisponível'],
    ['CRAM', snapshot?.cram ? `${snapshot.cram.length} bytes` : 'indisponível'],
    ['VSRAM', snapshot?.vsram ? `${snapshot.vsram.length} bytes` : 'indisponível'],
    ['VDP/PPU Regs', snapshot?.regs ? `${snapshot.regs.length} bytes` : 'indisponível'],
  ] as const;

  return (
    <div className="space-y-3">
      <div className="bg-white rounded border p-3">
        <div className="font-medium mb-2">Métricas</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {entries.map(([k, v]) => (
            <div key={k as string} className="flex justify-between">
              <span className="text-gray-600">{k}</span>
              <span className="text-gray-800">{String(v)}</span>
            </div>
          ))}
        </div>
      </div>
      {diags.length > 0 && (
        <div className="bg-white rounded border p-3">
          <div className="font-medium mb-2">Diagnósticos</div>
          <ul className="list-disc pl-5 text-sm text-gray-700">
            {diags.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DiagnosticsPanel;

