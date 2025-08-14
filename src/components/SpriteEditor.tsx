// Implementando a Fase 2: SpriteEditor avançado com edição pixel-a-pixel
// Este componente permite editar sprites extraídos do Genesis Plus GX
// Seguindo as especificações da Fase 2 do Universal Asset Studio

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Grid, List, Download, ZoomIn, ZoomOut, Undo, Redo, Save, Palette, Brush, Eraser, Droplet, Square, FileImage, Grid3X3, Upload, FolderOpen, Plus } from 'lucide-react';
import { validateSpriteDimensions, generateValidationReport, SpriteValidationResult } from '../tests/spriteValidation';
import { DRAWING_TOOLS, DrawingTools, DrawingState, useDrawingState } from './DrawingTools';
import ColorPalette from './ColorPalette';
import { useCanvasEditor } from '../hooks/useCanvasEditor';
import { useEditHistory } from '../hooks/useEditHistory';
import PreviewPanel from './PreviewPanel';
import SpriteGallery from './SpriteGallery';
import ExportDialog from './ExportDialog';
import ImportDialog from './ImportDialog';
import ProjectDialog from './ProjectDialog';
import { useAssetsStore, EditedSprite } from '../state/assets';

// Importando tipos do Genesis
import { AssembledSprite } from '../types/genesis';

interface ProcessedMegaDriveData {
  sprites: AssembledSprite[];
  tiles: any[];
  palettes: any[];
  metadata: {
    romName: string;
    timestamp: number;
  };
}

export interface SpriteEditorProps {
  data: ProcessedMegaDriveData | null;
  className?: string;
}

