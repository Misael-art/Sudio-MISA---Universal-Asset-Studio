// Implementando o Pilar 1.7: SpriteEditor.tsx
// Galeria de sprites extraídos - Componente crítico da Fase 1
// Deve exibir sprites como ImageData com cores corretas

import React, { useState, useRef, useEffect } from 'react';
import { Download, Search, Grid, List, ZoomIn, ZoomOut, Palette, CheckCircle, XCircle } from 'lucide-react';
// import { AssembledSprite } from '../lib/decoders/MegaDriveSpriteAssembler'; // Removido - não existe mais
// import { ProcessedMegaDriveData } from '../lib/cores/MegaDriveCore'; // Removido - não existe mais

// Tipos simplificados para compatibilidade
interface AssembledSprite {
  id: number;
  imageData: ImageData;
  width: number;
  height: number;
  attributes?: {
    size: 'small' | 'medium' | 'large';
    paletteIndex: number;
  };
}

interface ProcessedMegaDriveData {
  sprites: AssembledSprite[];
  tiles: any[];
  palettes: any[];
  metadata: {
    romName: string;
    timestamp: number;
    totalTiles: number;
    totalSprites: number;
    totalPalettes: number;
    processingTime: number;
  };
}
import { validateSpriteDimensions, generateValidationReport, SpriteValidationResult } from '../tests/spriteValidation';

export interface SpriteEditorProps {
  data: ProcessedMegaDriveData | null;
  className?: string;
}

type ViewMode = 'grid' | 'list';
type SortMode = 'id' | 'size' | 'palette';

/**
 * Editor de Sprites com galeria de sprites extraídos
 * Componente crítico da Fase 1 que exibe sprites decodificados
 * com cores corretas usando ImageData
 */
