// Implementando Pilar 2.9: Interface de importação com validação
// Componente de diálogo para importar sprites com validação em tempo real

import React, { useState, useCallback, useRef } from 'react';
import { X, Upload, FileImage, AlertTriangle, CheckCircle, Info, Settings } from 'lucide-react';
import { AssembledSprite } from '../types/genesis';
import {
  importSprite,
  importMultipleSprites,
  ImportValidationResult,
  ImportOptions,
  resizeSprite,
  optimizePalette
} from '../utils/spriteImporter';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (sprites: AssembledSprite[]) => void;
}

const ImportDialog: React.FC<ImportDialogProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [validationResults, setValidationResults] = useState<ImportValidationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Opções de importação
  const [options, setOptions] = useState<ImportOptions>({
    maxWidth: 128,
    maxHeight: 128,
    allowedFormats: ['image/png', 'image/webp', 'image/jpeg'],
    maxFileSize: 5 * 1024 * 1024,
    validateColors: true,
    maxColors: 16,
    autoGenerateId: true,
    paletteIndex: 0
  });
  
  // Função para processar arquivos
  const processFiles = useCallback(async (fileList: File[]) => {
    if (fileList.length === 0) return;
    
    setIsProcessing(true);
    setFiles(fileList);
    
    try {
      const results = await importMultipleSprites(fileList, options);
      setValidationResults(results);
    } catch (error) {
      console.error('Erro ao processar arquivos:', error);
      alert('Erro ao processar arquivos. Verifique o console para detalhes.');
    } finally {
      setIsProcessing(false);
    }
  }, [options]);
  
  // Handlers para drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }, [processFiles]);
  
  // Handler para seleção de arquivos
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
  }, [processFiles]);
  
  // Função para importar sprites válidos
  const handleImport = useCallback(() => {
    const validSprites = validationResults
      .filter(result => result.isValid && result.sprite)
      .map(result => result.sprite!);
    
    if (validSprites.length > 0) {
      onImport(validSprites);
      onClose();
    }
  }, [validationResults, onImport, onClose]);
  
  // Função para limpar arquivos
  const clearFiles = useCallback(() => {
    setFiles([]);
    setValidationResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);
  
  // Função para remover arquivo específico
  const removeFile = useCallback((index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newResults = validationResults.filter((_, i) => i !== index);
    setFiles(newFiles);
    setValidationResults(newResults);
  }, [files, validationResults]);
  
  // Estatísticas dos resultados
  const stats = {
    total: validationResults.length,
    valid: validationResults.filter(r => r.isValid).length,
    errors: validationResults.filter(r => r.errors.length > 0).length,
    warnings: validationResults.filter(r => r.warnings.length > 0).length
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-600 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Cabeçalho */}
        <div className="border-b border-gray-600 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Upload className="w-5 h-5" />
            <h2 className="text-lg font-semibold text-white">Importar Sprites</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Área de upload */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-500 bg-opacity-10'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <FileImage className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Arraste arquivos aqui ou clique para selecionar
              </h3>
              <p className="text-gray-400 mb-4">
                Suporte para PNG, WebP e JPEG. Máximo {(options.maxFileSize! / 1024 / 1024).toFixed(0)}MB por arquivo.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Selecionar Arquivos
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            
            {/* Opções avançadas */}
            <div className="border-t border-gray-600 pt-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors mb-4"
              >
                <Settings className="w-4 h-4" />
                <span>Opções Avançadas</span>
              </button>
              
              {showAdvanced && (
                <div className="bg-gray-700 rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Dimensões máximas */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Largura máxima: {options.maxWidth}px
                      </label>
                      <input
                        type="range"
                        min="8"
                        max="256"
                        step="8"
                        value={options.maxWidth}
                        onChange={(e) => setOptions({...options, maxWidth: Number(e.target.value)})}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Altura máxima: {options.maxHeight}px
                      </label>
                      <input
                        type="range"
                        min="8"
                        max="256"
                        step="8"
                        value={options.maxHeight}
                        onChange={(e) => setOptions({...options, maxHeight: Number(e.target.value)})}
                        className="w-full"
                      />
                    </div>
                    
                    {/* Cores máximas */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Cores máximas: {options.maxColors}
                      </label>
                      <input
                        type="range"
                        min="2"
                        max="256"
                        value={options.maxColors}
                        onChange={(e) => setOptions({...options, maxColors: Number(e.target.value)})}
                        className="w-full"
                      />
                    </div>
                    
                    {/* Índice da paleta */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Índice da paleta: {options.paletteIndex}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        value={options.paletteIndex}
                        onChange={(e) => setOptions({...options, paletteIndex: Number(e.target.value)})}
                        className="w-full"
                      />
                    </div>
                  </div>
                  
                  {/* Opções booleanas */}
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center space-x-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={options.validateColors}
                        onChange={(e) => setOptions({...options, validateColors: e.target.checked})}
                        className="rounded"
                      />
                      <span>Validar cores</span>
                    </label>
                    
                    <label className="flex items-center space-x-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={options.autoGenerateId}
                        onChange={(e) => setOptions({...options, autoGenerateId: e.target.checked})}
                        className="rounded"
                      />
                      <span>Gerar IDs automaticamente</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
            
            {/* Resultados da validação */}
            {validationResults.length > 0 && (
              <div className="border-t border-gray-600 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Resultados da Validação</h3>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-green-400 flex items-center space-x-1">
                      <CheckCircle className="w-4 h-4" />
                      <span>{stats.valid} válidos</span>
                    </span>
                    {stats.errors > 0 && (
                      <span className="text-red-400 flex items-center space-x-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{stats.errors} com erros</span>
                      </span>
                    )}
                    {stats.warnings > 0 && (
                      <span className="text-yellow-400 flex items-center space-x-1">
                        <Info className="w-4 h-4" />
                        <span>{stats.warnings} com avisos</span>
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Lista de arquivos */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {validationResults.map((result, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-3 ${
                        result.isValid
                          ? 'border-green-600 bg-green-600 bg-opacity-10'
                          : 'border-red-600 bg-red-600 bg-opacity-10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {result.isValid ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                          )}
                          <span className="text-white font-medium">{files[index]?.name}</span>
                          {result.sprite && (
                            <span className="text-gray-400 text-sm">
                              ({result.sprite.width}×{result.sprite.height}px)
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Erros */}
                      {result.errors.length > 0 && (
                        <div className="mb-2">
                          <h4 className="text-red-400 text-sm font-medium mb-1">Erros:</h4>
                          <ul className="text-red-300 text-sm space-y-1">
                            {result.errors.map((error, i) => (
                              <li key={i}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Avisos */}
                      {result.warnings.length > 0 && (
                        <div>
                          <h4 className="text-yellow-400 text-sm font-medium mb-1">Avisos:</h4>
                          <ul className="text-yellow-300 text-sm space-y-1">
                            {result.warnings.map((warning, i) => (
                              <li key={i}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Loading */}
            {isProcessing && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Processando arquivos...</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Rodapé */}
        <div className="border-t border-gray-600 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {files.length > 0 && (
              <button
                onClick={clearFiles}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Limpar Tudo
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={stats.valid === 0 || isProcessing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>
                Importar {stats.valid > 0 ? `${stats.valid} Sprite${stats.valid > 1 ? 's' : ''}` : 'Sprites'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportDialog;