// Universal Asset Studio - Interface Principal
// Fase 1: Componente principal com MegaDriveCore e sistema de abas integrados

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Upload, Play, AlertCircle, CheckCircle, Image, Palette, BarChart3 } from 'lucide-react';
import { LogEntry, WorkerResponse, SupportedSystem, WorkerState, ROMInfo } from '../types/worker';
import { MegaDriveCore } from '../lib/cores/MegaDriveCore';
import useEmulator from '@/hooks/useEmulator';
import { getAdapterForSystem } from '@/emulation/adapters';
import { toSystemId } from '@/emulation/systemMap';
import Analyzer from '@/components/Analyzer';
import LogPanel from './LogPanel';
import SystemSelector from './SystemSelector';
import TabSystem, { useDefaultTabs, TabId } from './TabSystem';
import SpriteEditor from './SpriteEditor';
import ROMTestRunner from './ROMTestRunner';
import ImportEditor from './ImportEditor';

/**
 * Componente MainInterface - Interface principal da aplicação
 * Implementa os pilares obrigatórios da Fase 0:
 * - Criação do worker com caminho correto
 * - Manipuladores de eventos explícitos (onerror, onmessage)
 * - Painel de log visível desde o início
 * - Comunicação 100% local
 * 
 * @returns Componente React da interface principal
 */
