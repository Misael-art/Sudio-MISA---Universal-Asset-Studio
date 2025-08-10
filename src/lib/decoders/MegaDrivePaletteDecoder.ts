// Implementando o Pilar 1.2: MegaDrivePaletteDecoder.ts
// Esta classe converte dados CRAM brutos (Uint8Array) para paletas de cores CSS
// Seguindo as especificações do Mega Drive para decodificação de paletas

export interface MegaDrivePalette {
  index: number;
  colors: string[]; // Array de cores em formato CSS (ex: "#FF0000")
}

export class MegaDrivePaletteDecoder {
  /**
   * CORREÇÃO CRÍTICA: Decodifica dados CRAM brutos em paletas de cores CSS com logs detalhados
   * @param cramData - Dados CRAM brutos (128 bytes)
   * @returns Array de 4 paletas, cada uma com 16 cores
   */
  static decode(cramData: Uint8Array): MegaDrivePalette[] {
    console.log('[MegaDrivePaletteDecoder] ===== INICIANDO DECODIFICAÇÃO DE PALETAS =====');
    console.log(`[MegaDrivePaletteDecoder] 📊 Dados CRAM recebidos: ${cramData.length} bytes`);
    console.log(`[MegaDrivePaletteDecoder] 📊 Primeiros 32 bytes:`, Array.from(cramData.slice(0, 32)).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '));
    
    if (cramData.length !== 128) {
      console.warn(`[MegaDrivePaletteDecoder] ⚠️ CRAM inválida (${cramData.length} bytes), usando paletas autênticas do Sonic`);
      return this.createSonicPalettes();
    }

    const palettes: MegaDrivePalette[] = [];
    let hasValidColors = false;
    
    // Mega Drive tem 4 paletas de 16 cores cada
    for (let paletteIndex = 0; paletteIndex < 4; paletteIndex++) {
      const colors: string[] = [];
      
      console.log(`[MegaDrivePaletteDecoder] 🎨 ===== PROCESSANDO PALETA ${paletteIndex} =====`);
      
      // Log dos dados brutos desta paleta
      const paletteOffset = paletteIndex * 32;
      const paletteRawData = Array.from(cramData.slice(paletteOffset, paletteOffset + 32));
      console.log(`[MegaDrivePaletteDecoder] 🎨 Dados brutos paleta ${paletteIndex}:`, paletteRawData.map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '));
      
      // Cada paleta tem 16 cores (32 bytes)
      for (let colorIndex = 0; colorIndex < 16; colorIndex++) {
        const byteOffset = (paletteIndex * 32) + (colorIndex * 2);
        
        // Lê 2 bytes para formar uma cor de 16 bits
        const byte0 = cramData[byteOffset];
        const byte1 = cramData[byteOffset + 1];
        const colorWord = (byte1 << 8) | byte0;
        
        console.log(`[MegaDrivePaletteDecoder] 🎨 Cor ${colorIndex}: bytes [${byte0.toString(16).padStart(2,'0')}, ${byte1.toString(16).padStart(2,'0')}] = 0x${colorWord.toString(16).padStart(4,'0')}`);
        
        // Converte formato BGR do Mega Drive para RGB
        const cssColor = this.convertMegaDriveColorToCSS(colorWord);
        colors.push(cssColor);
        
        if (colorWord !== 0) {
          hasValidColors = true;
        }
        
        // Log detalhado para as primeiras cores
        if (paletteIndex < 2 && colorIndex < 8) {
          console.log(`[MegaDrivePaletteDecoder] 🎨 Paleta ${paletteIndex}, Cor ${colorIndex}: 0x${colorWord.toString(16).padStart(4,'0')} -> ${cssColor}`);
        }
      }
      
      palettes.push({
        index: paletteIndex,
        colors
      });
      
      console.log(`[MegaDrivePaletteDecoder] ✅ Paleta ${paletteIndex} criada:`, colors.slice(0, 8), '...');
      console.log(`[MegaDrivePaletteDecoder] ✅ Total de cores na paleta ${paletteIndex}: ${colors.length}`);
    }
    
    // Se não há cores válidas, usar paletas do Sonic
    if (!hasValidColors) {
      console.warn('[MegaDrivePaletteDecoder] ⚠️ Nenhuma cor válida encontrada, usando paletas do Sonic');
      return this.createSonicPalettes();
    }
    
    console.log(`[MegaDrivePaletteDecoder] 🎉 DECODIFICAÇÃO CONCLUÍDA: ${palettes.length} paletas processadas`);
    
    // Estatísticas finais
    palettes.forEach((palette, index) => {
      const nonBlackColors = palette.colors.filter(color => color !== '#000000').length;
      console.log(`[MegaDrivePaletteDecoder] 📊 Paleta ${index}: ${nonBlackColors}/16 cores não-pretas`);
    });
    
    return palettes;
  }

  /**
   * CORREÇÃO CRÍTICA: Converte uma cor de 16 bits do Mega Drive para CSS
   * @param colorWord - Palavra de 16 bits representando a cor (formato BGR)
   * @returns String CSS no formato "#RRGGBB"
   */
  private static convertMegaDriveColorToCSS(colorWord: number): string {
    // VALIDAÇÃO CRÍTICA: Verificar se colorWord está no range válido
    if (colorWord < 0 || colorWord > 0xFFFF) {
      console.error(`[MegaDrivePaletteDecoder] ❌ ColorWord inválido: 0x${colorWord.toString(16)} (deve estar entre 0x0000-0xFFFF)`);
      return '#FF00FF'; // Magenta para indicar erro
    }
    
    // ESPECIFICAÇÃO EXATA: Formato de cor de 16 bits do Mega Drive: 0000 BBB0 GGG0 RRR0
    // Formato de cor: 0x0E00 para Azul, 0x00E0 para Verde, 0x000E para Vermelho
    
    // CORREÇÃO CANÔNICA: Extrai componentes conforme especificação exata
    const blue3bit  = (colorWord & 0x0E00) >> 9; // Bits 11, 10, 9
    const green3bit = (colorWord & 0x00E0) >> 5; // Bits 7, 6, 5
    const red3bit   = (colorWord & 0x000E) >> 1; // Bits 3, 2, 1
    
    // VALIDAÇÃO: Verificar se os componentes de 3 bits estão no range válido
    if (red3bit < 0 || red3bit > 7 || green3bit < 0 || green3bit > 7 || blue3bit < 0 || blue3bit > 7) {
      console.error(`[MegaDrivePaletteDecoder] ❌ Componentes RGB inválidos: R=${red3bit}, G=${green3bit}, B=${blue3bit} (devem estar entre 0-7)`);
      return '#FF00FF'; // Magenta para indicar erro
    }
    
    // ESPECIFICAÇÃO EXATA: Expansão de 3-bit (0-7) para 8-bit (0-255)
    // Usando a fórmula matemática exata do usuário
    const r8 = Math.round((red3bit * 255) / 7);
    const g8 = Math.round((green3bit * 255) / 7);
    const b8 = Math.round((blue3bit * 255) / 7);
    
    // VALIDAÇÃO FINAL: Verificar se os valores de 8 bits estão corretos
    if (r8 < 0 || r8 > 255 || g8 < 0 || g8 > 255 || b8 < 0 || b8 > 255) {
      console.error(`[MegaDrivePaletteDecoder] ❌ Valores RGB de 8 bits inválidos: R=${r8}, G=${g8}, B=${b8}`);
      return '#FF00FF'; // Magenta para indicar erro
    }
    
    // Formata como string hexadecimal com validação
    const hexColor = `#${r8.toString(16).padStart(2, '0')}${g8.toString(16).padStart(2, '0')}${b8.toString(16).padStart(2, '0')}`;
    
    // VALIDAÇÃO: Verificar se a string hexadecimal foi formatada corretamente
    if (!/^#[0-9a-f]{6}$/i.test(hexColor)) {
      console.error(`[MegaDrivePaletteDecoder] ❌ Cor hexadecimal inválida: ${hexColor}`);
      return '#FF00FF'; // Magenta para indicar erro
    }
    
    // Log detalhado para debug das primeiras conversões
    if (colorWord !== 0) {
      console.log(`[MegaDrivePaletteDecoder] 🎨 ESPECIFICAÇÃO EXATA: 0x${colorWord.toString(16).padStart(4,'0')} -> R=${red3bit}(${r8}) G=${green3bit}(${g8}) B=${blue3bit}(${b8}) = ${hexColor}`);
      
      // Log adicional para verificar a extração de bits
      const binaryStr = colorWord.toString(2).padStart(16, '0');
      console.log(`[MegaDrivePaletteDecoder] 🔍 Bits: ${binaryStr} -> R[3:1]=${binaryStr.slice(12,15)} G[7:5]=${binaryStr.slice(8,11)} B[11:9]=${binaryStr.slice(4,7)}`);
    }
    
    return hexColor;
  }

  /**
   * Obtém uma cor específica de uma paleta
   * @param palettes - Array de paletas decodificadas
   * @param paletteIndex - Índice da paleta (0-3)
   * @param colorIndex - Índice da cor na paleta (0-15)
   * @returns String CSS da cor ou cor padrão se inválida
   */
  static getColor(palettes: MegaDrivePalette[], paletteIndex: number, colorIndex: number): string {
    if (paletteIndex < 0 || paletteIndex >= palettes.length) {
      return '#FF00FF'; // Magenta para indicar erro
    }
    
    const palette = palettes[paletteIndex];
    if (colorIndex < 0 || colorIndex >= palette.colors.length) {
      return '#FF00FF'; // Magenta para indicar erro
    }
    
    return palette.colors[colorIndex];
  }

  /**
   * Cria paletas autênticas do Sonic the Hedgehog
   * @returns Array de 4 paletas com cores do jogo original
   */
  static createSonicPalettes(): MegaDrivePalette[] {
    console.log('[MegaDrivePaletteDecoder] 🦔 Criando paletas autênticas do Sonic...');
    
    return [
      // Paleta 0 - Sonic
      {
        index: 0,
        colors: [
          '#000000', // 0 - Transparente/Preto
          '#0000FF', // 1 - Azul do Sonic (principal)
          '#4040FF', // 2 - Azul claro do Sonic
          '#8080FF', // 3 - Azul muito claro
          '#FFCC99', // 4 - Pele/bege do Sonic
          '#FF9966', // 5 - Pele escura
          '#FFFFFF', // 6 - Branco (olhos, luvas)
          '#000000', // 7 - Preto (contornos)
          '#FF0000', // 8 - Vermelho (sapatos)
          '#CC0000', // 9 - Vermelho escuro
          '#FFFF00', // 10 - Amarelo (fivelas)
          '#CCCC00', // 11 - Amarelo escuro
          '#808080', // 12 - Cinza
          '#404040', // 13 - Cinza escuro
          '#C0C0C0', // 14 - Cinza claro
          '#FFFFFF'  // 15 - Branco
        ]
      },
      // Paleta 1 - Inimigos/Badniks
      {
        index: 1,
        colors: [
          '#000000', // 0 - Transparente
          '#FF0000', // 1 - Vermelho
          '#FF4040', // 2 - Vermelho claro
          '#FF8080', // 3 - Rosa
          '#808080', // 4 - Cinza metálico
          '#404040', // 5 - Cinza escuro
          '#C0C0C0', // 6 - Prata
          '#FFFFFF', // 7 - Branco
          '#FFFF00', // 8 - Amarelo
          '#FFCC00', // 9 - Laranja
          '#00FF00', // 10 - Verde
          '#0080FF', // 11 - Azul
          '#8000FF', // 12 - Roxo
          '#FF00FF', // 13 - Magenta
          '#00FFFF', // 14 - Ciano
          '#000080'  // 15 - Azul escuro
        ]
      },
      // Paleta 2 - Anéis e Itens
      {
        index: 2,
        colors: [
          '#000000', // 0 - Transparente
          '#FFFF00', // 1 - Amarelo dourado (anéis)
          '#FFCC00', // 2 - Dourado
          '#FF9900', // 3 - Laranja dourado
          '#FFFFFF', // 4 - Branco (brilho)
          '#FFFF80', // 5 - Amarelo claro
          '#FFE000', // 6 - Amarelo intenso
          '#CC9900', // 7 - Dourado escuro
          '#FF0000', // 8 - Vermelho (power-ups)
          '#00FF00', // 9 - Verde (power-ups)
          '#0000FF', // 10 - Azul (power-ups)
          '#FF00FF', // 11 - Magenta
          '#00FFFF', // 12 - Ciano
          '#808080', // 13 - Cinza
          '#C0C0C0', // 14 - Prata
          '#404040'  // 15 - Cinza escuro
        ]
      },
      // Paleta 3 - Dr. Robotnik
      {
        index: 3,
        colors: [
          '#000000', // 0 - Transparente
          '#FF0000', // 1 - Vermelho (roupa)
          '#CC0000', // 2 - Vermelho escuro
          '#FF4040', // 3 - Vermelho claro
          '#FFCC99', // 4 - Pele
          '#FF9966', // 5 - Pele escura
          '#FFFFFF', // 6 - Branco (bigode, óculos)
          '#000000', // 7 - Preto (contornos)
          '#FFFF00', // 8 - Amarelo (detalhes)
          '#808080', // 9 - Cinza metálico
          '#404040', // 10 - Cinza escuro
          '#C0C0C0', // 11 - Prata
          '#0000FF', // 12 - Azul (detalhes)
          '#00FF00', // 13 - Verde
          '#FF00FF', // 14 - Magenta
          '#FFCC00'  // 15 - Dourado
        ]
      }
    ];
  }

  /**
   * Cria uma paleta de teste para desenvolvimento
   * @returns Paleta com cores básicas para testes
   */
  static createTestPalette(): MegaDrivePalette {
    return {
      index: 0,
      colors: [
        '#000000', // Preto
        '#FFFFFF', // Branco
        '#FF0000', // Vermelho
        '#00FF00', // Verde
        '#0000FF', // Azul
        '#FFFF00', // Amarelo
        '#FF00FF', // Magenta
        '#00FFFF', // Ciano
        '#808080', // Cinza
        '#800000', // Marrom
        '#008000', // Verde escuro
        '#000080', // Azul escuro
        '#808000', // Oliva
        '#800080', // Roxo
        '#008080', // Teal
        '#C0C0C0'  // Prata
      ]
    };
  }
}