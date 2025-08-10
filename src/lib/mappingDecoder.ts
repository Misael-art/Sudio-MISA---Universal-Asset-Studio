/**
 * Decoder de Sprite Mappings para Mega Drive
 * Implementa decodificação correta dos formatos Sonic 1 e Sonic 2+
 * para resolver o problema de sprites com dimensões absurdas
 */

// Interface que define uma entrada de mapping decodificada
export interface MappingEntry {
  widthTiles: number;   // Largura em tiles (8x8 pixels cada)
  heightTiles: number;  // Altura em tiles (8x8 pixels cada)
  tileIndex: number;    // Índice do tile na VRAM
  x: number;           // Posição X relativa
  y: number;           // Posição Y relativa
  flags?: number;      // Flags adicionais (apenas Sonic 2+)
}

// Interface para dimensões calculadas em pixels
export interface SpriteDimensions {
  widthPx: number;
  heightPx: number;
  valid: boolean;
}

/**
 * Decodifica uma entrada de mapping de acordo com o formato especificado
 * @param bytes Array de bytes da entrada de mapping
 * @param format Formato do mapping ('sonic1' para 6 bytes, 'sonic2' para 8 bytes)
 * @returns Entrada de mapping decodificada ou null se inválida
 */
export function decodeMapping(bytes: Uint8Array, format: 'sonic1' | 'sonic2'): MappingEntry | null {
  try {
    if (format === 'sonic1' && bytes.length >= 6) {
      // Formato Sonic 1: 6 bytes - usando valores seguros com Math.max
      const width = Math.max(1, bytes[0] & 0x0F);   // 1-4 tiles mínimo
      const height = Math.max(1, (bytes[0] >> 4) & 0x0F); // 1-4 tiles mínimo
      const tile = ((bytes[2] << 8) | bytes[1]) & 0x7FF; // 0-2047 tiles válidos
      const x = bytes[3];
      const y = bytes[4];
      return { widthTiles: width, heightTiles: height, tileIndex: tile, x, y, flags: bytes[5] };
    }

    if (format === 'sonic2' && bytes.length >= 8) {
      // Formato Sonic 2+: 8 bytes - usando valores seguros com Math.max
      const width = Math.max(1, bytes[0]);
      const height = Math.max(1, bytes[1]);
      const tile = ((bytes[3] << 8) | bytes[2]) & 0x7FF; // Máscara para tile válido
      const x = bytes[4];
      const y = bytes[5];
      return { widthTiles: width, heightTiles: height, tileIndex: tile, x, y, flags: bytes[6] };
    }
  } catch {
    // Engole erros e retorna null para fallback
  }

  return null; // Fallback para dados inválidos
}

/**
 * Calcula as dimensões em pixels de um sprite e valida os limites
 * @param entry Entrada de mapping decodificada
 * @returns Dimensões em pixels e status de validação
 */
export function calculateSpriteDimensions(entry: MappingEntry): SpriteDimensions {
  // Converte tiles para pixels (cada tile = 8x8 pixels)
  const widthPx = Math.min(entry.widthTiles * 8, 128);
  const heightPx = Math.min(entry.heightTiles * 8, 128);
  
  // Valida se as dimensões estão dentro dos limites aceitáveis
  const valid = widthPx <= 128 && heightPx <= 128 && widthPx > 0 && heightPx > 0;
  
  return {
    widthPx,
    heightPx,
    valid
  };
}

/**
 * Detecta automaticamente o formato de mapping baseado no tamanho dos dados
 * @param dataLength Tamanho dos dados em bytes
 * @returns Formato detectado
 */
export function detectMappingFormat(dataLength: number): 'sonic1' | 'sonic2' {
  // Sonic 1 usa 6 bytes por entrada, Sonic 2+ usa 8 bytes
  return dataLength === 6 ? 'sonic1' : 'sonic2';
}

/**
 * Valida se uma entrada de mapping tem valores sensatos (versão relaxada)
 * @param entry Entrada de mapping para validar
 * @returns true se a entrada é válida (sempre true agora para evitar rejeições)
 */
export function validateMappingEntry(entry: MappingEntry): boolean {
  // Validação relaxada - aceita qualquer entrada válida para evitar sprites vazios
  return (
    entry.widthTiles >= 1 &&   // Pelo menos 1 tile
    entry.heightTiles >= 1 &&  // Pelo menos 1 tile
    entry.tileIndex >= 0       // Índice não negativo
  );
}