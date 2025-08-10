export type SystemId =
  // Sega 16-bit
  | 'megadrive' | 'genesis' | 'segaMD'
  // Nintendo 16-bit
  | 'snes' | 'sfc'
  // Nintendo 8-bit
  | 'nes' | 'famicom'
  // Game Boy family
  | 'gb' | 'gameboy'
  | 'gbc' | 'gameboycolor'
  | 'gba'
  // NEC PC Engine / TurboGrafx-16
  | 'pce' | 'pcengine' | 'tg16'
  // Sega 8-bit
  | 'sms' | 'mastersystem'
  | 'gg' | 'gamegear'
  // 32-bit era
  | 'ss' | 'saturn' | 'segaSaturn'
  | 'psx' | 'playstation'
  // 64-bit era
  | 'n64';

export interface EmulatorInstance {
  gameManager?: any;
  resumeMainLoop?: () => void;
  pauseMainLoop?: () => void;
  exit?: () => void;
}

export interface MemorySnapshot {
  framebuffer?: Uint8ClampedArray;
  width?: number;
  height?: number;
  // Optional raw memories when available
  vram?: Uint8Array;
  cram?: Uint8Array;
  vsram?: Uint8Array;
  oam?: Uint8Array; // Object Attribute Memory (e.g., NES/SNES/GBA)
  sat?: Uint8Array; // Sprite Attribute Table (Mega Drive)
  palettes?: Uint8Array; // Raw palette RAM where applicable
  regs?: Uint8Array; // Raw video registers block when available
}

