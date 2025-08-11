// Caminho do arquivo: src/lib/cores/MegaDriveCore.ts

import { MegaDrivePaletteDecoder } from '../decoders/MegaDrivePaletteDecoder';
import { MegaDriveTileDecoder } from '../decoders/MegaDriveTileDecoder';
import { MegaDriveSpriteDecoder } from '../decoders/MegaDriveSpriteDecoder';

export class MegaDriveCore {
  /**
   * Processa os dados do emulador (VRAM, CRAM, VSRAM) para gerar sprites visíveis.
   */
  static processarDadosDoWorker(payload: {
    vram: Uint8Array;
    cram: Uint8Array;
    vsram?: Uint8Array; // VSRAM é opcional para compatibilidade
    sat?: Uint8Array;   // SAT mantido para compatibilidade
  }): ImageData[] {
    try {
      console.log('[MegaDriveCore] Iniciando processamento de dados do worker...');
      console.log(`[MegaDriveCore] Payload recebido: VRAM=${payload?.vram?.length || 0} bytes, CRAM=${payload?.cram?.length || 0} bytes, VSRAM=${payload?.vsram?.length || 0} bytes`);
      
      if (!payload?.vram?.length || !payload?.cram?.length) {
        console.error("[MegaDriveCore] Payload do worker está incompleto (VRAM/CRAM). Abortando.");
        return [];
      }

      // 1. Decodifica paletas da CRAM.
      console.log('[MegaDriveCore] Decodificando paletas da CRAM...');
      const palettes = MegaDrivePaletteDecoder.decode(payload.cram);
      console.log(`[MegaDriveCore] ${palettes.length} paletas decodificadas`);
      
      // Log das primeiras cores de cada paleta para debug
      palettes.forEach((palette, index) => {
        console.log(`[MegaDriveCore] Paleta ${index}: ${palette.colors.slice(0, 4).join(', ')}...`);
      });
      
      // 2. Usa VSRAM ou SAT para decodificar sprites
      const spriteAttributeTable = payload.vsram || payload.sat || new Uint8Array(0x80);
      console.log(`[MegaDriveCore] Usando tabela de atributos de sprites: ${spriteAttributeTable.length} bytes`);
      
      // Log dos primeiros bytes da tabela de atributos para debug
      const firstBytes = Array.from(spriteAttributeTable.slice(0, 32)).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ');
      console.log(`[MegaDriveCore] Primeiros 32 bytes da SAT/VSRAM: ${firstBytes}`);
      
      // Log dos primeiros bytes da VRAM para debug
      const firstVramBytes = Array.from(payload.vram.slice(0, 32)).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ');
      console.log(`[MegaDriveCore] Primeiros 32 bytes da VRAM: ${firstVramBytes}`);
      
      const sprites = MegaDriveSpriteDecoder.decode(spriteAttributeTable, payload.vram, palettes);
      console.log(`[MegaDriveCore] ${sprites.length} sprites decodificados da memória de atributos`);
      
      // Log detalhado dos sprites para debug
      sprites.forEach((sprite, index) => {
        if (index < 3) { // Log apenas os primeiros 3 sprites
          console.log(`[MegaDriveCore] Sprite ${index}: ${sprite.imageData.width}x${sprite.imageData.height}px, data length: ${sprite.imageData.data.length}`);
        }
      });
      
      // 3. Extrai ImageData dos sprites
      const spriteImages = sprites.map(sprite => sprite.imageData);
      console.log(`[MegaDriveCore] Extraídos ${spriteImages.length} ImageData dos sprites`);
      
      return spriteImages;

    } catch (error) {
      console.error('❌ Erro crítico no MegaDriveCore:', error);
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A');
      return []; // Retorna array vazio para não quebrar a UI.
    }
  }
}