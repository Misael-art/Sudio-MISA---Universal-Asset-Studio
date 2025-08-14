// Implementando Pilar 2.7: Sistema de exportação PNG avançado
// Utilitário para exportar sprites individuais e sprite sheets com múltiplas opções

import { AssembledSprite } from '../types/genesis';

export interface ExportOptions {
  scale: number;
  format: 'png' | 'webp';
  quality?: number; // Para WebP
  backgroundColor?: string; // Cor de fundo transparente ou sólida
  padding?: number; // Padding ao redor do sprite
  includeMetadata?: boolean; // Incluir metadados no nome do arquivo
}

export interface SpriteSheetOptions extends ExportOptions {
  layout: 'grid' | 'horizontal' | 'vertical' | 'compact';
  maxColumns?: number;
  spacing?: number; // Espaçamento entre sprites
  includeLabels?: boolean; // Incluir IDs dos sprites
  labelColor?: string;
  labelFont?: string;
}

/**
 * Exporta um sprite individual como PNG/WebP
 */
export const exportSprite = async (
  sprite: AssembledSprite,
  options: ExportOptions = { scale: 1, format: 'png' }
): Promise<void> => {
  const { scale, format, quality, backgroundColor, padding = 0, includeMetadata } = options;
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível criar contexto do canvas');
  
  // Calcula dimensões com padding
  const finalWidth = (sprite.width + padding * 2) * scale;
  const finalHeight = (sprite.height + padding * 2) * scale;
  
  canvas.width = finalWidth;
  canvas.height = finalHeight;
  
  // Configura renderização pixel-perfect
  ctx.imageSmoothingEnabled = false;
  
  // Aplica cor de fundo se especificada
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, finalWidth, finalHeight);
  }
  
  // Cria canvas temporário para o sprite original
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCanvas.width = sprite.width;
  tempCanvas.height = sprite.height;
  tempCtx.putImageData(sprite.imageData, 0, 0);
  
  // Desenha o sprite escalado com padding
  ctx.drawImage(
    tempCanvas,
    0, 0, sprite.width, sprite.height,
    padding * scale, padding * scale,
    sprite.width * scale, sprite.height * scale
  );
  
  // Gera nome do arquivo
  let filename = `sprite_${sprite.id}`;
  if (includeMetadata) {
    filename += `_${sprite.width}x${sprite.height}_pal${sprite.paletteIndex}`;
  }
  if (scale !== 1) {
    filename += `_${scale}x`;
  }
  filename += `.${format}`;
  
  // Exporta o arquivo
  const mimeType = format === 'webp' ? 'image/webp' : 'image/png';
  const dataUrl = format === 'webp' && quality !== undefined
    ? canvas.toDataURL(mimeType, quality / 100)
    : canvas.toDataURL(mimeType);
  
  downloadFile(dataUrl, filename);
};

/**
 * Exporta múltiplos sprites como sprite sheet
 */
