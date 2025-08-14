// Implementando Fase 1: Componente CoreTester para validação visual do Genesis Plus GX
// Versão simplificada para debug e validação inicial

import React, { useState } from 'react';
import './CoreTester.css';

/**
 * Interface para logs do sistema
 */
interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

/**
 * Componente CoreTester - Validação visual do Genesis Plus GX
 * Implementa o Pilar 1.5: Interface de teste e validação
 */
const CoreTester: React.FC = () => {
  // Estados do componente
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  
  /**
   * Adiciona uma entrada ao log
   * Implementa o Pilar 3.1: Logging visível obrigatório
   */
  const addLog = (level: LogEntry['level'], message: string) => {
    const logEntry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      level,
      message
    };
    
    setLogs(prev => [logEntry, ...prev].slice(0, 100)); // Mantém apenas os últimos 100 logs
  };
  
  /**
   * Simula inicialização do core
   */
  const handleInitializeCore = () => {
    addLog('info', 'Iniciando carregamento do core Genesis Plus GX...');
    setStatus('loading');
    
    // Simula carregamento
    setTimeout(() => {
      addLog('success', 'Core carregado e pronto para uso!');
      setStatus('ready');
    }, 2000);
  };
  
  /**
   * Simula captura de snapshot
   */
  const handleCaptureSnapshot = () => {
    if (status !== 'ready') {
      addLog('warning', 'Core não está pronto. Inicialize primeiro.');
      return;
    }
    
    addLog('info', 'Capturando snapshot da memória...');
    
    setTimeout(() => {
      addLog('success', `Snapshot capturado! Timestamp: ${new Date().toLocaleTimeString()}`);
    }, 500);
  };
  
  // Log inicial
  React.useEffect(() => {
    addLog('info', 'CoreTester inicializado. Pronto para testar o Genesis Plus GX.');
  }, []);
  
  return (
    <div className="core-tester">
      <div className="core-tester__header">
        <h1>Genesis Plus GX - Core Tester</h1>
        <div className="core-tester__status">
          <span className={`status-indicator status-indicator--${status}`}>
            {status === 'idle' && 'Idle'}
            {status === 'loading' && 'Carregando'}
            {status === 'ready' && 'Pronto'}
            {status === 'error' && 'Erro'}
          </span>
        </div>
      </div>
      
      <div className="core-tester__content">
        {/* Painel de Controle */}
        <div className="core-tester__panel">
          <h2>Controles</h2>
          <div className="control-group">
            <button 
              onClick={handleInitializeCore}
              disabled={status === 'loading' || status === 'ready'}
              className="btn btn--primary"
            >
              {status === 'loading' ? 'Carregando...' : status === 'ready' ? 'Core Inicializado' : 'Inicializar Core'}
            </button>
            
            <button 
              onClick={handleCaptureSnapshot}
              disabled={status !== 'ready'}
              className="btn btn--secondary"
            >
              Capturar Snapshot
            </button>
          </div>
        </div>
        
        {/* Informações do Core */}
        <div className="core-tester__panel">
          <h2>Informações do Core</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Status:</label>
              <span>{status === 'ready' ? 'Inicializado' : 'Não inicializado'}</span>
            </div>
            <div className="info-item">
              <label>Módulo Carregado:</label>
              <span>{status === 'ready' ? 'Sim' : 'Não'}</span>
            </div>
          </div>
        </div>
        
        {/* Painel de Logs */}
        <div className="core-tester__panel core-tester__logs">
          <h2>Logs do Sistema</h2>
          <div className="logs-container">
            {logs.length === 0 ? (
              <p className="logs-empty">Nenhum log disponível</p>
            ) : (
              logs.map(log => (
                <div key={log.id} className={`log-entry log-entry--${log.level}`}>
                  <span className="log-timestamp">{log.timestamp}</span>
                  <span className="log-level">{log.level.toUpperCase()}</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoreTester;