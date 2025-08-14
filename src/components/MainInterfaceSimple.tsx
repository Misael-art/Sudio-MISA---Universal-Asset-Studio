import React, { useState, useRef, useEffect } from 'react';
import { WorkerMessage, WorkerResponse, LogEntry, SupportedSystem } from '../types/worker';
import LogPanel from './LogPanel';
import SystemSelector from './SystemSelector';
import TabSystem, { TabId } from './TabSystem';
import SpriteEditor from './SpriteEditor';
import EmulatorScreen from './EmulatorScreen';
import useEmulator from '@/hooks/useEmulator';
import { MegaDriveCore } from '../lib/cores/MegaDriveCore';

/**
 * Componente MainInterface simplificado - sem caracteres especiais
 * Teste para identificar se emojis/acentos estao causando erro de sintaxe
 */
function MainInterface() {
  // Estados da aplicacao
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<SupportedSystem>('megadrive');
  const [romFile, setRomFile] = useState<File | null>(null);
  const [processedData, setProcessedData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabId>('emulator');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Referencias
  const workerRef = useRef<Worker | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Integração EmulatorJS
  const { mountRef, loadRomFile, start } = useEmulator({ system: 'megadrive', dataPath: '/emulatorjs-data/' });

  /**
   * Adiciona entrada de log
   */
  const addLogEntry = (level: 'info' | 'error' | 'complete', message: string) => {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message
    };
    setLogs(prev => [...prev, entry]);
  };

  /**
   * Processa dados do worker
   * Converte ImageData[] do MegaDriveCore para formato compatível com SpriteEditor
   */
  const processWorkerPayload = (payload: any) => {
    addLogEntry('info', 'Iniciando processamento do payload...');
    
    // CORREÇÃO CRÍTICA: Verificar apenas se payload existe, não romFile
    if (!payload) {
      addLogEntry('error', 'Payload de dados não disponível');
      setIsProcessing(false);
      return;
    }

    // Verificar se payload contém dados necessários
    if (!payload.vram || !payload.cram) {
      addLogEntry('error', 'Dados de memória incompletos no payload');
      addLogEntry('error', `VRAM: ${payload.vram ? 'OK' : 'FALTANDO'}, CRAM: ${payload.cram ? 'OK' : 'FALTANDO'}`);
      setIsProcessing(false);
      return;
    }

    try {
      addLogEntry('info', 'Processando dados extraídos da emulação...');
      addLogEntry('info', `Chamando MegaDriveCore.processarDadosDoWorker...`);
      
      // Processa dados com MegaDriveCore - retorna ImageData[]
      addLogEntry('info', `Dados recebidos: VRAM=${payload.vram.length} bytes, CRAM=${payload.cram.length} bytes`);
      const initialImageDataArray = MegaDriveCore.processarDadosDoWorker(payload);
      
      addLogEntry('info', `MegaDriveCore retornou ${initialImageDataArray ? initialImageDataArray.length : 0} ImageData`);
      
      // USAR SPRITES REAIS: Utilizar os ImageData[] retornados pelo MegaDriveCore
      let imageDataArray = initialImageDataArray;
      
      // Fallback para sprites de teste APENAS se não há sprites reais
      if (!imageDataArray || imageDataArray.length === 0) {
        addLogEntry('info', 'FALLBACK: Gerando sprites de teste pois MegaDriveCore retornou array vazio...');
        const testSprites = [];
        
        // Gerar apenas 3 sprites de teste como fallback
        const testConfigs = [
          { size: 16, color: [255, 100, 100], name: 'Teste Vermelho 16x16' },
          { size: 24, color: [100, 255, 100], name: 'Teste Verde 24x24' },
          { size: 32, color: [100, 100, 255], name: 'Teste Azul 32x32' }
        ];
        
        testConfigs.forEach((config, i) => {
          const testImageData = new ImageData(config.size, config.size);
          const data = testImageData.data;
          
          for (let y = 0; y < config.size; y++) {
            for (let x = 0; x < config.size; x++) {
              const pixelIndex = (y * config.size + x) * 4;
              
              // Criar padrão de xadrez para tornar visível
              const isCheckerboard = (Math.floor(x / 4) + Math.floor(y / 4)) % 2;
              const intensity = isCheckerboard ? 1.0 : 0.7;
              
              data[pixelIndex] = config.color[0] * intensity;     // R
              data[pixelIndex + 1] = config.color[1] * intensity; // G
              data[pixelIndex + 2] = config.color[2] * intensity; // B
              data[pixelIndex + 3] = 255;                         // A
            }
          }
          
          testSprites.push(testImageData);
          addLogEntry('info', `Sprite de teste fallback ${i + 1}: ${config.name}`);
        });
        
        addLogEntry('info', `Gerados ${testSprites.length} sprites de teste como fallback`);
        imageDataArray = testSprites;
      } else {
        addLogEntry('info', `USANDO SPRITES REAIS: ${imageDataArray.length} sprites extraídos da ROM`);
      }
      
      addLogEntry('info', 'Convertendo ImageData[] para formato compatível com SpriteEditor...');
      
      // CORREÇÃO CRÍTICA: Converter ImageData[] para formato esperado pelo SpriteEditor
      const convertedSprites = imageDataArray.map((imageData, index) => {
        // Determinar tamanho baseado nas dimensões do ImageData
        const getSize = (width: number, height: number) => {
          if (width <= 8 && height <= 8) return 'small';
          if (width <= 16 && height <= 16) return 'medium';
          return 'large';
        };
        
        return {
          id: index,
          imageData: imageData,
          width: imageData.width,
          height: imageData.height,
          attributes: {
            size: getSize(imageData.width, imageData.height),
            paletteIndex: index % 4 // Distribui entre as 4 paletas do Mega Drive
          }
        };
      });
      
      addLogEntry('info', `Convertidos ${convertedSprites.length} sprites para formato SpriteEditor`);
      
      // CORREÇÃO CRÍTICA: Criar estrutura de dados completa esperada pelo SpriteEditor
      const processedResult = {
        sprites: convertedSprites,
        tiles: [], // Vazio por enquanto
        palettes: [], // Vazio por enquanto
        metadata: {
          romName: romFile?.name || 'ROM Emulada',
          timestamp: Date.now(),
          totalTiles: 0,
          totalSprites: convertedSprites.length,
          totalPalettes: 4, // Mega Drive tem 4 paletas
          processingTime: 0
        }
      };

      addLogEntry('info', 'Estrutura de dados completa criada');
      addLogEntry('info', `Metadata: ${processedResult.metadata.romName}, ${processedResult.metadata.totalSprites} sprites`);
      
      setProcessedData(processedResult);
      addLogEntry('complete', `Processamento concluído: ${convertedSprites.length} sprites extraídos e convertidos`);
      setIsProcessing(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      addLogEntry('error', `Erro no processamento: ${errorMessage}`);
      console.error('Erro detalhado:', error);
      setIsProcessing(false);
    }
  };

  /**
   * Inicializacao do worker - apenas uma vez
   */
  useEffect(() => {
    // Evitar dupla inicialização
    if (workerRef.current) {
      return;
    }

    try {
      // Criacao do worker do Mega Drive usando sintaxe do Vite para TypeScript workers
      workerRef.current = new Worker(
        new URL('../workers/megadrive.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // Manipulador de erro
      workerRef.current.onerror = (error) => {
        const errorMessage = `Erro de inicializacao do worker: ${error.message || 'Erro desconhecido'}`;
        addLogEntry('error', errorMessage);
        console.error('Erro no worker:', error);
      };

      // Manipulador de mensagem
      workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;

        // Log da resposta do worker
        if (response.status === 'error') {
          addLogEntry('error', response.message);
          setIsProcessing(false);
        } else if (response.status === 'complete') {
          addLogEntry('complete', response.message);
          
          // Se há payload, processar dados extraídos
          if (response.payload) {
            addLogEntry('info', 'Dados extraídos do worker recebidos');
            addLogEntry('info', `Payload contém: vram=${response.payload.vram?.length || 0} bytes, cram=${response.payload.cram?.length || 0} bytes, vsram=${response.payload.vsram?.length || 0} bytes`);
            processWorkerPayload(response.payload);
          } else {
            addLogEntry('error', 'Resposta complete recebida mas sem payload');
            setIsProcessing(false);
          }
        } else if (response.status === 'info') {
          addLogEntry('info', response.message);
        } else if (response.status === 'progress') {
          addLogEntry('info', response.message);
        } else if (response.status === 'warning') {
          addLogEntry('info', response.message);
        }
      };

      // Log de inicializacao
      addLogEntry('info', 'Sistema inicializado');
      addLogEntry('info', 'Worker carregado');
      addLogEntry('info', 'Modo local ativo - sem dependencias externas');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      addLogEntry('error', `Falha na criação do worker: ${errorMessage}`);
      console.error('Erro na criação do worker:', error);
    }

    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []); // Sem dependências - executar apenas uma vez

  /**
   * Processa arquivo ROM
   */
  const processRom = async () => {
    if (!romFile || !workerRef.current) {
      addLogEntry('error', 'ROM, sistema ou worker nao disponivel');
      return;
    }

    setIsProcessing(true);
    
    try {
      addLogEntry('info', `Iniciando processamento da ROM no sistema ${selectedSystem}`);
      
      // Converter arquivo para ArrayBuffer
      const arrayBuffer = await romFile.arrayBuffer();
      const romData = new Uint8Array(arrayBuffer);
      
      // Carregar ROM no worker
      const loadMessage: WorkerMessage = {
        type: 'LOAD_ROM',
        payload: { romData, system: selectedSystem }
      };
      workerRef.current.postMessage(loadMessage);
      
      // Aguardar e extrair sprites
      setTimeout(() => {
        if (workerRef.current && romData) {
          const extractMessage: WorkerMessage = {
            type: 'EXTRACT_ASSETS',
            payload: { 
              romData: romData,
              system: selectedSystem 
            }
          };
          workerRef.current.postMessage(extractMessage);
        }
      }, 1000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      addLogEntry('error', `Erro no processamento: ${errorMessage}`);
      setIsProcessing(false);
    }
  };

  /**
   * Manipulador de selecao de arquivo
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setRomFile(file);
      addLogEntry('info', `Arquivo selecionado: ${file.name} (${file.size} bytes)`);
      
      // CRÍTICO: Processar ROM automaticamente após carregamento
      setTimeout(() => {
        processRomWithFile(file);
      }, 100);
    }
  };

  /**
   * Processa arquivo ROM específico (versão que aceita File diretamente)
   */
  const processRomWithFile = async (file: File) => {
    if (!file || !workerRef.current) {
      addLogEntry('error', 'ROM, sistema ou worker nao disponivel');
      return;
    }

    setIsProcessing(true);
    
    try {
      addLogEntry('info', `Iniciando processamento da ROM no sistema ${selectedSystem}`);
      
      // Converter arquivo para ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const romData = new Uint8Array(arrayBuffer);
      
      // Carregar ROM no worker
      const loadMessage: WorkerMessage = {
        type: 'LOAD_ROM',
        payload: { romData, system: selectedSystem }
      };
      workerRef.current.postMessage(loadMessage);
      
      // Aguardar e extrair sprites
      setTimeout(() => {
        if (workerRef.current && romData) {
          const extractMessage: WorkerMessage = {
            type: 'EXTRACT_ASSETS',
            payload: { 
              romData: romData,
              system: selectedSystem 
            }
          };
          workerRef.current.postMessage(extractMessage);
        }
      }, 1000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      addLogEntry('error', `Erro no processamento: ${errorMessage}`);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabecalho */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Universal Asset Studio
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            FASE 1: Integração Visual do Emulador - "Ver para Crer"
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Selecao de sistema */}
            <div className="bg-white rounded-lg shadow p-6">
              <SystemSelector
                selectedSystem={selectedSystem}
                onSystemChange={setSelectedSystem}
                disabled={isProcessing}
              />
            </div>

            {/* Area de drag and drop */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <div className="space-y-4">
                  <div className="text-4xl">📁</div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Carregar ROM
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Selecione um arquivo ROM para extrair sprites
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".bin,.gen,.md,.smd"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                      className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      {isProcessing ? 'Processando...' : 'Selecionar Arquivo'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Informacoes da ROM carregada */}
            {romFile && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  ROM Carregada
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Nome:</span>
                    <p className="text-gray-900">{romFile.name}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Tamanho:</span>
                    <p className="text-gray-900">{(romFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Sistema:</span>
                    <p className="text-gray-900">{selectedSystem}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Status:</span>
                    <p className="text-gray-900">
                      {isProcessing ? 'Processando...' : processedData ? 'Processada' : 'Carregada'}
                    </p>
                  </div>
                </div>
                
                {isProcessing && (
                  <div className="mt-4 flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    <span className="text-sm text-gray-600">Processando automaticamente...</span>
                  </div>
                )}
              </div>
            )}

            {/* Sistema de abas - FASE 1: Emulador sempre disponível */}
            <div className="bg-white rounded-lg shadow">
              <TabSystem
                tabs={[
                  {
                    id: 'emulator',
                    label: 'Emulador',
                    icon: <span>📺</span>,
                    content: <EmulatorScreen worker={workerRef.current} emulatorMountRef={mountRef} />
                  },
                  {
                    id: 'sprite-editor',
                    label: 'Editor de Sprites',
                    icon: <span>🎮</span>,
                    content: processedData ? (
                      <SpriteEditor data={processedData} />
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <div className="text-4xl mb-4">🎮</div>
                        <h3 className="text-lg font-medium mb-2">Editor de Sprites</h3>
                        <p>Carregue uma ROM para extrair sprites</p>
                      </div>
                    ),
                    disabled: !processedData
                  },
                  {
                    id: 'color-mapper',
                    label: 'Mapeador de Cores',
                    icon: <span>🎨</span>,
                    content: (
                      <div className="p-8 text-center text-gray-500">
                        <div className="text-4xl mb-4">🎨</div>
                        <h3 className="text-lg font-medium mb-2">Mapeador de Cores</h3>
                        <p>Disponivel na Fase 2</p>
                      </div>
                    ),
                    disabled: true
                  },
                  {
                    id: 'analyzer',
                    label: 'Analisador',
                    icon: <span>📊</span>,
                    content: (
                      <div className="p-8 text-center text-gray-500">
                        <div className="text-4xl mb-4">📊</div>
                        <h3 className="text-lg font-medium mb-2">Analisador</h3>
                        <p>Disponivel na Fase 2</p>
                      </div>
                    ),
                    disabled: true
                  }
                ]}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </div>
          </div>

          {/* Painel de Log */}
          <div className="lg:col-span-1">
            <LogPanel logs={logs} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainInterface;