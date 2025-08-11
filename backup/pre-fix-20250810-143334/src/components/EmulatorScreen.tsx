import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Square } from 'lucide-react';

/**
 * Implementando Fase 1 do plano estratégico "Ver para Crer"
 * EmulatorScreen.tsx - Canvas de Emulação que serve como "tela da TV" do Mega Drive virtual
 * 
 * Funcionalidades:
 * - Canvas para renderização do framebuffer em tempo real
 * - requestAnimationFrame loop para animação suave
 * - Controles de emulação (Play/Pause/Stop)
 * - Comunicação com worker para receber dados do framebuffer
 */

interface EmulatorScreenProps {
  worker?: Worker | null;
  isEmulationActive?: boolean;
  onEmulationStateChange?: (isActive: boolean) => void;
  emulatorMountRef?: (el: HTMLDivElement | null) => void;
}

interface FrameData {
  framebuffer: Uint8Array | ImageData;
  width: number;
  height: number;
  timestamp: number;
}

export const EmulatorScreen: React.FC<EmulatorScreenProps> = ({
  worker,
  isEmulationActive = false,
  onEmulationStateChange,
  emulatorMountRef,
}) => {
  // Referencias para canvas e contexto
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const ejsContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Estados do componente
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [frameCount, setFrameCount] = useState<number>(0);
  const [fps, setFps] = useState<number>(0);
  const [lastFrameTime, setLastFrameTime] = useState<number>(0);
  const [currentFrame, setCurrentFrame] = useState<FrameData | null>(null);
  
  // Dimensões padrão do Mega Drive (320x224)
  const CANVAS_WIDTH = 320;
  const CANVAS_HEIGHT = 224;
  const SCALE_FACTOR = 2; // Escala 2x para melhor visualização

  /**
   * Inicializa o canvas e contexto de renderização
   */
  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Configurar dimensões do canvas
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvas.style.width = `${CANVAS_WIDTH * SCALE_FACTOR}px`;
    canvas.style.height = `${CANVAS_HEIGHT * SCALE_FACTOR}px`;
    
    // Obter contexto 2D
    const context = canvas.getContext('2d');
    if (!context) {
      console.error('[EmulatorScreen] Falha ao obter contexto 2D do canvas');
      return;
    }
    
    // Configurar contexto para pixel art (sem suavização)
    context.imageSmoothingEnabled = false;
    contextRef.current = context;
    
    // Limpar canvas com cor preta
    context.fillStyle = '#000000';
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    console.log('[EmulatorScreen] Canvas inicializado:', CANVAS_WIDTH, 'x', CANVAS_HEIGHT);
  }, []);

  /**
   * FASE 1: Renderiza frame no canvas usando requestAnimationFrame
   */
  const renderFrame = useCallback(() => {
    if (!canvasRef.current || !currentFrame) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    try {
      // Verificar se framebuffer é ImageData ou Uint8ClampedArray
      let imageData: ImageData;
      
      if (currentFrame.framebuffer instanceof ImageData) {
        imageData = currentFrame.framebuffer;
      } else {
        // Criar ImageData a partir do Uint8ClampedArray
        imageData = new ImageData(
          new Uint8ClampedArray(currentFrame.framebuffer),
          currentFrame.width,
          currentFrame.height
        );
      }
      
      // Limpar canvas antes de renderizar
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Renderizar frame no canvas
      ctx.putImageData(imageData, 0, 0);
      
      // Log apenas a cada 60 frames para evitar spam
      if (frameCount % 60 === 0) {
        console.log(`[EmulatorScreen] Frame ${frameCount} renderizado: ${currentFrame.width}x${currentFrame.height}`);
      }
      
      setFrameCount(prev => prev + 1);
      
      // Calcular FPS
      const now = performance.now();
      if (lastFrameTime > 0) {
        const deltaTime = now - lastFrameTime;
        const currentFps = 1000 / deltaTime;
        setFps(Math.round(currentFps));
      }
      setLastFrameTime(now);
      
    } catch (error) {
      console.error('[EmulatorScreen] Erro ao renderizar frame:', error);
    }
  }, [currentFrame, frameCount, lastFrameTime]);

  /**
   * FASE 1: requestAnimationFrame loop para renderização suave
   */
  useEffect(() => {
    let animationId: number;
    
    const animate = () => {
      if (currentFrame && isPlaying) {
        renderFrame();
      }
      
      animationId = requestAnimationFrame(animate);
    };
    
    if (isPlaying) {
      animationId = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [currentFrame, isPlaying, renderFrame]);

  /**
   * Manipulador de mensagens do worker
   * Recebe dados do framebuffer via postMessage do worker
   */
  const handleWorkerMessage = useCallback((event: MessageEvent) => {
    const { type, payload } = event.data;
    
    // Processar mensagem FRAME_RENDERED conforme especificado na Fase 1
    if (type === 'FRAME_RENDERED' && payload?.framebuffer) {
      const frameData: FrameData = {
        framebuffer: payload.framebuffer,
        width: payload.width || CANVAS_WIDTH,
        height: payload.height || CANVAS_HEIGHT,
        timestamp: performance.now()
      };
      
      setCurrentFrame(frameData);
      console.log('[EmulatorScreen] Frame recebido do worker:', frameData.width, 'x', frameData.height);
    }
  }, []);

  /**
   * Controles de emulação
   */
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    onEmulationStateChange?.(true);
    
    // Enviar comando para worker iniciar emulação
    if (worker) {
      worker.postMessage({ type: 'START_EMULATION' });
    }
    
    console.log('[EmulatorScreen] Emulação iniciada');
  }, [worker, onEmulationStateChange]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    onEmulationStateChange?.(false);
    
    // Parar loop de animação
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Enviar comando para worker pausar emulação
    if (worker) {
      worker.postMessage({ type: 'PAUSE_EMULATION' });
    }
    
    console.log('[EmulatorScreen] Emulação pausada');
  }, [worker, onEmulationStateChange]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setFrameCount(0);
    setFps(0);
    setCurrentFrame(null);
    onEmulationStateChange?.(false);
    
    // Parar loop de animação
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Limpar canvas
    const context = contextRef.current;
    if (context) {
      context.fillStyle = '#000000';
      context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    
    // Enviar comando para worker parar emulação
    if (worker) {
      worker.postMessage({ type: 'STOP_EMULATION' });
    }
    
    console.log('[EmulatorScreen] Emulação parada');
  }, [worker, onEmulationStateChange]);

  /**
   * Efeito para inicializar canvas
   */
  useEffect(() => {
    initializeCanvas();
  }, [initializeCanvas]);

  /**
   * Efeito para configurar listener do worker
   * FASE 1: Comunicação com o worker para receber framebuffer
   */
  useEffect(() => {
    if (!worker) return;

    const handleWorkerMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      
      switch (type) {
        case 'FRAME_RENDERED':
          // FASE 1: Renderizar framebuffer recebido do worker
          if (payload?.framebuffer) {
            const frameData: FrameData = {
              framebuffer: payload.framebuffer,
              width: payload.width || CANVAS_WIDTH,
              height: payload.height || CANVAS_HEIGHT,
              timestamp: performance.now()
            };
            
            setCurrentFrame(frameData);
            
            // Atualizar FPS
            const now = performance.now();
            if (lastFrameTime) {
              const deltaTime = now - lastFrameTime;
              const currentFps = 1000 / deltaTime;
              setFps(Math.round(currentFps));
            }
            setLastFrameTime(now);
            
            console.log(`[EmulatorScreen] Frame ${payload.timestamp} renderizado (${payload.width}x${payload.height})`);
          }
          break;
          
        case 'EMULATION_STARTED':
          setIsPlaying(true);
          console.log('[EmulatorScreen] Emulação iniciada');
          break;
          
        case 'EMULATION_PAUSED':
          setIsPlaying(false);
          console.log('[EmulatorScreen] Emulação pausada');
          break;
          
        case 'EMULATION_STOPPED':
          setIsPlaying(false);
          setFps(0);
          setCurrentFrame(null);
          console.log('[EmulatorScreen] Emulação parada');
          break;
          
        case 'ROM_LOADED':
          console.log('[EmulatorScreen] ROM carregada no emulador');
          break;
          
        case 'ERROR':
          console.error('[EmulatorScreen] Erro do worker:', payload.message);
          break;
          
        default:
          console.log('[EmulatorScreen] Mensagem do worker:', type, payload);
      }
    };
    
    worker.addEventListener('message', handleWorkerMessage);
    
    return () => {
      worker.removeEventListener('message', handleWorkerMessage);
    };
  }, [worker, lastFrameTime]);



  return (
    <div className="emulator-screen bg-gray-900 p-6 rounded-lg">
      {/* Cabeçalho com título e informações */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white mb-2">
          🎮 Tela do Mega Drive Virtual
        </h2>
        <div className="flex gap-4 text-sm text-gray-300">
          <span>Frames: {frameCount}</span>
          <span>FPS: {fps}</span>
          <span>Status: {isPlaying ? '▶️ Rodando' : '⏸️ Pausado'}</span>
        </div>
      </div>

      {/* Canvas principal - "Tela da TV" */}
      <div className="canvas-container bg-black p-4 rounded border-2 border-gray-700 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <canvas
          ref={canvasRef}
          className="border border-gray-600 mx-auto block"
          style={{
             imageRendering: 'crisp-edges' as any,
             WebkitImageRendering: '-webkit-crisp-edges',
             MozImageRendering: '-moz-crisp-edges'
            } as React.CSSProperties}
        />
        <div>
          <div className="text-gray-300 text-sm mb-2">EmulatorJS</div>
          <div
            ref={(el) => {
              ejsContainerRef.current = el;
              if (emulatorMountRef) emulatorMountRef(el);
            }}
            id="EJS_player"
            className="w-[640px] h-[480px] bg-black border border-gray-700"
          />
        </div>
        
        {/* Overlay de informações quando não está rodando */}
        {!isPlaying && (
          <div className="text-center text-gray-400 mt-2 text-sm">
            {currentFrame ? 'Emulação pausada' : 'Aguardando ROM...'}
          </div>
        )}
      </div>

      {/* Controles de emulação */}
      <div className="controls flex gap-2 justify-center">
        <button
          onClick={handlePlay}
          disabled={isPlaying}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
        >
          <Play size={16} />
          Play
        </button>
        
        <button
          onClick={handlePause}
          disabled={!isPlaying}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
        >
          <Pause size={16} />
          Pause
        </button>
        
        <button
          onClick={handleStop}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
        >
          <Square size={16} />
          Stop
        </button>
      </div>
      
      {/* Informações técnicas */}
      <div className="mt-4 text-xs text-gray-400 text-center">
        Resolução: {CANVAS_WIDTH}x{CANVAS_HEIGHT} • Escala: {SCALE_FACTOR}x • Pixel Perfect
      </div>
    </div>
  );
};

export default EmulatorScreen;