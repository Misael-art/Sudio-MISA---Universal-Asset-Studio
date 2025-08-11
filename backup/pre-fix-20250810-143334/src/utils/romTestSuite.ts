// Universal Asset Studio - Suíte de Testes de ROMs
// Testa automaticamente todas as ROMs da pasta /data/

import { WorkerMessage, WorkerResponse, ROMInfo, SupportedSystem } from '../types/worker';

/**
 * Resultado de um teste de ROM
 */
export interface ROMTestResult {
  fileName: string;
  system: SupportedSystem;
  size: number;
  success: boolean;
  processingTime: number;
  error?: string;
  extractedAssets?: {
    sprites: number;
    palettes: number;
    tiles: number;
  };
}

/**
 * Configuração de teste
 */
export interface TestConfig {
  timeout: number; // Timeout em ms
  retries: number; // Número de tentativas
  systems: SupportedSystem[]; // Sistemas a testar
}

/**
 * Suíte de testes de ROMs
 */
export class ROMTestSuite {
  private worker: Worker | null = null;
  private testResults: ROMTestResult[] = [];
  private onProgress?: (progress: number, current: string) => void;
  private onResult?: (result: ROMTestResult) => void;
  private onComplete?: (results: ROMTestResult[]) => void;

  constructor(
    private config: TestConfig = {
      timeout: 30000, // 30 segundos
      retries: 2,
      systems: ['megadrive']
    }
  ) {}

  /**
   * Configura callbacks de progresso
   */
  public setCallbacks(callbacks: {
    onProgress?: (progress: number, current: string) => void;
    onResult?: (result: ROMTestResult) => void;
    onComplete?: (results: ROMTestResult[]) => void;
  }) {
    this.onProgress = callbacks.onProgress;
    this.onResult = callbacks.onResult;
    this.onComplete = callbacks.onComplete;
  }

  /**
   * Obtém lista de ROMs da pasta /data/
   */
  private async getROMFiles(): Promise<File[]> {
    // Simular lista de ROMs (em produção, seria obtida via API ou input de diretório)
    const romFiles = [
      'rom_teste.bin',
      'rom_teste_2.bin', 
      'rom_teste_3.bin',
      'rom_teste_4.bin',
      'rom_teste_5.bin',
      'rom_teste_6.gen',
      'rom_teste_7.gen',
      'rom_teste_8.gen',
      'rom_teste_9.bin',
      'rom_teste_12.bin'
    ];

    const files: File[] = [];
    
    for (const fileName of romFiles) {
      try {
        // Simular carregamento de arquivo (em produção, seria fetch ou FileReader)
        const response = await fetch(`/data/${fileName}`);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const file = new File([arrayBuffer], fileName, {
            type: 'application/octet-stream'
          });
          files.push(file);
        }
      } catch (error) {
        console.warn(`[ROMTestSuite] Não foi possível carregar ${fileName}:`, error);
      }
    }

