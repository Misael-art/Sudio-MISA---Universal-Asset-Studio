import React, { useState, useCallback } from 'react';
import { Play, Square, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { ROMTestSuite, ROMTestResult, TestConfig } from '../utils/romTestSuite';

/**
 * Componente para executar e exibir resultados da suíte de testes de ROMs
 */
export const ROMTestRunner: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [results, setResults] = useState<ROMTestResult[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    successful: number;
    failed: number;
    successRate: number;
    averageTime: number;
  } | null>(null);
  const [testSuite] = useState(() => new ROMTestSuite());

  /**
   * Inicia a suíte de testes
   */
  const handleStartTests = useCallback(async () => {
    setIsRunning(true);
    setProgress(0);
    setCurrentTest('');
    setResults([]);
    setStats(null);

    // Configurar callbacks
    testSuite.setCallbacks({
      onProgress: (progress, current) => {
        setProgress(progress);
        setCurrentTest(current);
      },
      onResult: (result) => {
        setResults(prev => [...prev, result]);
      },
      onComplete: (allResults) => {
        setStats(testSuite.getStats());
        setIsRunning(false);
        setCurrentTest('');
        console.log('🏁 Suíte de testes concluída!');
      }
    });

    try {
      await testSuite.runTestSuite();
    } catch (error) {
      console.error('Erro na suíte de testes:', error);
      setIsRunning(false);
    }
  }, [testSuite]);

  /**
   * Para a suíte de testes
   */
  const handleStopTests = useCallback(() => {
    setIsRunning(false);
    setCurrentTest('Parando testes...');
    // Note: Em uma implementação real, seria necessário cancelar os testes em andamento
  }, []);

  /**
   * Renderiza o status de um resultado
   */
  const renderResultStatus = (result: ROMTestResult) => {
    if (result.success) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle size={16} />
          <span>Sucesso</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2 text-red-600">
          <XCircle size={16} />
          <span>Falha</span>
        </div>
      );
    }
  };

  /**
   * Renderiza informações dos assets extraídos
   */
  const renderAssetInfo = (result: ROMTestResult) => {
    if (!result.extractedAssets) return null;

    const { sprites, palettes, tiles } = result.extractedAssets;
    return (
      <div className="text-xs text-gray-500 mt-1">
        {sprites}S / {palettes}P / {tiles}T
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            🧪 Suíte de Testes de ROMs
          </h2>
          <p className="text-gray-600 text-sm">
            Testa automaticamente todas as ROMs da pasta /data/
          </p>
        </div>
        
        <div className="flex gap-2">
          {!isRunning ? (
            <button
              onClick={handleStartTests}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <Play size={16} />
              Iniciar Testes
            </button>
          ) : (
            <button
              onClick={handleStopTests}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              <Square size={16} />
              Parar Testes
            </button>
          )}
        </div>
      </div>

      {/* Barra de Progresso */}
      {isRunning && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              Progresso: {progress.toFixed(1)}%
            </span>
            <span className="text-sm text-blue-600">
              {currentTest}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
            <div className="text-xs text-green-600">Sucessos</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-xs text-red-600">Falhas</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.successRate.toFixed(1)}%</div>
            <div className="text-xs text-blue-600">Taxa de Sucesso</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.averageTime.toFixed(0)}ms</div>
            <div className="text-xs text-yellow-600">Tempo Médio</div>
          </div>
        </div>
      )}

      {/* Lista de Resultados */}
      {results.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
            <FileText size={18} />
            Resultados dos Testes ({results.length})
          </h3>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div 
                key={index}
                className={[
                  'p-3 rounded-lg border-l-4 transition-all',
                  result.success 
                    ? 'bg-green-50 border-green-500' 
                    : 'bg-red-50 border-red-500'
                ].join(' ')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-800">
                        {result.fileName}
                      </span>
                      <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                        {result.system}
                      </span>
                      <span className="text-xs text-gray-500">
                        {(result.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    {renderAssetInfo(result)}
                    {result.error && (
                      <div className="text-xs text-red-600 mt-1">
                        Erro: {result.error}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock size={12} />
                      {result.processingTime.toFixed(0)}ms
                    </div>
                    {renderResultStatus(result)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensagem quando não há resultados */}
      {!isRunning && results.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhum teste executado ainda.</p>
          <p className="text-sm">Clique em "Iniciar Testes" para começar.</p>
        </div>
      )}
    </div>
  );
};

export default ROMTestRunner;