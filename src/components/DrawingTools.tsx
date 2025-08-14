// Implementando a Fase 2: Ferramentas de desenho avançadas para o SpriteEditor
// Este componente fornece ferramentas de edição pixel-a-pixel com funcionalidades completas
// Seguindo as especificações da Fase 2 do Universal Asset Studio

import React, { useCallback, useRef, useEffect } from 'react';
import {
  Paintbrush, PaintBucket, Eraser, Pipette, Square, Circle, Move, 
  Scissors, Copy, RotateCw, FlipHorizontal, FlipVertical, Minus, Plus
} from 'lucide-react';

// Tipos para as ferramentas de desenho
export interface DrawingTool {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  cursor: string;
  description: string;
}

export interface DrawingState {
  tool: string;
  color: string;
  brushSize: number;
  opacity: number;
  isDrawing: boolean;
  startPos: { x: number; y: number } | null;
  selection: {
    active: boolean;
    start: { x: number; y: number } | null;
    end: { x: number; y: number } | null;
  };
}

export interface DrawingToolsProps {
  imageData: ImageData | null;
  onImageDataChange: (newImageData: ImageData) => void;
  onToolChange: (tool: string) => void;
  onColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  scale: number;
  selectedTool: string;
  selectedColor: string;
  brushSize: number;
}

// Ferramentas de desenho disponíveis
export const DRAWING_TOOLS: DrawingTool[] = [
  { 
    id: 'brush', 
    name: 'Pincel', 
    icon: Paintbrush, 
    cursor: 'crosshair',
    description: 'Desenha pixels com a cor selecionada'
  },
  { 
    id: 'bucket', 
    name: 'Balde', 
    icon: PaintBucket, 
    cursor: 'crosshair',
    description: 'Preenche área com a cor selecionada'
  },
  { 
    id: 'eraser', 
    name: 'Borracha', 
    icon: Eraser, 
    cursor: 'crosshair',
    description: 'Apaga pixels (define como transparente)'
  },
  { 
    id: 'eyedropper', 
    name: 'Conta-gotas', 
    icon: Pipette, 
    cursor: 'crosshair',
    description: 'Seleciona cor do pixel clicado'
  },
  { 
    id: 'select', 
    name: 'Seleção Retangular', 
    icon: Square, 
    cursor: 'crosshair',
    description: 'Seleciona área retangular para edição'
  },
  { 
    id: 'circle_select', 
    name: 'Seleção Circular', 
    icon: Circle, 
    cursor: 'crosshair',
    description: 'Seleciona área circular para edição'
  },
  { 
    id: 'move', 
    name: 'Mover', 
    icon: Move, 
    cursor: 'move',
    description: 'Move a seleção atual'
  },
  { 
    id: 'line', 
    name: 'Linha', 
    icon: Minus, 
    cursor: 'crosshair',
    description: 'Desenha linha reta entre dois pontos'
  }
];

// Utilitários para manipulação de ImageData
export class ImageDataUtils {
  // Converte coordenadas do canvas para coordenadas da imagem
  static canvasToImageCoords(canvasX: number, canvasY: number, scale: number): { x: number; y: number } {
    return {
      x: Math.floor(canvasX / scale),
      y: Math.floor(canvasY / scale)
    };
  }

  // Obtém cor de um pixel específico
  static getPixelColor(imageData: ImageData, x: number, y: number): string {
    if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) {
      return '#000000';
    }
    
    const index = (y * imageData.width + x) * 4;
    const r = imageData.data[index];
    const g = imageData.data[index + 1];
    const b = imageData.data[index + 2];
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  // Define cor de um pixel específico
  static setPixelColor(imageData: ImageData, x: number, y: number, color: string, opacity: number = 1): void {
    if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) {
      return;
    }
    
