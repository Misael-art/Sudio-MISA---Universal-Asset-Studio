// Universal Asset Studio - Componente de Log
// Fase 0: Painel de log obrigatório para exibir mensagens do worker

import React from 'react';
import { LogEntry } from '../types/worker';

/**
 * Props do componente LogPanel
 */
interface LogPanelProps {
  logs: LogEntry[];
}

/**
 * Componente LogPanel - Exibe mensagens de status do worker
 * Implementa o painel de log obrigatório da Fase 0
 * 
 * @param logs - Array de entradas de log para exibir
 * @returns Componente React do painel de log
 */
export const LogPanel: React.FC<LogPanelProps> = ({ logs }) => {
  /**
   * Formata timestamp para exibição legível
   * @param timestamp - Timestamp em milissegundos
   * @returns String formatada do horário
   */
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  /**
   * Determina a classe CSS baseada no nível do log
   * @param level - Nível do log (info, error, complete)
   * @returns String com classes CSS apropriadas
   */
  const getLogLevelClass = (level: LogEntry['level']): string => {
    switch (level) {
      case 'error':
        return 'text-red-400';
      case 'complete':
        return 'text-blue-400';
      case 'info':
      default:
        return 'text-green-400';
    }
  };

  /**
   * Obtém o ícone apropriado para o nível do log
   * @param level - Nível do log
   * @returns String com o ícone
   */
  const getLogIcon = (level: LogEntry['level']): string => {
    switch (level) {
      case 'error':
        return '[ERR]';
      case 'complete':
        return '[OK]';
      case 'info':
      default:
        return '[INFO]';
    }
  };

  return (
    <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto border border-gray-700">
      {/* Cabeçalho do log */}
      <div className="text-white mb-3 flex items-center gap-2 border-b border-gray-700 pb-2">
        <span className="text-xl">[SYS]</span>
        <span className="font-semibold">Universal Asset Studio - System Log</span>
        <span className="text-gray-500 text-xs ml-auto">
          {logs.length} {logs.length === 1 ? 'entrada' : 'entradas'}
        </span>
      </div>
      
      {/* Lista de logs */}
      <div className="space-y-1">
        {logs.length === 0 ? (
          <div className="text-gray-500 italic">
            Aguardando mensagens do worker...
          </div>
        ) : (
          logs.map((log, index) => (
            <div 
              key={index} 
              className={`flex items-start gap-2 ${getLogLevelClass(log.level)} hover:bg-gray-900 hover:bg-opacity-50 px-2 py-1 rounded transition-colors`}
            >
              {/* Ícone do nível */}
              <span className="text-xs mt-0.5 flex-shrink-0">
                {getLogIcon(log.level)}
              </span>
              
              {/* Timestamp */}
              <span className="text-gray-500 text-xs mt-0.5 flex-shrink-0 min-w-[70px]">
                [{formatTime(log.timestamp)}]
              </span>
              
              {/* Mensagem */}
              <span className="flex-1 break-words">
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
      
      {/* Indicador de scroll automático */}
      {logs.length > 0 && (
        <div className="text-gray-600 text-xs mt-2 text-center border-t border-gray-700 pt-2">
          [INFO] Scroll automático ativo - Últimas mensagens aparecem no final
        </div>
      )}
    </div>
  );
};

export default LogPanel;