// Universal Asset Studio - Mega Drive Worker Simplificado
// Versão de teste sem dependências do Genesis Plus GX

import { WorkerMessage, WorkerResponse, WorkerPayload } from '../types/worker';

/**
 * Interface para comunicação de frames
 */
interface FrameMessage {
  type: 'FRAME_RENDERED';
  payload: {
    framebuffer: ImageData;
    width: number;
    height: number;
    timestamp: number;
  };
}

/**
 * Worker simplificado para teste
 */
class SimpleMegaDriveWorker {
  private canvas: OffscreenCanvas;
  private context: OffscreenCanvasRenderingContext2D;
  private isRunning: boolean = false;
  private frameCount: number = 0;
  private animationId: ReturnType<typeof setTimeout> | null = null;
  
  // Dimensões do Mega Drive
  private readonly SCREEN_WIDTH = 320;
  private readonly SCREEN_HEIGHT = 224;
  
  constructor() {
    console.log('[SimpleMegaDriveWorker] 🚀 Inicializando worker simplificado...');
    
    // Canvas para renderização
    this.canvas = new OffscreenCanvas(this.SCREEN_WIDTH, this.SCREEN_HEIGHT);
    this.context = this.canvas.getContext('2d')!;
    
    console.log('[SimpleMegaDriveWorker] ✅ Canvas criado');
  }
  
  /**
   * Inicializa o worker
   */
  public async initializeEmulator(): Promise<void> {
    try {
      console.log('[SimpleMegaDriveWorker] 📦 Inicializando emulador simplificado...');
      
      // Simular inicialização
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('[SimpleMegaDriveWorker] ✅ Emulador inicializado');
      
      self.postMessage({
        type: 'EMULATOR_INITIALIZED',
        payload: { success: true, message: 'Emulador simplificado inicializado' }
      });
      
    } catch (error) {
      console.error('[SimpleMegaDriveWorker] ❌ Erro na inicialização:', error);
      
      self.postMessage({
        type: 'EMULATOR_ERROR',
        payload: { error: error.message }
      });
    }
  }
  
  /**
   * Carrega ROM
   */
  public async loadRom(romData: Uint8Array): Promise<void> {
    try {
      console.log(`[SimpleMegaDriveWorker] 🎮 Carregando ROM (${romData.length} bytes)...`);
      
      // Simular carregamento da ROM
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log('[SimpleMegaDriveWorker] ✅ ROM carregada');
      
      self.postMessage({
        type: 'ROM_LOADED',
        payload: { success: true, message: 'ROM carregada com sucesso' }
      });
      
    } catch (error) {
      console.error('[SimpleMegaDriveWorker] ❌ Erro ao carregar ROM:', error);
      
      self.postMessage({
        type: 'ROM_ERROR',
        payload: { error: error.message }
      });
    }
  }
  
  /**
   * Inicia emulação
   */
  public async startEmulation(): Promise<void> {
    try {
      console.log('[SimpleMegaDriveWorker] ▶️ Iniciando emulação...');
      
      this.isRunning = true;
      this.frameCount = 0;
      
      // Iniciar loop de renderização
      this.renderLoop();
      
      console.log('[SimpleMegaDriveWorker] ✅ Emulação iniciada');
      
    } catch (error) {
      console.error('[SimpleMegaDriveWorker] ❌ Erro ao iniciar emulação:', error);
      throw error;
    }
  }
  
  /**
   * Para emulação
   */
  public stopEmulation(): void {
    console.log('[SimpleMegaDriveWorker] ⏹️ Parando emulação...');
    this.isRunning = false;
    
    if (this.animationId !== null) {
      clearTimeout(this.animationId);
      this.animationId = null;
    }
  }
  
  /**
   * Loop de renderização
   */
  private renderLoop(): void {
    if (!this.isRunning) return;
    
    // Gerar frame de teste
    this.generateTestFrame();
    
    // Enviar frame
    this.sendFrame();
    
    this.frameCount++;
    
    // Continuar loop (60 FPS)
    this.animationId = setTimeout(() => {
      this.renderLoop();
    }, 1000 / 60);
  }
  