    const index = (y * imageData.width + x) * 4;
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    if (opacity >= 1) {
      imageData.data[index] = r;
      imageData.data[index + 1] = g;
      imageData.data[index + 2] = b;
      imageData.data[index + 3] = 255;
    } else {
      // Blending com alpha
      const alpha = opacity;
      const invAlpha = 1 - alpha;
      
      imageData.data[index] = Math.round(r * alpha + imageData.data[index] * invAlpha);
      imageData.data[index + 1] = Math.round(g * alpha + imageData.data[index + 1] * invAlpha);
      imageData.data[index + 2] = Math.round(b * alpha + imageData.data[index + 2] * invAlpha);
    }
  }

  // Desenha pincel circular
  static drawBrush(imageData: ImageData, x: number, y: number, color: string, size: number, opacity: number = 1): void {
    const radius = Math.floor(size / 2);
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= radius) {
          const pixelOpacity = size === 1 ? opacity : opacity * (1 - distance / radius);
          this.setPixelColor(imageData, x + dx, y + dy, color, pixelOpacity);
        }
      }
    }
  }

  // Implementa flood fill (balde de tinta)
  static floodFill(imageData: ImageData, startX: number, startY: number, newColor: string): void {
    const width = imageData.width;
    const height = imageData.height;
    const data = new Uint8ClampedArray(imageData.data);
    
    const getPixelIndex = (x: number, y: number) => (y * width + x) * 4;
    
    const startIndex = getPixelIndex(startX, startY);
    const startR = data[startIndex];
    const startG = data[startIndex + 1];
    const startB = data[startIndex + 2];
    
    const newR = parseInt(newColor.slice(1, 3), 16);
    const newG = parseInt(newColor.slice(3, 5), 16);
    const newB = parseInt(newColor.slice(5, 7), 16);
    
    // Se a cor já é a mesma, não faz nada
    if (startR === newR && startG === newG && startB === newB) {
      return;
    }
    
    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();
    
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;
      
      if (visited.has(key) || x < 0 || x >= width || y < 0 || y >= height) {
        continue;
      }
      
      const index = getPixelIndex(x, y);
      
      if (data[index] !== startR || data[index + 1] !== startG || data[index + 2] !== startB) {
        continue;
      }
      
      visited.add(key);
      
      data[index] = newR;
      data[index + 1] = newG;
      data[index + 2] = newB;
      
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    
    // Atualiza o ImageData original
    for (let i = 0; i < data.length; i++) {
      imageData.data[i] = data[i];
    }
  }

  // Desenha linha usando algoritmo de Bresenham
  static drawLine(imageData: ImageData, x0: number, y0: number, x1: number, y1: number, color: string, brushSize: number): void {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    let x = x0;
    let y = y0;
    
    while (true) {
      this.drawBrush(imageData, x, y, color, brushSize);
      
      if (x === x1 && y === y1) break;
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  // Apaga pixel (define como transparente)
  static erasePixel(imageData: ImageData, x: number, y: number, size: number): void {
    const radius = Math.floor(size / 2);
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= radius) {
          const px = x + dx;
          const py = y + dy;
          
          if (px >= 0 && px < imageData.width && py >= 0 && py < imageData.height) {
            const index = (py * imageData.width + px) * 4;
            imageData.data[index + 3] = 0; // Define alpha como 0 (transparente)
          }
        }
      }
    }
  }

  // Cria cópia do ImageData
  static cloneImageData(imageData: ImageData): ImageData {
    return new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
  }

  // Verifica se um ponto está dentro de uma seleção retangular
  static isPointInRectSelection(x: number, y: number, selection: { start: { x: number; y: number }; end: { x: number; y: number } }): boolean {
    const minX = Math.min(selection.start.x, selection.end.x);
    const maxX = Math.max(selection.start.x, selection.end.x);
    const minY = Math.min(selection.start.y, selection.end.y);
    const maxY = Math.max(selection.start.y, selection.end.y);
    
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  }

  // Verifica se um ponto está dentro de uma seleção circular
  static isPointInCircleSelection(x: number, y: number, selection: { start: { x: number; y: number }; end: { x: number; y: number } }): boolean {
    const centerX = selection.start.x;
    const centerY = selection.start.y;
    const radius = Math.sqrt(
      Math.pow(selection.end.x - selection.start.x, 2) + 
      Math.pow(selection.end.y - selection.start.y, 2)
    );
    
    const distance = Math.sqrt(
      Math.pow(x - centerX, 2) + 
      Math.pow(y - centerY, 2)
    );
    
    return distance <= radius;
  }
}