export const MainInterface: React.FC = () => {
  // Referência para o worker (obrigatória)
  const workerRef = useRef<Worker | null>(null);
  
  // Estados da aplicação
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [workerStatus, setWorkerStatus] = useState<WorkerState>('idle');
  const [selectedSystem, setSelectedSystem] = useState<SupportedSystem | null>(null);
  const [selectedROM, setSelectedROM] = useState<ROMInfo | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Estados da Fase 1 - MegaDriveCore e abas
  const [processedData, setProcessedData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabId>('sprite-editor');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Referência do MegaDriveCore
  const megaDriveCore = useRef(MegaDriveCore);
  const mdAdapterRef = useRef(getAdapterForSystem('megadrive'));

  // Integração com EmulatorJS
  const currentSystemId = toSystemId(selectedSystem || 'megadrive');
  const { isReady, isRunning, error: emulatorError, mountRef, loadRomFile, start, snapshot, captureState } = useEmulator({
    system: currentSystemId,
    dataPath: '/emulatorjs-data/'
  });
  const frameIR = React.useMemo(() => {
    if (!snapshot) return null;
    // Selecionar adapter conforme sistema selecionado (fallback megadrive)
    const adapter = getAdapterForSystem(toSystemId(selectedSystem || 'megadrive')) || mdAdapterRef.current;
    if (!adapter) return null;
    return (adapter as any).buildFrameIR({
      vram: snapshot.vram,
      cram: snapshot.cram,
      vsram: snapshot.vsram,
      sat: snapshot.sat,
      regs: snapshot.regs,
      framebuffer: snapshot.framebuffer,
      width: snapshot.width,
      height: snapshot.height
    });
  }, [snapshot, selectedSystem]);

  /**
   * Adiciona uma entrada ao log
   * @param level - Nível do log
   * @param message - Mensagem do log
   */
  const addLogEntry = useCallback((level: LogEntry['level'], message: string) => {
    const logEntry: LogEntry = {
      timestamp: Date.now(),
      level,
      message
    };
    setLogs(prev => [...prev, logEntry]);
  }, []);

  /**
   * Processa o payload recebido do worker usando MegaDriveCore
   * @param payload - Dados extraídos pelo worker
   */
  const processWorkerPayload = useCallback(async (payload: any) => {
    if (!selectedROM) {
      addLogEntry('error', 'ROM não disponível para processamento');
      return;
    }

    try {
      setIsProcessing(true);
      addLogEntry('info', 'Iniciando processamento com MegaDriveCore...');
      
      // Converte payload do worker para formato do MegaDriveCore
      const workerPayload = {
        vramData: new Uint8Array(payload.vram || []),
        cramData: new Uint8Array(payload.cram || []),
        satData: new Uint8Array(payload.sat || []),
        mappings: payload.mappings || [],
        romName: selectedROM.name,
        timestamp: Date.now()
      };
      
      // Processa dados com MegaDriveCore
      const sprites = MegaDriveCore.processarDadosDoWorker({
        vram: workerPayload.vramData,
        cram: workerPayload.cramData,
        vsram: workerPayload.satData
      });
      
      setProcessedData({
        sprites: sprites,
        tiles: [],
        palettes: [],
        metadata: {
          processingTime: Date.now() - workerPayload.timestamp,
          romName: workerPayload.romName
        }
      });
      setActiveTab('sprite-editor'); // Muda para aba de sprites
      
      addLogEntry('complete', `✅ Processamento concluído: ${sprites.length} sprites extraídos`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      addLogEntry('error', `❌ Erro no processamento: ${errorMessage}`);
      console.error('Erro no MegaDriveCore:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [addLogEntry, selectedROM]);

  /**
   * Inicialização do worker (OBRIGATÓRIA)
   * Implementa os manipuladores de eventos explícitos conforme especificação
   */
  useEffect(() => {
    // Criação OBRIGATÓRIA do worker com caminho público correto
    workerRef.current = new Worker('/workers/emulation.worker.js');

    // Manipulador de erro OBRIGATÓRIO
    workerRef.current.onerror = (error) => {
      const errorMessage = `Erro de inicialização do worker: ${error.message || 'Erro desconhecido'}`;
      addLogEntry('error', errorMessage);
      setWorkerStatus('error');
      console.error('❌ Erro no worker:', error);
    };

    // Manipulador de mensagem OBRIGATÓRIO
    workerRef.current.onmessage = (event) => {
      const response: WorkerResponse = event.data;
      
      // Adicionar ao log
      const logLevel: LogEntry['level'] = 
        response.status === 'error' ? 'error' : 
        response.status === 'complete' ? 'complete' : 'info';
      
      addLogEntry(logLevel, response.message);
      
      // Atualizar status do worker
      if (response.status === 'complete') {
        setWorkerStatus('idle');
        if (response.payload) {
          processWorkerPayload(response.payload);
        }
      } else if (response.status === 'error') {
        setWorkerStatus('error');
        setIsProcessing(false);
      } else {
        setWorkerStatus('working');
      }
    };

    // Log de inicialização bem-sucedida (OBRIGATÓRIO)
    addLogEntry('info', 'Worker criado com sucesso');
    addLogEntry('info', 'Caminho configurado: /workers/emulation.worker.js');
    addLogEntry('info', 'Modo local ativo - sem dependências externas');

    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        addLogEntry('info', 'Worker desconectado');
      }
    };
  }, [addLogEntry, processWorkerPayload]);

  /**
   * Processa arquivo ROM selecionado
   * @param file - Arquivo ROM selecionado
   */
  const handleFileSelect = useCallback(async (file: File) => {
    if (!selectedSystem) {
      addLogEntry('error', 'Selecione um sistema antes de carregar a ROM');
      return;
    }

    try {
      addLogEntry('info', `Carregando arquivo: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      
      const arrayBuffer = await file.arrayBuffer();
      const romData = new Uint8Array(arrayBuffer);
      
      const romInfo: ROMInfo = {
        name: file.name,
        size: file.size,
        type: file.type,
        system: selectedSystem,
        data: romData
      };
      
      setSelectedROM(romInfo);
      addLogEntry('info', `ROM carregada: ${file.name}`);
      try {
        await loadRomFile(file);
        addLogEntry('info', 'ROM enviada ao EmulatorJS');
      } catch (err) {
        addLogEntry('error', `Falha ao enviar ROM ao EmulatorJS: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      }
      
    } catch (error) {
      addLogEntry('error', `Erro ao carregar ROM: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }, [selectedSystem, addLogEntry]);

  /**
   * Inicia processamento da ROM no worker
   */
  const handleProcessROM = useCallback(() => {
    if (!selectedROM) {
      addLogEntry('error', 'Selecione uma ROM antes de iniciar');
      return;
    }
    setProcessedData(null);
    setIsProcessing(true);
    addLogEntry('info', '🚀 Iniciando emulação real (EmulatorJS)');
    try {
      start();
    } catch (e) {
      addLogEntry('error', `Falha ao iniciar emulação: ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
      setIsProcessing(false);
    }
  }, [selectedROM, start, addLogEntry]);

  // Observa framebuffer real
  useEffect(() => {
    if (emulatorError) addLogEntry('error', `EmulatorJS: ${emulatorError}`);
  }, [emulatorError, addLogEntry]);

  /**
   * Manipuladores de drag and drop
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  /**
   * Manipulador de seleção de arquivo via input
   */
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Universal Asset Studio
          </h1>
          <p className="text-gray-600">
            Fase 1: Decodificação e Interface de Abas
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className={[
              'w-3 h-3 rounded-full',
              workerStatus === 'idle' ? 'bg-green-500' :
              workerStatus === 'working' ? 'bg-yellow-500 animate-pulse' :
              'bg-red-500'
            ].join(' ')} />
            <span className="text-sm text-gray-600">
              Worker: {workerStatus === 'idle' ? 'Pronto' : workerStatus === 'working' ? 'Processando' : 'Erro'}
            </span>
            {isProcessing && (
              <>
                <div className="w-3 h-3 rounded-full bg-blue-500 ml-4 animate-pulse" />
                <span className="text-sm text-blue-600">MegaDriveCore: processando</span>
              </>
            )}
          </div>
        </div>

        {/* Seletor de Sistema */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <SystemSelector
            selectedSystem={selectedSystem}
            onSystemChange={setSelectedSystem}
            disabled={workerStatus === 'working'}
          />
        </div>

        {/* Upload de ROM */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Carregar ROM</h2>
          
          {/* Área de drag and drop */}
          <div
            className={[
              'border-2 border-dashed rounded-lg p-8 text-center transition-all',
              isDragOver 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400',
              !selectedSystem ? 'opacity-50 pointer-events-none' : ''
            ].join(' ')}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg text-gray-600 mb-2">
              Arraste um arquivo ROM aqui ou clique para selecionar
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Formatos suportados: .bin, .smd, .gen, .smc, .sfc, .gb, .gbc
            </p>
            
            <input
              type="file"
              accept=".bin,.smd,.gen,.smc,.sfc,.gb,.gbc"
              onChange={handleFileInputChange}
              disabled={!selectedSystem || workerStatus === 'working'}
              className="hidden"
              id="rom-file-input"
            />
            <label
              htmlFor="rom-file-input"
              className={[
                'inline-block px-6 py-2 bg-blue-500 text-white rounded-lg cursor-pointer',
                'hover:bg-blue-600 transition-colors',
                (!selectedSystem || workerStatus === 'working') ? 'opacity-50 cursor-not-allowed' : ''
              ].join(' ')}
            >
              Selecionar Arquivo
            </label>
          </div>

          {/* Informações da ROM carregada */}
          {selectedROM && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium text-green-700">ROM Carregada</span>
              </div>
              <div className="text-sm text-green-600 space-y-1">
                <p><strong>Nome:</strong> {selectedROM.name}</p>
                <p><strong>Tamanho:</strong> {(selectedROM.size / 1024 / 1024).toFixed(2)} MB</p>
                <p><strong>Sistema:</strong> {selectedROM.system}</p>
              </div>
              
              <button
                onClick={handleProcessROM}
                disabled={workerStatus === 'working' || isProcessing}
                className={[
                  'mt-3 flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg',
                  'hover:bg-green-600 transition-colors',
                  (workerStatus === 'working' || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''
                ].join(' ')}
              >
                <Play className="w-4 h-4" />
                {(workerStatus === 'working' || isProcessing) ? 'Processando...' : 'Processar ROM'}
              </button>
            </div>
          )}
        </div>

        {/* Sistema de Abas - inclui Emulador sempre */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <TabSystem 
            tabs={[
              {
                id: 'emulator',
                label: 'Emulador',
                icon: <Image className="w-5 h-5" />,
                content: (
                  <div className="p-4">
                    <div className="mb-2 text-sm text-gray-600">{`Estado: ${isReady ? (isRunning ? 'Rodando' : 'Pronto') : 'Inicializando...'}`}</div>
                    <div id="emulator-mount" ref={mountRef as any} className="w-full min-h-[320px] bg-black" />
                  </div>
                )
              },
              {
                id: 'sprite-editor',
                label: 'Editor de Sprites',
                icon: <Image className="w-5 h-5" />,
                content: processedData ? (
                  <SpriteEditor data={processedData} />
                ) : (
                  <div className="text-center text-gray-500 py-12">
                    <h3 className="text-lg font-medium mb-2">Editor de Sprites</h3>
                    <p>Carregue e inicie uma ROM para extrair sprites</p>
                  </div>
                )
              },
              {
                id: 'color-mapper',
                label: 'Mapeador de Cores',
                icon: <Palette className="w-5 h-5" />,
                content: (
                  <div className="text-center text-gray-500 py-12">
                    <h3 className="text-lg font-medium mb-2">Mapeador de Cores</h3>
                    <p>Disponível na Fase 2</p>
                  </div>
                ),
                disabled: true
              },
              {
                id: 'analyzer',
                label: 'Analisador',
                icon: <BarChart3 className="w-5 h-5" />,
                content: (
                  <div className="p-4">
                    <Analyzer frame={frameIR} captureState={captureState} snapshot={snapshot as any} />
                  </div>
                )
              }
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {/* Suíte de Testes de ROMs */}
        <ROMTestRunner />

        {/* Painel de Log OBRIGATÓRIO */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Log do Sistema</h2>
          <LogPanel logs={logs} />
        </div>
      </div>
    </div>
  );
};

export default MainInterface;