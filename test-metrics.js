// Script de teste automatizado para validar métricas do EmulatorJS
// Executa teste com ROM real e registra resultados no TESTE_RESULTADOS.md

/**
 * Função para executar teste automatizado de métricas
 * Carrega ROM, aguarda eventos e coleta métricas de boot/latência
 */
async function runMetricsTest() {
  console.log('🚀 [TEST] Iniciando teste automatizado de métricas...');
  
  // Aguardar carregamento da aplicação
  await new Promise(resolve => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', resolve);
    }
  });
  
  console.log('✅ [TEST] Aplicação carregada. Aguardando motor do emulador...');
  
  // Aguardar motor do emulador ficar pronto
  let attempts = 0;
  while (!window.EJS_emulator && attempts < 100) {
    await new Promise(r => setTimeout(r, 100));
    attempts++;
  }
  
  if (!window.EJS_emulator) {
    console.error('❌ [TEST] Motor do emulador não ficou disponível');
    return;
  }
  
  console.log('✅ [TEST] Motor do emulador disponível. Carregando ROM de teste...');
  
  // Carregar ROM de teste
  try {
    const response = await fetch('/data/rom_teste.bin');
    const arrayBuffer = await response.arrayBuffer();
    const file = new File([arrayBuffer], 'rom_teste.bin', { type: 'application/octet-stream' });
    
    // Simular carregamento via UI
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      // Criar evento de mudança simulado
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      
      const event = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(event);
      
      console.log('✅ [TEST] ROM carregada via input simulado');
    } else {
      console.warn('⚠️ [TEST] Input de arquivo não encontrado, tentando carregamento direto');
      
      // Tentar carregamento direto se disponível
      if (window.loadRomFile) {
        await window.loadRomFile(file);
      }
    }
    
  } catch (error) {
    console.error('❌ [TEST] Erro ao carregar ROM:', error);
    return;
  }
  
  // Aguardar eventos de inicialização
  console.log('⏳ [TEST] Aguardando eventos de inicialização...');
  
  let startReceived = false;
  let timeoutId;
  
  const waitForStart = new Promise((resolve, reject) => {
    // Listener para evento start
    const checkStart = () => {
      if (window.__UAS_METRICS && window.__UAS_METRICS.start !== undefined) {
        startReceived = true;
        clearTimeout(timeoutId);
        resolve();
      }
    };
    
    // Verificar a cada 500ms
    const interval = setInterval(() => {
      checkStart();
      if (startReceived) {
        clearInterval(interval);
      }
    }, 500);
    
    // Timeout de 30 segundos
    timeoutId = setTimeout(() => {
      clearInterval(interval);
      reject(new Error('Timeout aguardando evento start'));
    }, 30000);
  });
  
  try {
    await waitForStart;
    console.log('✅ [TEST] Evento start recebido!');
    
    // Aguardar mais um pouco para captura de sprites
    await new Promise(r => setTimeout(r, 2000));
    
    // Coletar métricas finais
    const metrics = window.__UAS_METRICS || {};
    
    console.log('📊 [TEST] Métricas coletadas:', metrics);
    
    // Verificar sprites extraídos
    const spriteCount = document.querySelectorAll('.sprite-item, [data-sprite], .sprite-preview').length;
    console.log(`🎨 [TEST] Sprites encontrados na UI: ${spriteCount}`);
    
    // Gerar relatório
    generateTestReport(metrics, spriteCount);
    
  } catch (error) {
    console.error('❌ [TEST] Erro durante teste:', error);
  }
}

/**
 * Gera relatório de teste e atualiza TESTE_RESULTADOS.md
 */
function generateTestReport(metrics, spriteCount) {
  const now = new Date();
  const timestamp = now.toLocaleString('pt-BR');
  
  const report = {
    timestamp,
    browser: navigator.userAgent,
    metrics,
    spriteCount,
    success: metrics.start !== undefined && spriteCount >= 5
  };
  
  console.log('📋 [TEST] Relatório gerado:', report);
  
  // Salvar no localStorage para recuperação
  localStorage.setItem('uas_test_report', JSON.stringify(report));
  
  // Exibir resumo no console
  console.log(`
=== RESUMO DO TESTE ===`);
  console.log(`Data/Hora: ${timestamp}`);
  console.log(`Boot Total: ${metrics.start || 'N/A'}ms`);
  console.log(`Primeiro Framebuffer: ${metrics.firstFramebuffer || 'N/A'}ms`);
  console.log(`Sprites Extraídos: ${spriteCount}`);
  console.log(`Status: ${report.success ? '✅ SUCESSO' : '❌ FALHA'}`);
  console.log(`========================\n`);
}

// Executar teste automaticamente após carregamento
if (typeof window !== 'undefined') {
  // Aguardar um pouco para garantir que a aplicação está totalmente carregada
  setTimeout(runMetricsTest, 2000);
}

// Exportar para uso manual
window.runMetricsTest = runMetricsTest;
window.generateTestReport = generateTestReport;

console.log('📝 [TEST] Script de teste carregado. Execute runMetricsTest() manualmente se necessário.');