// Componente React para renderizar as ferramentas de desenho
export const DrawingTools: React.FC<{
  drawingState: any;
  className?: string;
}> = ({ drawingState, className = '' }) => {
  return (
    <div className={`grid grid-cols-4 gap-2 ${className}`}>
      {DRAWING_TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isSelected = drawingState.tool === tool.id;
        
        return (
          <button
            key={tool.id}
            onClick={() => drawingState.setTool(tool.id)}
            className={`p-2 rounded-lg border transition-colors ${
              isSelected
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white'
            }`}
            title={tool.description}
          >
            <Icon className="w-4 h-4 mx-auto" />
          </button>
        );
      })}
    </div>
  );
};

// Hook personalizado para gerenciar estado de desenho
export const useDrawingState = (initialImageData: ImageData | null) => {
  const [drawingState, setDrawingState] = React.useState<DrawingState>({
    tool: 'brush',
    color: '#FF0000',
    brushSize: 1,
    opacity: 1,
    isDrawing: false,
    startPos: null,
    selection: {
      active: false,
      start: null,
      end: null
    }
  });

  const [imageData, setImageData] = React.useState<ImageData | null>(initialImageData);
  const [previewImageData, setPreviewImageData] = React.useState<ImageData | null>(null);

  // Atualiza imageData quando initialImageData muda
  React.useEffect(() => {
    if (initialImageData) {
      setImageData(ImageDataUtils.cloneImageData(initialImageData));
    }
  }, [initialImageData]);

  const updateTool = useCallback((tool: string) => {
    setDrawingState(prev => ({ ...prev, tool }));
  }, []);

  const updateColor = useCallback((color: string) => {
    setDrawingState(prev => ({ ...prev, color }));
  }, []);

  const updateBrushSize = useCallback((brushSize: number) => {
    setDrawingState(prev => ({ ...prev, brushSize }));
  }, []);

  const updateOpacity = useCallback((opacity: number) => {
    setDrawingState(prev => ({ ...prev, opacity }));
  }, []);

  const startDrawing = useCallback((x: number, y: number) => {
    setDrawingState(prev => ({ 
      ...prev, 
      isDrawing: true, 
      startPos: { x, y }
    }));
  }, []);

  const stopDrawing = useCallback(() => {
    setDrawingState(prev => ({ 
      ...prev, 
      isDrawing: false, 
      startPos: null
    }));
    
    // Aplica preview ao imageData principal se existir
    if (previewImageData) {
      setImageData(ImageDataUtils.cloneImageData(previewImageData));
      setPreviewImageData(null);
    }
  }, [previewImageData]);

  const updateSelection = useCallback((start: { x: number; y: number } | null, end: { x: number; y: number } | null) => {
    setDrawingState(prev => ({
      ...prev,
      selection: {
        active: start !== null && end !== null,
        start,
        end
      }
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setDrawingState(prev => ({
      ...prev,
      selection: {
        active: false,
        start: null,
        end: null
      }
    }));
  }, []);

  return {
    drawingState,
    imageData,
    previewImageData,
    setImageData,
    setPreviewImageData,
    updateTool,
    updateColor,
    updateBrushSize,
    updateOpacity,
    startDrawing,
    stopDrawing,
    updateSelection,
    clearSelection
  };
};

export default {
  DRAWING_TOOLS,
  ImageDataUtils,
  useDrawingState
};