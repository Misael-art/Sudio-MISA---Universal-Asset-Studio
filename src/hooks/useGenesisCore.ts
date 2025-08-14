// Implementando Fase 1: Hook useGenesisCore para integração com Genesis Plus GX
// Este hook gerencia o carregamento do core e fornece acesso às funções de memória

import { useState, useEffect, useCallback, useRef } from 'react';
import type { 
  EmscriptenModule, 
  GenesisMemoryData, 
  GenesisCoreConfig, 
  GenesisCoreStatus,
  GenesisMemoryRegion 
} from '../types/emscripten';
import { GENESIS_MEMORY_SIZES } from '../types/emscripten';

/**
 * Hook personalizado para gerenciar o core Genesis Plus GX
 * Fornece funcionalidades para carregar o core e acessar regiões de memória
 */
export function useGenesisCore(config?: GenesisCoreConfig) {
  // Estados do hook
  const [status, setStatus] = useState<GenesisCoreStatus>({
    isInitialized: false,
    isLoading: false,
    error: null,
    memorySize: 0
  });
  
  // Referência para o módulo carregado
  const moduleRef = useRef<EmscriptenModule | null>(null);
  const initializationPromiseRef = useRef<Promise<EmscriptenModule> | null>(null);
  
  /**
   * Carrega o script do Genesis Plus GX dinamicamente
   * Implementa o Pilar 1.1: Carregamento dinâmico do core
   */
  const loadGenesisScript = useCallback(async (): Promise<EmscriptenModule> => {
    return new Promise((resolve, reject) => {
      try {
        // Verifica se o módulo já foi carregado
        if (moduleRef.current && status.isInitialized) {
          resolve(moduleRef.current);
          return;
        }
        
        // Configura o módulo antes de carregar o script
        const moduleConfig: Partial<EmscriptenModule> = {
          onRuntimeInitialized: () => {
            const module = window.Module as EmscriptenModule;
            
            // Verifica se todas as funções exportadas estão disponíveis
            const requiredFunctions = [
              '_get_frame_buffer_ref',
              '_get_work_ram_ptr',
              '_get_zram_ptr',
              '_get_cram_ptr',
              '_get_vram_ptr',
              '_get_vsram_ptr',
              '_get_vdp_regs_ptr',
              '_get_sat_ptr',
              '_is_core_initialized',
              '_get_total_memory_size'
            ];
            
            const missingFunctions = requiredFunctions.filter(fn => typeof module[fn as keyof EmscriptenModule] !== 'function');
            
            if (missingFunctions.length > 0) {
              const error = new Error(`Funções exportadas não encontradas: ${missingFunctions.join(', ')}`);
              setStatus(prev => ({ ...prev, isLoading: false, error: error.message }));
              config?.onError?.(error);
              reject(error);
              return;
            }
            
            moduleRef.current = module;
            
            // Atualiza o status
            setStatus({
              isInitialized: true,
              isLoading: false,
              error: null,
              memorySize: module._get_total_memory_size()
            });
            
            config?.onInitialized?.();
            resolve(module);
          }
        };
        
        // Define a configuração global do módulo
        // Configuração do módulo Emscripten com tipos compatíveis
        (window as any).Module = moduleConfig;
        
        // Carrega o script do Genesis Plus GX
        const script = document.createElement('script');
        script.src = config?.jsPath || '/genesis_plus_gx.js';
        script.async = true;
        
        script.onload = () => {
          // O script foi carregado, aguarda onRuntimeInitialized
        };
        
        script.onerror = () => {
          const error = new Error('Falha ao carregar o script do Genesis Plus GX');
          setStatus(prev => ({ ...prev, isLoading: false, error: error.message }));
          config?.onError?.(error);
          reject(error);
        };
        
        document.head.appendChild(script);
        
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Erro desconhecido ao carregar o core');
        setStatus(prev => ({ ...prev, isLoading: false, error: err.message }));
        config?.onError?.(err);
        reject(err);
      }
    });
  }, [config]);
  
  /**
   * Inicializa o core Genesis Plus GX
   * Implementa o Pilar 1.2: Inicialização controlada
   */
  const initializeCore = useCallback(async (): Promise<EmscriptenModule> => {
    if (initializationPromiseRef.current) {
      return initializationPromiseRef.current;
    }
    
    if (moduleRef.current && status.isInitialized) {
      return moduleRef.current;
    }
    
    setStatus(prev => ({ ...prev, isLoading: true, error: null }));
    
    initializationPromiseRef.current = loadGenesisScript();
    
    try {
      const module = await initializationPromiseRef.current;
      return module;
    } catch (error) {
      initializationPromiseRef.current = null;
      throw error;
    }
  }, [loadGenesisScript, status.isInitialized]);
  
  /**
   * Captura um snapshot das regiões de memória do Genesis
   * Implementa o Pilar 1.3: Acesso às regiões de memória
   */
  const captureMemorySnapshot = useCallback((): GenesisMemoryData | null => {
    if (!moduleRef.current || !status.isInitialized) {
      console.warn('Core não inicializado. Não é possível capturar snapshot de memória.');
      return null;
    }
    
    const module = moduleRef.current;
    
    try {
      // Verifica se o core está inicializado
      if (!module._is_core_initialized()) {
        console.warn('Core Genesis Plus GX não está inicializado.');
        return null;
      }
      
      // Captura ponteiros para as regiões de memória
      const frameBufferPtr = module._get_frame_buffer_ref();
      const workRamPtr = module._get_work_ram_ptr();
      const zRamPtr = module._get_zram_ptr();
      const cramPtr = module._get_cram_ptr();
      const vramPtr = module._get_vram_ptr();
      const vsramPtr = module._get_vsram_ptr();
      const vdpRegsPtr = module._get_vdp_regs_ptr();
      const satPtr = module._get_sat_ptr();
      
      // Cria cópias dos dados de memória
      const memoryData: GenesisMemoryData = {
        frameBuffer: new Uint8Array(module.HEAPU8.buffer, frameBufferPtr, GENESIS_MEMORY_SIZES.FRAME_BUFFER),
        workRam: new Uint8Array(module.HEAPU8.buffer, workRamPtr, GENESIS_MEMORY_SIZES.WORK_RAM),
        zRam: new Uint8Array(module.HEAPU8.buffer, zRamPtr, GENESIS_MEMORY_SIZES.Z_RAM),
        cram: new Uint8Array(module.HEAPU8.buffer, cramPtr, GENESIS_MEMORY_SIZES.CRAM),
        vram: new Uint8Array(module.HEAPU8.buffer, vramPtr, GENESIS_MEMORY_SIZES.VRAM),
        vsram: new Uint8Array(module.HEAPU8.buffer, vsramPtr, GENESIS_MEMORY_SIZES.VSRAM),
        vdpRegs: new Uint8Array(module.HEAPU8.buffer, vdpRegsPtr, GENESIS_MEMORY_SIZES.VDP_REGS),
        sat: new Uint8Array(module.HEAPU8.buffer, satPtr, GENESIS_MEMORY_SIZES.SAT),
        timestamp: Date.now()
      };
      
      return memoryData;
      
    } catch (error) {
      console.error('Erro ao capturar snapshot de memória:', error);
      return null;
    }
  }, [status.isInitialized]);
  
  /**
   * Obtém dados de uma região específica de memória
   * Implementa o Pilar 1.4: Acesso granular à memória
   */
  const getMemoryRegion = useCallback((region: GenesisMemoryRegion): Uint8Array | null => {
    if (!moduleRef.current || !status.isInitialized) {
      return null;
    }
    
    const module = moduleRef.current;
    
    try {
      let ptr: number;
      let size: number;
      
      switch (region) {
        case 'FRAME_BUFFER':
          ptr = module._get_frame_buffer_ref();
          size = GENESIS_MEMORY_SIZES.FRAME_BUFFER;
          break;
        case 'WORK_RAM':
          ptr = module._get_work_ram_ptr();
          size = GENESIS_MEMORY_SIZES.WORK_RAM;
          break;
        case 'Z_RAM':
          ptr = module._get_zram_ptr();
          size = GENESIS_MEMORY_SIZES.Z_RAM;
          break;
        case 'CRAM':
          ptr = module._get_cram_ptr();
          size = GENESIS_MEMORY_SIZES.CRAM;
          break;
        case 'VRAM':
          ptr = module._get_vram_ptr();
          size = GENESIS_MEMORY_SIZES.VRAM;
          break;
        case 'VSRAM':
          ptr = module._get_vsram_ptr();
          size = GENESIS_MEMORY_SIZES.VSRAM;
          break;
        case 'VDP_REGS':
          ptr = module._get_vdp_regs_ptr();
          size = GENESIS_MEMORY_SIZES.VDP_REGS;
          break;
        case 'SAT':
          ptr = module._get_sat_ptr();
          size = GENESIS_MEMORY_SIZES.SAT;
          break;
        default:
          return null;
      }
      
      return new Uint8Array(module.HEAPU8.buffer, ptr, size);
      
    } catch (error) {
      console.error(`Erro ao acessar região de memória ${region}:`, error);
      return null;
    }
  }, [status.isInitialized]);
  
  /**
   * Limpa recursos e reseta o estado
   */
  const cleanup = useCallback(() => {
    moduleRef.current = null;
    initializationPromiseRef.current = null;
    setStatus({
      isInitialized: false,
      isLoading: false,
      error: null,
      memorySize: 0
    });
  }, []);
  
  // Cleanup automático quando o componente é desmontado
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);
  
  return {
    // Estados
    status,
    module: moduleRef.current,
    
    // Métodos
    initializeCore,
    captureMemorySnapshot,
    getMemoryRegion,
    cleanup,
    
    // Propriedades computadas
    isReady: status.isInitialized && !status.isLoading && !status.error,
    hasError: !!status.error
  };
}

export default useGenesisCore;