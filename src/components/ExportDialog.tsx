// Implementando Pilar 2.7: Interface de exportação avançada
// Componente de diálogo para configurar opções de exportação de sprites

import React, { useState, useCallback } from 'react';
import { X, Download, Settings, Image, Grid, Layers, Palette } from 'lucide-react';
import { AssembledSprite } from '../types/genesis';
import {
  exportSprite,
  exportSpriteSheet,
  exportSpriteMultiScale,
  exportSpriteSheetMultiScale,
  ExportOptions,
  SpriteSheetOptions
} from '../utils/spriteExporter';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sprites: AssembledSprite[];
  selectedSprite?: AssembledSprite;
  romName?: string;
  mode: 'single' | 'sheet';
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  sprites,
  selectedSprite,
  romName,
  mode
}) => {
  // Estados para opções de exportação
  const [format, setFormat] = useState<'png' | 'webp'>('png');
  const [scale, setScale] = useState(2);
  const [multiScale, setMultiScale] = useState(false);
  const [scales, setScales] = useState([1, 2, 4]);
  const [backgroundColor, setBackgroundColor] = useState('');
  const [padding, setPadding] = useState(0);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [quality, setQuality] = useState(90);
  
  // Estados específicos para sprite sheet
  const [layout, setLayout] = useState<SpriteSheetOptions['layout']>('grid');
  const [maxColumns, setMaxColumns] = useState(8);
  const [spacing, setSpacing] = useState(2);
  const [includeLabels, setIncludeLabels] = useState(false);
  const [labelColor, setLabelColor] = useState('#ffffff');
  
  const [isExporting, setIsExporting] = useState(false);
  
  // Função para exportar sprite individual
  const handleExportSingle = useCallback(async () => {
    if (!selectedSprite) return;
    
    setIsExporting(true);
    try {
      const options: ExportOptions = {
        scale,
        format,
        quality: format === 'webp' ? quality : undefined,
        backgroundColor: backgroundColor || undefined,
        padding,
        includeMetadata
      };
      
      if (multiScale) {
        await exportSpriteMultiScale(selectedSprite, scales, options);
      } else {
        await exportSprite(selectedSprite, options);
      }
      
      onClose();
    } catch (error) {
      console.error('Erro ao exportar sprite:', error);
      alert('Erro ao exportar sprite. Verifique o console para detalhes.');
    } finally {
      setIsExporting(false);
    }
  }, [selectedSprite, scale, format, quality, backgroundColor, padding, includeMetadata, multiScale, scales, onClose]);
  
  // Função para exportar sprite sheet
  const handleExportSheet = useCallback(async () => {
    if (sprites.length === 0) return;
    
    setIsExporting(true);
    try {
      const options: SpriteSheetOptions = {
        scale,
        format,
        quality: format === 'webp' ? quality : undefined,
        backgroundColor: backgroundColor || undefined,
        layout,
        maxColumns,
        spacing,
        includeLabels,
        labelColor
      };
      
      if (multiScale) {
        await exportSpriteSheetMultiScale(sprites, scales, options, romName);
      } else {
        await exportSpriteSheet(sprites, options, romName);
      }
      
      onClose();
    } catch (error) {
      console.error('Erro ao exportar sprite sheet:', error);
      alert('Erro ao exportar sprite sheet. Verifique o console para detalhes.');
    } finally {
      setIsExporting(false);
    }
  }, [sprites, scale, format, quality, backgroundColor, layout, maxColumns, spacing, includeLabels, labelColor, multiScale, scales, romName, onClose]);
  
  // Função para adicionar escala customizada
  const addCustomScale = useCallback(() => {
    const newScale = prompt('Digite a escala (ex: 3, 8):');
    if (newScale && !isNaN(Number(newScale))) {
      const scaleNum = Number(newScale);
      if (scaleNum > 0 && scaleNum <= 16 && !scales.includes(scaleNum)) {
        setScales([...scales, scaleNum].sort((a, b) => a - b));
      }
    }
  }, [scales]);
  
  // Função para remover escala
  const removeScale = useCallback((scaleToRemove: number) => {
    if (scales.length > 1) {
      setScales(scales.filter(s => s !== scaleToRemove));
    }
  }, [scales]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-600 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Cabeçalho */}
        <div className="border-b border-gray-600 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {mode === 'single' ? <Image className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
            <h2 className="text-lg font-semibold text-white">
              {mode === 'single' ? 'Exportar Sprite' : 'Exportar Sprite Sheet'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Conteúdo */}
        <div className="p-6 space-y-6">
          {/* Informações */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Informações:</h3>
            {mode === 'single' && selectedSprite ? (
              <div className="text-sm text-gray-400">
                <p>Sprite #{selectedSprite.id} - {selectedSprite.width}×{selectedSprite.height}px</p>
                <p>Paleta: {selectedSprite.paletteIndex}</p>
              </div>
            ) : (
              <div className="text-sm text-gray-400">
                <p>{sprites.length} sprites selecionados</p>
                {romName && <p>ROM: {romName}</p>}
              </div>
            )}
          </div>
          
          {/* Opções básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Formato */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Formato:
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'png' | 'webp')}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="png">PNG (sem perda)</option>
                <option value="webp">WebP (comprimido)</option>
              </select>
            </div>
            
            {/* Qualidade (apenas para WebP) */}
            {format === 'webp' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Qualidade: {quality}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </div>
          
          {/* Escala */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">
                Escala:
              </label>
              <label className="flex items-center space-x-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={multiScale}
                  onChange={(e) => setMultiScale(e.target.checked)}
                  className="rounded"
                />
                <span>Múltiplas escalas</span>
              </label>
            </div>
            
            {!multiScale ? (
              <input
                type="range"
                min="1"
                max="8"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full"
              />
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {scales.map((s) => (
                    <div
                      key={s}
                      className="bg-gray-700 border border-gray-600 rounded px-3 py-1 flex items-center space-x-2"
                    >
                      <span className="text-sm text-white">{s}x</span>
                      {scales.length > 1 && (
                        <button
                          onClick={() => removeScale(s)}
                          className="text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addCustomScale}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    + Adicionar
                  </button>
                </div>
              </div>
            )}
            
            {!multiScale && (
              <div className="text-center text-sm text-gray-400 mt-1">
                {scale}x ({(selectedSprite?.width || 0) * scale}×{(selectedSprite?.height || 0) * scale}px)
              </div>
            )}
          </div>
          
          {/* Opções avançadas */}
          <div className="border-t border-gray-600 pt-4">
            <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Opções Avançadas</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cor de fundo */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cor de fundo (opcional):
                </label>
                <div className="flex space-x-2">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-12 h-8 rounded border border-gray-600"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    placeholder="#000000 ou transparente"
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              
              {/* Padding */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Padding: {padding}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={padding}
                  onChange={(e) => setPadding(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Metadados */}
            <div className="mt-4">
              <label className="flex items-center space-x-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="rounded"
                />
                <span>Incluir metadados no nome do arquivo</span>
              </label>
            </div>
          </div>
          
          {/* Opções específicas para sprite sheet */}
          {mode === 'sheet' && (
            <div className="border-t border-gray-600 pt-4">
              <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center space-x-2">
                <Layers className="w-4 h-4" />
                <span>Layout do Sprite Sheet</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Layout */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tipo de layout:
                  </label>
                  <select
                    value={layout}
                    onChange={(e) => setLayout(e.target.value as SpriteSheetOptions['layout'])}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="grid">Grade uniforme</option>
                    <option value="horizontal">Horizontal</option>
                    <option value="vertical">Vertical</option>
                    <option value="compact">Compacto</option>
                  </select>
                </div>
                
                {/* Colunas máximas (apenas para grid) */}
                {layout === 'grid' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Colunas máximas: {maxColumns}
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="16"
                      value={maxColumns}
                      onChange={(e) => setMaxColumns(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
                
                {/* Espaçamento */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Espaçamento: {spacing}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={spacing}
                    onChange={(e) => setSpacing(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                {/* Labels */}
                <div>
                  <label className="flex items-center space-x-2 text-sm text-gray-300 mb-2">
                    <input
                      type="checkbox"
                      checked={includeLabels}
                      onChange={(e) => setIncludeLabels(e.target.checked)}
                      className="rounded"
                    />
                    <span>Incluir IDs dos sprites</span>
                  </label>
                  {includeLabels && (
                    <input
                      type="color"
                      value={labelColor}
                      onChange={(e) => setLabelColor(e.target.value)}
                      className="w-12 h-6 rounded border border-gray-600"
                      title="Cor do texto"
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Rodapé */}
        <div className="border-t border-gray-600 p-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={mode === 'single' ? handleExportSingle : handleExportSheet}
            disabled={isExporting || (mode === 'single' && !selectedSprite)}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>
              {isExporting ? 'Exportando...' : 
               mode === 'single' ? 'Exportar Sprite' : 'Exportar Sheet'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;