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
  const [isReady, setIsReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<EmulatorMemorySnapshot | null>(null);
  const memoryViewRef = useRef<{ frame?: Uint8ClampedArray } | null>(null);
  const rafRef = useRef<number | null>(null);
  const attemptedFallbackRef = useRef<boolean>(false);

  const coreDescriptor = useMemo(() => getCoreDescriptor(system), [system]);

  const mountRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
  }, []);

  const initEmulator = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      // Prepare global config for loader.js
      window.EJS_player = containerRef.current;
      window.EJS_core = coreDescriptor.ejsCore;
      window.EJS_pathtodata = dataPath;
      // Do not start automatically; we'll control start()
      (window as any).EJS_startOnLoaded = false;
      // Remove any previous emulator instance
      if (window.EJS_emulator) {
        try { window.EJS_emulator.exit?.(); } catch {}
        window.EJS_emulator = undefined;
      }
      // Dynamically inject loader if not present
      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector('script[data-ejs-loader]') as HTMLScriptElement | null;
        if (existing) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = `${dataPath}loader.js`;
        script.async = true;
        script.dataset.ejsLoader = 'true';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Falha ao carregar EmulatorJS loader.js'));
        document.head.appendChild(script);
      });
      // Wait until EmulatorJS constructs instance
      await new Promise<void>((resolve, reject) => {
        let timeout: number | null = null;
        window.EJS_ready = () => {
          if (timeout) window.clearTimeout(timeout);
          setIsReady(true);
          resolve();
        };
        timeout = window.setTimeout(() => {
          reject(new Error('Timeout ao inicializar EmulatorJS'));
        }, 10000);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao inicializar emulador');
    }
  }, [dataPath, coreDescriptor.ejsCore]);

  const loadRomFile = useCallback(async (file: File) => {
    if (!window.EJS_emulator) {
      setError('Emulador não inicializado');
      return;
    }
    try {
      window.EJS_gameUrl = file; // EmulatorJS aceita File
      // Trigger internal flow to prepare files
      await window.EJS_emulator.downloadFiles?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar ROM');
    }
  }, []);

  const captureLoop = useCallback(() => {
    if (!window.EJS_emulator) return;
    try {
      const gm = window.EJS_emulator.gameManager;
      if (!gm || !gm.Module) return;
      // Try to access framebuffer when core exposes it (Genesis Plus GX ports often do)
      const tryGetExport = (names?: string[]) => {
        if (!names) return undefined;
        for (const name of names) {
          const fn = (gm.Module as any)[name];
          if (typeof fn === 'function') return fn;
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
      } catch {}
      let framebuffer: Uint8ClampedArray | undefined;
      if (typeof getFrameRef === 'function') {
        const ptr = getFrameRef();
        if (ptr && gm.Module.HEAPU8 && gm.Module.HEAPF32) {
          framebuffer = new Uint8ClampedArray(gm.Module.HEAPU8.buffer, ptr, width * height * 4);
          memoryViewRef.current = { frame: framebuffer };
        }
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
      let sat: Uint8Array | undefined;
      if (vram) {
        // Se o core não expuser ponteiro para SAT, derive pela base típica
        // Em breve substituímos pelo registrador VDP real
        const satBase = 0xD800;
        const satSize = 0x280;
        if (satBase + satSize <= vram.length) {
          sat = vram.slice(satBase, satBase + satSize);
        }
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

      setSnapshot({ framebuffer, width, height, vram, cram, vsram, sat, palettes: undefined, regs });
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
    // init on mount when container becomes available
    if (containerRef.current) {
      initEmulator();
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try { window.EJS_emulator?.exit?.(); } catch {}
    };
  }, [initEmulator]);

  return { isReady, isRunning, error, mountRef, loadRomFile, start, pause, stop, captureState, snapshot };
}

export default useEmulator;

