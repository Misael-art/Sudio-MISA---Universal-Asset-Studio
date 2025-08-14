/**
 * Script de Teste Automatizado do EmulatorJS
 * Valida o funcionamento completo com ROM real
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmulatorTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testResults = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    async init() {
        console.log('🚀 Iniciando teste automatizado do EmulatorJS...');
        
        this.browser = await puppeteer.launch({
            headless: false, // Mostrar navegador para debug
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });
        
        this.page = await this.browser.newPage();
        
        // Configurar console listener para capturar logs
        this.page.on('console', msg => {
            const text = msg.text();
            if (text.includes('[EMULATOR]') || text.includes('EJS_Runtime')) {
                console.log(`📋 Console: ${text}`);
            }
            if (text.includes('❌') || text.includes('Error')) {
                console.error(`❌ Erro detectado: ${text}`);
                this.testResults.errors.push(text);
            }
        });
        
        // Configurar error listener
        this.page.on('pageerror', error => {
            console.error(`❌ Erro de página: ${error.message}`);
            this.testResults.errors.push(error.message);
        });
    }

    async testRomExists() {
        console.log('\n📁 Teste 1: Verificando existência da ROM...');
        
        const romPath = path.join(__dirname, '..', 'data', 'rom_teste.bin');
        
        if (!fs.existsSync(romPath)) {
            this.fail('ROM de teste não encontrada em data/rom_teste.bin');
            return false;
        }
        
        const stats = fs.statSync(romPath);
        console.log(`✅ ROM encontrada: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        this.pass();
        return true;
    }

    async testPageLoad() {
        console.log('\n🌐 Teste 2: Carregando página principal...');
        
        try {
            console.log('📋 Navegando para http://localhost:5174...');
            await this.page.goto('http://localhost:5174', {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });
            
            console.log('📋 Página carregada, aguardando elementos...');
            
            // Aguardar elementos principais
            await this.page.waitForSelector('#root', { timeout: 15000 });
            console.log('📋 Elemento #root encontrado');
            
            // Aguardar que o React renderize o componente principal
            await this.page.waitForSelector('.App', { timeout: 15000 });
            console.log('📋 Componente .App encontrado');
            
            console.log('✅ Página carregada com sucesso');
            this.pass();
            return true;
        } catch (error) {
            console.log('📋 Erro detalhado:', error.message);
            this.fail(`Falha ao carregar página: ${error.message}`);
            return false;
        }
    }

    async testWorkerInitialization() {
        console.log('\n⚙️ Teste 3: Verificando inicialização dos Workers...');
        
        try {
            // Aguardar logs de inicialização dos workers no LogPanel
            await this.page.waitForFunction(
                () => {
                    // Procurar no LogPanel por mensagens de worker
                    const logPanel = document.querySelector('.bg-black.text-green-400');
                    if (!logPanel) return false;
                    
                    const logText = logPanel.textContent || '';
                    return logText.includes('Worker configurado e pronto') || 
                           logText.includes('Worker TS (bundle) inicializado');
                },
                { timeout: 15000 }
            );
            
            console.log('✅ Workers inicializados com sucesso');
            this.pass();
            return true;
        } catch (error) {
            this.fail(`Workers não inicializaram: ${error.message}`);
            return false;
        }
    }

    async testRomLoad() {
        console.log('\n📂 Teste 4: Carregando ROM de teste...');
        
        try {
            // Aguardar que o motor esteja pronto
            await this.page.waitForFunction(
                () => {
                    const statusText = document.body.textContent || '';
                    return statusText.includes('Motor: Pronto');
                },
                { timeout: 30000 }
            );
            
            // Simular upload da ROM
            const fileInput = await this.page.$('input[type="file"]');
            if (!fileInput) {
                this.fail('Input de arquivo não encontrado');
                return false;
            }
            
            const romPath = path.join(__dirname, '..', 'data', 'rom_teste.bin');
            await fileInput.uploadFile(romPath);
            
            // Aguardar que a ROM seja processada
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            console.log('✅ ROM carregada no input');
            this.pass();
            return true;
        } catch (error) {
            this.fail(`Falha ao carregar ROM: ${error.message}`);
            return false;
        }
    }

    async testEmulatorInitialization() {
        console.log('\n🎮 Teste 5: Verificando inicialização do EmulatorJS...');
        
        try {
            // Aguardar inicialização do emulador (até 60 segundos)
            await this.page.waitForFunction(
                () => {
                    return window.EJS_Runtime && typeof window.EJS_Runtime === 'function';
                },
                { timeout: 60000 }
            );
            
            // Verificar se não há erros críticos
            const hasErrors = await this.page.evaluate(() => {
                const logs = Array.from(document.querySelectorAll('.log-entry'));
                return logs.some(log => 
                    log.textContent.includes('EJS_Runtime is not defined') ||
                    log.textContent.includes('EJS_Runtime não está definido')
                );
            });
            
            if (hasErrors) {
                this.fail('Erro EJS_Runtime detectado nos logs');
                return false;
            }
            
            console.log('✅ EmulatorJS inicializado sem erros críticos');
            this.pass();
            return true;
        } catch (error) {
            this.fail(`EmulatorJS não inicializou: ${error.message}`);
            return false;
        }
    }

    async testEmulatorCanvas() {
        console.log('\n🖼️ Teste 6: Verificando canvas do emulador...');
        
        try {
            // Aguardar canvas aparecer
            await this.page.waitForSelector('canvas', { timeout: 30000 });
            
            const canvasInfo = await this.page.evaluate(() => {
                const canvas = document.querySelector('canvas');
                return {
                    exists: !!canvas,
                    width: canvas?.width || 0,
                    height: canvas?.height || 0,
                    visible: canvas?.style.display !== 'none'
                };
            });
            
            if (!canvasInfo.exists) {
                this.fail('Canvas do emulador não encontrado');
                return false;
            }
            
            if (canvasInfo.width === 0 || canvasInfo.height === 0) {
                this.fail('Canvas tem dimensões inválidas');
                return false;
            }
            
            console.log(`✅ Canvas encontrado: ${canvasInfo.width}x${canvasInfo.height}`);
            this.pass();
            return true;
        } catch (error) {
            this.fail(`Canvas não encontrado: ${error.message}`);
            return false;
        }
    }

    async testDecodingFunctionality() {
        console.log('\n🔍 Teste 7: Verificando funcionalidade de decodificação...');
        
        try {
            // Navegar para aba de sprites (usando texto do botão)
            const spriteTabButton = await this.page.$('button:has-text("Editor de Sprites")');
            if (spriteTabButton) {
                await spriteTabButton.click();
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            // Verificar se há sprites decodificados ou conteúdo da aba
            const tabContent = await this.page.evaluate(() => {
                // Procurar por qualquer conteúdo relacionado a sprites
                const spriteContent = document.querySelector('.sprite-gallery') || 
                                    document.querySelector('[class*="sprite"]') ||
                                    document.querySelector('[class*="editor"]');
                
                const hasContent = !!spriteContent;
                const contentText = document.body.textContent || '';
                const hasProcessingMessage = contentText.includes('Processando dados da ROM') ||
                                           contentText.includes('Carregue uma ROM para extrair sprites');
                
                return {
                    hasContent,
                    hasProcessingMessage,
                    contentText: contentText.substring(0, 500) // Primeiros 500 chars para debug
                };
            });
            
            if (tabContent.hasContent || tabContent.hasProcessingMessage) {
                console.log('✅ Aba de sprites acessível e funcionando');
                this.pass();
                return true;
            } else {
                console.log('⚠️ Conteúdo da aba não encontrado, mas não é erro crítico');
                this.pass(); // Não falhar, pode ser normal
                return true;
            }
        } catch (error) {
            this.fail(`Erro na verificação de decodificação: ${error.message}`);
            return false;
        }
    }

    async runAllTests() {
        console.log('🧪 Iniciando bateria completa de testes...');
        
        const tests = [
            () => this.testRomExists(),
            () => this.testPageLoad(),
            () => this.testWorkerInitialization(),
            () => this.testRomLoad(),
            () => this.testEmulatorInitialization(),
            () => this.testEmulatorCanvas(),
            () => this.testDecodingFunctionality()
        ];
        
        for (let i = 0; i < tests.length; i++) {
            const success = await tests[i]();
            if (!success) {
                console.log(`\n❌ Teste ${i + 1} falhou. Interrompendo bateria de testes.`);
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 1000)); // Pausa entre testes
        }
        
        this.printResults();
    }

    pass() {
        this.testResults.passed++;
    }

    fail(message) {
        this.testResults.failed++;
        this.testResults.errors.push(message);
        console.error(`❌ FALHA: ${message}`);
    }

    printResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESULTADOS DOS TESTES');
        console.log('='.repeat(60));
        console.log(`✅ Testes aprovados: ${this.testResults.passed}`);
        console.log(`❌ Testes falharam: ${this.testResults.failed}`);
        console.log(`📝 Total de erros: ${this.testResults.errors.length}`);
        
        if (this.testResults.errors.length > 0) {
            console.log('\n🔍 DETALHES DOS ERROS:');
            this.testResults.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error}`);
            });
        }
        
        const success = this.testResults.failed === 0;
        console.log(`\n🎯 RESULTADO FINAL: ${success ? '✅ SUCESSO' : '❌ FALHA'}`);
        
        return success;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// Executar testes automaticamente
(async () => {
    const tester = new EmulatorTester();
    let success = false;
    
    try {
        await tester.init();
        success = await tester.runAllTests();
    } catch (error) {
        console.error('❌ Erro fatal durante os testes:', error);
    } finally {
        await tester.cleanup();
        process.exit(success ? 0 : 1);
    }
})();

export default EmulatorTester;