  /**
   * Gera frame de teste
   */
  private generateTestFrame(): void {
    const imageData = this.context.createImageData(this.SCREEN_WIDTH, this.SCREEN_HEIGHT);
    const data = imageData.data;
    
    // Padrão de teste animado
    const time = this.frameCount * 0.05;
    
    for (let y = 0; y < this.SCREEN_HEIGHT; y++) {
      for (let x = 0; x < this.SCREEN_WIDTH; x++) {
        const index = (y * this.SCREEN_WIDTH + x) * 4;
        
        // Padrão xadrez animado
        const checkSize = 32;
        const checkX = Math.floor(x / checkSize);
        const checkY = Math.floor(y / checkSize);
        const isCheck = (checkX + checkY + Math.floor(time)) % 2;
        
        if (isCheck) {
          // Azul
          data[index] = 0;     // R
          data[index + 1] = 100; // G
          data[index + 2] = 255; // B
        } else {
          // Branco
          data[index] = 255;     // R
          data[index + 1] = 255; // G
          data[index + 2] = 255; // B
        }
        data[index + 3] = 255; // A
      }
    }
    
    this.context.putImageData(imageData, 0, 0);
  }
  
  /**
   * Envia frame para a UI
   */
  private sendFrame(): void {
    try {
      const imageData = this.context.getImageData(0, 0, this.SCREEN_WIDTH, this.SCREEN_HEIGHT);
      
      const frameMessage: FrameMessage = {
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
      if (this.frameCount % 60 === 0) {
        console.log(`[SimpleMegaDriveWorker] 📺 Frame ${this.frameCount} enviado`);
      }
      
    } catch (error) {
      console.error('[SimpleMegaDriveWorker] ❌ Erro ao enviar frame:', error);
    }
  }
  
  /**
   * Controla a emulação
   */
  public async handleEmulationControl(action: string): Promise<void> {
    try {
      switch (action) {
        case 'START_EMULATION':
          console.log('[SimpleMegaDriveWorker] ▶️ Comando: Iniciar emulação');
          await this.startEmulation();
          break;
          
        case 'PAUSE_EMULATION':
          console.log('[SimpleMegaDriveWorker] ⏸️ Comando: Pausar emulação');
          this.isRunning = false;
          break;
          
        case 'STOP_EMULATION':
          console.log('[SimpleMegaDriveWorker] ⏹️ Comando: Parar emulação');
          this.stopEmulation();
          break;
          
        default:
          console.warn('[SimpleMegaDriveWorker] ⚠️ Ação desconhecida:', action);
      }
      
      self.postMessage({
        type: 'EMULATION_CONTROL_RESPONSE',
        payload: { action, success: true }
      });
      
    } catch (error) {
      console.error('[SimpleMegaDriveWorker] ❌ Erro no controle:', error);
      
      self.postMessage({
        type: 'EMULATION_ERROR',
        payload: { action, error: error.message }
      });
    }
  }
}

// Instância do worker
const workerInstance = new SimpleMegaDriveWorker();

/**
 * Handler de mensagens
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;
  
  try {
    console.log(`[SimpleMegaDriveWorker] 📨 Mensagem recebida: ${type}`);
    
    switch (type) {
      case 'INITIALIZE_EMULATOR':
        await workerInstance.initializeEmulator();
        break;
        
      case 'LOAD_ROM':
        if (payload?.romData) {
          await workerInstance.loadRom(payload.romData);
        }
        break;
        
      case 'START_EMULATION':
      case 'PAUSE_EMULATION':
      case 'STOP_EMULATION':
        await workerInstance.handleEmulationControl(type);
        break;
        
      default:
        console.warn('[SimpleMegaDriveWorker] ⚠️ Tipo desconhecido:', type);
    }
    
  } catch (error) {
    console.error('[SimpleMegaDriveWorker] ❌ Erro no handler:', error);
    
    self.postMessage({
      type: 'WORKER_ERROR',
      payload: { error: error.message }
    });
  }
};

// Inicialização automática
(async () => {
  try {
    console.log('[SimpleMegaDriveWorker] 🚀 Inicializando automaticamente...');
    await workerInstance.initializeEmulator();
  } catch (error) {
    console.error('[SimpleMegaDriveWorker] ❌ Erro na inicialização automática:', error);
  }
})();

console.log('[SimpleMegaDriveWorker] 🎮 Worker simplificado carregado');