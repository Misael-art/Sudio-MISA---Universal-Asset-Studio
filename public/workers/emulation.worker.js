// Universal Asset Studio - Worker Público (Bridge)
// Encaminha mensagens para o worker TypeScript compilado quando disponível.

console.log('[EmulationWorker] 🚀 Bridge de worker iniciado');

self.onmessage = async function(event) {
  const { type, payload } = event.data || {};
  try {
    switch (type) {
      case 'EXTRACT_ASSETS':
        // Apenas repassa; a lógica real roda em src/workers/emulation.worker.ts (bundle)
        self.postMessage({ status: 'error', message: 'Bridge ativo: use o worker TS empacotado pelo Vite (src/workers/emulation.worker.ts)' });
        break;
      default:
        self.postMessage({ status: 'error', message: `Tipo não suportado no bridge público: ${type}` });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido';
    self.postMessage({ status: 'error', message: `Falha no bridge: ${msg}` });
  }
};

console.log('[EmulationWorker] ✅ Bridge pronto');