// Implementando a Fase 2: SpriteGallery melhorada com grid responsivo
// Este componente oferece uma galeria avançada de sprites com múltiplas opções de visualização
// Seguindo as especificações da Fase 2 do Universal Asset Studio

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Search, Grid, List, Filter, SortAsc, SortDesc, Eye, Download, Edit, Maximize2, Minimize2 } from 'lucide-react';

import { AssembledSprite } from '../types/genesis';

interface SpriteGalleryProps {
  sprites: AssembledSprite[];
  selectedSprite?: AssembledSprite | null;
  onSpriteSelect?: (sprite: AssembledSprite) => void;
  onSpriteEdit?: (sprite: AssembledSprite) => void;
  onSpriteExport?: (sprite: AssembledSprite) => void;
  className?: string;
}

type ViewMode = 'grid' | 'list' | 'compact';
type SortBy = 'id' | 'size' | 'width' | 'height' | 'palette';
type SortOrder = 'asc' | 'desc';
type FilterBy = 'all' | 'small' | 'medium' | 'large';

const SpriteGallery: React.FC<SpriteGalleryProps> = ({
  sprites,
  selectedSprite,
  onSpriteSelect,
  onSpriteEdit,
  onSpriteExport,
  className = ''
}) => {
  // Estados de controle
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterBy, setFilterBy] = useState<FilterBy>('all');
  const [gridSize, setGridSize] = useState(8); // Colunas no grid
  const [showFilters, setShowFilters] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Refs
  const galleryRef = useRef<HTMLDivElement>(null);
  const thumbnailCache = useRef<Map<number, string>>(new Map());
  
  // Função para determinar o tamanho do sprite
  const getSpriteSize = (sprite: AssembledSprite): FilterBy => {
    const totalPixels = sprite.width * sprite.height;
    if (totalPixels <= 64) return 'small';
    if (totalPixels <= 256) return 'medium';
    return 'large';
  };
  
  // Função para gerar thumbnail do sprite
  const generateThumbnail = useCallback((sprite: AssembledSprite): string => {
    // Verifica cache primeiro
    if (thumbnailCache.current.has(sprite.id)) {
      return thumbnailCache.current.get(sprite.id)!;
    }
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    canvas.width = sprite.width;
    canvas.height = sprite.height;
    ctx.putImageData(sprite.imageData, 0, 0);
    
    const dataUrl = canvas.toDataURL();
    thumbnailCache.current.set(sprite.id, dataUrl);
    
    return dataUrl;
  }, []);
  
  // Sprites filtrados e ordenados
  const processedSprites = useMemo(() => {
    let filtered = sprites.filter(sprite => {
      // Filtro de busca
      const matchesSearch = searchTerm === '' || 
        sprite.id.toString().includes(searchTerm) ||
        sprite.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtro por tamanho
      const matchesFilter = filterBy === 'all' || getSpriteSize(sprite) === filterBy;
      
      return matchesSearch && matchesFilter;
    });
    
    // Ordenação
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'id':
          comparison = a.id - b.id;
          break;
        case 'size':
          comparison = (a.width * a.height) - (b.width * b.height);
          break;
        case 'width':
          comparison = a.width - b.width;
          break;
        case 'height':
          comparison = a.height - b.height;
          break;
        case 'palette':
          comparison = (a.paletteIndex || 0) - (b.paletteIndex || 0);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [sprites, searchTerm, sortBy, sortOrder, filterBy]);
  
  // Função para alternar ordenação
  const toggleSort = useCallback((newSortBy: SortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  }, [sortBy, sortOrder]);
  
  // Função para alternar fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);
  
  // Ajuste responsivo do grid
  useEffect(() => {
    const updateGridSize = () => {
      if (!galleryRef.current) return;
      
      const width = galleryRef.current.offsetWidth;
      if (width < 640) setGridSize(4);
      else if (width < 1024) setGridSize(6);
      else if (width < 1280) setGridSize(8);
      else setGridSize(10);
    };
    
    updateGridSize();
    window.addEventListener('resize', updateGridSize);
    
    return () => window.removeEventListener('resize', updateGridSize);
  }, []);
  
  // Renderização do sprite no modo grid
  const renderGridSprite = useCallback((sprite: AssembledSprite) => {
    const isSelected = selectedSprite?.id === sprite.id;
    
    return (
      <div
        key={sprite.id}
        onClick={() => onSpriteSelect?.(sprite)}
        className={`relative group cursor-pointer border-2 rounded-lg p-2 transition-all hover:scale-105 ${
          isSelected 
            ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/25' 
            : 'border-gray-600 hover:border-gray-500 bg-gray-800 hover:bg-gray-750'
        }`}
      >
        {/* Thumbnail */}
        <div className="aspect-square bg-gray-700 rounded flex items-center justify-center overflow-hidden relative">
          <img
            src={generateThumbnail(sprite)}
            alt={`Sprite ${sprite.id}`}
            className="max-w-full max-h-full pixelated"
            style={{ imageRendering: 'pixelated' }}
          />
          
          {/* Overlay com ações */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSpriteEdit?.(sprite);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded transition-colors"
              title="Editar"
            >
              <Edit className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSpriteExport?.(sprite);
              }}
              className="bg-green-600 hover:bg-green-700 text-white p-1 rounded transition-colors"
              title="Exportar"
            >
              <Download className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        {/* Informações */}
        <div className="mt-1 text-xs text-center">
          <div className="text-white font-mono">#{sprite.id}</div>
          <div className="text-gray-400">{sprite.width}×{sprite.height}</div>
          <div className={`text-xs px-1 rounded mt-1 inline-block ${
            getSpriteSize(sprite) === 'small' ? 'bg-green-600/20 text-green-400' :
            getSpriteSize(sprite) === 'medium' ? 'bg-yellow-600/20 text-yellow-400' :
            'bg-red-600/20 text-red-400'
          }`}>
            {getSpriteSize(sprite)}
          </div>
        </div>
      </div>
    );
  }, [selectedSprite, onSpriteSelect, onSpriteEdit, onSpriteExport, generateThumbnail]);
  
  // Renderização do sprite no modo lista
  const renderListSprite = useCallback((sprite: AssembledSprite) => {
    const isSelected = selectedSprite?.id === sprite.id;
    
    return (
      <div
        key={sprite.id}
        onClick={() => onSpriteSelect?.(sprite)}
        className={`flex items-center space-x-4 p-3 rounded-lg cursor-pointer transition-all ${
          isSelected 
            ? 'border border-blue-500 bg-blue-500/20' 
            : 'border border-gray-600 hover:border-gray-500 bg-gray-800 hover:bg-gray-750'
        }`}
      >
        {/* Thumbnail */}
        <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
          <img
            src={generateThumbnail(sprite)}
            alt={`Sprite ${sprite.id}`}
            className="max-w-full max-h-full pixelated"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
        
        {/* Informações */}
        <div className="flex-1 min-w-0">
          <div className="text-white font-mono text-sm">Sprite #{sprite.id}</div>
          <div className="text-gray-400 text-xs">
            {sprite.width}×{sprite.height} pixels • {sprite.width * sprite.height} total
            <>
              <span className="ml-2">• {sprite.width}x{sprite.height}</span>
              <span className="ml-2">• Paleta {sprite.paletteIndex}</span>
            </>
          </div>
        </div>
        
        {/* Ações */}
        <div className="flex items-center space-x-1 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSpriteEdit?.(sprite);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition-colors"
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSpriteExport?.(sprite);
            }}
            className="bg-green-600 hover:bg-green-700 text-white p-2 rounded transition-colors"
            title="Exportar"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }, [selectedSprite, onSpriteSelect, onSpriteEdit, onSpriteExport, generateThumbnail]);
  
  // Renderização do sprite no modo compacto
  const renderCompactSprite = useCallback((sprite: AssembledSprite) => {
    const isSelected = selectedSprite?.id === sprite.id;
    
    return (
      <div
        key={sprite.id}
        onClick={() => onSpriteSelect?.(sprite)}
        className={`relative group cursor-pointer border rounded p-1 transition-all ${
          isSelected 
            ? 'border-blue-500 bg-blue-500/20' 
            : 'border-gray-600 hover:border-gray-500 bg-gray-800'
        }`}
        title={`Sprite #${sprite.id} (${sprite.width}×${sprite.height})`}
      >
        <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center overflow-hidden">
          <img
            src={generateThumbnail(sprite)}
            alt={`Sprite ${sprite.id}`}
            className="max-w-full max-h-full pixelated"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
        <div className="text-xs text-center text-gray-400 mt-1 font-mono">#{sprite.id}</div>
      </div>
    );
  }, [selectedSprite, onSpriteSelect, generateThumbnail]);
  
  if (sprites.length === 0) {
    return (
      <div className={`bg-gray-900 border border-gray-700 rounded-lg p-6 ${className}`}>
        <div className="text-center text-gray-400">
          <Grid className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Nenhum Sprite Encontrado</h3>
          <p>Carregue dados do Genesis Plus GX para visualizar sprites.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg ${isFullscreen ? 'fixed inset-4 z-50' : ''} ${className}`}>
      {/* Cabeçalho */}
      <div className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Galeria de Sprites</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">
              {processedSprites.length} de {sprites.length} sprites
            </span>
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title={isFullscreen ? 'Sair do fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        {/* Controles principais */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          {/* Busca */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar sprites..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          
          {/* Filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
            title="Filtros"
          >
            <Filter className="w-4 h-4" />
          </button>
          
          {/* Modos de visualização */}
          <div className="flex border border-gray-600 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              title="Grade"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              title="Lista"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`p-2 ${viewMode === 'compact' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              title="Compacto"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Painel de filtros */}
        {showFilters && (
          <div className="bg-gray-800 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Filtro por tamanho */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Tamanho:</label>
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as FilterBy)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">Todos</option>
                  <option value="small">Pequeno</option>
                  <option value="medium">Médio</option>
                  <option value="large">Grande</option>
                </select>
              </div>
              
              {/* Ordenação */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Ordenar por:</label>
                <div className="flex space-x-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="id">ID</option>
                    <option value="size">Tamanho</option>
                    <option value="width">Largura</option>
                    <option value="height">Altura</option>
                    <option value="palette">Paleta</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-2 bg-gray-700 border border-gray-600 rounded text-gray-400 hover:text-white transition-colors"
                    title={sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
                  >
                    {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {/* Tamanho do grid */}
              {viewMode === 'grid' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Colunas: {gridSize}</label>
                  <input
                    type="range"
                    min="4"
                    max="12"
                    value={gridSize}
                    onChange={(e) => setGridSize(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Galeria */}
      <div ref={galleryRef} className={`p-4 overflow-auto ${isFullscreen ? 'h-full' : 'max-h-96'}`}>
        {viewMode === 'grid' && (
          <div 
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
          >
            {processedSprites.map(renderGridSprite)}
          </div>
        )}
        
        {viewMode === 'list' && (
          <div className="space-y-2">
            {processedSprites.map(renderListSprite)}
          </div>
        )}
        
        {viewMode === 'compact' && (
          <div className="grid grid-cols-16 gap-1">
            {processedSprites.map(renderCompactSprite)}
          </div>
        )}
        
        {processedSprites.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum sprite encontrado com os filtros aplicados.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpriteGallery;