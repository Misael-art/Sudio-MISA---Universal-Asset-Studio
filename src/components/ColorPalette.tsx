// Implementando a Fase 2: Componente de paleta de cores para o SpriteEditor
// Este componente fornece as paletas padrão do Mega Drive e permite seleção de cores
// Seguindo as especificações da Fase 2 do Universal Asset Studio

import React, { useState, useCallback } from 'react';

// Paletas padrão do Mega Drive (RGB convertido para hex)
const MEGADRIVE_PALETTES = {
  sonic: [
    '#000000', '#0000AA', '#00AA00', '#00AAAA', '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',
    '#555555', '#5555FF', '#55FF55', '#55FFFF', '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF',
    '#000000', '#111111', '#222222', '#333333', '#444444', '#555555', '#666666', '#777777',
    '#888888', '#999999', '#AAAAAA', '#BBBBBB', '#CCCCCC', '#DDDDDD', '#EEEEEE', '#FFFFFF'
  ],
  
  streets_of_rage: [
    '#000000', '#330000', '#660000', '#990000', '#CC0000', '#FF0000', '#FF3333', '#FF6666',
    '#FF9999', '#FFCCCC', '#003300', '#006600', '#009900', '#00CC00', '#00FF00', '#33FF33',
    '#66FF66', '#99FF99', '#CCFFCC', '#000033', '#000066', '#000099', '#0000CC', '#0000FF',
    '#3333FF', '#6666FF', '#9999FF', '#CCCCFF', '#330033', '#660066', '#990099', '#CC00CC'
  ],
  
  golden_axe: [
    '#000000', '#2A1810', '#54301F', '#7E482F', '#A8603F', '#D2784F', '#FC905F', '#FFA86F',
    '#FFC07F', '#FFD88F', '#FFFF9F', '#E6E68A', '#CCCC75', '#B3B360', '#99994B', '#808036',
    '#666621', '#4D4D0C', '#333300', '#1A1A00', '#000000', '#0A0A0A', '#141414', '#1E1E1E',
    '#282828', '#323232', '#3C3C3C', '#464646', '#505050', '#5A5A5A', '#646464', '#6E6E6E'
  ],
  
  custom: [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
    '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#C0C0C0', '#808080',
    '#FF8080', '#80FF80', '#8080FF', '#FFFF80', '#FF80FF', '#80FFFF', '#FFC080', '#C080FF',
    '#80FFC0', '#C0FF80', '#80C0FF', '#FFC0C0', '#C0FFC0', '#C0C0FF', '#FFFFC0', '#FFC0FF'
  ]
};

interface ColorPaletteProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  className?: string;
}

const ColorPalette: React.FC<ColorPaletteProps> = ({
  selectedColor,
  onColorSelect,
  className = ''
}) => {
  const [activePalette, setActivePalette] = useState<keyof typeof MEGADRIVE_PALETTES>('sonic');
  const [customColor, setCustomColor] = useState('#FF0000');
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Adiciona cor customizada à paleta custom
  const addCustomColor = useCallback(() => {
    const customPalette = [...MEGADRIVE_PALETTES.custom];
    const emptyIndex = customPalette.findIndex(color => color === '#000000');
    
    if (emptyIndex !== -1) {
      customPalette[emptyIndex] = customColor;
      MEGADRIVE_PALETTES.custom = customPalette;
    } else {
      // Substitui a última cor se não há espaço
      customPalette[customPalette.length - 1] = customColor;
      MEGADRIVE_PALETTES.custom = customPalette;
    }
    
    onColorSelect(customColor);
    setShowCustomPicker(false);
  }, [customColor, onColorSelect]);

  // Converte hex para RGB para exibição
  const hexToRgb = useCallback((hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }, []);

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg p-4 ${className}`}>
      {/* Cabeçalho da paleta */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Paleta de Cores</h3>
        <div className="flex items-center space-x-2">
          <div 
            className="w-8 h-8 border-2 border-white rounded"
            style={{ backgroundColor: selectedColor }}
            title={`Cor selecionada: ${selectedColor}`}
          />
          <span className="text-gray-300 text-sm font-mono">
            {selectedColor.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Seletor de paleta */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {Object.keys(MEGADRIVE_PALETTES).map((paletteKey) => (
            <button
              key={paletteKey}
              onClick={() => setActivePalette(paletteKey as keyof typeof MEGADRIVE_PALETTES)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                activePalette === paletteKey
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {paletteKey.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de cores */}
      <div className="grid grid-cols-8 gap-1 mb-4">
        {MEGADRIVE_PALETTES[activePalette].map((color, index) => {
          const rgb = hexToRgb(color);
          const isSelected = selectedColor === color;
          
          return (
            <button
              key={`${activePalette}-${index}`}
              onClick={() => onColorSelect(color)}
              className={`w-8 h-8 border-2 rounded transition-all hover:scale-110 ${
                isSelected 
                  ? 'border-white shadow-lg shadow-white/50' 
                  : 'border-gray-600 hover:border-gray-400'
              }`}
              style={{ backgroundColor: color }}
              title={`${color.toUpperCase()}${rgb ? ` (R:${rgb.r} G:${rgb.g} B:${rgb.b})` : ''}`}
            />
          );
        })}
      </div>

      {/* Informações da cor selecionada */}
      <div className="bg-gray-800 rounded p-3 mb-4">
        <div className="text-sm text-gray-300">
          <div className="flex justify-between items-center mb-1">
            <span>Hex:</span>
            <span className="font-mono text-white">{selectedColor.toUpperCase()}</span>
          </div>
          {(() => {
            const rgb = hexToRgb(selectedColor);
            return rgb ? (
              <div className="flex justify-between items-center">
                <span>RGB:</span>
                <span className="font-mono text-white">
                  R:{rgb.r} G:{rgb.g} B:{rgb.b}
                </span>
              </div>
            ) : null;
          })()}
        </div>
      </div>

      {/* Seletor de cor customizada */}
      <div className="border-t border-gray-700 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-300 text-sm">Cor Customizada</span>
          <button
            onClick={() => setShowCustomPicker(!showCustomPicker)}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            {showCustomPicker ? 'Fechar' : 'Abrir'}
          </button>
        </div>
        
        {showCustomPicker && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-12 h-8 border border-gray-600 rounded cursor-pointer"
              />
              <input
                type="text"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white font-mono text-sm"
                placeholder="#FF0000"
                pattern="^#[0-9A-Fa-f]{6}$"
              />
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={addCustomColor}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded text-sm transition-colors"
              >
                Adicionar à Paleta
              </button>
              <button
                onClick={() => onColorSelect(customColor)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm transition-colors"
              >
                Usar Cor
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cores recentes (implementação futura) */}
      <div className="border-t border-gray-700 pt-4 mt-4">
        <span className="text-gray-400 text-sm">Cores Recentes</span>
        <div className="grid grid-cols-8 gap-1 mt-2">
          {/* Placeholder para cores recentes */}
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={`recent-${i}`}
              className="w-8 h-8 bg-gray-800 border border-gray-700 rounded"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ColorPalette;