const SpriteEditor: React.FC<SpriteEditorProps> = ({ data, className = '' }) => {
  // Integração com Zustand store
  const {
    editedSprites,
    isEditing: storeIsEditing,
    editingSprite: storeEditingSprite,
    currentProjectId,
    spriteProjects,
    addEditedSprite,
    updateEditedSprite,
    startEditing: storeStartEditing,
    stopEditing: storeStopEditing,
    saveCurrentEdit,
    createProject,
    loadProject,
    saveProject
  } = useAssetsStore();
  
  // Estados básicos da galeria
  const [selectedSprite, setSelectedSprite] = useState<AssembledSprite | null>(null);
  const [zoom, setZoom] = useState(4);
  const [validationResults, setValidationResults] = useState<SpriteValidationResult[]>([]);
  
  // Estados para edição avançada
  const [isEditing, setIsEditing] = useState(false);
  const [editingSprite, setEditingSprite] = useState<ImageData | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportMode, setExportMode] = useState<'single' | 'sheet'>('single');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Estados para ferramentas de desenho
  const drawingState = useDrawingState(selectedSprite?.imageData || null);
  const editHistory = useEditHistory(editingSprite);
  
  // Canvas editor
  const canvasEditor = useCanvasEditor({
    imageData: editingSprite,
    scale: zoom,
    drawingState: drawingState.drawingState,
    onImageDataChange: (newImageData) => {
      setEditingSprite(newImageData);
    },
    onColorPick: (color) => {
      drawingState.updateColor(color);
    },
    onHistorySave: (action) => {
      if (editingSprite) {
        editHistory.saveToHistory(editingSprite, action);
      }
    }
  });
  
  // Dados processados
  const sprites = data?.sprites || [];
  
  // Validação de sprites
  useEffect(() => {
    if (sprites.length > 0) {
      const results = validateSpriteDimensions(sprites);
      setValidationResults(results);
    }
  }, [sprites]);
  

  
  // Função para iniciar edição integrada com Zustand
  const startEditing = useCallback((sprite: AssembledSprite) => {
    // Cria cópia do ImageData para edição
    const editData = new ImageData(
      new Uint8ClampedArray(sprite.imageData.data),
      sprite.width,
      sprite.height
    );
    
    // Adiciona sprite ao store como EditedSprite
    const editedSpriteId = addEditedSprite({
      originalIndex: sprite.id,
      imageData: editData,
      width: sprite.width,
      height: sprite.height,
      paletteIndex: sprite.paletteIndex || 0
    });
    
    // Busca o sprite editado criado
    const editedSprite = editedSprites.find(s => s.id === editedSpriteId);
    if (editedSprite) {
      storeStartEditing(editedSprite);
    }
    
    setEditingSprite(editData);
    setSelectedSprite(sprite);
    setIsEditing(true);
    setShowTools(true);
    
    // Inicializa histórico
    editHistory.initializeHistory(editData);
  }, [editHistory, addEditedSprite, editedSprites, storeStartEditing]);
  
  // Função para finalizar edição
  const finishEditing = useCallback(() => {
    storeStopEditing();
    setIsEditing(false);
    setEditingSprite(null);
    setShowTools(false);
    setShowPalette(false);
    editHistory.clearHistory();
  }, [editHistory, storeStopEditing]);
  
  // Função para salvar sprite editado
  const saveEditedSprite = useCallback(() => {
    if (!editingSprite || !storeEditingSprite) return;
    
    // Salva no store Zustand
    updateEditedSprite(storeEditingSprite.id, editingSprite);
    
    // Salva no projeto atual se existir
    if (currentProjectId) {
      saveProject();
    }
    
    console.log('Sprite editado salvo:', storeEditingSprite.id);
    finishEditing();
  }, [editingSprite, storeEditingSprite, updateEditedSprite, currentProjectId, saveProject, finishEditing]);
  
  // Função para abrir diálogo de exportação de sprite individual
  const handleExportSprite = useCallback((sprite: AssembledSprite) => {
    setSelectedSprite(sprite);
    setExportMode('single');
    setShowExportDialog(true);
  }, []);
  
  // Função para abrir diálogo de exportação de sprite sheet
  const handleExportSpriteSheet = useCallback(() => {
    if (sprites.length === 0) return;
    setExportMode('sheet');
    setShowExportDialog(true);
  }, [sprites]);
  
  // Função para importar sprites
  const handleImportSprites = useCallback((importedSprites: AssembledSprite[]) => {
    // Adiciona sprites importados ao store
    importedSprites.forEach(sprite => {
      addEditedSprite({
        originalIndex: -1, // Marca como sprite importado
        imageData: sprite.imageData,
        width: sprite.width,
        height: sprite.height,
        paletteIndex: sprite.paletteIndex || 0
      });
    });
    
    // Salva no projeto atual se existir
    if (currentProjectId) {
      saveProject();
    }
    
    console.log('Sprites importados:', importedSprites);
    alert(`${importedSprites.length} sprite(s) importado(s) com sucesso!`);
  }, [addEditedSprite, currentProjectId, saveProject]);
  
  // Função para criar novo projeto
  const handleCreateProject = useCallback((name: string) => {
    const projectId = createProject(name);
    console.log('Projeto criado:', projectId);
    setShowProjectDialog(false);
  }, [createProject]);
  
  // Função para carregar projeto
  const handleLoadProject = useCallback((projectId: string) => {
    loadProject(projectId);
    console.log('Projeto carregado:', projectId);
  }, [loadProject]);
  
  // Função para salvar projeto atual
  const handleSaveProject = useCallback(() => {
    if (currentProjectId) {
      saveProject();
      console.log('Projeto salvo:', currentProjectId);
    }
  }, [currentProjectId, saveProject]);
  
  // Função para desfazer
  const handleUndo = useCallback(() => {
    const undoData = editHistory.undo();
    if (undoData) {
      setEditingSprite(undoData);
    }
  }, [editHistory]);
  
  // Função para refazer
  const handleRedo = useCallback(() => {
    const redoData = editHistory.redo();
    if (redoData) {
      setEditingSprite(redoData);
    }
  }, [editHistory]);
  
  // Renderiza canvas do sprite selecionado
  useEffect(() => {
    if (selectedSprite && canvasRef.current && !isEditing) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      canvas.width = selectedSprite.width * zoom;
      canvas.height = selectedSprite.height * zoom;
      
      ctx.imageSmoothingEnabled = false;
      
      // Cria canvas temporário para o ImageData original
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCanvas.width = selectedSprite.width;
      tempCanvas.height = selectedSprite.height;
      tempCtx.putImageData(selectedSprite.imageData, 0, 0);
      
      // Desenha escalado no canvas principal
      ctx.drawImage(
        tempCanvas,
        0, 0, selectedSprite.width, selectedSprite.height,
        0, 0, canvas.width, canvas.height
      );
    }
  }, [selectedSprite, zoom, isEditing]);
  
  if (!data || sprites.length === 0) {
    return (
      <div className={`bg-gray-900 border border-gray-700 rounded-lg p-6 ${className}`}>
        <div className="text-center text-gray-400">
          <Palette className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Nenhum Sprite Encontrado</h3>
          <p>Carregue dados do Genesis Plus GX para visualizar sprites.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg ${className}`}>
      {/* Cabeçalho */}
      <div className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Editor de Sprites</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">
              {sprites.length} sprites
            </span>
            {data.metadata.romName && (
              <span className="text-sm text-blue-400 font-mono">
                {data.metadata.romName}
              </span>
            )}
          </div>
        </div>
        
        {/* Controles de projeto */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowProjectDialog(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 transition-colors"
              title="Novo Projeto"
            >
              <Plus className="w-4 h-4" />
              <span>Projeto</span>
            </button>
            
            {spriteProjects.length > 0 && (
              <select
                value={currentProjectId || ''}
                onChange={(e) => e.target.value && handleLoadProject(e.target.value)}
                className="bg-gray-700 text-white px-2 py-1 rounded text-sm border border-gray-600"
              >
                <option value="">Selecionar projeto...</option>
                {spriteProjects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({project.sprites.length} sprites)
                  </option>
                ))}
              </select>
            )}
            
            {currentProjectId && (
              <button
                onClick={handleSaveProject}
                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm flex items-center space-x-1 transition-colors"
                title="Salvar Projeto"
              >
                <Save className="w-3 h-3" />
              </button>
            )}
          </div>
          
          {/* Controles principais */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowImportDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Importar</span>
            </button>
            <button
              onClick={handleExportSpriteSheet}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Grid3X3 className="w-4 h-4" />
              <span>Exportar Sheet</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Abas para sprites originais e editados */}
      <div className="border-b border-gray-700 mb-4">
        <div className="flex space-x-4">
          <button
            className="px-4 py-2 text-white border-b-2 border-blue-500 font-medium"
          >
            Sprites Originais ({sprites.length})
          </button>
          {editedSprites.length > 0 && (
            <button
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Sprites Editados ({editedSprites.length})
            </button>
          )}
        </div>
      </div>
      
      <div className="flex h-96">
        {/* Galeria de sprites melhorada */}
        <div className="flex-1">
          <SpriteGallery
            sprites={sprites}
            selectedSprite={selectedSprite}
            onSpriteSelect={setSelectedSprite}
            onSpriteEdit={startEditing}
            onSpriteExport={handleExportSprite}
            className="h-full border-0 rounded-none"
          />
        </div>
        
        {/* Painel de detalhes e edição */}
        {selectedSprite && (
          <div className="w-80 border-l border-gray-700 flex flex-col">
            {/* Cabeçalho do sprite */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-white">
                  Sprite #{selectedSprite.id}
                </h3>
                {!isEditing ? (
                  <button
                    onClick={() => startEditing(selectedSprite)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 transition-colors"
                  >
                    <Brush className="w-3 h-3" />
                    <span>Editar</span>
                  </button>
                ) : (
                  <div className="flex space-x-1">
                    <button
                      onClick={saveEditedSprite}
                      className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-sm flex items-center space-x-1 transition-colors"
                    >
                      <Save className="w-3 h-3" />
                      <span>Salvar</span>
                    </button>
                    <button
                      onClick={finishEditing}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-sm transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
              
              <div className="text-sm text-gray-400 space-y-1">
                <div>Dimensões: {selectedSprite.width}×{selectedSprite.height}</div>
                <div>Tamanho: {selectedSprite.width * selectedSprite.height} pixels</div>
                <div>Paleta: {selectedSprite.paletteIndex}</div>
              </div>
            </div>
            
            {/* Ferramentas de edição */}
            {isEditing && showTools && (
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-white">Ferramentas</h4>
                  <div className="flex space-x-1">
                    <button
                      onClick={handleUndo}
                      disabled={!editHistory.getHistoryInfo().canUndo}
                      className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Desfazer"
                    >
                      <Undo className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleRedo}
                      disabled={!editHistory.getHistoryInfo().canRedo}
                      className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Refazer"
                    >
                      <Redo className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowPalette(!showPalette)}
                      className={`p-1 rounded transition-colors ${
                        showPalette ? 'text-blue-400' : 'text-gray-400 hover:text-white'
                      }`}
                      title="Paleta de Cores"
                    >
                      <Palette className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <DrawingTools
                  drawingState={drawingState}
                  className="mb-3"
                />
                
                {showPalette && (
                  <ColorPalette
                  selectedColor={drawingState.drawingState.color}
                  onColorSelect={drawingState.updateColor}
                  className="mt-3"
                />
                )}
              </div>
            )}
            
            {/* Canvas de edição e preview */}
            <div className="flex-1 p-4 overflow-auto">
              {isEditing ? (
                <div className="space-y-4">
                  {/* Canvas de edição */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Editor:</span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setZoom(Math.max(1, zoom - 1))}
                          className="p-1 rounded text-gray-400 hover:text-white"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="text-sm text-white font-mono w-8 text-center">{zoom}x</span>
                        <button
                          onClick={() => setZoom(Math.min(16, zoom + 1))}
                          className="p-1 rounded text-gray-400 hover:text-white"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 rounded-lg p-4 overflow-auto">
                      <div className="bg-white/10 rounded inline-block p-2">
                        <canvas
                          ref={canvasEditor.canvasRef}
                          onMouseDown={canvasEditor.handleMouseDown}
                          onMouseMove={canvasEditor.handleMouseMove}
                          onMouseUp={canvasEditor.handleMouseUp}
                          onMouseLeave={canvasEditor.handleMouseLeave}
                          className="border border-gray-600 rounded"
                          style={{ 
                            cursor: canvasEditor.getCursor(),
                            imageRendering: 'pixelated'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Preview em tempo real */}
                  <PreviewPanel
                    imageData={editingSprite}
                    originalImageData={selectedSprite.imageData}
                    scale={2}
                    showComparison={true}
                    className=""
                  />
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Visualização:</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setZoom(Math.max(1, zoom - 1))}
                        className="p-1 rounded text-gray-400 hover:text-white"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-white font-mono w-8 text-center">{zoom}x</span>
                      <button
                        onClick={() => setZoom(Math.min(16, zoom + 1))}
                        className="p-1 rounded text-gray-400 hover:text-white"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-4 overflow-auto">
                    <div className="bg-white/10 rounded inline-block p-2">
                      <canvas
                        ref={canvasRef}
                        className="border border-gray-600 rounded"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Botões de exportação */}
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => handleExportSprite(selectedSprite)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <FileImage className="w-4 h-4" />
                  <span>Exportar Sprite</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Diálogo de exportação */}
      {showExportDialog && (
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          mode={exportMode}
          selectedSprite={exportMode === 'single' ? selectedSprite : null}
          sprites={exportMode === 'sheet' ? sprites : []}
          romName={data?.metadata.romName}
        />
      )}
      
      {/* Diálogo de importação */}
      {showImportDialog && (
        <ImportDialog
          isOpen={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          onImport={handleImportSprites}
        />
      )}
      
      {/* Diálogo de projeto */}
      {showProjectDialog && (
        <ProjectDialog
          isOpen={showProjectDialog}
          onClose={() => setShowProjectDialog(false)}
          onCreateProject={handleCreateProject}
        />
      )}
    </div>
  );
};

export default SpriteEditor;