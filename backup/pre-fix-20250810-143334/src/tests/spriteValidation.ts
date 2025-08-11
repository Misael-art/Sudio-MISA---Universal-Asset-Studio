/**
 * Teste de Validação de Dimensões de Sprites
 * Verifica se o decoder real está produzindo as dimensões corretas:
 * - Sonic #0 = 32×48 px
 * - Anel #2 = 16×16 px  
 * - Robotnik #10 = 64×64 px
 */

export interface SpriteValidationResult {
  spriteId: number;
  expectedWidth: number;
  expectedHeight: number;
  actualWidth: number;
  actualHeight: number;
  isValid: boolean;
  name: string;
}

/**
 * Dimensões esperadas para sprites específicos
 */
const EXPECTED_SPRITE_DIMENSIONS = {
  0: { width: 32, height: 48, name: 'Sonic' },
  2: { width: 16, height: 16, name: 'Anel' },
  10: { width: 64, height: 64, name: 'Robotnik' }
};

/**
 * Valida as dimensões de sprites específicos
 * @param sprites - Array de sprites processados
 * @returns Array de resultados de validação
 */
export function validateSpriteDimensions(sprites: any[]): SpriteValidationResult[] {
  const results: SpriteValidationResult[] = [];
  
  for (const [spriteId, expected] of Object.entries(EXPECTED_SPRITE_DIMENSIONS)) {
    const id = parseInt(spriteId);
    const sprite = sprites.find(s => s.id === id);
    
    if (sprite) {
      const result: SpriteValidationResult = {
        spriteId: id,
        expectedWidth: expected.width,
        expectedHeight: expected.height,
        actualWidth: sprite.width || 0,
        actualHeight: sprite.height || 0,
        isValid: false,
        name: expected.name
      };
      
      // Verificar se as dimensões estão corretas (com tolerância de ±8px para tiles)
      const widthValid = Math.abs(result.actualWidth - result.expectedWidth) <= 8;
      const heightValid = Math.abs(result.actualHeight - result.expectedHeight) <= 8;
      result.isValid = widthValid && heightValid;
      
      results.push(result);
    } else {
      // Sprite não encontrado
      results.push({
        spriteId: id,
        expectedWidth: expected.width,
        expectedHeight: expected.height,
        actualWidth: 0,
        actualHeight: 0,
        isValid: false,
        name: expected.name
      });
    }
  }
  
  return results;
}

/**
 * Gera relatório de validação em formato legível
 * @param results - Resultados da validação
 * @returns String com o relatório
 */
export function generateValidationReport(results: SpriteValidationResult[]): string {
  let report = '=== RELATÓRIO DE VALIDAÇÃO DE SPRITES ===\n\n';
  
  for (const result of results) {
    const status = result.isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO';
    report += `${status} - ${result.name} (Sprite #${result.spriteId})\n`;
    report += `  Esperado: ${result.expectedWidth}×${result.expectedHeight}px\n`;
    report += `  Atual: ${result.actualWidth}×${result.actualHeight}px\n`;
    
    if (!result.isValid) {
      const widthDiff = result.actualWidth - result.expectedWidth;
      const heightDiff = result.actualHeight - result.expectedHeight;
      report += `  Diferença: ${widthDiff > 0 ? '+' : ''}${widthDiff}×${heightDiff > 0 ? '+' : ''}${heightDiff}px\n`;
    }
    
    report += '\n';
  }
  
  const validCount = results.filter(r => r.isValid).length;
  const totalCount = results.length;
  report += `RESUMO: ${validCount}/${totalCount} sprites com dimensões corretas\n`;
  
  return report;
}

/**
 * Executa validação completa e retorna se todos os sprites estão corretos
 * @param sprites - Array de sprites processados
 * @returns true se todos os sprites têm dimensões corretas
 */
export function runSpriteValidation(sprites: any[]): boolean {
  const results = validateSpriteDimensions(sprites);
  const report = generateValidationReport(results);
  
  console.log(report);
  
  return results.every(r => r.isValid);
}