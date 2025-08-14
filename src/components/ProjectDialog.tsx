// Implementando diálogo para gerenciamento de projetos de sprites
// Integração com sistema de assets existente (Zustand)
// Seguindo as especificações da Fase 2 do Universal Asset Studio

import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';

interface ProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (name: string) => void;
}

const ProjectDialog: React.FC<ProjectDialogProps> = ({
  isOpen,
  onClose,
  onCreateProject
}) => {
  const [projectName, setProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectName.trim()) return;
    
    setIsCreating(true);
    
    try {
      onCreateProject(projectName.trim());
      setProjectName('');
      onClose();
    } catch (error) {
      console.error('Erro ao criar projeto:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setProjectName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <FolderPlus className="w-5 h-5" />
            <span>Novo Projeto</span>
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome do Projeto
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Digite o nome do projeto..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
              disabled={isCreating}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              disabled={isCreating}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!projectName.trim() || isCreating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Criando...</span>
                </>
              ) : (
                <>
                  <FolderPlus className="w-4 h-4" />
                  <span>Criar Projeto</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectDialog;