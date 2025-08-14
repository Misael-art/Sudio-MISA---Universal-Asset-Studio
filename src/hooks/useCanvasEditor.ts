// Implementando a Fase 2: Hook para gerenciar edição de canvas com ferramentas avançadas
// Este hook integra as ferramentas de desenho com o canvas de edição do SpriteEditor
// Seguindo as especificações da Fase 2 do Universal Asset Studio

import { useCallback, useRef, useEffect, useState } from 'react';
import { ImageDataUtils, DrawingState } from '../components/DrawingTools';

export interface CanvasEditorState {
  isDrawing: boolean;
  lastPos: { x: number; y: number } | null;
  previewData: ImageData | null;
}

export interface CanvasEditorProps {
  imageData: ImageData | null;
  scale: number;
  drawingState: DrawingState;
  onImageDataChange: (newImageData: ImageData) => void;
  onColorPick: (color: string) => void;
  onHistorySave: (action: string) => void;
}

export const useCanvasEditor = ({
  imageData,
  scale,
  drawingState,
  onImageDataChange,
  onColorPick,
  onHistorySave
}: CanvasEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [editorState, setEditorState] = useState<CanvasEditorState>({
    isDrawing: false,
    lastPos: null,
    previewData: null
  });

  // Renderiza o ImageData no canvas
  const renderCanvas = useCallback((data: ImageData) => {
    if (!canvasRef.current || !data) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = data.width * scale;
    canvas.height = data.height * scale;
    
    ctx.imageSmoothingEnabled = false;
    
    // Cria canvas temporário para o ImageData original
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCanvas.width = data.width;
    tempCanvas.height = data.height;
    tempCtx.putImageData(data, 0, 0);
    
    // Desenha escalado no canvas principal
    ctx.drawImage(
      tempCanvas,
      0, 0, data.width, data.height,
      0, 0, canvas.width, canvas.height
    );
  }, [scale]);

  // Renderiza canvas principal
  useEffect(() => {
    if (imageData) {
      renderCanvas(editorState.previewData || imageData);
    }
  }, [imageData, editorState.previewData, renderCanvas]);

  // Converte coordenadas do mouse para coordenadas da imagem
  const getImageCoordinates = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    
    return ImageDataUtils.canvasToImageCoords(canvasX, canvasY, scale);
  }, [scale]);

  // Aplica ferramenta no ponto especificado
  const applyTool = useCallback((x: number, y: number, isPreview: boolean = false) => {
    if (!imageData) return;
    
    const workingData = isPreview 
      ? ImageDataUtils.cloneImageData(imageData)
      : ImageDataUtils.cloneImageData(editorState.previewData || imageData);
    
    switch (drawingState.tool) {
      case 'brush':
        ImageDataUtils.drawBrush(
          workingData, 
          x, 
          y, 
          drawingState.color, 
          drawingState.brushSize, 
          drawingState.opacity
        );
        break;
        
      case 'eraser':
        ImageDataUtils.erasePixel(workingData, x, y, drawingState.brushSize);
        break;
        
      case 'bucket':
        ImageDataUtils.floodFill(workingData, x, y, drawingState.color);
        break;
        
      case 'eyedropper':
        const color = ImageDataUtils.getPixelColor(workingData, x, y);
        onColorPick(color);
        return; // Não modifica a imagem
        
      default:
        return;
    }
    
    if (isPreview) {
      setEditorState(prev => ({ ...prev, previewData: workingData }));
    } else {
      onImageDataChange(workingData);
      setEditorState(prev => ({ ...prev, previewData: null }));
    }
  }, [imageData, drawingState, editorState.previewData, onImageDataChange, onColorPick]);

  // Aplica linha entre dois pontos
  const applyLine = useCallback((startX: number, startY: number, endX: number, endY: number, isPreview: boolean = false) => {
    if (!imageData) return;
    
    const workingData = isPreview 
      ? ImageDataUtils.cloneImageData(imageData)
      : ImageDataUtils.cloneImageData(editorState.previewData || imageData);
    
    ImageDataUtils.drawLine(
      workingData,
      startX,
      startY,
      endX,
      endY,
      drawingState.color,
      drawingState.brushSize
    );
    
    if (isPreview) {
      setEditorState(prev => ({ ...prev, previewData: workingData }));
    } else {
      onImageDataChange(workingData);
      setEditorState(prev => ({ ...prev, previewData: null }));
    }
  }, [imageData, drawingState, editorState.previewData, onImageDataChange]);

  // Handler para mouse down
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const { x, y } = getImageCoordinates(event);
    
    setEditorState(prev => ({
      ...prev,
      isDrawing: true,
      lastPos: { x, y }
    }));
    
    // Ferramentas que aplicam imediatamente
    if (['brush', 'eraser', 'bucket', 'eyedropper'].includes(drawingState.tool)) {
      applyTool(x, y);
      
      if (['bucket', 'eyedropper'].includes(drawingState.tool)) {
        // Salva no histórico imediatamente para ferramentas de aplicação única
        onHistorySave(drawingState.tool);
      }
    }
  }, [getImageCoordinates, drawingState.tool, applyTool, onHistorySave]);

  // Handler para mouse move
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getImageCoordinates(event);
    
    if (!editorState.isDrawing || !editorState.lastPos) {
      return;
    }
    
    switch (drawingState.tool) {
      case 'brush':
      case 'eraser':
        // Desenha linha contínua do último ponto até o atual
        applyLine(editorState.lastPos.x, editorState.lastPos.y, x, y);
        setEditorState(prev => ({ ...prev, lastPos: { x, y } }));
        break;
        
      case 'line':
        // Preview da linha
        if (editorState.lastPos) {
          applyLine(editorState.lastPos.x, editorState.lastPos.y, x, y, true);
        }
        break;
        
      case 'select':
      case 'circle_select':
        // Preview da seleção (implementar depois)
        break;
    }
  }, [getImageCoordinates, editorState.isDrawing, editorState.lastPos, drawingState.tool, applyLine]);

  // Handler para mouse up
  const handleMouseUp = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!editorState.isDrawing || !editorState.lastPos) {
      setEditorState(prev => ({ ...prev, isDrawing: false, lastPos: null }));
      return;
    }
    
    const { x, y } = getImageCoordinates(event);
    
    switch (drawingState.tool) {
      case 'line':
        // Aplica linha final
        applyLine(editorState.lastPos.x, editorState.lastPos.y, x, y);
        onHistorySave('line');
        break;
        
      case 'brush':
      case 'eraser':
        // Salva no histórico
        onHistorySave(drawingState.tool);
        break;
        
      case 'select':
      case 'circle_select':
        // Finaliza seleção (implementar depois)
        break;
    }
    
    setEditorState(prev => ({
      ...prev,
      isDrawing: false,
      lastPos: null,
      previewData: null
    }));
  }, [editorState.isDrawing, editorState.lastPos, getImageCoordinates, drawingState.tool, applyLine, onHistorySave]);

  // Handler para mouse leave
  const handleMouseLeave = useCallback(() => {
    if (editorState.isDrawing) {
      // Finaliza desenho se o mouse sair do canvas
      if (['brush', 'eraser'].includes(drawingState.tool)) {
        onHistorySave(drawingState.tool);
      }
      
      setEditorState(prev => ({
        ...prev,
        isDrawing: false,
        lastPos: null,
        previewData: null
      }));
    }
  }, [editorState.isDrawing, drawingState.tool, onHistorySave]);

  // Limpa preview
  const clearPreview = useCallback(() => {
    setEditorState(prev => ({ ...prev, previewData: null }));
  }, []);

  // Obtém cursor baseado na ferramenta
  const getCursor = useCallback(() => {
    switch (drawingState.tool) {
      case 'brush':
      case 'eraser':
      case 'bucket':
      case 'eyedropper':
      case 'line':
      case 'select':
      case 'circle_select':
        return 'crosshair';
      case 'move':
        return 'move';
      default:
        return 'default';
    }
  }, [drawingState.tool]);

  return {
    canvasRef,
    editorState,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    clearPreview,
    getCursor,
    renderCanvas
  };
};

export default useCanvasEditor;