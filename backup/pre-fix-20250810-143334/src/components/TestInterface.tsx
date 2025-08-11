// Componente de teste simples para verificar se a aplicação funciona

import React from 'react';

export const TestInterface: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Universal Asset Studio - Teste
        </h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-lg text-gray-600">
            Se você está vendo esta mensagem, a aplicação React está funcionando corretamente!
          </p>
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 font-medium">
              ✅ Fase 0: Fundação básica estabelecida
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestInterface;