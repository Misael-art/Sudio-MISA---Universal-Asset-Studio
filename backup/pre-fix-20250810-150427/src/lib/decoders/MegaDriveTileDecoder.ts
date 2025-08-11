// Implementando o Pilar 1.3: MegaDriveTileDecoder.ts
// Esta classe converte dados VRAM brutos em tiles de 8x8 pixels
// Seguindo as especificações do Mega Drive para decodificação de tiles

export interface MegaDriveTile {
  index: number;
  pixels: number[][]; // Matriz 8x8 de índices de cores (0-15)
  rawData: Uint8Array; // Dados brutos do tile (32 bytes)
}

export class MegaDriveTileDecoder {
  /**
   * Decodifica dados VRAM brutos em tiles do Mega Drive
   * @param vramData - Dados VRAM brutos (65536 bytes)
   * @param startOffset - Offset inicial para começar a decodificação
   * @param tileCount - Número de tiles para decodificar
   * @returns Array de tiles decodificados
   */
  static decode(vramData: Uint8Array, startOffset: number = 0, tileCount: number = 2048): MegaDriveTile[] {
    console.log(`[MegaDriveTileDecoder] === INICIANDO DECODIFICAÇÃO DE TILES ===`);
    console.log(`[MegaDriveTileDecoder] VRAM: ${vramData.length} bytes, startOffset: ${startOffset}, tileCount: ${tileCount}`);
    
    if (vramData.length < 65536) {
      throw new Error(`VRAM deve ter pelo menos 65536 bytes, recebido: ${vramData.length}`);
    }

    const tiles: MegaDriveTile[] = [];
    const maxTiles = Math.min(tileCount, Math.floor((vramData.length - startOffset) / 32));
    console.log(`[MegaDriveTileDecoder] Processando ${maxTiles} tiles`);
    
    let nonEmptyTiles = 0;
    
    for (let tileIndex = 0; tileIndex < maxTiles; tileIndex++) {
      const tileOffset = startOffset + (tileIndex * 32);
      
      // Extrai 32 bytes para este tile
      const tileData = vramData.slice(tileOffset, tileOffset + 32);
      
      // Decodifica o tile
      const tile = this.decodeSingleTile(tileData, tileIndex);
      tiles.push(tile);
      
      // Conta tiles não vazios
      if (!this.isTileEmpty(tile)) {
        nonEmptyTiles++;
        if (nonEmptyTiles <= 5) { // Log apenas os primeiros 5 tiles não vazios
          console.log(`[MegaDriveTileDecoder] Tile ${tileIndex} não vazio encontrado`);
        }
      }
    }
    
    console.log(`[MegaDriveTileDecoder] Decodificação completa: ${tiles.length} tiles totais, ${nonEmptyTiles} não vazios`);
    return tiles;
  }

