// Universal Asset Studio - Tipos para Comunicação Worker-UI
// Fase 0: Definições de tipos para comunicação local

/**
 * Tipos de mensagem que podem ser enviadas para o worker
 */
export type WorkerMessageType = 'LOAD_ROM' | 'EXTRACT_ASSETS' | 'INITIALIZE_EMULATOR' | 'LOAD_ROM_EMULATOR' | 'EMULATION_CONTROL' | 'START_EMULATION' | 'PAUSE_EMULATION' | 'STOP_EMULATION';

/**
 * Sistemas de console suportados
 */
export type SupportedSystem = 'megadrive' | 'snes' | 'gameboy' | 'gameboycolor';

/**
 * Status das respostas do worker
 */
export type WorkerStatus = 'info' | 'error' | 'complete' | 'progress';

/**
 * Mensagem enviada para o worker
 */
export interface WorkerMessage {
  type: WorkerMessageType;
  payload: {
    romData: Uint8Array;
    system: SupportedSystem;
  };
}

/**
 * Resposta recebida do worker
 */
export interface WorkerResponse {
  status: WorkerStatus;
  message: string;
  payload?: WorkerPayload;
  isMock?: boolean;
}

/**
 * Dados extraídos pelo worker
 */
export interface WorkerPayload {
  vram?: Uint8Array;
  cram?: Uint8Array;
  vsram?: Uint8Array; // VSRAM para Genesis Plus GX
  sat?: Uint8Array;   // SAT mantido para compatibilidade
  system: string;
}

/**
 * Entrada de log da UI
 */
export interface LogEntry {
  timestamp: number;
  level: 'info' | 'error' | 'complete';
  message: string;
}

/**
 * Estado do worker na UI
 */
export type WorkerState = 'idle' | 'working' | 'error';

/**
 * Configuração do worker
 */
export interface WorkerConfig {
  emulatorPath: string;
  supportedSystems: SupportedSystem[];
  maxROMSize: number;
  timeoutMs: number;
}

/**
 * Informações do arquivo ROM carregado
 */
export interface ROMInfo {
  name: string;
  size: number;
  type: string;
  system?: SupportedSystem;
  data: Uint8Array;
}