export const SpriteEditor: React.FC<SpriteEditorProps> = ({ data, className = '' }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('id');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSprite, setSelectedSprite] = useState<AssembledSprite | null>(null);
  const [scale, setScale] = useState(2);
  const [validationResults, setValidationResults] = useState<SpriteValidationResult[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Executar validação quando sprites são carregados
  useEffect(() => {
    if (data && data.sprites && data.sprites.length > 0) {
      const results = validateSpriteDimensions(data.sprites);
      setValidationResults(results);
      
      // Log do relatório de validação
      const report = generateValidationReport(results);
      console.log('[SPRITE-VALIDATION]', report);
    }
  }, [data && data.sprites]);

  // Filtra e ordena sprites
  const filteredSprites = React.useMemo(() => {
    if (!data || !data.sprites) return [];

    let filtered = data.sprites;

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(sprite => 
        (sprite.id ? sprite.id.toString() : `Sprite #${sprite.id || 'Unknown'}`).includes(searchTerm) ||
        `${sprite.width}x${sprite.height}`.includes(searchTerm)
      );
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortMode) {
        case 'id':
          return a.id - b.id;
        case 'size': {
          const sizeA = a.width * a.height;
          const sizeB = b.width * b.height;
          return sizeA - sizeB;
        }
        case 'palette':
          return a.id - b.id; // Fallback para ID já que não temos paletteIndex
        default:
          return 0;
      }
    });

    return filtered;
  }, [data && data.sprites, searchTerm, sortMode]);

  // Renderiza sprite no canvas quando selecionado
  useEffect(() => {
    if (selectedSprite && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Ajusta tamanho do canvas
      canvas.width = selectedSprite.width * scale;
      canvas.height = selectedSprite.height * scale;

      // Limpa canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Cria ImageData escalado
      const scaledImageData = new ImageData(canvas.width, canvas.height);
      
      // Escala pixel por pixel
      for (let y = 0; y < selectedSprite.height; y++) {
        for (let x = 0; x < selectedSprite.width; x++) {
          const srcIndex = (y * selectedSprite.width + x) * 4;
          const r = selectedSprite.imageData.data[srcIndex];
          const g = selectedSprite.imageData.data[srcIndex + 1];
          const b = selectedSprite.imageData.data[srcIndex + 2];
          const a = selectedSprite.imageData.data[srcIndex + 3];

          // Aplica escala
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const destX = x * scale + sx;
              const destY = y * scale + sy;
              const destIndex = (destY * canvas.width + destX) * 4;
              
              scaledImageData.data[destIndex] = r;
              scaledImageData.data[destIndex + 1] = g;
              scaledImageData.data[destIndex + 2] = b;
              scaledImageData.data[destIndex + 3] = a;
            }
          }
        }
      }

      // Renderiza no canvas
      ctx.putImageData(scaledImageData, 0, 0);
    }
  }, [selectedSprite, scale]);

  // Exporta sprite como PNG
  const handleExportSprite = (sprite: AssembledSprite) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = sprite.width;
    canvas.height = sprite.height;
    ctx.putImageData(sprite.imageData, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sprite_${sprite.id}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  };

  // Renderiza sprite em miniatura
  const renderSpriteThumb = (sprite: AssembledSprite) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    canvas.width = sprite.width;
    canvas.height = sprite.height;
    ctx.putImageData(sprite.imageData, 0, 0);
    
    return canvas.toDataURL();
  };

  if (!data) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-6xl mb-4">🎮</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          Nenhuma ROM processada
        </h3>
        <p className="text-gray-500">
          Carregue e processe uma ROM para ver os sprites extraídos
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Painel de Validação */}
      {validationResults.length > 0 && (
        <div className="w-full mb-4 p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Validação de Dimensões
            </h4>
            <button
              onClick={() => setShowValidation(!showValidation)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showValidation ? 'Ocultar' : 'Mostrar'} Detalhes
            </button>
          </div>
          
          <div className="flex gap-4 text-sm">
            {validationResults.map((result) => (
              <div key={result.spriteId} className="flex items-center gap-1">
                {result.isValid ? (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-500" />
                )}
                <span className={result.isValid ? 'text-green-700' : 'text-red-700'}>
                  {result.name} #{result.spriteId}: {result.actualWidth}×{result.actualHeight}px
                </span>
              </div>
            ))}
          </div>
          
          {showValidation && (
            <div className="mt-3 p-2 bg-white rounded border text-xs font-mono whitespace-pre-line">
              {generateValidationReport(validationResults)}
            </div>
          )}
        </div>
      )}

      {/* Cabeçalho com controles */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Galeria de Sprites
          </h2>
          <p className="text-gray-600">
            {filteredSprites.length} sprites encontrados de {data.metadata.romName}
          </p>
        </div>

        <div className="flex gap-2">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar sprites..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Ordenação */}
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="id">ID</option>
            <option value="size">Tamanho</option>
            <option value="palette">Paleta</option>
          </select>

          {/* Modo de visualização */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Galeria de sprites */}
      {filteredSprites.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-lg">Nenhum sprite encontrado</p>
          <p className="text-sm">Tente ajustar os filtros de busca</p>
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4' 
            : 'space-y-2'
        }>
          {filteredSprites.map((sprite) => (
            <div
              key={sprite.id}
              onClick={() => setSelectedSprite(sprite)}
              className={`
                border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md
                ${selectedSprite && selectedSprite.id === sprite.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
                ${viewMode === 'list' ? 'flex items-center gap-4' : 'text-center'}
              `}
            >
              {/* Miniatura do sprite */}
              <div className={`
                bg-gray-100 rounded border-2 border-dashed border-gray-300 flex items-center justify-center
                ${viewMode === 'grid' ? 'w-full h-20 mb-2' : 'w-16 h-16 flex-shrink-0'}
              `}>
                <img
                  src={renderSpriteThumb(sprite)}
                  alt={`Sprite ${sprite.id}`}
                  className="max-w-full max-h-full pixelated"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>

              {/* Informações do sprite */}
              <div className={viewMode === 'list' ? 'flex-1' : ''}>
                <div className="font-medium text-gray-800">
                  Sprite #{sprite.id}
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <div>{sprite.width}x{sprite.height}px</div>
                  <div className="flex items-center gap-1">
                    <Palette className="w-3 h-3" />
                    Paleta {sprite.attributes?.paletteIndex || 0}
                  </div>
                  <div className="capitalize">{sprite.attributes?.size || 'medium'}</div>
                </div>
              </div>

              {/* Botão de exportar */}
              {viewMode === 'list' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportSprite(sprite);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                  title="Exportar PNG"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Painel de detalhes do sprite selecionado */}
      {selectedSprite && (
        <div className="bg-gray-50 rounded-lg p-6 border">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Canvas do sprite */}
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-lg font-semibold text-gray-800">
                  Sprite #{selectedSprite.id}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setScale(Math.max(1, scale - 1))}
                    className="p-1 text-gray-500 hover:text-gray-700"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600 min-w-[3rem] text-center">
                    {scale}x
                  </span>
                  <button
                    onClick={() => setScale(Math.min(8, scale + 1))}
                    className="p-1 text-gray-500 hover:text-gray-700"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded border inline-block">
                <canvas
                  ref={canvasRef}
                  className="pixelated border"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
            </div>

            {/* Informações detalhadas */}
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Dimensões</label>
                  <p className="text-lg text-gray-800">{selectedSprite.width}x{selectedSprite.height}px</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Tamanho</label>
                  <p className="text-lg text-gray-800 capitalize">{selectedSprite.attributes?.size || 'medium'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Área</label>
                  <p className="text-lg text-gray-800">
                    {selectedSprite.width * selectedSprite.height} pixels
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Paleta</label>
                  <p className="text-lg text-gray-800">#{selectedSprite.attributes?.paletteIndex || 0}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Informações</label>
                <div className="flex gap-2 mt-1">
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                    SAT-based
                  </span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {selectedSprite.width}×{selectedSprite.height}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleExportSprite(selectedSprite)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Exportar PNG
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpriteEditor;