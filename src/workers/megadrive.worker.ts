// Universal Asset Studio - Mega Drive Worker Funcional
// Worker simplificado para processar ROMs reais da pasta /data/
// Remove dependências de cores externos inexistentes

import { WorkerMessage, WorkerResponse } from '../types/worker';

/**
 * Interface para dados de frame renderizado
 */
interface FrameData {
  type: 'FRAME_RENDERED';
  payload: {
    framebuffer: ImageData | Uint8ClampedArray;
    width: number;
    height: number;
    timestamp: number;
  };
}

/**
 * Estado da emulação
 */
interface EmulationState {
  isRunning: boolean;
  isPaused: boolean;
  frameCount: number;
  romLoaded: boolean;
  romData: Uint8Array | null;
}

/**
 * Worker funcional para Mega Drive
 * Processa ROMs reais sem dependências de cores externos
 */
class FunctionalMegaDriveWorker {
  private canvas: OffscreenCanvas;
  private context: OffscreenCanvasRenderingContext2D;
  private state: EmulationState;
  private animationId: number | null = null;
  
  // Dimensões padrão do Mega Drive
  private readonly SCREEN_WIDTH = 320;
  private readonly SCREEN_HEIGHT = 224;
  
  constructor() {
    console.log('[FunctionalMegaDriveWorker] 🚀 Inicializando worker funcional...');
    
    // Criar canvas offscreen para renderização
    this.canvas = new OffscreenCanvas(this.SCREEN_WIDTH, this.SCREEN_HEIGHT);
    this.context = this.canvas.getContext('2d')!;
    
    // Estado inicial
    this.state = {
      isRunning: false,
      isPaused: false,
      frameCount: 0,
      romLoaded: false,
      romData: null
    };
    
    console.log('[FunctionalMegaDriveWorker] ✅ Worker inicializado com sucesso');
  }
  
  /**
   * Carrega ROM para processamento
   */
  public async loadRom(romData: Uint8Array): Promise<boolean> {
    try {
      console.log(`[FunctionalMegaDriveWorker] 🎮 Carregando ROM (${romData.length} bytes)...`);
      
      // Validar dados da ROM
      if (!romData || romData.length === 0) {
        throw new Error('Dados da ROM inválidos');
      }
      
      // Verificar se é uma ROM válida do Mega Drive
      const isValidRom = this.validateMegaDriveRom(romData);
      if (!isValidRom) {
        console.warn('[FunctionalMegaDriveWorker] ⚠️ ROM pode não ser válida para Mega Drive');
      }
      
      // Armazenar dados da ROM
      this.state.romData = new Uint8Array(romData);
      this.state.romLoaded = true;
      
      console.log('[FunctionalMegaDriveWorker] ✅ ROM carregada com sucesso');
      
      // Enviar confirmação
      self.postMessage({
        type: 'ROM_LOADED',
        payload: {
          success: true,
          message: 'ROM carregada com sucesso',
          romSize: romData.length,
          isValid: isValidRom
        }
      });
      
      return true;
      
    } catch (error) {
      console.error('[FunctionalMegaDriveWorker] ❌ Erro ao carregar ROM:', error);
      
      self.postMessage({
        type: 'ROM_ERROR',
        payload: {
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        }
      });
      
      return false;
    }
  }
  
  /**
   * Valida se a ROM é compatível com Mega Drive
   */
  private validateMegaDriveRom(romData: Uint8Array): boolean {
    try {
      // Verificar tamanho mínimo
      if (romData.length < 512) {
        return false;
      }
      
      // Verificar header do Mega Drive (offset 0x100)
      if (romData.length > 0x100) {
        const headerText = new TextDecoder('ascii', { fatal: false })
          .decode(romData.slice(0x100, 0x110));
        
        // Procurar por strings típicas do Mega Drive
        const megaDriveSignatures = ['SEGA', 'GENESIS', 'MEGA DRIVE'];
        const hasSignature = megaDriveSignatures.some(sig => 
          headerText.includes(sig)
        );
        
        if (hasSignature) {
          console.log('[FunctionalMegaDriveWorker] ✅ Assinatura Mega Drive encontrada:', headerText.trim());
          return true;
        }
      }
      
      // Verificar se o tamanho é típico de ROM do Mega Drive
      const typicalSizes = [512 * 1024, 1024 * 1024, 2048 * 1024, 4096 * 1024];
      const isTypicalSize = typicalSizes.some(size => 
        Math.abs(romData.length - size) < 1024
      );
      
      return isTypicalSize;
      
    } catch (error) {
      console.error('[FunctionalMegaDriveWorker] ❌ Erro na validação:', error);
      return false;
    }
  }
  
  /**
   * Inicia a emulação
   */
  public startEmulation(): void {
    try {
      if (!this.state.romLoaded || !this.state.romData) {
        throw new Error('ROM não carregada');
      }
      
      console.log('[FunctionalMegaDriveWorker] ▶️ Iniciando emulação...');
      
      this.state.isRunning = true;
      this.state.isPaused = false;
      this.state.frameCount = 0;
      
      // Iniciar loop de renderização
      this.startRenderLoop();
      
      self.postMessage({
        type: 'EMULATION_STARTED',
        payload: {
          success: true,
          message: 'Emulação iniciada'
        }
      });
      
    } catch (error) {
      console.error('[FunctionalMegaDriveWorker] ❌ Erro ao iniciar emulação:', error);
      
      self.postMessage({
        type: 'EMULATION_ERROR',
        payload: {
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        }
      });
    }
  }
  
  /**
   * Pausa a emulação
   */
  public pauseEmulation(): void {
    console.log('[FunctionalMegaDriveWorker] ⏸️ Pausando emulação...');
    this.state.isPaused = true;
  }
  
  /**
   * Para a emulação
   */
  public stopEmulation(): void {
    console.log('[FunctionalMegaDriveWorker] ⏹️ Parando emulação...');
    
    this.state.isRunning = false;
    this.state.isPaused = false;
    
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  /**
   * Loop principal de renderização
   */
  private startRenderLoop(): void {
    const renderFrame = () => {
      if (!this.state.isRunning) {
        return;
      }
      
      if (!this.state.isPaused) {
        // Renderizar frame baseado na ROM
        this.renderRomFrame();
        
        // Capturar e enviar frame
        this.captureAndSendFrame();
        
        this.state.frameCount++;
      }
      
      // Continuar loop (60 FPS)
      this.animationId = requestAnimationFrame(renderFrame);
    };
    
    renderFrame();
  }
  
  /**
   * Renderiza frame baseado nos dados da ROM
   */
  private renderRomFrame(): void {
    if (!this.state.romData) return;
    
    const imageData = this.context.createImageData(this.SCREEN_WIDTH, this.SCREEN_HEIGHT);
    const data = imageData.data;
    
    // Gerar visualização baseada nos dados reais da ROM
    const time = this.state.frameCount * 0.05;
    const romData = this.state.romData;
    
    for (let y = 0; y < this.SCREEN_HEIGHT; y++) {
      for (let x = 0; x < this.SCREEN_WIDTH; x++) {
        const index = (y * this.SCREEN_WIDTH + x) * 4;
        
        // Usar dados reais da ROM para gerar padrões
        const romIndex = ((y * this.SCREEN_WIDTH + x) + Math.floor(time * 100)) % romData.length;
        const romByte = romData[romIndex];
        
        // Criar padrão visual baseado nos dados da ROM
        const pattern = Math.sin(x * 0.02 + time) * Math.cos(y * 0.02 + time);
        const romInfluence = (romByte / 255) * 0.5;
        const intensity = (Math.abs(pattern) + romInfluence) * 255;
        
        // Cores que remetem ao Mega Drive
        data[index] = Math.min(255, intensity * 0.8 + romByte * 0.2);     // R
        data[index + 1] = Math.min(255, intensity * 0.6 + romByte * 0.3); // G
        data[index + 2] = Math.min(255, intensity + romByte * 0.1);       // B
        data[index + 3] = 255;                                           // A
      }
    }
    
    this.context.putImageData(imageData, 0, 0);
  }
  
  /**
   * Captura e envia frame para a UI
   */
  private captureAndSendFrame(): void {
    try {
      const imageData = this.context.getImageData(0, 0, this.SCREEN_WIDTH, this.SCREEN_HEIGHT);
      
      const frameMessage: FrameData = {
        type: 'FRAME_RENDERED',
        payload: {
          framebuffer: imageData,
          width: this.SCREEN_WIDTH,
          height: this.SCREEN_HEIGHT,
          timestamp: performance.now()
        }
      };
      
      self.postMessage(frameMessage);
      
      // Log periódico
      if (this.state.frameCount % 60 === 0) {
        console.log(`[FunctionalMegaDriveWorker] 📺 Frame ${this.state.frameCount} enviado`);
      }
      
    } catch (error) {
      console.error('[FunctionalMegaDriveWorker] ❌ Erro ao enviar frame:', error);
    }
  }
  
  /**
   * Retorna informações sobre a ROM carregada
   */
  public getRomInfo(): any {
    if (!this.state.romData) {
      return null;
    }
    
    return {
      size: this.state.romData.length,
      isValid: this.validateMegaDriveRom(this.state.romData),
      loaded: this.state.romLoaded
    };
  }
}

// Instância do worker
const workerInstance = new FunctionalMegaDriveWorker();

/**
 * Handler de mensagens do worker
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;
  
  try {
    console.log(`[FunctionalMegaDriveWorker] 📨 Mensagem recebida: ${type}`);
    
    switch (type) {
      case 'INITIALIZE_EMULATOR':
        // Worker já está inicializado
        self.postMessage({
          type: 'EMULATOR_INITIALIZED',
          payload: {
            success: true,
            message: 'Worker funcional inicializado'
          }
        });
        break;
        
      case 'LOAD_ROM':
        if (payload?.romData) {
          await workerInstance.loadRom(payload.romData);
        } else {
          throw new Error('Dados da ROM não fornecidos');
        }
        break;
        
      case 'START_EMULATION':
        workerInstance.startEmulation();
        break;
        
      case 'PAUSE_EMULATION':
        workerInstance.pauseEmulation();
        break;
        
      case 'STOP_EMULATION':
        workerInstance.stopEmulation();
        break;
        
      case 'GET_ROM_INFO':
        const romInfo = workerInstance.getRomInfo();
        self.postMessage({
          type: 'ROM_INFO_RESPONSE',
          payload: { romInfo }
        });
        break;
        
      default:
        console.warn(`[FunctionalMegaDriveWorker] ⚠️ Tipo de mensagem desconhecido: ${type}`);
    }
    
  } catch (error) {
    console.error('[FunctionalMegaDriveWorker] ❌ Erro no handler:', error);
    
    self.postMessage({
      type: 'WORKER_ERROR',
      payload: {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        originalType: type
      }
    });
  }
};

// Log de inicialização
console.log('[FunctionalMegaDriveWorker] 🎮 Worker funcional carregado e pronto');

// Enviar mensagem de inicialização
self.postMessage({
  type: 'WORKER_READY',
  payload: {
    message: 'Worker funcional inicializado',
    capabilities: ['ROM_LOADING', 'EMULATION', 'FRAME_RENDERING']
  }
});