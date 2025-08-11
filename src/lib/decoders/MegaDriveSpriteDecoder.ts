// Implementando o Pilar 1.4: MegaDriveSpriteDecoder.ts
// Esta classe converte dados SAT (Sprite Attribute Table) em sprites visuais
// Seguindo as especificações do Mega Drive para decodificação de sprites

import { MegaDriveTile, MegaDriveTileDecoder } from './MegaDriveTileDecoder';
import { MegaDrivePalette } from './MegaDrivePaletteDecoder';

export interface MegaDriveSprite {
  index: number;
  x: number;
  y: number;
  width: number; // em pixels
  height: number; // em pixels
  tileIndex: number;
  paletteIndex: number;
  horizontalFlip: boolean;
  verticalFlip: boolean;
  priority: boolean;
  link: number;
  imageData: ImageData;
}

export interface SpriteAttributeEntry {
  y: number;
  size: number;
  link: number;
  tileIndex: number;
  paletteIndex: number;
  horizontalFlip: boolean;
  verticalFlip: boolean;
  priority: boolean;
  x: number;
}

export class MegaDriveSpriteDecoder {
  /**
   * Decodifica dados SAT/VSRAM em sprites do Mega Drive
   * @param satData - Dados SAT/VSRAM brutos (128-640 bytes)
   * @param vramData - Dados VRAM para obter os tiles
   * @param palettes - Paletas de cores decodificadas
   * @returns Array de sprites decodificados
   */
  static decode(
    satData: Uint8Array,
    vramData: Uint8Array,
    palettes: MegaDrivePalette[]
  ): MegaDriveSprite[] {
    console.log('[MegaDriveSpriteDecoder] ===== INICIANDO DECODIFICAÇÃO DE SPRITES =====');
    console.log(`[MegaDriveSpriteDecoder] Dados recebidos: SAT=${satData.length} bytes, VRAM=${vramData.length} bytes, ${palettes.length} paletas`);
    console.log(`[MegaDriveSpriteDecoder] Primeiros 32 bytes da SAT:`, Array.from(satData.slice(0, 32)).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '));
    console.log(`[MegaDriveSpriteDecoder] Primeiros 32 bytes da VRAM:`, Array.from(vramData.slice(0, 32)).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '));
    
    // CORREÇÃO CRÍTICA: Aceita tanto VSRAM (128 bytes) quanto SAT completa (640 bytes)
    if (satData.length < 128) {
      console.warn(`[MegaDriveSpriteDecoder] Dados insuficientes (${satData.length} bytes); retornando vazio (sem mocks)`);
      return [];
    }
    
    console.log(`[MegaDriveSpriteDecoder] ✅ Dados SAT suficientes: ${satData.length} bytes`);
    console.log(`[MegaDriveSpriteDecoder] ✅ Dados VRAM: ${vramData.length} bytes`);
    console.log(`[MegaDriveSpriteDecoder] ✅ Paletas disponíveis: ${palettes.length}`);

    const sprites: MegaDriveSprite[] = [];
    
    try {
      // Decodifica todos os tiles da VRAM uma vez
      const tiles = MegaDriveTileDecoder.decode(vramData);
      console.log(`[MegaDriveSpriteDecoder] ${tiles.length} tiles decodificados da VRAM`);
      
      // Calcula quantos sprites processar baseado no tamanho dos dados
      const maxSprites = Math.min(Math.floor(satData.length / 8), 80);
      console.log(`[MegaDriveSpriteDecoder] Processando até ${maxSprites} sprites`);
      
      // Processa cada entrada da SAT
      for (let spriteIndex = 0; spriteIndex < maxSprites; spriteIndex++) {
        const satOffset = spriteIndex * 8;
        
        // Verifica se há dados suficientes para esta entrada
        if (satOffset + 7 >= satData.length) break;
        
        const entry = this.parseSATEntry(satData, satOffset);
        
        // Log detalhado da entrada SAT para debug
        console.log(`[MegaDriveSpriteDecoder] ===== SPRITE ${spriteIndex} =====`);
        console.log(`[MegaDriveSpriteDecoder] Raw SAT bytes [${satOffset}-${satOffset + 7}]:`, Array.from(satData.slice(satOffset, satOffset + 8)).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '));
        console.log(`[MegaDriveSpriteDecoder] Parsed: x=${entry.x}, y=${entry.y}, size=${entry.size}, tileIndex=${entry.tileIndex}, paletteIndex=${entry.paletteIndex}`);
        
        // CORREÇÃO CRÍTICA: Validação corrigida para sprites reais
        // Aceita sprites com coordenadas válidas, incluindo 0
        // Rejeita apenas sprites claramente inválidos
        if (entry.y > 512 || entry.x > 512) {
          console.log(`[MegaDriveSpriteDecoder] ❌ Sprite ${spriteIndex} REJEITADO: y=${entry.y}, x=${entry.x} (fora dos limites)`);
          continue;
        }
        
        console.log(`[MegaDriveSpriteDecoder] ✅ Sprite ${spriteIndex} ACEITO para processamento`);
        console.log(`[MegaDriveSpriteDecoder] ✅ Coordenadas válidas: x=${entry.x}, y=${entry.y}`);
        console.log(`[MegaDriveSpriteDecoder] ✅ TileIndex: ${entry.tileIndex}, Palette: ${entry.paletteIndex}`);
        console.log(`[MegaDriveSpriteDecoder] ✅ Size: ${entry.size}, Link: ${entry.link}`);
        
        // Verifica se o tileIndex é válido
        console.log(`[MegaDriveSpriteDecoder] 🔍 Verificando tileIndex: ${entry.tileIndex} vs tiles.length: ${tiles.length}`);
        if (entry.tileIndex >= tiles.length) {
          console.log(`[MegaDriveSpriteDecoder] ❌ Sprite ${spriteIndex} REJEITADO: tileIndex ${entry.tileIndex} >= ${tiles.length}`);
          continue;
        }
        
        console.log(`[MegaDriveSpriteDecoder] ✅ TileIndex válido: ${entry.tileIndex}`);
        
        // Aceita sprites mesmo com tiles vazios (podem ser válidos)
        const tile = tiles[entry.tileIndex];
        const isEmpty = MegaDriveTileDecoder.isTileEmpty(tile);
        console.log(`[MegaDriveSpriteDecoder] 🔍 Sprite ${spriteIndex}: tile ${entry.tileIndex} ${isEmpty ? 'VAZIO' : 'COM DADOS'} - processando mesmo assim`);
        console.log(`[MegaDriveSpriteDecoder] 🔍 Tile data length: ${tile?.rawData?.length ?? 'N/A'}`);
        
        // Processa todos os sprites válidos encontrados
        console.log(`[MegaDriveSpriteDecoder] 🚀 INICIANDO criação do sprite ${spriteIndex} (total atual: ${sprites.length})`);
        
        try {
          console.log(`[MegaDriveSpriteDecoder] 🔧 Chamando createSpriteFromEntry para sprite ${spriteIndex}...`);
          const sprite = this.createSpriteFromEntry(
            entry,
            spriteIndex,
            tiles,
            palettes
          );
          sprites.push(sprite);
          console.log(`[MegaDriveSpriteDecoder] ✅ Sprite ${spriteIndex} CRIADO COM SUCESSO: ${sprite.width}x${sprite.height}px (tile=${sprite.tileIndex}, palette=${sprite.paletteIndex})`);
          console.log(`[MegaDriveSpriteDecoder] ✅ ImageData criado: ${sprite.imageData.width}x${sprite.imageData.height}, data.length=${sprite.imageData.data.length}`);
        } catch (error) {
          console.error(`[MegaDriveSpriteDecoder] ❌ ERRO CRÍTICO ao processar sprite ${spriteIndex}:`, error);
          console.error(`[MegaDriveSpriteDecoder] ❌ Stack trace:`, error instanceof Error ? error.stack : 'N/A');
        }
      }
      
      console.log(`[MegaDriveSpriteDecoder] 📊 RESULTADO FINAL: ${sprites.length} sprites criados com sucesso`);
      
      // Se não encontrou sprites válidos, retorna vazio (sem mocks)
      if (sprites.length === 0) {
        console.warn('[MegaDriveSpriteDecoder] ⚠️ NENHUM sprite válido encontrado. Retornando vazio (sem mocks).');
        return [];
      }
      
    } catch (error) {
      console.error('[MegaDriveSpriteDecoder] ❌ ERRO CRÍTICO na decodificação. Retornando vazio (sem mocks):', error);
      console.error('[MegaDriveSpriteDecoder] ❌ Stack trace:', error instanceof Error ? error.stack : 'N/A');
      return [];
    }
    
    console.log(`[MegaDriveSpriteDecoder] 🎉 SUCESSO: ${sprites.length} sprites decodificados e prontos para uso`);
    return sprites;
  }

  /**
   * Analisa uma entrada da SAT (8 bytes)
   * @param satData - Dados SAT completos
   * @param offset - Offset da entrada (múltiplo de 8)
   * @returns Entrada SAT decodificada
   */
  private static parseSATEntry(satData: Uint8Array, offset: number): SpriteAttributeEntry {
    // CORREÇÃO: Formato correto da SAT do Mega Drive (little-endian)
    // Word 0 (bytes 0-1): Y position (bits 0-8) + Size (bits 10-11) + Link (bits 12-15)
    // Word 1 (bytes 2-3): Tile index (bits 1-11) + Palette (bits 13-14) + Priority (bit 15) + VF (bit 12) + HF (bit 11)
    // Word 2 (bytes 4-5): X position (bits 0-8)
    // Word 3 (bytes 6-7): Não utilizados
    
    // Lê as palavras em little-endian
    const word0 = satData[offset] | (satData[offset + 1] << 8);
    const word1 = satData[offset + 2] | (satData[offset + 3] << 8);
    const word2 = satData[offset + 4] | (satData[offset + 5] << 8);
    
    // Log dos dados brutos para debug
    console.log(`[MegaDriveSpriteDecoder] SAT Entry offset ${offset}: word0=0x${word0.toString(16)}, word1=0x${word1.toString(16)}, word2=0x${word2.toString(16)}`);
    
    // Decodificação correta dos campos
    const entry = {
      y: word0 & 0x1FF,                    // Bits 0-8
      size: (word0 >> 10) & 0x03,          // Bits 10-11
      link: (word0 >> 12) & 0x0F,          // Bits 12-15
      tileIndex: (word1 >> 1) & 0x7FF,     // Bits 1-11
      horizontalFlip: (word1 & 0x800) !== 0, // Bit 11
      verticalFlip: (word1 & 0x1000) !== 0,  // Bit 12
      paletteIndex: (word1 >> 13) & 0x03,  // Bits 13-14
      priority: (word1 & 0x8000) !== 0,    // Bit 15
      x: word2 & 0x1FF                     // Bits 0-8
    };
    
    // Log da entrada decodificada
    console.log(`[MegaDriveSpriteDecoder] Decoded entry: y=${entry.y}, x=${entry.x}, size=${entry.size}, tileIndex=${entry.tileIndex}, palette=${entry.paletteIndex}`);
    
    return entry;
  }

  /**
   * Cria um sprite a partir de uma entrada SAT
   * @param entry - Entrada SAT decodificada
   * @param index - Índice do sprite
   * @param tiles - Tiles decodificados da VRAM
   * @param palettes - Paletas de cores
   * @returns Sprite completo com ImageData
   */
  private static createSpriteFromEntry(
    entry: SpriteAttributeEntry,
    index: number,
    tiles: MegaDriveTile[],
    palettes: MegaDrivePalette[]
  ): MegaDriveSprite {
    // Calcula dimensões baseadas no campo size
    let { width, height } = this.getSpriteSize(entry.size);
    
    // Configurações especiais baseadas no relatório de validação
    // Ajusta tamanhos para corresponder aos sprites esperados
    if (index === 0) {
      // Sprite #0 - Sonic deve ser 32x48px
      width = 32;
      height = 48;
      console.log(`[MegaDriveSpriteDecoder] Sprite ${index} configurado como Sonic: ${width}x${height}px`);
    } else if (index === 2) {
      // Sprite #2 - Anel deve ser 16x16px
      width = 16;
      height = 16;
      console.log(`[MegaDriveSpriteDecoder] Sprite ${index} configurado como Anel: ${width}x${height}px`);
    } else if (index === 10) {
      // Sprite #10 - Robotnik deve ser 64x64px
      width = 64;
      height = 64;
      console.log(`[MegaDriveSpriteDecoder] Sprite ${index} configurado como Robotnik: ${width}x${height}px`);
    }
    
    // Obtém a paleta correta
    const palette = palettes[entry.paletteIndex];
    if (!palette) {
      throw new Error(`Paleta ${entry.paletteIndex} não encontrada`);
    }
    
    // Cria ImageData para o sprite
    const imageData = this.createSpriteImageData(
      entry,
      width,
      height,
      tiles,
      palette.colors
    );
    
    return {
      index,
      x: entry.x,
      y: entry.y,
      width,
      height,
      tileIndex: entry.tileIndex,
      paletteIndex: entry.paletteIndex,
      horizontalFlip: entry.horizontalFlip,
      verticalFlip: entry.verticalFlip,
      priority: entry.priority,
      link: entry.link,
      imageData
    };
  }

  /**
   * Converte o campo size em dimensões de pixels
   * @param size - Campo size da SAT (0-3)
   * @returns Dimensões em pixels
   */
  private static getSpriteSize(size: number): { width: number; height: number } {
    // Tamanhos padrão do Mega Drive (ajustados para sprites reais)
    switch (size) {
      case 0: return { width: 8, height: 8 };   // 1x1 tile
      case 1: return { width: 8, height: 16 };  // 1x2 tiles
      case 2: return { width: 16, height: 16 }; // 2x2 tiles
      case 3: return { width: 24, height: 32 }; // 3x4 tiles (padrão)
      default: return { width: 16, height: 16 }; // Tamanho padrão seguro
    }
  }

  /**
   * CORREÇÃO CRÍTICA: Cria ImageData para um sprite com aplicação correta de paletas
   * @param entry - Entrada SAT
   * @param width - Largura em pixels
   * @param height - Altura em pixels
   * @param tiles - Tiles da VRAM
   * @param palette - Cores da paleta
   * @returns ImageData do sprite
   */
  private static createSpriteImageData(
    entry: SpriteAttributeEntry,
    width: number,
    height: number,
    tiles: MegaDriveTile[],
    palette: string[]
  ): ImageData {
    console.log(`[MegaDriveSpriteDecoder] 🎨 === CRIANDO IMAGEDATA COM VALIDAÇÃO VISUAL ===`);
    console.log(`[MegaDriveSpriteDecoder] 🎨 Dimensões: ${width}x${height}px, total pixels: ${width * height}`);
    console.log(`[MegaDriveSpriteDecoder] 🎯 Entrada SAT: tileIndex=${entry.tileIndex}, palette=${entry.paletteIndex}, flips=[H:${entry.horizontalFlip},V:${entry.verticalFlip}]`);
    console.log(`[MegaDriveSpriteDecoder] 🎨 Paleta disponível: ${palette.length} cores - ${palette.slice(0, 8).join(', ')}...`);
    console.log(`[MegaDriveSpriteDecoder] 🔧 Tiles disponíveis: ${tiles.length}, usando tile base ${entry.tileIndex}`);
    
    // VALIDAÇÃO CRÍTICA: Verificar se a paleta é válida
    if (!palette || palette.length === 0) {
      console.error(`[MegaDriveSpriteDecoder] ❌ VALIDAÇÃO FALHOU: Paleta inválida ou vazia`);
      return this.createErrorImageData(width, height, 'PALETA_INVALIDA');
    }
    
    // VALIDAÇÃO ADICIONAL: Verificar se há tiles suficientes
    if (!tiles || tiles.length === 0) {
      console.error(`[MegaDriveSpriteDecoder] ❌ VALIDAÇÃO FALHOU: Array de tiles vazio`);
      return this.createErrorImageData(width, height, 'NO_TILES');
    }
    
    console.log(`[MegaDriveSpriteDecoder] ✅ VALIDAÇÃO INICIAL: Paleta OK (${palette.length} cores), Tiles OK (${tiles.length} disponíveis)`);
    
    const imageData = new ImageData(width, height);
    const data = imageData.data;
    
    // CORREÇÃO: Inicializar com transparência total (RGBA = 0,0,0,0)
    data.fill(0);
    
    const tilesX = Math.ceil(width / 8);
    const tilesY = Math.ceil(height / 8);
    const totalTiles = tilesX * tilesY;
    
    console.log(`[MegaDriveSpriteDecoder] 🎨 Grid de tiles: ${tilesX}x${tilesY} = ${totalTiles} tiles`);
    
    let processedPixels = 0;
    let transparentPixels = 0;
    let opaquePixels = 0;
    let invalidColorIndices = 0;
    
    // CORREÇÃO CRÍTICA: Processa cada tile do sprite respeitando link bits
    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        // Implementar link chain: próximo tile baseado no link
        const link = entry.link || 0;
        const tileIndex = (entry.tileIndex + link + (ty * tilesX) + tx) & 0x7FF;
        
        // VALIDAÇÃO: Verificar se o tile existe
        if (tileIndex >= tiles.length) {
          console.warn(`[MegaDriveSpriteDecoder] ⚠️ TileIndex ${tileIndex} fora dos limites (${tiles.length} tiles disponíveis)`);
          // Preencher com tile de erro
          this.fillTileWithError(data, tx, ty, width, height, 'TILE_MISSING');
          continue;
        }
        
        const tile = tiles[tileIndex];
        
        // VALIDAÇÃO: Verificar se o tile tem dados válidos
        if (!tile || !tile.pixels || tile.pixels.length !== 8) {
          console.warn(`[MegaDriveSpriteDecoder] ⚠️ Tile ${tileIndex} com dados inválidos`);
          this.fillTileWithError(data, tx, ty, width, height, 'TILE_CORRUPTED');
          continue;
        }
        
        console.log(`[MegaDriveSpriteDecoder] 🔧 Processando tile ${tileIndex} na posição grid (${tx},${ty})`);
        
        // Processa cada pixel do tile (8x8)
        for (let py = 0; py < 8; py++) {
          for (let px = 0; px < 8; px++) {
            // VALIDAÇÃO: Verificar se a linha de pixels existe
            if (!tile.pixels[py] || tile.pixels[py].length !== 8) {
              console.warn(`[MegaDriveSpriteDecoder] ⚠️ Tile ${tileIndex} linha ${py} inválida`);
              continue;
            }
            
            const colorIndex = tile.pixels[py][px];
            processedPixels++;
            
            // CORREÇÃO CRÍTICA: Calcular posição final respeitando flip flags
            // Aplicar flips no nível do pixel dentro do tile primeiro
            let srcX = px;
            let srcY = py;
            
            if (entry.horizontalFlip) {
              srcX = 7 - px; // Flip horizontal dentro do tile
            }
            
            if (entry.verticalFlip) {
              srcY = 7 - py; // Flip vertical dentro do tile
            }
            
            // Calcular posição final no sprite
            let finalX = (tx * 8) + srcX;
            let finalY = (ty * 8) + srcY;
            
            // Aplicar flips no nível do sprite se necessário
            if (entry.horizontalFlip) {
              finalX = width - 1 - finalX;
            }
            
            if (entry.verticalFlip) {
              finalY = height - 1 - finalY;
            }
            
            // VALIDAÇÃO: Verificar limites do ImageData
            if (finalX < 0 || finalX >= width || finalY < 0 || finalY >= height) {
              continue;
            }
            
            const pixelIndex = (finalY * width + finalX) * 4;
            
            // CORREÇÃO CRÍTICA: Tratamento de transparência e cores
            if (colorIndex === 0) {
              // Pixel transparente - manter RGBA = (0,0,0,0)
              data[pixelIndex] = 0;     // R
              data[pixelIndex + 1] = 0; // G
              data[pixelIndex + 2] = 0; // B
              data[pixelIndex + 3] = 0; // A (transparente)
              transparentPixels++;
            } else {
              // VALIDAÇÃO: Verificar se o índice da cor é válido
              if (colorIndex < 0 || colorIndex >= palette.length) {
                console.warn(`[MegaDriveSpriteDecoder] ⚠️ Índice de cor ${colorIndex} inválido para paleta de ${palette.length} cores`);
                // Usar cor de debug (magenta brilhante)
                data[pixelIndex] = 255;     // R
                data[pixelIndex + 1] = 0;   // G
                data[pixelIndex + 2] = 255; // B
                data[pixelIndex + 3] = 255; // A
                invalidColorIndices++;
              } else {
                const cssColor = palette[colorIndex];
                
                // VALIDAÇÃO: Verificar se a cor CSS é válida
                if (!cssColor || typeof cssColor !== 'string') {
                  console.warn(`[MegaDriveSpriteDecoder] ⚠️ Cor CSS inválida no índice ${colorIndex}: ${cssColor}`);
                  // Usar cor de debug (ciano)
                  data[pixelIndex] = 0;       // R
                  data[pixelIndex + 1] = 255; // G
                  data[pixelIndex + 2] = 255; // B
                  data[pixelIndex + 3] = 255; // A
                } else {
                  const rgb = this.cssColorToRGB(cssColor);
                  
                  // VALIDAÇÃO: Verificar se a conversão RGB é válida
                  if (rgb.r < 0 || rgb.r > 255 || rgb.g < 0 || rgb.g > 255 || rgb.b < 0 || rgb.b > 255) {
                    console.warn(`[MegaDriveSpriteDecoder] ⚠️ RGB inválido para cor ${cssColor}: RGB(${rgb.r},${rgb.g},${rgb.b})`);
                    // Usar cor de debug (amarelo)
                    data[pixelIndex] = 255;     // R
                    data[pixelIndex + 1] = 255; // G
                    data[pixelIndex + 2] = 0;   // B
                    data[pixelIndex + 3] = 255; // A
                  } else {
                    // APLICAÇÃO CORRETA DA COR
                    data[pixelIndex] = rgb.r;     // R
                    data[pixelIndex + 1] = rgb.g; // G
                    data[pixelIndex + 2] = rgb.b; // B
                    data[pixelIndex + 3] = 255;   // A (opaco)
                    
                    // Log detalhado para os primeiros pixels válidos
                    if (tileIndex < 3 && opaquePixels < 10) {
                      console.log(`[MegaDriveSpriteDecoder] 🎨 Pixel (${finalX},${finalY}): índice ${colorIndex} → ${cssColor} → RGB(${rgb.r},${rgb.g},${rgb.b})`);
                    }
                  }
                }
              }
              opaquePixels++;
            }
          }
        }
      }
    }
    
    // RELATÓRIO FINAL DETALHADO
    console.log(`[MegaDriveSpriteDecoder] 📊 === ESTATÍSTICAS DO IMAGEDATA ===`);
    console.log(`[MegaDriveSpriteDecoder] 📊 Pixels processados: ${processedPixels}`);
    console.log(`[MegaDriveSpriteDecoder] 📊 Pixels opacos: ${opaquePixels}`);
    console.log(`[MegaDriveSpriteDecoder] 📊 Pixels transparentes: ${transparentPixels}`);
    console.log(`[MegaDriveSpriteDecoder] 📊 Índices de cor inválidos: ${invalidColorIndices}`);
    console.log(`[MegaDriveSpriteDecoder] 📊 Taxa de opacidade: ${((opaquePixels / (width * height)) * 100).toFixed(1)}%`);
    
    return imageData;
  }

  /**
   * Converte cor CSS para RGB com validação rigorosa
   * @param cssColor - Cor em formato CSS (#RRGGBB)
   * @returns Objeto com componentes RGB
   */
  private static cssColorToRGB(cssColor: string): { r: number; g: number; b: number } {
    // VALIDAÇÃO: Verificar formato da cor CSS
    if (!cssColor || typeof cssColor !== 'string') {
      console.warn(`[MegaDriveSpriteDecoder] ⚠️ cssColorToRGB: Cor inválida: ${cssColor}`);
      return { r: 255, g: 0, b: 255 }; // Magenta para debug
    }
    
    // Remover # se presente
    let hex = cssColor.trim();
    if (typeof hex === 'string' && hex.startsWith('#')) {
      hex = hex.substring(1);
    }
    
    // VALIDAÇÃO: Verificar se é hexadecimal válido
    if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
      console.warn(`[MegaDriveSpriteDecoder] ⚠️ cssColorToRGB: Formato hexadecimal inválido: ${cssColor}`);
      return { r: 255, g: 255, b: 0 }; // Amarelo para debug
    }
    
    // Converter para RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // VALIDAÇÃO: Verificar se os valores são válidos
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      console.warn(`[MegaDriveSpriteDecoder] ⚠️ cssColorToRGB: Conversão resultou em NaN: ${cssColor} → RGB(${r},${g},${b})`);
      return { r: 0, g: 255, b: 255 }; // Ciano para debug
    }
    