    return files;
  }

  /**
   * Determina o sistema baseado na extensão do arquivo
   */
  private getSystemFromFile(fileName: string): SupportedSystem {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'bin':
      case 'gen':
      case 'smd':
        return 'megadrive';
      case 'smc':
      case 'sfc':
        return 'snes';
      case 'gb':
        return 'gameboy';
      case 'gbc':
        return 'gameboycolor';
      default:
        return 'megadrive'; // Default
    }
  }

  /**
   * Testa uma ROM específica
   */
  private async testROM(file: File, system: SupportedSystem): Promise<ROMTestResult> {
    const startTime = performance.now();
    
    const result: ROMTestResult = {
      fileName: file.name,
      system,
      size: file.size,
      success: false,
      processingTime: 0
    };

    try {
      // Carregar dados da ROM
      const arrayBuffer = await file.arrayBuffer();
      const romData = new Uint8Array(arrayBuffer);

      // Criar worker se não existir
      if (!this.worker) {
        this.worker = new Worker('/src/workers/megadrive.worker.ts', { type: 'module' });
      }

      // Testar processamento da ROM
      const testResult = await this.processROMWithTimeout(romData, system);
      
      result.success = true;
      result.extractedAssets = {
        sprites: testResult.sprites?.length || 0,
        palettes: testResult.palettes?.length || 0,
        tiles: testResult.tiles?.length || 0
      };
      
    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : 'Erro desconhecido';
    }

    result.processingTime = performance.now() - startTime;
    return result;
  }

  /**
   * Processa ROM com timeout
   */
  private async processROMWithTimeout(romData: Uint8Array, system: SupportedSystem): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker não disponível'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error(`Timeout após ${this.config.timeout}ms`));
      }, this.config.timeout);

      const messageHandler = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;
        
        if (response.status === 'complete') {
          clearTimeout(timeout);
          this.worker?.removeEventListener('message', messageHandler);
          resolve(response.payload);
        } else if (response.status === 'error') {
          clearTimeout(timeout);
          this.worker?.removeEventListener('message', messageHandler);
          reject(new Error(response.message));
        }
        // Ignorar mensagens de progresso
      };

      this.worker.addEventListener('message', messageHandler);
      
      // Enviar ROM para processamento
      this.worker.postMessage({
        type: 'LOAD_ROM',
        payload: {
          romData
        }
      } as WorkerMessage);
    });
  }

  /**
   * Executa a suíte completa de testes
   */
  public async runTestSuite(): Promise<ROMTestResult[]> {
    console.log('[ROMTestSuite] 🚀 Iniciando suíte de testes de ROMs...');
    
    this.testResults = [];
    
    try {
      // Obter lista de ROMs
      const romFiles = await this.getROMFiles();
      console.log(`[ROMTestSuite] 📁 Encontradas ${romFiles.length} ROMs para teste`);
      
      if (romFiles.length === 0) {
        throw new Error('Nenhuma ROM encontrada para teste');
      }

      // Testar cada ROM
      for (let i = 0; i < romFiles.length; i++) {
        const file = romFiles[i];
        const system = this.getSystemFromFile(file.name);
        
        // Verificar se sistema está na lista de testes
        if (!this.config.systems.includes(system)) {
          console.log(`[ROMTestSuite] ⏭️ Pulando ${file.name} (sistema ${system} não está na lista de testes)`);
          continue;
        }

        console.log(`[ROMTestSuite] 🧪 Testando ${file.name} (${i + 1}/${romFiles.length})`);
        
        // Callback de progresso
        this.onProgress?.(((i + 1) / romFiles.length) * 100, file.name);
        
        // Testar ROM com retry
        let result: ROMTestResult | null = null;
        let attempts = 0;
        
        while (attempts <= this.config.retries && !result?.success) {
          attempts++;
          
          try {
            result = await this.testROM(file, system);
            
            if (!result.success && attempts <= this.config.retries) {
              console.log(`[ROMTestSuite] 🔄 Tentativa ${attempts} falhou para ${file.name}, tentando novamente...`);
            }
          } catch (error) {
            result = {
              fileName: file.name,
              system,
              size: file.size,
              success: false,
              processingTime: 0,
              error: error instanceof Error ? error.message : 'Erro desconhecido'
            };
          }
        }
        
        if (result) {
          this.testResults.push(result);
          this.onResult?.(result);
          
          console.log(`[ROMTestSuite] ${result.success ? '✅' : '❌'} ${file.name}: ${result.success ? 'SUCESSO' : 'FALHA'} (${result.processingTime.toFixed(0)}ms)`);
          if (!result.success && result.error) {
            console.log(`[ROMTestSuite] 📝 Erro: ${result.error}`);
          }
        }
      }
      
    } catch (error) {
      console.error('[ROMTestSuite] ❌ Erro na suíte de testes:', error);
      throw error;
    } finally {
      // Limpar worker
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }
    }

    // Callback de conclusão
    this.onComplete?.(this.testResults);
    
    // Relatório final
    this.generateReport();
    
    return this.testResults;
  }

  /**
   * Gera relatório dos testes
   */
  private generateReport() {
    const total = this.testResults.length;
    const successful = this.testResults.filter(r => r.success).length;
    const failed = total - successful;
    const avgTime = this.testResults.reduce((sum, r) => sum + r.processingTime, 0) / total;
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 RELATÓRIO DA SUÍTE DE TESTES DE ROMs');
    console.log('='.repeat(50));
    console.log(`📁 Total de ROMs testadas: ${total}`);
    console.log(`✅ Sucessos: ${successful} (${((successful / total) * 100).toFixed(1)}%)`);
    console.log(`❌ Falhas: ${failed} (${((failed / total) * 100).toFixed(1)}%)`);
    console.log(`⏱️ Tempo médio: ${avgTime.toFixed(0)}ms`);
    console.log('\n📋 Detalhes por ROM:');
    
    this.testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const assets = result.extractedAssets 
        ? ` (${result.extractedAssets.sprites}S/${result.extractedAssets.palettes}P/${result.extractedAssets.tiles}T)`
        : '';
      console.log(`${status} ${result.fileName} - ${result.processingTime.toFixed(0)}ms${assets}`);
      if (!result.success && result.error) {
        console.log(`   📝 ${result.error}`);
      }
    });
    
    console.log('='.repeat(50) + '\n');
  }

  /**
   * Obtém resultados dos testes
   */
  public getResults(): ROMTestResult[] {
    return [...this.testResults];
  }

  /**
   * Obtém estatísticas dos testes
   */
  public getStats() {
    const total = this.testResults.length;
    const successful = this.testResults.filter(r => r.success).length;
    const failed = total - successful;
    const avgTime = total > 0 ? this.testResults.reduce((sum, r) => sum + r.processingTime, 0) / total : 0;
    
    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageTime: avgTime
    };
  }
}

export default ROMTestSuite;