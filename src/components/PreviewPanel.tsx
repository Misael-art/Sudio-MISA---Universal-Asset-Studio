// Implementando a Fase 2: Componente de preview em tempo real para o SpriteEditor
// Este componente mostra uma visualização em tempo real das edições sendo feitas
// Seguindo as especificações da Fase 2 do Universal Asset Studio

import React, { useRef, useEffect, useState } from 'react';
import { Eye, EyeOff, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

interface PreviewPanelProps {
  imageData: ImageData | null;
  originalImageData: ImageData | null;
  scale?: number;
  showComparison?: boolean;
  className?: string;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  imageData,
  originalImageData,
  scale = 2,
  showComparison = false,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const [previewScale, setPreviewScale] = useState(scale);
  const [showOriginal, setShowOriginal] = useState(false);
  const [animationFrame, setAnimationFrame] = useState<number | null>(null);

  // Renderiza o ImageData no canvas de preview
  const renderPreview = (canvas: HTMLCanvasElement, data: ImageData, currentScale: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || !data) return;

    canvas.width = data.width * currentScale;
    canvas.height = data.height * currentScale;

    ctx.imageSmoothingEnabled = false;

    // Cria canvas temporário para o ImageData
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCanvas.width = data.width;
    tempCanvas.height = data.height;
    tempCtx.putImageData(data, 0, 0);

    // Desenha escalado no canvas de preview
    ctx.drawImage(
      tempCanvas,
      0, 0, data.width, data.height,
      0, 0, canvas.width, canvas.height
    );
  };

  // Efeito para renderizar o preview principal
  useEffect(() => {
    if (imageData && canvasRef.current) {
      // Cancela frame anterior se existir
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }

      // Agenda nova renderização
      const frame = requestAnimationFrame(() => {
        renderPreview(canvasRef.current!, imageData, previewScale);
      });
      
      setAnimationFrame(frame);
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [imageData, previewScale]);

  // Efeito para renderizar o preview original (comparação)
  useEffect(() => {
    if (originalImageData && originalCanvasRef.current && showComparison) {
      renderPreview(originalCanvasRef.current, originalImageData, previewScale);
    }
  }, [originalImageData, previewScale, showComparison]);

  // Função para alternar entre original e editado
  const toggleOriginal = () => {
    setShowOriginal(!showOriginal);
  };

  // Função para resetar o zoom
  const resetZoom = () => {
    setPreviewScale(scale);
  };

  if (!imageData) {
    return (
      <div className={`bg-gray-900 border border-gray-700 rounded-lg p-4 ${className}`}>
        <div className="text-center text-gray-400">
          <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Preview aparecerá aqui</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg ${className}`}>
      {/* Cabeçalho do preview */}
      <div className="border-b border-gray-700 p-3">
        <div className="flex items-center justify-between">
          <h4 className="text-white font-semibold text-sm">Preview em Tempo Real</h4>
          <div className="flex items-center space-x-1">
            {/* Controles de zoom */}
            <button
              onClick={() => setPreviewScale(Math.max(1, previewScale - 1))}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title="Diminuir zoom"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-xs text-gray-300 font-mono w-8 text-center">
              {previewScale}x
            </span>
            <button
              onClick={() => setPreviewScale(Math.min(8, previewScale + 1))}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title="Aumentar zoom"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            
            {/* Reset zoom */}
            <button
              onClick={resetZoom}
              className="p-1 text-gray-400 hover:text-white transition-colors ml-1"
              title="Resetar zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            
            {/* Toggle original/editado */}
            {originalImageData && showComparison && (
              <button
                onClick={toggleOriginal}
                className={`p-1 transition-colors ml-1 ${
                  showOriginal ? 'text-blue-400' : 'text-gray-400 hover:text-white'
                }`}
                title={showOriginal ? 'Mostrar editado' : 'Mostrar original'}
              >
                {showOriginal ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>
        
        {/* Informações do sprite */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
          <span>
            {imageData.width}×{imageData.height}px
          </span>
          <span>
            {showOriginal ? 'Original' : 'Editado'}
          </span>
        </div>
      </div>

      {/* Área do canvas */}
      <div className="p-4">
        <div className="bg-gray-800 rounded-lg p-3 overflow-auto max-h-64">
          {/* Padrão de transparência */}
          <div 
            className="inline-block relative"
            style={{
              backgroundImage: `
                linear-gradient(45deg, #666 25%, transparent 25%), 
                linear-gradient(-45deg, #666 25%, transparent 25%), 
                linear-gradient(45deg, transparent 75%, #666 75%), 
                linear-gradient(-45deg, transparent 75%, #666 75%)
              `,
              backgroundSize: '8px 8px',
              backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
            }}
          >
            {/* Canvas principal (editado) */}
            <canvas
              ref={canvasRef}
              className={`border border-gray-600 rounded transition-opacity ${
                showOriginal && showComparison ? 'opacity-0' : 'opacity-100'
              }`}
              style={{ 
                imageRendering: 'pixelated',
                position: showComparison ? 'absolute' : 'static',
                top: 0,
                left: 0
              }}
            />
            
            {/* Canvas original (comparação) */}
            {showComparison && (
              <canvas
                ref={originalCanvasRef}
                className={`border border-gray-600 rounded transition-opacity ${
                  showOriginal ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ 
                  imageRendering: 'pixelated',
                  position: 'absolute',
                  top: 0,
                  left: 0
                }}
              />
            )}
          </div>
        </div>
        
        {/* Indicadores de mudança */}
        {showComparison && originalImageData && (
          <div className="mt-3 flex items-center justify-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-400">Editado</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gray-500 rounded"></div>
              <span className="text-gray-400">Original</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Estatísticas de edição */}
      <div className="border-t border-gray-700 p-3">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-gray-400">Dimensões:</span>
            <div className="text-white font-mono">
              {imageData.width}×{imageData.height}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Pixels:</span>
            <div className="text-white font-mono">
              {imageData.width * imageData.height}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;