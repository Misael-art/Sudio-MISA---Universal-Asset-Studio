import type { FrameIR } from '@/emulation/ir';
import type { SystemId } from '@/emulation/types';
import { MegaDriveAdapter } from './megadrive/MegaDriveAdapter';
import { SNESAdapter } from './snes/SNESAdapter';
import { NESAdapter } from './nes/NESAdapter';
import { GBAdapter } from './gb/GBAdapter';
import { GBCAdapter } from './gbc/GBCAdapter';
import { GBAAdapter } from './gba/GBAAdapter';

export interface Adapter<TSnapshot = any> {
  buildFrameIR(snapshot: TSnapshot): FrameIR;
}

export function getAdapterForSystem(system: SystemId): Adapter | null {
  switch (system) {
    case 'megadrive':
    case 'genesis':
    case 'segaMD':
      return new MegaDriveAdapter();
    case 'snes':
    case 'sfc':
      return new SNESAdapter();
    case 'nes':
    case 'famicom':
      return new NESAdapter();
    case 'gb':
    case 'gameboy':
      return new GBAdapter();
    case 'gbc':
    case 'gameboycolor':
      return new GBCAdapter();
    case 'gba':
      return new GBAAdapter();
    // Próximos: retornar adapters específicos (snes, nes, gb, gbc, gba, pce, sms, gg, ss, psx, n64)
    default:
      return null;
  }
}