  /**
   * Decodifica um único tile de 32 bytes em uma matriz 8x8 de pixels
   * CORREÇÃO CRÍTICA: Implementa decodificação 4bpp planar CORRETA do Mega Drive
   * @param tileData - 32 bytes de dados do tile
   * @param index - Índice do tile
   * @returns Tile decodificado
   */
  private static decodeSingleTile(tileData: Uint8Array, index: number): MegaDriveTile {
    if (tileData.length !== 32) {
      throw new Error(`Tile deve ter 32 bytes, recebido: ${tileData.length}`);
    }

    const pixels: number[][] = [];
    let hasNonZeroPixels = false;
    let uniqueColors = new Set<number>();
    let pixelStats = { total: 0, nonZero: 0, maxColorIndex: 0 };
    
    // VALIDAÇÃO CRÍTICA: Verificar se os dados do tile são válidos
    const allZero = tileData.every(byte => byte === 0);
    const allSame = tileData.every(byte => byte === tileData[0]);
    
    if (index < 10) {
      const hexData = Array.from(tileData).map(b => b.toString(16).padStart(2, '0')).join(' ');
      console.log(`[MegaDriveTileDecoder] 🔍 Tile ${index} dados brutos: ${hexData}`);
      console.log(`[MegaDriveTileDecoder] 🔍 Tile ${index} validação: allZero=${allZero}, allSame=${allSame}`);
    }
    
    // CORREÇÃO CRÍTICA: Formato 4bpp planar do Mega Drive
    // Cada tile é 8x8 pixels, 4 bits por pixel = 32 bytes total
    // Os dados estão organizados em 4 bitplanes sequenciais de 8 bytes cada
    // Bitplane 0: bytes 0-7   (bit menos significativo)
    // Bitplane 1: bytes 8-15
    // Bitplane 2: bytes 16-23
    // Bitplane 3: bytes 24-31 (bit mais significativo)
    
    // Cada linha do tile (8 linhas)
    for (let row = 0; row < 8; row++) {
      const pixelRow: number[] = [];
      
      // CORREÇÃO CRÍTICA: Algoritmo 4bpp planar canônico do Mega Drive
      // Os bit-planes são armazenados sequencialmente na VRAM:
      // Bitplane 0 (LSB): bytes 0-7
      // Bitplane 1: bytes 8-15  
      // Bitplane 2: bytes 16-23
      // Bitplane 3 (MSB): bytes 24-31
      const plane0Byte = tileData[row];        // Bit-plane 0 (LSB)
      const plane1Byte = tileData[row + 8];    // Bit-plane 1
      const plane2Byte = tileData[row + 16];   // Bit-plane 2
      const plane3Byte = tileData[row + 24];   // Bit-plane 3 (MSB)
      
      // VALIDAÇÃO: Verificar se há dados válidos nesta linha
      const hasDataInRow = plane0Byte || plane1Byte || plane2Byte || plane3Byte;
      
      // Log detalhado para primeiros tiles
      if (index < 3 && hasDataInRow) {
        console.log(`[MegaDriveTileDecoder] 🔧 CANÔNICO Tile ${index} linha ${row}: P0=${plane0Byte.toString(16).padStart(2,'0')} P1=${plane1Byte.toString(16).padStart(2,'0')} P2=${plane2Byte.toString(16).padStart(2,'0')} P3=${plane3Byte.toString(16).padStart(2,'0')}`);
      }
      
      // Cada pixel da linha (8 pixels)
      for (let col = 0; col < 8; col++) {
        const bitPosition = 7 - col; // Bits são lidos da esquerda para direita (MSB primeiro)
        
        // VALIDAÇÃO: Verificar se bitPosition está no range válido
        if (bitPosition < 0 || bitPosition > 7) {
          console.error(`[MegaDriveTileDecoder] ❌ BitPosition inválido: ${bitPosition} para col=${col}`);
          continue;
        }
        
        // Extrai bits de cada bitplane com validação
        const bit0 = (plane0Byte >> bitPosition) & 1;
        const bit1 = (plane1Byte >> bitPosition) & 1;
        const bit2 = (plane2Byte >> bitPosition) & 1;
        const bit3 = (plane3Byte >> bitPosition) & 1;
        
        // VALIDAÇÃO: Verificar se os bits extraídos são válidos (0 ou 1)
        if ([bit0, bit1, bit2, bit3].some(bit => bit < 0 || bit > 1)) {
          console.error(`[MegaDriveTileDecoder] ❌ Bits inválidos extraídos: bit0=${bit0}, bit1=${bit1}, bit2=${bit2}, bit3=${bit3}`);
        }
        
        // Combina os 4 bits para formar o índice da cor (0-15)
        // Formato: bit3 bit2 bit1 bit0 (MSB para LSB)
        const colorIndex = (bit3 << 3) | (bit2 << 2) | (bit1 << 1) | bit0;
        
        // VALIDAÇÃO CRÍTICA: Verificar se o índice de cor está no range válido
        if (colorIndex < 0 || colorIndex > 15) {
          console.error(`[MegaDriveTileDecoder] ❌ Índice de cor inválido: ${colorIndex} (deve estar entre 0-15)`);
          pixelRow.push(0); // Usar transparente como fallback
        } else {
          pixelRow.push(colorIndex);
          pixelStats.total++;
          
          if (colorIndex !== 0) {
            hasNonZeroPixels = true;
            uniqueColors.add(colorIndex);
            pixelStats.nonZero++;
            pixelStats.maxColorIndex = Math.max(pixelStats.maxColorIndex, colorIndex);
          }
        }
        
        // Log detalhado para primeiros pixels não-zero
        if (index < 2 && colorIndex > 0 && pixelStats.nonZero <= 5) {
          console.log(`[MegaDriveTileDecoder] 🎨 Tile ${index} pixel (${col},${row}): bits[${bit3}${bit2}${bit1}${bit0}] = colorIndex ${colorIndex}`);
        }
      }
      
      pixels.push(pixelRow);
    }
    
    // VALIDAÇÃO FINAL: Verificar se o tile foi decodificado corretamente
    const expectedPixels = 64; // 8x8
    const actualPixels = pixels.flat().length;
    
    if (actualPixels !== expectedPixels) {
      console.error(`[MegaDriveTileDecoder] ❌ Tile ${index}: pixels esperados=${expectedPixels}, obtidos=${actualPixels}`);
    }
    
    // Log detalhado para tiles não vazios
    if (hasNonZeroPixels && index < 5) {
      console.log(`[MegaDriveTileDecoder] ✅ CANÔNICO Tile ${index} decodificado:`);
      console.log(`[MegaDriveTileDecoder]   Estatísticas: ${pixelStats.nonZero}/${pixelStats.total} pixels não-zero, max colorIndex: ${pixelStats.maxColorIndex}`);
      console.log(`[MegaDriveTileDecoder]   Cores únicas: [${Array.from(uniqueColors).sort((a,b) => a-b).join(', ')}]`);
      
      // Mostrar apenas as primeiras 4 linhas para evitar spam
      pixels.slice(0, 4).forEach((row, y) => {
        const rowStr = row.map(p => p.toString(16).toUpperCase()).join('');
        console.log(`[MegaDriveTileDecoder]   Linha ${y}: ${rowStr}`);
      });
      
      if (pixels.length > 4) {
        console.log(`[MegaDriveTileDecoder]   ... (${pixels.length - 4} linhas restantes)`);
      }
    }

    return {
      index,
      pixels,
      rawData: new Uint8Array(tileData)
    };
  }

