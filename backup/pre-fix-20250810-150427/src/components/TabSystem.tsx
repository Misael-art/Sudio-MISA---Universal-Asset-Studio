// Implementando o Pilar 1.6: TabSystem.tsx
// Sistema de abas para Editor de Sprites, Mapeador de Cores e Analisador
// Interface crítica da Fase 1 que estava faltando

import React, { useState, ReactNode } from 'react';
import { Image, Palette, BarChart3 } from 'lucide-react';

export type TabId = 'emulator' | 'sprite-editor' | 'color-mapper' | 'analyzer';

export interface Tab {
  id: TabId;
  label: string;
  icon: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabSystemProps {
  tabs: Tab[];
  activeTab?: TabId;
  onTabChange?: (tabId: TabId) => void;
  className?: string;
}

/**
 * Sistema de abas principal da aplicação
 * Implementa as três abas obrigatórias da Fase 1:
 * - Editor de Sprites: Galeria de sprites extraídos
 * - Mapeador de Cores: Visualização de paletas
 * - Analisador: Estatísticas e dados técnicos
 */
export const TabSystem: React.FC<TabSystemProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = ''
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<TabId>(
    activeTab || (tabs[0] ? tabs[0].id : 'sprite-editor')
  );

  const currentActiveTab = activeTab || internalActiveTab;

  const handleTabClick = (tabId: TabId) => {
    if (onTabChange) {
      onTabChange(tabId);
    } else {
      setInternalActiveTab(tabId);
    }
  };

  const activeTabObj = tabs.find(tab => tab.id === currentActiveTab);
  const activeTabContent = activeTabObj ? activeTabObj.content : null;

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      {/* Cabeçalho das abas */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-0" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = tab.id === currentActiveTab;
            const isDisabled = tab.disabled;
            
            return (
              <button
                key={tab.id}
                onClick={() => !isDisabled && handleTabClick(tab.id)}
                disabled={isDisabled}
                className={[
                  'flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all',
                  isActive 
                    ? 'border-blue-500 text-blue-600 bg-blue-50' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                  isDisabled 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'cursor-pointer',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset'
                ].join(' ')}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="w-5 h-5">{tab.icon}</span>
                {tab.label}
                {isDisabled && (
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full ml-2">
                    Em breve
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Conteúdo da aba ativa */}
      <div className="p-6">
        {activeTabContent || (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">🚧</div>
            <p className="text-lg font-medium mb-2">Aba em desenvolvimento</p>
            <p className="text-sm">Este conteúdo será implementado em breve.</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Hook para criar as abas padrão do sistema
 * @param hasData - Se há dados processados disponíveis
 * @returns Array de abas configuradas
 */
export const useDefaultTabs = (hasData: boolean = false): Tab[] => {
  return [
    {
      id: 'sprite-editor',
      label: 'Editor de Sprites',
      icon: <Image className="w-5 h-5" />,
      content: null, // Será preenchido pelo componente SpriteEditor
      disabled: !hasData
    },
    {
      id: 'color-mapper',
      label: 'Mapeador de Cores',
      icon: <Palette className="w-5 h-5" />,
      content: null, // Será implementado na Fase 2
      disabled: true
    },
    {
      id: 'analyzer',
      label: 'Analisador',
      icon: <BarChart3 className="w-5 h-5" />,
      content: null, // Será implementado na Fase 2
      disabled: true
    }
  ];
};

export default TabSystem;