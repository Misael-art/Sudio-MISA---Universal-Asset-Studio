// Universal Asset Studio - Seletor de Sistema
// Fase 0: Componente para seleção de console/sistema

import React from 'react';
import { SupportedSystem } from '../types/worker';
import { Gamepad2, Monitor, Smartphone } from 'lucide-react';

/**
 * Props do componente SystemSelector
 */
interface SystemSelectorProps {
  selectedSystem: SupportedSystem | null;
  onSystemChange: (system: SupportedSystem) => void;
  disabled?: boolean;
}

/**
 * Informações dos sistemas suportados
 */
interface SystemInfo {
  id: SupportedSystem;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

/**
 * Componente SystemSelector - Permite seleção do sistema de origem
 * Implementa seletor de console conforme especificação da Fase 0
 * 
 * @param selectedSystem - Sistema atualmente selecionado
 * @param onSystemChange - Callback para mudança de sistema
 * @param disabled - Se o seletor está desabilitado
 * @returns Componente React do seletor de sistema
 */
export const SystemSelector: React.FC<SystemSelectorProps> = ({
  selectedSystem,
  onSystemChange,
  disabled = false
}) => {
  /**
   * Configuração dos sistemas suportados
   */
  const systems: SystemInfo[] = [
    {
      id: 'megadrive',
      name: 'Sega Genesis/Mega Drive',
      description: '16-bit, sprites 4bpp, 4 paletas de 16 cores',
      icon: <Gamepad2 className="w-6 h-6" />,
      color: 'bg-blue-500'
    },
    {
      id: 'snes',
      name: 'Super Nintendo (SNES)',
      description: '16-bit, sprites 2/4/8bpp, 256 cores',
      icon: <Monitor className="w-6 h-6" />,
      color: 'bg-purple-500'
    },
    {
      id: 'gameboy',
      name: 'Game Boy / Game Boy Color',
      description: '8-bit, sprites 2bpp, 4 tons de cinza',
      icon: <Smartphone className="w-6 h-6" />,
      color: 'bg-green-500'
    }
  ];

  /**
   * Manipula a seleção de um sistema
   * @param system - Sistema selecionado
   */
  const handleSystemSelect = (system: SupportedSystem) => {
    if (!disabled) {
      onSystemChange(system);
    }
  };

  return (
    <div className="space-y-4">
      {/* Título */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Selecione o Sistema de Origem
        </h3>
        <p className="text-sm text-gray-600">
          Escolha o console do qual você deseja extrair sprites
        </p>
      </div>

      {/* Grid de sistemas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {systems.map((system) => {
          const isSelected = selectedSystem === system.id;
          const isDisabled = disabled;
          
          return (
            <button
              key={system.id}
              onClick={() => handleSystemSelect(system.id)}
              disabled={isDisabled}
              className={[
                'relative p-4 rounded-lg border-2 transition-all duration-200',
                isSelected 
                  ? 'border-blue-500 bg-blue-50 shadow-lg scale-105' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md',
                isDisabled 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'cursor-pointer hover:scale-102',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50'
              ].join(' ')}
            >
              {/* Indicador de seleção */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">OK</span>
                </div>
              )}
              
              {/* Ícone do sistema */}
              <div className={[
                'w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3',
                system.color,
                'text-white',
                isSelected ? 'shadow-lg' : ''
              ].join(' ')}>
                {system.icon}
              </div>
              
              {/* Nome do sistema */}
              <h4 className={[
                'font-semibold text-sm mb-2 text-center',
                isSelected ? 'text-blue-700' : 'text-gray-800'
              ].join(' ')}>
                {system.name}
              </h4>
              
              {/* Descrição */}
              <p className={[
                'text-xs text-center leading-relaxed',
                isSelected ? 'text-blue-600' : 'text-gray-600'
              ].join(' ')}>
                {system.description}
              </p>
              
              {/* Status */}
              <div className="mt-3 text-center">
                <span className={[
                  'inline-block px-2 py-1 rounded-full text-xs font-medium',
                  isSelected 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600'
                ].join(' ')}>
                  {isSelected ? 'Selecionado' : 'Disponível'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Informação adicional */}
      {selectedSystem && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-blue-500">[INFO]</span>
            <span className="text-sm text-blue-700 font-medium">
              Sistema selecionado: {systems.find(s => s.id === selectedSystem)?.name}
            </span>
          </div>
          <p className="text-xs text-blue-600 mt-1 ml-6">
            O worker será configurado automaticamente para este sistema.
          </p>
        </div>
      )}
    </div>
  );
};

export default SystemSelector;