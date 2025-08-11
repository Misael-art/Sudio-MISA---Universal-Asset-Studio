// Caminho do arquivo: src/lib/decoders/MegaDriveSpriteAssembler.ts

export class MegaDriveSpriteAssembler {
  /**
   * Monta sprites lendo diretamente da SAT (Sprite Attribute Table), a fonte de verdade do hardware.
   */
  static assemble(sat: Uint8Array, allTiles: ImageData[]): ImageData[] {
    const assembledSprites: ImageData[] = [];
    const VDP_MAX_SPRITES = 80;

    for (let i = 0; i < VDP_MAX_SPRITES; i++) {
      const offset = i * 8;
      if (offset + 7 >= sat.length) break;

      const yPos =           ((sat[offset + 0] << 8) | sat[offset + 1]) & 0x01FF;
      const sizeAndLink =    ((sat[offset + 2] << 8) | sat[offset + 3]);
      const tileAttributes = ((sat[offset + 4] << 8) | sat[offset + 5]);
      
      const baseTileIndex = tileAttributes & 0x07FF;

      // Ignora sprites inativos ou "escondidos".
      if (yPos === 0 || yPos >= 480 || baseTileIndex === 0) {
        continue;
      }
      
      // Cálculo de dimensões a partir da SAT, conforme documentação do VDP.
      const widthInTiles  = ((sizeAndLink >> 10) & 0x03) + 1;
      const heightInTiles = ((sizeAndLink >> 8)  & 0x03) + 1;
      const spriteWidthPx  = widthInTiles * 8;
      const spriteHeightPx = heightInTiles * 8;

      const flipH = (tileAttributes & 0x0800) !== 0;
      const flipV = (tileAttributes & 0x1000) !== 0;
      
      const spriteImageData = new ImageData(spriteWidthPx, spriteHeightPx);
      let tileCounter = 0;

      for (let ty = 0; ty < heightInTiles; ty++) {
        for (let tx = 0; tx < widthInTiles; tx++) {
          const tileToDrawIndex = baseTileIndex + tileCounter;
          if (tileToDrawIndex >= allTiles.length) continue;
          
          const tileImageData = allTiles[tileToDrawIndex];
          if (!tileImageData) continue;

          const destX = flipH ? (widthInTiles - 1 - tx) * 8 : tx * 8;
          const destY = flipV ? (heightInTiles - 1 - ty) * 8 : ty * 8;

          for (let py = 0; py < 8; py++) {
            for (let px = 0; px < 8; px++) {
              const srcIndex = (py * 8 + px) * 4;
              const destIndex = ((destY + py) * spriteWidthPx + (destX + px)) * 4;
              
              spriteImageData.data[destIndex]     = tileImageData.data[srcIndex];
              spriteImageData.data[destIndex + 1] = tileImageData.data[srcIndex + 1];
              spriteImageData.data[destIndex + 2] = tileImageData.data[srcIndex + 2];
              spriteImageData.data[destIndex + 3] = tileImageData.data[srcIndex + 3];
            }
          }
          tileCounter++;
        }
      }
      assembledSprites.push(spriteImageData);
    }
    return assembledSprites.filter(s => s.width > 0 && s.height > 0);
  }
}