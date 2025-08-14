import React from 'react';
import { MainInterface } from './components/MainInterface';
import './App.css';

/**
 * Componente principal da aplicação - Fase 2
 * Renderiza o MainInterface com SpriteEditor avançado
 * Implementando Fase 2: Editor de Sprites com edição pixel-a-pixel,
 * sistema de paletas, ferramentas de desenho, preview em tempo real,
 * exportação/importação e integração com Zustand
 */
function App() {
  return (
    <div className="App">
      <MainInterface />
    </div>
  );
}

export default App;
