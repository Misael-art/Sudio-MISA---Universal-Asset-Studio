// Universal Asset Studio - Interface Principal
// Fase 1: Componente principal com MegaDriveCore e sistema de abas integrados

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Upload, Play, AlertCircle, CheckCircle, Image, Palette, BarChart3, Loader } from 'lucide-react';
import { LogEntry, WorkerResponse, SupportedSystem, WorkerState, ROMInfo } from '../types/worker';
// Vite worker (empacotado) - garante criação correta
// eslint-disable-next-line import/no-unresolved
import EmulationWorker from '@/workers/emulation.worker.ts?worker';
import { MegaDriveCore } from '../lib/cores/MegaDriveCore';
import useEmulator from '@/hooks/useEmulator';
import { getAdapterForSystem } from '@/emulation/adapters';
import { toSystemId } from '@/emulation/systemMap';
import Analyzer from '@/components/Analyzer';
import LogPanel from './LogPanel';
import SystemSelector from './SystemSelector';
import TabSystem, { TabId } from './TabSystem';
import SpriteEditor from './SpriteEditor';
import ROMTestRunner from './ROMTestRunner';

export const MainInterface: React.FC = () => {
  const workerRef = useRef<Worker | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [workerStatus, setWorkerStatus] = useState<WorkerState>('idle');
  const [selectedSystem, setSelectedSystem] = useState<SupportedSystem | null>('megadrive');
  const [selectedROM, setSelectedROM] = useState<ROMInfo | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [processedData, setProcessedData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabId>('sprite-editor');
  const [isProcessing, setIsProcessing] = useState(false);

  const mdAdapterRef = useRef(getAdapterForSystem('megadrive'));

  const currentSystemId = toSystemId(selectedSystem || 'megadrive');
  const { isReady, isRunning, error: emulatorError, mountRef, loadRomFile, snapshot, captureState } = useEmulator({
    system: currentSystemId,
    dataPath: '/emulatorjs-data/'
  });

  const frameIR = React.useMemo(() => {
    if (!snapshot) return null;
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

  const addLogEntry = useCallback((level: LogEntry['level'], message: string) => {
    const logEntry: LogEntry = { timestamp: Date.now(), level, message };
    setLogs(prev => [...prev, logEntry]);
  }, []);

  const processWorkerPayload = useCallback(async (payload: any) => {
    if (!selectedROM) {
      addLogEntry('error', 'ROM não disponível para processamento do payload.');
      return;
    }
    try {
      addLogEntry('info', 'Iniciando processamento do worker com MegaDriveCore...');
      const workerPayload = {
        vramData: new Uint8Array(payload.vram || []),
        cramData: new Uint8Array(payload.cram || []),
        satData: new Uint8Array(payload.sat || []),
        mappings: payload.mappings || [],
        romName: selectedROM.name,
        timestamp: Date.now()
      };
      const sprites = MegaDriveCore.processarDadosDoWorker({
        vram: workerPayload.vramData,
        cram: workerPayload.cramData,
        vsram: workerPayload.satData
      });
      setProcessedData({
        sprites: sprites,
        tiles: [],
        palettes: [],
        metadata: { processingTime: Date.now() - workerPayload.timestamp, romName: workerPayload.romName }
      });
      setActiveTab('sprite-editor');
      addLogEntry('complete', `✅ Processamento concluído: ${sprites.length} sprites extraídos.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      addLogEntry('error', `❌ Erro no processamento MegaDriveCore: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  }, [addLogEntry, selectedROM]);

  const addLogRef = useRef(addLogEntry);
  const processPayloadRef = useRef(processWorkerPayload);
  useEffect(() => { addLogRef.current = addLogEntry; }, [addLogEntry]);
  useEffect(() => { processPayloadRef.current = processWorkerPayload; }, [processWorkerPayload]);

  useEffect(() => {
    const w: any = window as any;
    if (!w.__UAS_WORKER__) {
      try {
        w.__UAS_WORKER__ = new EmulationWorker();
        addLogRef.current('info', 'Worker TS (bundle) inicializado.');
      } catch (e) {
        addLogRef.current('error', 'Falha ao criar worker TS; usando fallback público.');
        w.__UAS_WORKER__ = new Worker('/workers/emulation.worker.js');
      }
    }
    workerRef.current = w.__UAS_WORKER__ as Worker;

    workerRef.current.onerror = (error: ErrorEvent) => {
      const errorMessage = `Erro fatal no worker: ${error.message || 'Erro desconhecido'}`;
      addLogRef.current('error', errorMessage);
      setWorkerStatus('error');
    };

    workerRef.current.onmessage = (event) => {
      const response: WorkerResponse = event.data;
      const logLevel: LogEntry['level'] = response.status === 'error' ? 'error' : response.status === 'complete' ? 'complete' : 'info';
      addLogRef.current(logLevel, response.message);
      if (response.status === 'complete') {
        setWorkerStatus('idle');
        if (response.payload) processPayloadRef.current(response.payload);
      } else if (response.status === 'error') {
        setWorkerStatus('error');
        setIsProcessing(false);
      } else if (response.status === 'progress') {
        setWorkerStatus('working');
      }
    };

    addLogRef.current('info', 'Worker configurado e pronto para uso.');

    return () => {
      if (workerRef.current) {
        try { (workerRef.current as any).onerror = null; } catch {}
        try { (workerRef.current as any).onmessage = null; } catch {}
      }
    };
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!selectedSystem) {
      addLogEntry('error', 'Selecione um sistema antes de carregar a ROM.');
      return;
    }
    if (!isReady) {
      addLogEntry('error', 'EmulatorJS não está pronto. Aguarde a inicialização completa.');
      return;
    }

    try {
      addLogEntry('info', `Carregando arquivo: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      const romInfo: ROMInfo = { name: file.name, size: file.size, type: file.type, system: selectedSystem, data: new Uint8Array(await file.arrayBuffer()) };
      setSelectedROM(romInfo);
      setProcessedData(null); // Limpa dados antigos
      setIsProcessing(true); // Inicia o estado de processamento
      addLogEntry('info', 'ROM selecionada. Enviando para o EmulatorJS iniciar...');
      
      // A função loadRomFile agora controla todo o fluxo de inicialização
      await loadRomFile(file);

    } catch (error) {
      addLogEntry('error', `Erro ao carregar ROM: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setIsProcessing(false);
    }
  }, [selectedSystem, addLogEntry, isReady, loadRomFile]);

  // Efeito para reagir à mudança de snapshot e disparar o worker
  useEffect(() => {
    // Só processa se a emulação estiver rodando e tivermos um snapshot válido
    if (!isRunning || !snapshot) return;

    // Evita reprocessamento se já estivermos no meio de um
    if (workerStatus === 'working') return;

    const hasMemoryData = snapshot.vram && snapshot.cram;
    const hasFramebuffer = snapshot.framebuffer && snapshot.width && snapshot.height;

    if (hasMemoryData) {
      addLogEntry('info', '[AUTO] Snapshot com VRAM/CRAM detectado. Enviando ao worker...');
      workerRef.current?.postMessage({
        type: 'EXTRACT_ASSETS',
        payload: { system: 'megadrive', vram: snapshot.vram, cram: snapshot.cram, sat: snapshot.sat, vsram: snapshot.vsram }
      });
    } else if (hasFramebuffer) {
      addLogEntry('info', '[AUTO] Snapshot com Framebuffer detectado. Enviando ao worker para fallback...');
      workerRef.current?.postMessage({
        type: 'EXTRACT_FROM_FRAMEBUFFER',
        payload: { framebuffer: snapshot.framebuffer, width: snapshot.width, height: snapshot.height }
      });
    } else {
      // Isso pode acontecer nos primeiros frames antes da memória ser populada.
      // Não é necessariamente um erro, mas é bom logar.
      addLogEntry('info', '[AUTO] Snapshot recebido, mas sem dados de memória ou framebuffer ainda.');
    }
  }, [isRunning, snapshot, workerStatus, addLogEntry]);

  useEffect(() => {
    if (emulatorError) addLogEntry('error', `EmulatorJS: ${emulatorError}`);
  }, [emulatorError, addLogEntry]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFileSelect(files[0]);
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleFileSelect(files[0]);
  }, [handleFileSelect]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div
          id="emulator-mount"
          ref={mountRef as any}
          className={'relative w-[640px] h-[480px] bg-black rounded-md shadow-inner border border-gray-800 overflow-hidden'}
        />
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Universal Asset Studio</h1>
          <p className="text-gray-600">Fase 1: Decodificação e Interface de Abas</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className={`w-3 h-3 rounded-full ${isReady ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
            <span className="text-sm text-gray-600">Motor: {isReady ? 'Pronto' : 'Inicializando'}</span>
            <div className={`w-3 h-3 rounded-full ml-4 ${isRunning ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-sm text-gray-600">Emulação: {isRunning ? 'Rodando' : 'Parado'}</span>
            {isProcessing && (
              <>
                <div className="w-3 h-3 rounded-full bg-blue-500 ml-4 animate-pulse" />
                <span className="text-sm text-blue-600">Processando...</span>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <SystemSelector selectedSystem={selectedSystem} onSystemChange={setSelectedSystem} disabled={isProcessing} />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Carregar ROM</h2>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'} ${!isReady ? 'opacity-50 pointer-events-none' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg text-gray-600 mb-2">Arraste um arquivo ROM aqui ou clique para selecionar</p>
            <p className="text-sm text-gray-500 mb-4">Aguarde o status "Motor: Pronto" antes de carregar.</p>
            <input type="file" accept=".bin,.smd,.gen,.md" onChange={handleFileInputChange} disabled={!isReady || isProcessing} className="hidden" id="rom-file-input" />
            <label htmlFor="rom-file-input" className={`inline-block px-6 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors ${!isReady || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
              Selecionar Arquivo
            </label>
          </div>

          {selectedROM && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {isProcessing ? <Loader className="w-5 h-5 text-blue-500 animate-spin" /> : <CheckCircle className="w-5 h-5 text-green-500" />}
                <span className="font-medium text-gray-700">ROM Selecionada</span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Nome:</strong> {selectedROM.name}</p>
                <p><strong>Status:</strong> {isProcessing ? (isRunning ? 'Emulação rodando, aguardando dados...' : 'Enviado ao motor, aguardando início...') : (isRunning ? 'Emulação ativa' : 'Pronto para iniciar')}</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md mb-6">
          <TabSystem 
            tabs={[
              {
                id: 'sprite-editor',
                label: 'Editor de Sprites',
                icon: <Image className="w-5 h-5" />,
                content: processedData ? (
                  <SpriteEditor data={processedData} />
                ) : (
                  <div className="text-center text-gray-500 py-12">
                    <h3 className="text-lg font-medium mb-2">Editor de Sprites</h3>
                    <p>{isProcessing ? 'Processando dados da ROM...' : 'Carregue uma ROM para extrair sprites'}</p>
                  </div>
                )
              },
              {
                id: 'analyzer',
                label: 'Analisador',
                icon: <BarChart3 className="w-5 h-5" />,
                content: <div className="p-4"><Analyzer frame={frameIR} captureState={captureState} snapshot={snapshot as any} /></div>
              }
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        <ROMTestRunner />

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Log do Sistema</h2>
          <LogPanel logs={logs} />
        </div>
      </div>
    </div>
  );
};

export default MainInterface;