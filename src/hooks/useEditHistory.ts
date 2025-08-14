// Implementando a Fase 2: Hook para gerenciar histórico de edição (undo/redo)
// Este hook permite desfazer e refazer ações no SpriteEditor
// Seguindo as especificações da Fase 2 do Universal Asset Studio

import { useState, useCallback, useRef } from 'react';
import { ImageDataUtils } from '../components/DrawingTools';

export interface HistoryEntry {
  id: string;
  imageData: ImageData;
  action: string;
  timestamp: number;
}

export interface EditHistoryState {
  entries: HistoryEntry[];
  currentIndex: number;
  maxEntries: number;
}

export const useEditHistory = (initialImageData: ImageData | null, maxEntries: number = 50) => {
  const [history, setHistory] = useState<EditHistoryState>({
    entries: [],
    currentIndex: -1,
    maxEntries
  });
  
  const entryIdCounter = useRef(0);

  // Inicializa histórico com ImageData inicial
  const initializeHistory = useCallback((imageData: ImageData) => {
    const entry: HistoryEntry = {
      id: `entry_${entryIdCounter.current++}`,
      imageData: ImageDataUtils.cloneImageData(imageData),
      action: 'initial',
      timestamp: Date.now()
    };
    
    setHistory({
      entries: [entry],
      currentIndex: 0,
      maxEntries
    });
  }, [maxEntries]);

  // Adiciona nova entrada ao histórico
  const saveToHistory = useCallback((imageData: ImageData, action: string) => {
    setHistory(prev => {
      const newEntry: HistoryEntry = {
        id: `entry_${entryIdCounter.current++}`,
        imageData: ImageDataUtils.cloneImageData(imageData),
        action,
        timestamp: Date.now()
      };
      
      // Remove entradas após o índice atual (quando fazemos algo após um undo)
      const newEntries = prev.entries.slice(0, prev.currentIndex + 1);
      newEntries.push(newEntry);
      
      // Limita o número máximo de entradas
      if (newEntries.length > prev.maxEntries) {
        newEntries.shift(); // Remove a primeira entrada
        return {
          ...prev,
          entries: newEntries,
          currentIndex: newEntries.length - 1
        };
      }
      
      return {
        ...prev,
        entries: newEntries,
        currentIndex: newEntries.length - 1
      };
    });
  }, []);

  // Desfaz a última ação
  const undo = useCallback((): ImageData | null => {
    if (history.currentIndex <= 0) {
      return null; // Não há nada para desfazer
    }
    
    const newIndex = history.currentIndex - 1;
    const entry = history.entries[newIndex];
    
    setHistory(prev => ({
      ...prev,
      currentIndex: newIndex
    }));
    
    return ImageDataUtils.cloneImageData(entry.imageData);
  }, [history.currentIndex, history.entries]);

  // Refaz a próxima ação
  const redo = useCallback((): ImageData | null => {
    if (history.currentIndex >= history.entries.length - 1) {
      return null; // Não há nada para refazer
    }
    
    const newIndex = history.currentIndex + 1;
    const entry = history.entries[newIndex];
    
    setHistory(prev => ({
      ...prev,
      currentIndex: newIndex
    }));
    
    return ImageDataUtils.cloneImageData(entry.imageData);
  }, [history.currentIndex, history.entries]);

  // Limpa todo o histórico
  const clearHistory = useCallback(() => {
    setHistory({
      entries: [],
      currentIndex: -1,
      maxEntries
    });
  }, [maxEntries]);

  // Obtém a entrada atual
  const getCurrentEntry = useCallback((): HistoryEntry | null => {
    if (history.currentIndex >= 0 && history.currentIndex < history.entries.length) {
      return history.entries[history.currentIndex];
    }
    return null;
  }, [history.currentIndex, history.entries]);

  // Obtém informações sobre o estado do histórico
  const getHistoryInfo = useCallback(() => {
    return {
      canUndo: history.currentIndex > 0,
      canRedo: history.currentIndex < history.entries.length - 1,
      currentIndex: history.currentIndex,
      totalEntries: history.entries.length,
      currentAction: getCurrentEntry()?.action || 'none',
      memoryUsage: history.entries.length * (history.entries[0]?.imageData.data.length || 0) * 4 // bytes aproximados
    };
  }, [history, getCurrentEntry]);

  // Obtém lista de ações para exibição
  const getActionsList = useCallback(() => {
    return history.entries.map((entry, index) => ({
      id: entry.id,
      action: entry.action,
      timestamp: entry.timestamp,
      isCurrent: index === history.currentIndex,
      index
    }));
  }, [history.entries, history.currentIndex]);

  // Vai para uma entrada específica do histórico
  const goToHistoryEntry = useCallback((index: number): ImageData | null => {
    if (index < 0 || index >= history.entries.length) {
      return null;
    }
    
    const entry = history.entries[index];
    
    setHistory(prev => ({
      ...prev,
      currentIndex: index
    }));
    
    return ImageDataUtils.cloneImageData(entry.imageData);
  }, [history.entries]);

  // Inicializa histórico se necessário
  if (initialImageData && history.entries.length === 0) {
    initializeHistory(initialImageData);
  }

  return {
    // Estado
    history,
    
    // Ações principais
    saveToHistory,
    undo,
    redo,
    clearHistory,
    initializeHistory,
    
    // Navegação
    goToHistoryEntry,
    
    // Informações
    getHistoryInfo,
    getActionsList,
    getCurrentEntry
  };
};

export default useEditHistory;