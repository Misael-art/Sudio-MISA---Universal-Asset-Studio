// Implementando Fase 1: Definições TypeScript para Emscripten e Genesis Plus GX
// Este arquivo define as interfaces para o módulo Emscripten e as funções exportadas do core

/**
 * Interface para o módulo Emscripten carregado
 * Define as propriedades e métodos disponíveis após a inicialização do core
 */
export interface EmscriptenModule {
  // Propriedades padrão do Emscripten
  HEAP8: Int8Array;
  HEAP16: Int16Array;
  HEAP32: Int32Array;
  HEAPU8: Uint8Array;
  HEAPU16: Uint16Array;
  HEAPU32: Uint32Array;
  HEAPF32: Float32Array;
  HEAPF64: Float64Array;
  
  // Métodos de gerenciamento de memória
  _malloc(size: number): number;
  _free(ptr: number): void;
  
  // Funções exportadas do Genesis Plus GX para acesso às regiões de memória
  _get_frame_buffer_ref(): number;  // Ponteiro para o framebuffer
  _get_work_ram_ptr(): number;      // Ponteiro para Work RAM (68K)
  _get_zram_ptr(): number;          // Ponteiro para Z80 RAM
  _get_cram_ptr(): number;          // Ponteiro para Color RAM (paletas)
  _get_vram_ptr(): number;          // Ponteiro para Video RAM (tiles/patterns)
  _get_vsram_ptr(): number;         // Ponteiro para Vertical Scroll RAM
  _get_vdp_regs_ptr(): number;      // Ponteiro para registradores VDP
  _get_sat_ptr(): number;           // Ponteiro para Sprite Attribute Table
  _is_core_initialized(): number;   // Verifica se o core foi inicializado
  _get_total_memory_size(): number; // Tamanho total da memória alocada
  
  // Propriedades de configuração
  onRuntimeInitialized?: () => void;
  ready?: Promise<EmscriptenModule>;
}

/**
 * Interface para dados de memória extraídos do Genesis Plus GX
 * Representa um snapshot das regiões de memória em um momento específico
 */
export interface GenesisMemoryData {
  frameBuffer: Uint8Array;    // Buffer do frame atual (RGB)
  workRam: Uint8Array;        // Work RAM do 68000
  zRam: Uint8Array;           // RAM do Z80
  cram: Uint8Array;           // Color RAM (64 cores, 16-bit cada)
  vram: Uint8Array;           // Video RAM (64KB de patterns/tiles)
  vsram: Uint8Array;          // Vertical Scroll RAM
  vdpRegs: Uint8Array;        // Registradores do VDP
  sat: Uint8Array;            // Sprite Attribute Table
  timestamp: number;          // Timestamp da captura
}

/**
 * Interface para configuração do core Genesis Plus GX
 */
export interface GenesisCoreConfig {
  wasmPath: string;           // Caminho para o arquivo .wasm
  jsPath: string;             // Caminho para o arquivo .js
  onInitialized?: () => void; // Callback quando inicializado
  onError?: (error: Error) => void; // Callback para erros
}

/**
 * Interface para status do core
 */
export interface GenesisCoreStatus {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  memorySize: number;
}

/**
 * Declaração global para o módulo Genesis Plus GX
 * Permite acesso ao módulo carregado globalmente
 */
declare global {
  interface Window {
    Module?: EmscriptenModule;
    GenesisModule?: EmscriptenModule;
  }
}

/**
 * Factory function para criar o módulo Emscripten
 */
export type EmscriptenModuleFactory = (config?: Partial<EmscriptenModule>) => Promise<EmscriptenModule>;

/**
 * Constantes para tamanhos de memória do Mega Drive/Genesis
 */
export const GENESIS_MEMORY_SIZES = {
  WORK_RAM: 0x10000,      // 64KB Work RAM
  Z_RAM: 0x2000,          // 8KB Z80 RAM
  CRAM: 0x80,             // 128 bytes Color RAM (64 cores)
  VRAM: 0x10000,          // 64KB Video RAM
  VSRAM: 0x50,            // 80 bytes Vertical Scroll RAM
  VDP_REGS: 0x20,         // 32 bytes VDP registers
  SAT: 0x400,             // 1KB Sprite Attribute Table
  FRAME_BUFFER: 320 * 240 * 4 // RGBA framebuffer
} as const;

/**
 * Tipo para as chaves dos tamanhos de memória
 */
export type GenesisMemoryRegion = keyof typeof GENESIS_MEMORY_SIZES;