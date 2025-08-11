import React from 'react';
import { getCoreDescriptor } from '@/emulation/cores';
import type { SystemId } from '@/emulation/types';

interface CoreExportsPanelProps {
  system: SystemId;
}

export const CoreExportsPanel: React.FC<CoreExportsPanelProps> = ({ system }) => {
  const [rows, setRows] = React.useState<{ name: string; present: boolean; sizeOk?: boolean; expectedSize?: number }[]>([]);

  React.useEffect(() => {
    try {
      const core = getCoreDescriptor(system);
      const gm = (window as any).EJS_emulator?.gameManager;
      const mod = gm?.Module;
      const results: { name: string; present: boolean; sizeOk?: boolean; expectedSize?: number }[] = [];
      const pushEntry = (names: string[] | undefined, expectedSize?: number) => {
        names?.forEach(n => {
          const fn = mod?.[n];
          const present = typeof fn === 'function';
          let sizeOk: boolean | undefined = undefined;
          if (present && expectedSize && expectedSize > 0) {
            try {
              const ptr = fn();
              if (ptr && mod?.HEAPU8?.buffer) {
                // tenta apenas criar a view para checar limites
                // evita copiar dados
                // se falhar, lançará exceção
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const view = new Uint8Array(mod.HEAPU8.buffer, ptr, expectedSize);
                sizeOk = true;
              }
            } catch {
              sizeOk = false;
            }
          }
          results.push({ name: n, present, sizeOk, expectedSize });
        });
      };
      pushEntry(core.exports?.framebufferPtr, (core.defaultResolution.width * core.defaultResolution.height * 4));
      pushEntry(core.exports?.vramPtr, core.sizes?.vram);
      pushEntry(core.exports?.cramPtr, core.sizes?.cram);
      pushEntry(core.exports?.vsramPtr, core.sizes?.vsram);
      pushEntry(core.exports?.palettesPtr, core.sizes?.palettes);
      pushEntry(core.exports?.oamPtr, core.sizes?.oam);
      pushEntry(core.exports?.regsPtr, core.sizes?.regs);
      // MD SAT (quando houver no descritor)
      // @ts-expect-error satPtr opcional por sistema
      pushEntry(core.exports?.satPtr, core.sizes?.sat);
      setRows(results);
    } catch {
      setRows([]);
    }
  }, [system]);

  if (rows.length === 0) return null;

  return (
    <div className="bg-white rounded border p-3 mt-4">
      <div className="font-medium mb-2">Exports do Core (sondados)</div>
      <div className="grid grid-cols-2 gap-1 text-sm">
        {rows.map(r => (
          <div key={r.name} className="flex justify-between">
            <span className="text-gray-700">{r.name}</span>
            <span className={r.present ? 'text-green-700' : 'text-red-700'}>{r.present ? 'OK' : 'Faltando'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CoreExportsPanel;

