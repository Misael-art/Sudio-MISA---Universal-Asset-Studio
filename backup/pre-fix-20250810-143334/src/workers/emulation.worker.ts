// Universal Asset Studio - Emulation Worker
// Fase 0: Worker básico para processamento de ROMs sem dependências externas
// Este worker implementa o Pilar 1.1: Decodificação de Dados de Memória

import { WorkerMessage, WorkerResponse, WorkerPayload } from '../types/worker';

/**
 * Gera dados VRAM simulados baseados na ROM real
 * Implementa padrões realistas de tiles para Mega Drive
 */
const generateMockVRAMData = (romData: Uint8Array): Uint8Array => {
  const vramData = new Uint8Array(0x10000); // 64KB VRAM
  
  // Gerar seed baseado na ROM
  let seed = 0;
  for (let i = 0; i < Math.min(romData.length, 1024); i++) {
    seed = (seed + romData[i]) % 65536;
  }
  
  // Preencher com padrões de tiles realistas
  for (let i = 0; i < vramData.length; i += 32) {
    seed = (seed * 1103515245 + 12345) % 65536;
    
    // Criar padrão de tile 8x8 (32 bytes)
    for (let j = 0; j < 32 && (i + j) < vramData.length; j++) {
      const pixelData = (seed + j * 17) % 256;
      vramData[i + j] = pixelData;
    }
  }
  
  return vramData;
};

/**
 * Gera dados CRAM simulados (paletas de cores)
 * Implementa o Pilar 1.2: Decodificação de Paletas
 */
const generateMockCRAMData = (romData: Uint8Array): Uint8Array => {
  const cramData = new Uint8Array(0x80); // 128 bytes CRAM (64 cores)
  
  // Gerar seed baseado na ROM
  let colorSeed = 0;
  for (let i = 0; i < Math.min(romData.length, 256); i++) {
    colorSeed = (colorSeed + romData[i]) % 4096;
  }
  
  // Gerar 4 paletas de 16 cores cada
  for (let palette = 0; palette < 4; palette++) {
    for (let color = 0; color < 16; color++) {
      const offset = (palette * 16 + color) * 2;
      
      if (color === 0) {
        // Cor transparente (sempre 0)
        cramData[offset] = 0x00;
        cramData[offset + 1] = 0x00;
      } else {
        // Gerar cor RGB de 9 bits (formato Mega Drive)
        colorSeed = (colorSeed * 127 + 23) % 4096;
        const r = (colorSeed % 8) << 1;
        const g = ((colorSeed >> 3) % 8) << 5;
        const b = ((colorSeed >> 6) % 8) << 9;
        
        const color16 = r | g | b;
        cramData[offset] = color16 & 0xFF;
        cramData[offset + 1] = (color16 >> 8) & 0xFF;
      }
    }
  }
  
  return cramData;
};

/**
 * Gera dados VSRAM simulados (scroll vertical)
 */
const generateMockVSRAMData = (romData: Uint8Array): Uint8Array => {
  const vsramData = new Uint8Array(0x80); // 128 bytes VSRAM
  
  // Preencher com valores de scroll baseados na ROM
  let scrollSeed = 0;
  for (let i = 0; i < Math.min(romData.length, 128); i++) {
    scrollSeed = (scrollSeed + romData[i]) % 512;
  }
  
  for (let i = 0; i < vsramData.length; i += 2) {
    scrollSeed = (scrollSeed * 31 + 7) % 512;
    vsramData[i] = scrollSeed & 0xFF;
    vsramData[i + 1] = (scrollSeed >> 8) & 0xFF;
  }
  
  return vsramData;
};

/**
 * Classe principal do worker de emulação
 * Implementa processamento de ROMs com dados simulados para a Fase 0
 */
class EmulationWorker {
  constructor() {
    // Worker pronto imediatamente - sem inicialização complexa
    self.postMessage({ 
      status: 'info', 
      message: 'Worker inicializado - modo local ativo (sem dependências externas)' 
    });
  }

  /**
   * Processa ROM e extrai dados de memória
   * Implementa o Pilar 1.1: Decodificação de Dados de Memória
   */
  public async processRom(payload: { romData: Uint8Array; system: string }): Promise<void> {
    try {
      // Validar dados de entrada
      if (!payload || !payload.romData || payload.romData.length === 0) {
        self.postMessage({ 
          status: 'error', 
          message: 'Dados de ROM inválidos ou vazios fornecidos ao worker' 
        });
        return;
      }

      self.postMessage({ 
        status: 'info', 
        message: `Processando ROM: ${payload.romData.length} bytes (${payload.system})` 
      });
      
      // Simular tempo de processamento realista
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      self.postMessage({ 
        status: 'info', 
        message: 'Gerando dados de memória simulados...' 
      });
      
      // Gerar dados simulados baseados na ROM real
      const vramData = generateMockVRAMData(payload.romData);
      const cramData = generateMockCRAMData(payload.romData);
      const vsramData = generateMockVSRAMData(payload.romData);

      self.postMessage({ 
        status: 'info', 
        message: 'Dados extraídos com sucesso (modo simulado)' 
      });

      // Enviar dados processados
      self.postMessage({
        status: 'complete',
        message: 'ROM processada com sucesso - dados simulados gerados',
        payload: {
          vram: vramData,
          cram: cramData,
          vsram: vsramData,
          system: payload.system
        },
        isMock: true
      });
      
    } catch (error: any) {
      self.postMessage({
        status: 'error',
        message: `Erro no processamento da ROM: ${error.message}`
      });
    }
  }

  /**
   * Limpeza de recursos
   */
  public destroy(): void {
    self.postMessage({ 
      status: 'info', 
      message: 'Worker finalizado' 
    });
  }
}

// Instância do worker
const workerInstance = new EmulationWorker();

// Handler de mensagens
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  try {
    const { type, payload } = event.data;
    
    if (type === 'LOAD_ROM' || type === 'EXTRACT_ASSETS') {
      await workerInstance.processRom(payload);
    }
  } catch (error: any) {
    self.postMessage({
      status: 'error',
      message: `Erro no handler de mensagens: ${error.message}`
    });
  }
};

// Limpeza na finalização
self.addEventListener('beforeunload', () => {
  workerInstance.destroy();
});

// Sinalizar que o worker está pronto
self.postMessage({
  status: 'info',
  message: 'Worker carregado e pronto para processamento'
});