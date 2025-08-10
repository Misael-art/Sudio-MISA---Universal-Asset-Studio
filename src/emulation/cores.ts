import { SystemId } from './types';

export interface CoreDescriptor {
  id: SystemId;
  ejsCore: string; // EmulatorJS core identifier
  defaultResolution: { width: number; height: number };
  // Names of Module exports we will probe for optional memory access
  exports?: {
    framebufferPtr?: string[]; // list of possible exported function names
    vramPtr?: string[];
    cramPtr?: string[];
    vsramPtr?: string[];
    palettesPtr?: string[];
    oamPtr?: string[];
    regsPtr?: string[]; // video registers block pointer (when available)
    satPtr?: string[]; // Mega Drive specific: Sprite Attribute Table
  };
  sizes?: {
    vram?: number;
    cram?: number;
    vsram?: number;
    oam?: number;
    palettes?: number;
    regs?: number;
    sat?: number; // MD SAT size
  };
}

export const CORES: CoreDescriptor[] = [
  {
    id: 'megadrive',
    ejsCore: 'segaMD',
    defaultResolution: { width: 320, height: 224 },
    exports: {
      framebufferPtr: ['_get_frame_buffer_ref', 'get_frame_buffer_ref'],
      // VRAM/CRAM pointers are core-build specific; placeholders for future cwrap
      vramPtr: ['_get_vram_ptr'],
      cramPtr: ['_get_cram_ptr'],
      vsramPtr: ['_get_vsram_ptr'],
      regsPtr: ['_get_vdp_regs_ptr'],
      satPtr: ['_get_sat_ptr'],
    },
    sizes: { vram: 0x10000, cram: 0x80, vsram: 0x50, regs: 0x20, sat: 0x280 }
  },
  // Super Nintendo / Super Famicom
  {
    id: 'snes',
    ejsCore: 'snes',
    defaultResolution: { width: 256, height: 224 },
    exports: {
      framebufferPtr: ['_get_framebuffer_ptr', '_get_frame_buffer_ref'],
      palettesPtr: ['_get_cgram_ptr'],
      oamPtr: ['_get_oam_ptr'],
      vramPtr: ['_get_vram_ptr'],
      regsPtr: ['_get_ppu_regs_ptr'],
    },
    sizes: { vram: 0x8000, palettes: 0x200, oam: 0x220, regs: 0x40 }
  },
  // Nintendo Entertainment System / Famicom
  {
    id: 'nes',
    ejsCore: 'nes',
    defaultResolution: { width: 256, height: 240 },
    exports: {
      framebufferPtr: ['_get_framebuffer_ptr'],
      palettesPtr: ['_get_pal_ptr'],
      oamPtr: ['_get_oam_ptr'],
      vramPtr: ['_get_chr_ptr'],
      regsPtr: ['_get_ppu_regs_ptr'],
    },
    sizes: { palettes: 32, oam: 256, vram: 0x2000, regs: 0x20 }
  },
  // Game Boy (DMG)
  {
    id: 'gb',
    ejsCore: 'gb',
    defaultResolution: { width: 160, height: 144 },
    exports: {
      framebufferPtr: ['_get_framebuffer_ptr'],
      palettesPtr: ['_get_palette_ptr'],
      oamPtr: ['_get_oam_ptr'],
      vramPtr: ['_get_vram_ptr'],
      regsPtr: ['_get_lcd_regs_ptr'],
    },
    sizes: { vram: 0x2000, oam: 160, regs: 0x40 }
  },
  // Game Boy Color
  {
    id: 'gbc',
    ejsCore: 'gbc',
    defaultResolution: { width: 160, height: 144 },
    exports: {
      framebufferPtr: ['_get_framebuffer_ptr'],
      palettesPtr: ['_get_palette_ptr'],
      oamPtr: ['_get_oam_ptr'],
      vramPtr: ['_get_vram_ptr'],
      regsPtr: ['_get_lcd_regs_ptr'],
    },
    sizes: { vram: 0x4000, oam: 160, palettes: 0x40, regs: 0x40 }
  },
  // Game Boy Advance
  {
    id: 'gba',
    ejsCore: 'gba',
    defaultResolution: { width: 240, height: 160 },
    exports: {
      framebufferPtr: ['_get_framebuffer_ptr'],
      palettesPtr: ['_get_palette_ptr'],
      oamPtr: ['_get_oam_ptr'],
      vramPtr: ['_get_vram_ptr'],
      regsPtr: ['_get_ppu_regs_ptr'],
    },
    sizes: { vram: 0x18000, oam: 0x400, palettes: 0x400, regs: 0x40 }
  },
  // PC Engine / TurboGrafx-16
  {
    id: 'pce',
    ejsCore: 'pce',
    defaultResolution: { width: 256, height: 224 },
    exports: {
      framebufferPtr: ['_get_framebuffer_ptr'],
      palettesPtr: ['_get_palette_ptr'],
      vramPtr: ['_get_vram_ptr'],
      oamPtr: ['_get_oam_ptr']
    }
  },
  // Sega Master System
  {
    id: 'sms',
    ejsCore: 'sms',
    defaultResolution: { width: 256, height: 192 },
    exports: {
      framebufferPtr: ['_get_framebuffer_ptr'],
      palettesPtr: ['_get_palette_ptr'],
      vramPtr: ['_get_vram_ptr'],
      oamPtr: ['_get_oam_ptr']
    }
  },
  // Sega Game Gear
  {
    id: 'gg',
    ejsCore: 'gg',
    defaultResolution: { width: 160, height: 144 },
    exports: {
      framebufferPtr: ['_get_framebuffer_ptr'],
      palettesPtr: ['_get_palette_ptr'],
      vramPtr: ['_get_vram_ptr'],
      oamPtr: ['_get_oam_ptr']
    }
  },
  // Sega Saturn
  {
    id: 'ss',
    ejsCore: 'saturn',
    defaultResolution: { width: 320, height: 240 },
    exports: {
      framebufferPtr: ['_get_framebuffer_ptr']
      // Saturn memory maps are complex; placeholders for future integration
    }
  },
  // Sony PlayStation
  {
    id: 'psx',
    ejsCore: 'psx',
    defaultResolution: { width: 320, height: 240 },
    exports: {
      framebufferPtr: ['_get_framebuffer_ptr']
    }
  },
  // Nintendo 64
  {
    id: 'n64',
    ejsCore: 'n64',
    defaultResolution: { width: 320, height: 240 },
    exports: {
      framebufferPtr: ['_get_framebuffer_ptr']
    }
  }
];

export function getCoreDescriptor(id: SystemId): CoreDescriptor {
  const core = CORES.find(c => c.id === id);
  if (!core) throw new Error(`Core não suportado: ${id}`);
  return core;
}