  /**
   * Converte um tile em ImageData para renderização
   * @param tile - Tile decodificado
   * @param palette - Paleta de cores para usar
   * @param scale - Fator de escala (padrão 1)
   * @returns ImageData pronto para canvas
   */
  static tileToImageData(tile: MegaDriveTile, palette: string[], scale: number = 1): ImageData {
    const size = 8 * scale;
    const imageData = new ImageData(size, size);
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const colorIndex = tile.pixels[row][col];
        const color = palette[colorIndex] || '#FF00FF'; // Magenta para cores inválidas
        
        // Converte cor CSS para RGB
        const rgb = this.cssColorToRGB(color);
        
        // Aplica escala
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const pixelIndex = ((row * scale + sy) * size + (col * scale + sx)) * 4;
            imageData.data[pixelIndex] = rgb.r;     // Red
            imageData.data[pixelIndex + 1] = rgb.g; // Green
            imageData.data[pixelIndex + 2] = rgb.b; // Blue
            imageData.data[pixelIndex + 3] = 255;   // Alpha
          }
        }
      }
    }
    
    return imageData;
  }

  /**
   * Converte cor CSS para valores RGB
   * @param cssColor - Cor no formato "#RRGGBB"
   * @returns Objeto com componentes r, g, b
   */
  private static cssColorToRGB(cssColor: string): { r: number; g: number; b: number } {
    // Remove o # se presente
    const hex = cssColor.replace('#', '');
    
    if (hex.length !== 6) {
      return { r: 255, g: 0, b: 255 }; // Magenta para cores inválidas
    }
    
    return {
      r: parseInt(hex.substr(0, 2), 16),
      g: parseInt(hex.substr(2, 2), 16),
      b: parseInt(hex.substr(4, 2), 16)
    };
  }

  /**
   * Verifica se um tile está vazio (todos os pixels são 0)
   * @param tile - Tile para verificar
   * @returns true se o tile estiver vazio
   */
  static isTileEmpty(tile: MegaDriveTile): boolean {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (tile.pixels[row][col] !== 0) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Cria um tile de teste para desenvolvimento
   * @param pattern - Padrão do tile ('checkerboard', 'gradient', 'border')
   * @returns Tile de teste
   */
  static createTestTile(pattern: 'checkerboard' | 'gradient' | 'border' = 'checkerboard'): MegaDriveTile {
    const pixels: number[][] = [];
    
    for (let row = 0; row < 8; row++) {
      const pixelRow: number[] = [];
      
      for (let col = 0; col < 8; col++) {
        let colorIndex = 0;
        
        switch (pattern) {
          case 'checkerboard':
            colorIndex = (row + col) % 2 === 0 ? 1 : 2;
            break;
          case 'gradient':
            colorIndex = Math.floor((row + col) / 2);
            break;
          case 'border':
            colorIndex = (row === 0 || row === 7 || col === 0 || col === 7) ? 3 : 0;
            break;
        }
        
        pixelRow.push(colorIndex);
      }
      
      pixels.push(pixelRow);
    }
    
    // Cria dados brutos fictícios
    const rawData = new Uint8Array(32);
    
    return {
      index: 0,
      pixels,
      rawData
    };
  }
}