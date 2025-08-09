export interface ColorRGBA {
  r: number; g: number; b: number; a: number;
}

export interface Palette {
  id: string;
  colors: string[]; // hex #RRGGBB (a transparência é tratada pelo índice 0 por sistema)
  system: string;
  source: 'CRAM' | 'CGRAM' | 'PALETTE_RAM' | 'IMPORT' | 'UNKNOWN';
}

export interface Tile {
  id: number;
  width: number; // geralmente 8
  height: number; // geralmente 8
  // pixels indexados (índices na paleta) opcionalmente podem ser derivados quando necessário
  imageData: ImageData;
  // Opcional: índices 4bpp/8bpp por pixel (usado para aplicar paleta dinâmica na composição)
  pixelIndices?: Uint8Array;
  hash: string; // hash para deduplicação (incluindo conteudo, não flips)
}

export interface Tileset {
  tiles: Tile[];
  tileSize: { width: number; height: number };
}

export interface TilemapCell {
  tileIndex: number;
  paletteIndex: number;
  flipH: boolean;
  flipV: boolean;
  priority?: boolean;
}

export interface Tilemap {
  width: number;
  height: number;
  cells: TilemapCell[]; // length = width * height
}

export interface Layer {
  kind: 'BG' | 'FG' | 'HUD' | 'WINDOW' | 'OTHER';
  tileset: Tileset;
  tilemap: Tilemap;
  paletteGroup: number[]; // índices das paletas usadas
  scroll?: { x: number; y: number };
  priorityOrder?: number; // ordem de composição
}

export interface Sprite {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  image: ImageData;
  priority?: boolean;
  paletteIndex?: number;
}

export interface FrameIR {
  system: string;
  palettes: Palette[];
  tilesets: Tileset[];
  layers: Layer[];
  sprites: Sprite[];
  framebuffer?: { image: ImageData };
  diagnostics?: string[];
}

