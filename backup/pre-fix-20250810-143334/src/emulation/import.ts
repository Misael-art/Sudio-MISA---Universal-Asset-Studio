export interface ImportedSpritesheetMeta {
  sprites: { id: number; x: number; y: number; w: number; h: number }[];
  imageWidth: number;
  imageHeight: number;
}

export interface ImportValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function validateSpritesheetMeta(meta: ImportedSpritesheetMeta, maxSprites?: number): ImportValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!meta || !Array.isArray(meta.sprites)) {
    errors.push('Metadados inválidos: lista de sprites ausente');
  }
  if (typeof meta.imageWidth !== 'number' || typeof meta.imageHeight !== 'number') {
    errors.push('Metadados inválidos: dimensões da imagem ausentes');
  }
  if (maxSprites && meta.sprites.length > maxSprites) {
    warnings.push(`Quantidade de sprites (${meta.sprites.length}) excede o recomendado (${maxSprites})`);
  }
  return { ok: errors.length === 0, errors, warnings };
}

