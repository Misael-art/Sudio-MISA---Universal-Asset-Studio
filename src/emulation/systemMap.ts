import type { SystemId } from '@/emulation/types';
import type { SupportedSystem } from '@/types/worker';

export function toSystemId(system?: SupportedSystem | null): SystemId {
  switch (system) {
    case 'megadrive':
      return 'megadrive';
    case 'snes':
      return 'snes';
    case 'gameboy':
      return 'gb';
    case 'gameboycolor':
      return 'gbc';
    default:
      return 'megadrive';
  }
}

