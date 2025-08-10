// Universal Asset Studio - Worker de Emulação Simplificado
// Versão de teste para diagnosticar problemas de comunicação

console.log('[EmulationWorker] 🚀 Worker de emulação inicializado');

/**
 * Simula processamento de ROM
 */
function simulateROMProcessing(romData, system) {
    console.log(`[EmulationWorker] 📋 Processando ROM de ${romData.length} bytes para sistema ${system}`);
    
    // Simular delay de processamento
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('[EmulationWorker] ✅ Processamento simulado concluído');
            resolve({
                sprites: [
                    { id: 1, name: 'Sprite Teste 1', width: 32, height: 32 },
                    { id: 2, name: 'Sprite Teste 2', width: 16, height: 16 }
                ],
                palettes: [
                    { id: 1, name: 'Paleta Teste 1', colors: ['#FF0000', '#00FF00', '#0000FF'] }
                ],
                tiles: [
                    { id: 1, name: 'Tile Teste 1', data: new Uint8Array(64) }
                ]
            });
        }, 2000); // 2 segundos de delay
    });
}

/**
 * Handler de mensagens
 */
self.onmessage = async function(event) {
    const { type, payload } = event.data;
    
    console.log(`[EmulationWorker] 📨 Mensagem recebida: ${type}`);
    
    try {
        switch (type) {
            case 'LOAD_ROM':
                // Enviar status de início
                self.postMessage({
                    status: 'working',
                    message: 'Iniciando processamento da ROM...'
                });
                
                // Processar ROM
                const result = await simulateROMProcessing(payload.romData, payload.system);
                
                // Enviar resultado
                self.postMessage({
                    status: 'complete',
                    message: 'ROM processada com sucesso!',
                    payload: result
                });
                break;
                
            case 'INITIALIZE_EMULATOR':
                self.postMessage({
                    status: 'complete',
                    message: 'Emulador inicializado com sucesso'
                });
                break;
                
            default:
                console.log(`[EmulationWorker] ⚠️ Tipo de mensagem não reconhecido: ${type}`);
                self.postMessage({
                    status: 'error',
                    message: `Tipo de mensagem não suportado: ${type}`
                });
        }
    } catch (error) {
        console.error('[EmulationWorker] ❌ Erro no processamento:', error);
        self.postMessage({
            status: 'error',
            message: `Erro no worker: ${error.message}`
        });
    }
};

// Log de inicialização
console.log('[EmulationWorker] ✅ Worker pronto para receber mensagens');