// Tipos específicos para o sistema Genesis/Mega Drive

/**
 * Representa um sprite montado do Genesis/Mega Drive
 */
export interface AssembledSprite {
  /** ID único do sprite */
  id: number;
  /** Nome do sprite */
  name: string;
  /** Largura em pixels */
  width: number;
  /** Altura em pixels */
  height: number;
  /** Dados da imagem como ImageData */
  imageData: ImageData;
  /** Tiles do sprite */
  tiles: GenesisTile[];
  /** Paleta de cores utilizada */
  palette: GenesisPalette;
  /** Índice da paleta */
  paletteIndex: number;
  /** Endereço na VRAM */
  vramAddress?: number;
  /** Prioridade do sprite */
  priority?: number;
  /** Flip horizontal */
  flipH?: boolean;
  /** Flip vertical */
  flipV?: boolean;
  /** Tamanho do sprite */
  size?: {
    width: number;
    height: number;
  };
  /** Posição do sprite */
  position?: {
    x: number;
    y: number;
  };
  /** Metadados adicionais */
  metadata?: {
    /** Endereço na VRAM */
    vramAddress?: number;
    /** Formato do tile */
    tileFormat?: string;
    /** Número de tiles utilizados */
    tileCount?: number;
    /** Se foi importado */
    imported?: boolean;
    /** Data de importação */
    importDate?: string;
    /** Formato original */
    originalFormat?: string;
  };
}

/**
 * Configuração de paleta do Genesis
 */
export interface GenesisPalette {
  /** ID da paleta */
  id: number;
  /** Cores da paleta (16 cores por paleta) */
  colors: string[];
  /** Nome da paleta */
  name?: string;
}

/**
 * Configuração de tile do Genesis
 */
export interface GenesisTile {
  /** Dados do tile (8x8 pixels) */
  data: Uint8Array;
  /** ID da paleta utilizada */
  paletteId: number;
  /** Prioridade do tile */
  priority: boolean;
  /** Flip horizontal */
  flipH: boolean;
  /** Flip vertical */
  flipV: boolean;
}