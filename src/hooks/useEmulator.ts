import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getCoreDescriptor } from '@/emulation/cores';
import { fallbackExtractFromSaveState } from '@/emulation/state';
import type { SystemId, MemorySnapshot } from '@/emulation/types';

export type EmulatorSystem = SystemId;

export type EmulatorMemorySnapshot = MemorySnapshot;

interface UseEmulatorOptions {
  system: EmulatorSystem;
  dataPath?: string; // defaults to '/emulatorjs-data/' under public
}

interface UseEmulatorApi {
  isReady: boolean;
  isRunning: boolean;
  error: string | null;
  mountRef: (el: HTMLDivElement | null) => void;
  loadRomFile: (file: File) => Promise<void>;
  start: () => void;
  pause: () => void;
  stop: () => void;
  captureState: () => Promise<Uint8Array | null>;
  snapshot: EmulatorMemorySnapshot | null;
}

declare global {
  interface Window {
    EJS_emulator?: any;
    EJS_player?: HTMLDivElement;
    EJS_gameUrl?: any;
    EJS_core?: string;
    EJS_pathtodata?: string;
    EJS_ready?: () => void;
  }
}

export function useEmulator(options: UseEmulatorOptions): UseEmulatorApi {
  const { system, dataPath = '/emulatorjs-data/' } = options;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false); // Engine is initialized, Module is ready
  const [isRunning, setIsRunning] = useState(false); // ROM is loaded and emulation has started
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<EmulatorMemorySnapshot | null>(null);
  const memoryViewRef = useRef<{ frame?: Uint8ClampedArray } | null>(null);
  const rafRef = useRef<number | null>(null);
  const attemptedFallbackRef = useRef<boolean>(false);
  const lastEmptySnapshotLogRef = useRef<number>(0);
  const initStartedRef = useRef<boolean>(false);
  const loadStartTimeRef = useRef<number>(0);

  const rel = useCallback((label: string) => {
    const now = performance.now();
    const base = loadStartTimeRef.current || now;
    const delta = Math.round(now - base);
    return `${label} [T+${delta}ms]`;
  }, []);

  const coreDescriptor = useMemo(() => getCoreDescriptor(system), [system]);

  const initEmulator = useCallback(async () => {
    if (!containerRef.current || initStartedRef.current) return;
    initStartedRef.current = true;

    try {
      console.log('🚀 [INIT] Iniciando configuração do EmulatorJS...');
      if (!containerRef.current.id) containerRef.current.id = 'emulator-mount';
      
      window.EJS_player = '#' + containerRef.current.id;
      window.EJS_core = coreDescriptor.ejsCore;
      window.EJS_pathtodata = dataPath;
      (window as any).EJS_startOnLoaded = false; // *** CONTROLE MANUAL ***
      (window as any).EJS_threads = 'disabled';
      (window as any).EJS_forceLegacyCores = true;
      // Evitar ativar modo debug que força carregamento de src/* (ex.: GamepadHandler)
      try { delete (window as any).EJS_DEBUG_XX; } catch {}

      console.log('✅ [INIT] Variáveis globais configuradas para controle manual.');

      if (window.EJS_emulator) {
        console.log('🗑️ [INIT] Removendo instância anterior do EmulatorJS');
        try { window.EJS_emulator.exit?.(); } catch {}
        window.EJS_emulator = undefined;
      }

      console.log('📥 [INIT] Carregando loader.js...');
      await new Promise<void>((resolve, reject) => {
        if (document.querySelector('script[data-ejs-loader]')) {
          console.log('✅ [INIT] loader.js já existe, reutilizando.');
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = `${dataPath}loader.js`;
        script.async = true;
        script.dataset.ejsLoader = 'true';
        script.onload = () => {
          console.log('✅ [INIT] loader.js carregado com sucesso.');
          resolve();
        };
        script.onerror = (e) => {
          console.error('❌ [INIT] Erro ao carregar loader.js:', e);
          reject(new Error('Falha ao carregar EmulatorJS loader.js'));
        };
        document.head.appendChild(script);
      });

      let clsAttempts = 0;
      while (typeof (window as any).EmulatorJS !== 'function' && clsAttempts < 100) {
        await new Promise(r => setTimeout(r, 50));
        clsAttempts++;
      }
      if (typeof (window as any).EmulatorJS !== 'function') {
        throw new Error('Loader não disponibilizou a classe EmulatorJS a tempo.');
      }

      if (!window.EJS_emulator) {
        console.log('⚙️ [INIT] Instanciando EmulatorJS...');
        const config: any = {
          dataPath: window.EJS_pathtodata,
          system: window.EJS_core,
          startOnLoad: (window as any).EJS_startOnLoaded,
          threads: (window as any).EJS_threads,
          forceLegacyCores: (window as any).EJS_forceLegacyCores,
        };
        window.EJS_emulator = new (window as any).EmulatorJS(window.EJS_player, config);
      }

      console.log('⏳ [INIT] Aguardando instância do EJS_emulator...');
      let attempts = 0;
      while (!window.EJS_emulator && attempts < 100) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
      }
      if (!window.EJS_emulator) {
        throw new Error('Timeout: EJS_emulator não foi construído a tempo.');
      }
      
      console.log('🔧 [INIT] Anexando listeners de eventos...');
      window.EJS_emulator.on('ready', () => {
        console.log(`🟢 [EVENT] ${rel('ready')}: EmulatorJS pronto (UI carregada).`);
      });
      window.EJS_emulator.on('start', () => {
        console.log(`🎉 [EVENT] ${rel('start')}: Emulador iniciado! ROM carregada e pronta.`);
        setIsRunning(true);
        setError(null);
      });
      window.EJS_emulator.on('saveDatabaseLoaded', () => {
        console.log(`🗄️ [EVENT] ${rel('saveDatabaseLoaded')}: Filesystem (IDBFS) montado e pronto.`);
      });
      window.EJS_emulator.on('error', (e: any) => {
        console.error('❌ [EVENT] Erro no EmulatorJS:', e);
        setError(e?.message || 'Erro desconhecido no emulador');
        setIsRunning(false);
      });

      // Instrumentação não intrusiva: envolver métodos críticos para logs determinísticos
      try {
        const e: any = window.EJS_emulator;
        if (!e.__uast_instrumented) {
          e.__uast_instrumented = true;
          const wrap = (obj: any, name: string) => {
            if (!obj || typeof obj[name] !== 'function') return;
            const orig = obj[name].bind(obj);
            obj[name] = (...args: any[]) => {
              console.log(`⏱️ [FLOW] ${rel(name)}: chamada iniciada`, { argsCount: args?.length ?? 0 });
              try {
                const ret = orig(...args);
                if (ret && typeof ret.then === 'function') {
                  return (ret as Promise<any>)
                    .then((val) => {
                      console.log(`✅ [FLOW] ${rel(name)}: concluído`);
                      return val;
                    })
                    .catch((err: any) => {
                      console.error(`❌ [FLOW] ${rel(name)}: falhou`, err);
                      throw err;
                    });
                }
                console.log(`✅ [FLOW] ${rel(name)}: concluído (sync)`);
                return ret;
              } catch (err) {
                console.error(`❌ [FLOW] ${rel(name)}: exceção`, err);
                throw err;
              }
            };
          };
          wrap(e, 'createText');
          wrap(e, 'downloadGameCore');
          wrap(e, 'initModule');
          wrap(e, 'downloadFiles');
          wrap(e, 'startGame');
        }
      } catch (instErr) {
        console.warn('⚠️ [INIT] Falha ao instrumentar métodos do EmulatorJS (continuando):', instErr);
      }
      
      console.log('✅ [INIT] Motor do emulador instanciado. Aguardando ROM para inicializar Module...');

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error(`❌ [INIT] Falha crítica na inicialização: ${message}`, err);
      setError(message);
      initStartedRef.current = false;
    }
  }, [dataPath, coreDescriptor.ejsCore]);

  const mountRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
    if (el) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      initEmulator();
    }
  }, [initEmulator]);

  const loadRomFile = useCallback(async (file: File) => {
    try {
      if (!window.EJS_emulator) {
        const msg = 'Motor do emulador não está pronto para carregar a ROM.';
        console.error(`❌ [LOAD] ${msg}`);
        setError(msg);
        return;
      }
      if (isRunning) {
        console.log('🔄 [LOAD] Emulador em execução. Reiniciando...');
        try {
          window.EJS_emulator.exit?.();
          await new Promise(r => setTimeout(r, 250));
          setIsRunning(false);
        } catch (e) {
          console.warn('⚠️ [LOAD] Erro ao parar emulador existente (continuando)', e);
        }
      }

      loadStartTimeRef.current = performance.now();
      console.log(`🚀 [LOAD] ${rel('loadRomFile')}: Preparando ROM: ${file.name}`);
      // Usar Blob URL para satisfazer caminhos internos (getBaseFileName/startsWith, HEAD handling e blob: fetch)
      const blobUrl = URL.createObjectURL(file);
      window.EJS_gameUrl = blobUrl;
      try {
        if (window.EJS_emulator?.config) {
          window.EJS_emulator.config.gameUrl = blobUrl;
          window.EJS_emulator.config.gameName = file.name;
        }
      } catch {}

      // Listeners úteis antes do fluxo
      try {
        window.EJS_emulator.on('error', (e: any) => console.error(`❌ [EVENT] ${rel('error')}:`, e));
        window.EJS_emulator.on('start', () => console.log(`🎮 [EVENT] ${rel('start')}: start disparado`));
        window.EJS_emulator.on('saveDatabaseLoaded', (fs: any) => console.log(`🗄️ [EVENT] ${rel('saveDatabaseLoaded')}: FS=${!!fs}`));
      } catch {}

      // Disparar pipeline padrão: cria UI de loading e inicia download do core
      try {
        console.log(`⚙️ [LOAD] ${rel('createText')}: chamando createText() + downloadGameCore()`);
        window.EJS_emulator.createText();
        // Pode não ser uma Promise em todas as versões; então não depender do await
        const maybePromise = window.EJS_emulator.downloadGameCore?.();
        if (maybePromise && typeof maybePromise.then === 'function') {
          await maybePromise;
          console.log(`✅ [LOAD] ${rel('downloadGameCore')}: downloadGameCore() resolvido`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        console.error(`❌ [LOAD] Falha no start do core: ${message}`, err);
        setError(`Falha ao iniciar core: ${message}`);
        return;
      }

      // Aguardar Module ficar pronto
      console.log(`⏳ [LOAD] ${rel('await Module')}: aguardando Module após downloadGameCore...`);
      {
        let attempts = 0;
        while (!window.EJS_emulator?.Module && attempts < 200) {
          await new Promise(r => setTimeout(r, 100));
          attempts++;
          if (attempts % 20 === 0) console.log(`[LOAD] ${rel('await Module')}: tentando (${attempts}/200)`);
        }
        if (!window.EJS_emulator?.Module) {
          const msg = 'Module não ficou disponível após downloadGameCore.';
          console.error('❌ [LOAD]', msg);
          setError(msg);
          return;
        }
        // Instrumentar callMain após Module ficar acessível
        try {
          const mod: any = window.EJS_emulator.Module;
          if (mod && typeof mod.callMain === 'function' && !mod.__uast_callMain_wrapped) {
            const origCallMain = mod.callMain.bind(mod);
            mod.callMain = (args: any) => {
              console.log(`▶️ [FLOW] ${rel('Module.callMain')}: args=`, args);
              const r = origCallMain(args);
              console.log(`⏹️ [FLOW] ${rel('Module.callMain')}: retorno=`, r);
              return r;
            };
            mod.__uast_callMain_wrapped = true;
          }
        } catch {}
        console.log(`✅ [LOAD] ${rel('Module ready')}: Module disponível.`);
        setIsReady(true);
      }

      // Caso o fluxo interno não tenha iniciado, forçar downloadFiles (usa config.gameUrl já como blob:)
      if (!window.EJS_emulator.gameManager) {
        console.log(`⚙️ [LOAD] ${rel('downloadFiles')}: gameManager ausente. Chamando downloadFiles()`);
        try {
          window.EJS_emulator.downloadFiles?.();
        } catch (e) {
          console.warn('⚠️ [LOAD] Falha ao chamar downloadFiles():', e);
        }
      }

      // Aguardar criação do gameManager
      {
        let gmAttempts = 0;
        while (!window.EJS_emulator.gameManager && gmAttempts < 100) {
          await new Promise(r => setTimeout(r, 100));
          gmAttempts++;
        }
        if (!window.EJS_emulator.gameManager) {
          console.warn('⚠️ [LOAD] gameManager não criado a tempo');
        } else {
          console.log(`✅ [LOAD] ${rel('gameManager ready')}: gameManager pronto. Aguardando saveDatabaseLoaded/FS...`);
        }
      }

      // Marcar como rodando e finalizar carregamento
      console.log(`🎮 [LOAD] ${rel('running')}: ROM carregada com sucesso! Emulador iniciado.`);
      setIsRunning(true);
      
      // Iniciar loop de captura se não estiver rodando
      if (!rafRef.current) {
        rafRef.current = window.requestAnimationFrame(captureLoop);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error(`❌ [LOAD] Falha no carregamento da ROM: ${message}`, err);
      setError(message);
    }
  }, [isReady, isRunning]);

  const captureLoop = useCallback(() => {
    if (!window.EJS_emulator) return;
    try {
      const gm = window.EJS_emulator.gameManager;
      if (!gm || !gm.Module) return;
      // Try to access framebuffer when core exposes it (Genesis Plus GX ports often do)
      const tryGetExport = (names?: string[]) => {
        if (!names) return undefined;
        const mod: any = gm.Module as any;
        for (const name of names) {
          const direct = mod[name];
          if (typeof direct === 'function') return direct;
          // fallback via cwrap when available
          if (typeof mod.cwrap === 'function') {
            try {
              const wrapped = mod.cwrap(name, 'number', []);
              if (typeof wrapped === 'function') return wrapped;
            } catch {}
            try {
              const alt = name.startsWith('_') ? name.slice(1) : `_${name}`;
              const wrappedAlt = mod.cwrap(alt, 'number', []);
              if (typeof wrappedAlt === 'function') return wrappedAlt;
            } catch {}
          }
        }
        return undefined;
      };
      const getFrameRef = tryGetExport(coreDescriptor.exports?.framebufferPtr);
      const getVideoDimensions = window.EJS_emulator.gameManager.functions?.getVideoDimensions;
      let width = coreDescriptor.defaultResolution.width;
      let height = coreDescriptor.defaultResolution.height;
      try {
        if (typeof getVideoDimensions === 'function') {
          // getVideoDimensions writes into a struct pointer; many ports return 0 and fill a string.
          // As fallback, use known MD default.
          // Keeping fixed for now; if needed, parse from DOM canvas size.
        }
        // Fallback adicional: ler do canvas do emulador se existir
        const mount = containerRef.current;
        const canvas = mount?.querySelector('canvas') as HTMLCanvasElement | null;
        if (canvas && canvas.width && canvas.height) {
          width = canvas.width;
          height = canvas.height;
        }
      } catch {}
      let framebuffer: Uint8ClampedArray | undefined;
      if (typeof getFrameRef === 'function') {
        const ptr = getFrameRef();
        if (ptr && gm.Module.HEAPU8 && gm.Module.HEAPF32) {
          framebuffer = new Uint8ClampedArray(gm.Module.HEAPU8.buffer, ptr, width * height * 4);
          memoryViewRef.current = { frame: framebuffer };
        }
      }

      // Fallback: ler framebuffer diretamente do canvas quando ponteiro não estiver disponível
      if (!framebuffer) {
        try {
          const mount = containerRef.current;
          const canvas = mount?.querySelector('canvas') as HTMLCanvasElement | null;
          if (canvas && canvas.width && canvas.height) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
              framebuffer = new Uint8ClampedArray(img.data); // cópia desacoplada
              width = canvas.width;
              height = canvas.height;
              memoryViewRef.current = { frame: framebuffer };
            }
          }
        } catch {}
      }

      // Optional regions (VRAM/CRAM/VSRAM/OAM/Palettes) via exports when available
      const readRegion = (names: string[] | undefined, size: number | undefined): Uint8Array | undefined => {
        if (!names || !size) return undefined;
        const fn = tryGetExport(names);
        if (typeof fn !== 'function') return undefined;
        const ptr = fn();
        if (!ptr || !gm.Module.HEAPU8) return undefined;
        try {
          const view = new Uint8Array(gm.Module.HEAPU8.buffer, ptr, size);
          return new Uint8Array(view); // copy out to detach from WASM memory
        } catch {
          return undefined;
        }
      };

      let vram = readRegion(coreDescriptor.exports?.vramPtr, coreDescriptor.sizes?.vram);
      let cram = readRegion(coreDescriptor.exports?.cramPtr, coreDescriptor.sizes?.cram);
      let vsram = readRegion(coreDescriptor.exports?.vsramPtr, coreDescriptor.sizes?.vsram);
      let regs = readRegion(coreDescriptor.exports?.regsPtr, coreDescriptor.sizes?.regs);
      // SAT: preferir ponteiro nativo; fallback para derivado via base típica
      let sat = readRegion((coreDescriptor.exports as any)?.satPtr, coreDescriptor.sizes?.sat);
      if (!sat && vram) {
        const satBase = 0xD800;
        const satSize = 0x280;
        if (satBase + satSize <= vram.length) sat = vram.slice(satBase, satBase + satSize);
      }

      // Fallback por SaveState (uma tentativa) caso não tenhamos regiões essenciais
      if (!vram && !attemptedFallbackRef.current && typeof gm.getState === 'function') {
        attemptedFallbackRef.current = true;
        try {
          const stateData = gm.getState();
          if (stateData && (stateData as Uint8Array).byteLength !== undefined) {
            fallbackExtractFromSaveState(system as SystemId, stateData as Uint8Array)
              .then(extracted => {
                if (extracted) {
                  setSnapshot({ framebuffer, width, height, vram: extracted.vram, cram: extracted.cram, vsram: extracted.vsram, sat: extracted.sat, palettes: undefined, regs: extracted.regs });
                } else {
                  setSnapshot({ framebuffer, width, height, vram, cram, vsram, sat, palettes: undefined, regs });
                }
              })
              .catch(() => {
                setSnapshot({ framebuffer, width, height, vram, cram, vsram, sat, palettes: undefined, regs });
              });
            return; // snapshot será setado no then/catch
          }
        } catch {}
      }
      // Evitar spams de snapshot vazio: só publicar quando há framebuffer ou memória útil
      if (framebuffer || vram || cram) {
        setSnapshot({ framebuffer, width, height, vram, cram, vsram, sat, palettes: undefined, regs });
      } else {
        const now = Date.now();
        if (!lastEmptySnapshotLogRef.current || now - lastEmptySnapshotLogRef.current > 1000) {
          console.log('[AUTO] Snapshot recebido, mas sem dados de memória ou framebuffer ainda.');
          lastEmptySnapshotLogRef.current = now;
        }
      }
    } catch (e) {
      // swallow, keep loop robust
    } finally {
      rafRef.current = window.requestAnimationFrame(captureLoop);
    }
  }, [coreDescriptor]);

  const start = useCallback(() => {
    try {
      window.EJS_emulator?.resumeMainLoop?.();
      setIsRunning(true);
      if (!rafRef.current) rafRef.current = window.requestAnimationFrame(captureLoop);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao iniciar emulação');
    }
  }, [captureLoop]);

  const pause = useCallback(() => {
    try {
      window.EJS_emulator?.pauseMainLoop?.();
      setIsRunning(false);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao pausar emulação');
    }
  }, []);

  const stop = useCallback(() => {
    try {
      pause();
      window.EJS_emulator?.exit?.();
      setIsReady(false);
      setSnapshot(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao parar emulação');
    }
  }, [pause]);

  const captureState = useCallback(async (): Promise<Uint8Array | null> => {
    try {
      const gm = window.EJS_emulator?.gameManager;
      if (!gm || !gm.getState) return null;
      const data = gm.getState();
      if (data && (data as Uint8Array).byteLength !== undefined) {
        return data as Uint8Array;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    // cleanup no unmount
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try { window.EJS_emulator?.exit?.(); } catch {}
    };
  }, []);

  return { isReady, isRunning, error, mountRef, loadRomFile, start, pause, stop, captureState, snapshot };
}

export default useEmulator;

