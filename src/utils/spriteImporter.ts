// Implementando Pilar 2.9: Sistema de importação com validação
// Utilitário para importar sprites de arquivos PNG/WebP com validação completa

import { AssembledSprite } from '../types/genesis';

export interface ImportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sprite?: AssembledSprite;
}

export interface ImportOptions {
  maxWidth?: number;
  maxHeight?: number;
  allowedFormats?: string[];
  maxFileSize?: number; // em bytes
  validateColors?: boolean;
  maxColors?: number;
  autoGenerateId?: boolean;
  paletteIndex?: number;
}

const DEFAULT_OPTIONS: ImportOptions = {
  maxWidth: 128,
  maxHeight: 128,
  allowedFormats: ['image/png', 'image/webp', 'image/jpeg'],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  validateColors: true,
  maxColors: 16, // Limite típico do Mega Drive
  autoGenerateId: true,
  paletteIndex: 0
};

/**
 * Importa um sprite de um arquivo
 */
export const importSprite = async (
  file: File,
  options: ImportOptions = {}
): Promise<ImportValidationResult> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const result: ImportValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  try {
    // Validação básica do arquivo
    const fileValidation = validateFile(file, opts);
    if (!fileValidation.isValid) {
      return fileValidation;
    }
    
    // Carrega a imagem
    const imageData = await loadImageFromFile(file);
    
    // Validação da imagem
    const imageValidation = validateImage(imageData, opts);
    result.errors.push(...imageValidation.errors);
    result.warnings.push(...imageValidation.warnings);
    
    if (imageValidation.errors.length > 0) {
      result.isValid = false;
      return result;
    }
    
    // Converte para sprite
    const sprite = await convertImageToSprite(imageData, opts);
    result.sprite = sprite;
    
    // Validação final do sprite
    const spriteValidation = validateSprite(sprite, opts);
    result.errors.push(...spriteValidation.errors);
    result.warnings.push(...spriteValidation.warnings);
    
    if (spriteValidation.errors.length > 0) {
      result.isValid = false;
    }
    
    return result;
    
  } catch (error) {
    result.isValid = false;
    result.errors.push(`Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    return result;
  }
};

/**
 * Importa múltiplos sprites de arquivos
 */
export const importMultipleSprites = async (
  files: FileList | File[],
  options: ImportOptions = {}
): Promise<ImportValidationResult[]> => {
  const results: ImportValidationResult[] = [];
  const fileArray = Array.from(files);
  
  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i];
    const fileOptions = {
      ...options,
      autoGenerateId: true // Sempre gera ID automático para múltiplos
    };
    
    const result = await importSprite(file, fileOptions);
    
    // Ajusta o ID se necessário
    if (result.sprite && options.autoGenerateId) {
      result.sprite.id = i + 1;
    }
    
    results.push(result);
  }
  
  return results;
};

/**
 * Valida um arquivo antes do processamento
 */
function validateFile(file: File, options: ImportOptions): ImportValidationResult {
  const result: ImportValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  // Verifica o tipo do arquivo
  if (options.allowedFormats && !options.allowedFormats.includes(file.type)) {
    result.errors.push(`Formato de arquivo não suportado: ${file.type}. Formatos aceitos: ${options.allowedFormats.join(', ')}`);
    result.isValid = false;
  }
  
  // Verifica o tamanho do arquivo
  if (options.maxFileSize && file.size > options.maxFileSize) {
    result.errors.push(`Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(2)}MB. Máximo permitido: ${(options.maxFileSize / 1024 / 1024).toFixed(2)}MB`);
    result.isValid = false;
  }
  
  // Verifica o nome do arquivo
  if (!file.name || file.name.trim() === '') {
    result.warnings.push('Nome do arquivo está vazio');
  }
  
  return result;
}

/**
 * Carrega ImageData de um arquivo
 */
function loadImageFromFile(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Não foi possível criar contexto do canvas'));
      return;
    }
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Desenha a imagem no canvas
      ctx.drawImage(img, 0, 0);
      
      // Extrai os dados da imagem
      try {
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        resolve(imageData);
      } catch (error) {
        reject(new Error('Erro ao extrair dados da imagem'));
      }
    };
    
    img.onerror = () => {
      reject(new Error('Erro ao carregar a imagem'));
    };
    
    // Carrega a imagem do arquivo
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        reject(new Error('Erro ao ler o arquivo'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Valida os dados da imagem
 */
function validateImage(imageData: ImageData, options: ImportOptions): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Verifica dimensões
  if (options.maxWidth && imageData.width > options.maxWidth) {
    errors.push(`Largura muito grande: ${imageData.width}px. Máximo permitido: ${options.maxWidth}px`);
  }
  
  if (options.maxHeight && imageData.height > options.maxHeight) {
    errors.push(`Altura muito grande: ${imageData.height}px. Máximo permitido: ${options.maxHeight}px`);
  }
  
  // Verifica se as dimensões são válidas para sprites
  if (imageData.width === 0 || imageData.height === 0) {
    errors.push('Imagem com dimensões inválidas');
  }
  
  // Aviso para dimensões não múltiplas de 8 (comum no Mega Drive)
  if (imageData.width % 8 !== 0) {
    warnings.push(`Largura (${imageData.width}px) não é múltipla de 8. Isso pode causar problemas de alinhamento no Mega Drive.`);
  }
  
  if (imageData.height % 8 !== 0) {
    warnings.push(`Altura (${imageData.height}px) não é múltipla de 8. Isso pode causar problemas de alinhamento no Mega Drive.`);
  }
  
  // Validação de cores
  if (options.validateColors && options.maxColors) {
    const uniqueColors = getUniqueColors(imageData);
    if (uniqueColors.length > options.maxColors) {
      errors.push(`Muitas cores na imagem: ${uniqueColors.length}. Máximo permitido: ${options.maxColors}`);
    } else if (uniqueColors.length > options.maxColors / 2) {
      warnings.push(`Imagem usa ${uniqueColors.length} cores de ${options.maxColors} disponíveis. Considere otimizar a paleta.`);
    }
  }
  
  return { errors, warnings };
}

/**
 * Converte ImageData para AssembledSprite
 */
async function convertImageToSprite(imageData: ImageData, options: ImportOptions): Promise<AssembledSprite> {
  // Gera ID único se necessário
  const id = options.autoGenerateId ? Date.now() : 1;
  
  // Cria paleta básica (será melhorada posteriormente)
  const palette = {
    id: options.paletteIndex || 0,
    colors: ['#000000', '#FFFFFF'], // Paleta básica
    index: options.paletteIndex || 0
  };
  
  // Cria o sprite
  const sprite: AssembledSprite = {
    id,
    name: `Imported Sprite ${id}`,
    width: imageData.width,
    height: imageData.height,
    imageData: imageData,
    tiles: [], // Será preenchido posteriormente
    palette: palette,
    paletteIndex: options.paletteIndex || 0,
    metadata: {
      imported: true,
      importDate: new Date().toISOString(),
      originalFormat: 'imported'
    }
  };
  
  return sprite;
}

/**
 * Valida o sprite final
 */
function validateSprite(sprite: AssembledSprite, options: ImportOptions): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Verifica se o sprite tem dados válidos
  if (!sprite.imageData || sprite.imageData.data.length === 0) {
    errors.push('Sprite não contém dados de imagem válidos');
  }
  
  // Verifica consistência das dimensões
  if (sprite.imageData && 
      (sprite.width !== sprite.imageData.width || sprite.height !== sprite.imageData.height)) {
    errors.push('Dimensões do sprite inconsistentes com os dados da imagem');
  }
  
  // Verifica se o sprite não está vazio (todos os pixels transparentes)
  if (sprite.imageData && isImageEmpty(sprite.imageData)) {
    warnings.push('Sprite parece estar vazio (todos os pixels são transparentes)');
  }
  
  return { errors, warnings };
}

/**
 * Obtém cores únicas de uma imagem
 */
function getUniqueColors(imageData: ImageData): string[] {
  const colors = new Set<string>();
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    // Ignora pixels completamente transparentes
    if (a === 0) continue;
    
    const color = `rgba(${r},${g},${b},${a})`;
    colors.add(color);
  }
  
  return Array.from(colors);
}

/**
 * Verifica se uma imagem está vazia (todos os pixels transparentes)
 */
function isImageEmpty(imageData: ImageData): boolean {
  const data = imageData.data;
  
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) { // Canal alpha
      return false;
    }
  }
  
  return true;
}

/**
 * Utilitário para redimensionar sprite mantendo proporção
 */
export const resizeSprite = (imageData: ImageData, maxWidth: number, maxHeight: number): ImageData => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  // Calcula nova dimensão mantendo proporção
  const ratio = Math.min(maxWidth / imageData.width, maxHeight / imageData.height);
  const newWidth = Math.floor(imageData.width * ratio);
  const newHeight = Math.floor(imageData.height * ratio);
  
  // Cria canvas temporário com a imagem original
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  tempCtx.putImageData(imageData, 0, 0);
  
  // Redimensiona
  canvas.width = newWidth;
  canvas.height = newHeight;
  ctx.imageSmoothingEnabled = false; // Mantém pixels nítidos
  ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);
  
  return ctx.getImageData(0, 0, newWidth, newHeight);
};

/**
 * Utilitário para otimizar paleta de cores
 */
export const optimizePalette = (imageData: ImageData, maxColors: number): ImageData => {
  const uniqueColors = getUniqueColors(imageData);
  
  if (uniqueColors.length <= maxColors) {
    return imageData; // Já está otimizada
  }
  
  // Implementação simples de quantização de cores
  // Em uma implementação real, você usaria algoritmos mais sofisticados
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  
  ctx.putImageData(imageData, 0, 0);
  
  // Por simplicidade, retorna a imagem original
  // Uma implementação completa incluiria algoritmos como median cut ou octree
  return ctx.getImageData(0, 0, imageData.width, imageData.height);
};