export const exportSpriteSheet = async (
  sprites: AssembledSprite[],
  options: SpriteSheetOptions = { scale: 1, format: 'png', layout: 'grid' },
  romName?: string
): Promise<void> => {
  if (sprites.length === 0) throw new Error('Nenhum sprite para exportar');
  
  const {
    scale,
    format,
    quality,
    backgroundColor,
    layout,
    maxColumns = 8,
    spacing = 2,
    includeLabels = false,
    labelColor = '#ffffff',
    labelFont = '10px monospace'
  } = options;
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível criar contexto do canvas');
  
  // Calcula layout baseado no tipo
  const layoutInfo = calculateLayout(sprites, layout, maxColumns, spacing, includeLabels);
  
  canvas.width = layoutInfo.totalWidth * scale;
  canvas.height = layoutInfo.totalHeight * scale;
  
  // Configura renderização
  ctx.imageSmoothingEnabled = false;
  
  // Aplica cor de fundo
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  
  // Renderiza cada sprite
  sprites.forEach((sprite, index) => {
    const position = layoutInfo.positions[index];
    if (!position) return;
    
    // Cria canvas temporário para o sprite
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCanvas.width = sprite.width;
    tempCanvas.height = sprite.height;
    tempCtx.putImageData(sprite.imageData, 0, 0);
    
    // Desenha o sprite na posição calculada
    ctx.drawImage(
      tempCanvas,
      0, 0, sprite.width, sprite.height,
      position.x * scale, position.y * scale,
      sprite.width * scale, sprite.height * scale
    );
    
    // Adiciona label se solicitado
    if (includeLabels) {
      ctx.fillStyle = labelColor;
      ctx.font = `${parseInt(labelFont) * scale}px monospace`;
      ctx.fillText(
        `#${sprite.id}`,
        position.x * scale,
        (position.y + sprite.height + 12) * scale
      );
    }
  });
  
  // Gera nome do arquivo
  let filename = `sprite_sheet`;
  if (romName) {
    filename += `_${romName.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }
  filename += `_${sprites.length}sprites_${layout}`;
  if (scale !== 1) {
    filename += `_${scale}x`;
  }
  filename += `.${format}`;
  
  // Exporta o arquivo
  const mimeType = format === 'webp' ? 'image/webp' : 'image/png';
  const dataUrl = format === 'webp' && quality !== undefined
    ? canvas.toDataURL(mimeType, quality / 100)
    : canvas.toDataURL(mimeType);
  
  downloadFile(dataUrl, filename);
};

/**
 * Calcula o layout para sprite sheet
 */
function calculateLayout(
  sprites: AssembledSprite[],
  layout: SpriteSheetOptions['layout'],
  maxColumns: number,
  spacing: number,
  includeLabels: boolean
) {
  const positions: Array<{ x: number; y: number }> = [];
  let totalWidth = 0;
  let totalHeight = 0;
  
  switch (layout) {
    case 'grid': {
      const cols = Math.min(maxColumns, sprites.length);
      const rows = Math.ceil(sprites.length / cols);
      const maxWidth = Math.max(...sprites.map(s => s.width));
      const maxHeight = Math.max(...sprites.map(s => s.height));
      const labelHeight = includeLabels ? 16 : 0;
      
      sprites.forEach((sprite, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * (maxWidth + spacing);
        const y = row * (maxHeight + labelHeight + spacing);
        positions.push({ x, y });
      });
      
      totalWidth = cols * maxWidth + (cols - 1) * spacing;
      totalHeight = rows * (maxHeight + labelHeight) + (rows - 1) * spacing;
      break;
    }
    
    case 'horizontal': {
      let currentX = 0;
      const maxHeight = Math.max(...sprites.map(s => s.height));
      const labelHeight = includeLabels ? 16 : 0;
      
      sprites.forEach((sprite) => {
        positions.push({ x: currentX, y: 0 });
        currentX += sprite.width + spacing;
      });
      
      totalWidth = currentX - spacing;
      totalHeight = maxHeight + labelHeight;
      break;
    }
    
    case 'vertical': {
      let currentY = 0;
      const maxWidth = Math.max(...sprites.map(s => s.width));
      const labelHeight = includeLabels ? 16 : 0;
      
      sprites.forEach((sprite) => {
        positions.push({ x: 0, y: currentY });
        currentY += sprite.height + labelHeight + spacing;
      });
      
      totalWidth = maxWidth;
      totalHeight = currentY - spacing;
      break;
    }
    
    case 'compact': {
      // Algoritmo de empacotamento simples
      const sortedSprites = sprites
        .map((sprite, index) => ({ sprite, index }))
        .sort((a, b) => (b.sprite.width * b.sprite.height) - (a.sprite.width * a.sprite.height));
      
      const bins: Array<{ x: number; y: number; width: number; height: number }> = [];
      const labelHeight = includeLabels ? 16 : 0;
      
      sortedSprites.forEach(({ sprite, index }) => {
        let placed = false;
        
        // Tenta colocar em um bin existente
        for (const bin of bins) {
          if (sprite.width <= bin.width && (sprite.height + labelHeight) <= bin.height) {
            positions[index] = { x: bin.x, y: bin.y };
            
            // Atualiza o bin
            if (sprite.width === bin.width) {
              bin.y += sprite.height + labelHeight + spacing;
              bin.height -= sprite.height + labelHeight + spacing;
            } else {
              bins.push({
                x: bin.x + sprite.width + spacing,
                y: bin.y,
                width: bin.width - sprite.width - spacing,
                height: sprite.height + labelHeight
              });
              bin.width = sprite.width;
            }
            
            placed = true;
            break;
          }
        }
        
        // Se não coube em nenhum bin, cria um novo
        if (!placed) {
          const x = bins.length > 0 ? Math.max(...bins.map(b => b.x + b.width)) + spacing : 0;
          positions[index] = { x, y: 0 };
          bins.push({
            x,
            y: sprite.height + labelHeight + spacing,
            width: sprite.width,
            height: 1000 // Altura arbitrariamente grande
          });
        }
      });
      
      totalWidth = Math.max(...positions.map((p, i) => p.x + sprites[i].width));
      totalHeight = Math.max(...positions.map((p, i) => p.y + sprites[i].height + labelHeight));
      break;
    }
  }
  
  return { positions, totalWidth, totalHeight };
}

/**
 * Utilitário para download de arquivo
 */
function downloadFile(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exporta sprite com múltiplas escalas simultaneamente
 */
export const exportSpriteMultiScale = async (
  sprite: AssembledSprite,
  scales: number[] = [1, 2, 4],
  baseOptions: Omit<ExportOptions, 'scale'> = { format: 'png' }
): Promise<void> => {
  for (const scale of scales) {
    await exportSprite(sprite, { ...baseOptions, scale });
    // Pequeno delay para evitar problemas de download simultâneo
    await new Promise(resolve => setTimeout(resolve, 100));
  }
};

/**
 * Exporta sprite sheet com múltiplas escalas simultaneamente
 */
export const exportSpriteSheetMultiScale = async (
  sprites: AssembledSprite[],
  scales: number[] = [1, 2, 4],
  baseOptions: Omit<SpriteSheetOptions, 'scale'> = { format: 'png', layout: 'grid' },
  romName?: string
): Promise<void> => {
  for (const scale of scales) {
    await exportSpriteSheet(sprites, { ...baseOptions, scale }, romName);
    // Pequeno delay para evitar problemas de download simultâneo
    await new Promise(resolve => setTimeout(resolve, 200));
  }
};