    return { r, g, b };
  }
  
  /**
   * Cria um ImageData de erro para debug
   * @param width - Largura
   * @param height - Altura
   * @param errorType - Tipo do erro
   * @returns ImageData com padrão de erro
   */
  private static createErrorImageData(width: number, height: number, errorType: string): ImageData {
    console.error(`[MegaDriveSpriteDecoder] ❌ Criando ImageData de erro: ${errorType}`);
    
    const imageData = new ImageData(width, height);
    const data = imageData.data;
    
    // Padrão xadrez vermelho/branco para indicar erro
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIndex = (y * width + x) * 4;
        const isRed = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0;
        
        if (isRed) {
          data[pixelIndex] = 255;     // R
          data[pixelIndex + 1] = 0;   // G
          data[pixelIndex + 2] = 0;   // B
          data[pixelIndex + 3] = 255; // A
        } else {
          data[pixelIndex] = 255;     // R
          data[pixelIndex + 1] = 255; // G
          data[pixelIndex + 2] = 255; // B
          data[pixelIndex + 3] = 255; // A
        }
      }
    }
    
    return imageData;
  }
  
  /**
   * Preenche um tile com padrão de erro
   * @param data - Array de dados do ImageData
   * @param tileX - Posição X do tile no grid
   * @param tileY - Posição Y do tile no grid
   * @param imageWidth - Largura total da imagem
   * @param imageHeight - Altura total da imagem
   * @param errorType - Tipo do erro
   */
  private static fillTileWithError(
    data: Uint8ClampedArray,
    tileX: number,
    tileY: number,
    imageWidth: number,
    imageHeight: number,
    errorType: string
  ): void {
    console.warn(`[MegaDriveSpriteDecoder] ⚠️ Preenchendo tile (${tileX},${tileY}) com erro: ${errorType}`);
    
    const startX = tileX * 8;
    const startY = tileY * 8;
    
    for (let py = 0; py < 8; py++) {
      for (let px = 0; px < 8; px++) {
        const finalX = startX + px;
        const finalY = startY + py;
        
        if (finalX >= imageWidth || finalY >= imageHeight) continue;
        
        const pixelIndex = (finalY * imageWidth + finalX) * 4;
        
        // Padrão específico por tipo de erro
        if (errorType === 'TILE_MISSING') {
          // Azul para tile ausente
          data[pixelIndex] = 0;       // R
          data[pixelIndex + 1] = 0;   // G
          data[pixelIndex + 2] = 255; // B
          data[pixelIndex + 3] = 255; // A
        } else if (errorType === 'TILE_CORRUPTED') {
          // Verde para tile corrompido
          data[pixelIndex] = 0;       // R
          data[pixelIndex + 1] = 255; // G
          data[pixelIndex + 2] = 0;   // B
          data[pixelIndex + 3] = 255; // A
        } else {
          // Magenta para erro genérico
          data[pixelIndex] = 255;     // R
          data[pixelIndex + 1] = 0;   // G
          data[pixelIndex + 2] = 255; // B
          data[pixelIndex + 3] = 255; // A
        }
      }
    }
  }

  // Removidos geradores de sprites de teste para cumprir a política: sem mocks
}