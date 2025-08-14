#!/usr/bin/env node

/**
 * Script de Teste Simples para Universal Asset Studio
 * Verifica o funcionamento básico do servidor e arquivos
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SimpleEmulatorTester {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            errors: []
        };
        this.baseUrl = 'http://localhost:5173';
    }

    async makeRequest(url, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const req = http.get(url, { timeout }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
            });
            
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            
            req.on('error', reject);
        });
    }

    async testServerRunning() {
        console.log('\n🌐 Teste 1: Verificando se o servidor está rodando...');
        
        try {
            const response = await this.makeRequest(this.baseUrl);
            
            if (response.status === 200) {
                console.log('✅ Servidor está rodando na porta 5173');
                this.pass();
                return true;
            } else {
                this.fail(`Servidor retornou status ${response.status}`);
                return false;
            }
        } catch (error) {
            this.fail(`Servidor não está rodando: ${error.message}`);
            return false;
        }
    }

    async testRomExists() {
        console.log('\n📁 Teste 2: Verificando existência da ROM...');
        
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

    async testEmulatorFiles() {
        console.log('\n📂 Teste 3: Verificando arquivos do EmulatorJS...');
        
        const requiredFiles = [
            '/emulatorjs-data/loader.js',
            '/emulatorjs-data/src/emulator.js',
            '/emulatorjs-data/cores/genesis_plus_gx.js'
        ];
        
        let allFilesExist = true;
        
        for (const file of requiredFiles) {
            try {
                const response = await this.makeRequest(this.baseUrl + file);
                
                if (response.status === 200) {
                    console.log(`✅ ${file} - OK`);
                } else {
                    console.log(`❌ ${file} - Status ${response.status}`);
                    allFilesExist = false;
                }
            } catch (error) {
                console.log(`❌ ${file} - Erro: ${error.message}`);
                allFilesExist = false;
            }
        }
        
        if (allFilesExist) {
            console.log('✅ Todos os arquivos do EmulatorJS estão acessíveis');
            this.pass();
            return true;
        } else {
            this.fail('Alguns arquivos do EmulatorJS não estão acessíveis');
            return false;
        }
    }

    async testMainPageContent() {
        console.log('\n📄 Teste 4: Verificando conteúdo da página principal...');
        
        try {
            const response = await this.makeRequest(this.baseUrl);
            
            if (response.status !== 200) {
                this.fail(`Página principal retornou status ${response.status}`);
                return false;
            }
            
            const content = response.data;
            const requiredElements = [
                'Universal Asset Studio',
                'src/main.tsx',
                'emulatorjs-data/src/storage.js',
                'emulatorjs-data/src/gamepad.js'
            ];
            
            let allElementsFound = true;
            
            for (const element of requiredElements) {
                if (content.includes(element)) {
                    console.log(`✅ Elemento encontrado: ${element}`);
                } else {
                    console.log(`❌ Elemento não encontrado: ${element}`);
                    allElementsFound = false;
                }
            }
            
            if (allElementsFound) {
                console.log('✅ Página principal contém todos os elementos necessários');
                this.pass();
                return true;
            } else {
                this.fail('Página principal está faltando elementos necessários');
                return false;
            }
        } catch (error) {
            this.fail(`Erro ao verificar página principal: ${error.message}`);
            return false;
        }
    }

    async testCoreIntegrity() {
        console.log('\n🔧 Teste 5: Verificando integridade do core Genesis...');
        
        try {
            const response = await this.makeRequest(this.baseUrl + '/emulatorjs-data/cores/genesis_plus_gx.js');
            
            if (response.status !== 200) {
                this.fail(`Core não acessível: status ${response.status}`);
                return false;
            }
            
            const content = response.data;
            const requiredElements = [
                'genesis_plus_gx',
                'window.EJS_Runtime',
                'EJS_Runtime_Ready',
                'module.exports'
            ];
            
            let allElementsFound = true;
            
            for (const element of requiredElements) {
                if (content.includes(element)) {
                    console.log(`✅ Elemento do core encontrado: ${element}`);
                } else {
                    console.log(`❌ Elemento do core não encontrado: ${element}`);
                    allElementsFound = false;
                }
            }
            
            if (allElementsFound) {
                console.log('✅ Core Genesis tem todos os elementos necessários');
                this.pass();
                return true;
            } else {
                this.fail('Core Genesis está faltando elementos necessários');
                return false;
            }
        } catch (error) {
            this.fail(`Erro ao verificar core: ${error.message}`);
            return false;
        }
    }

    async testProjectStructure() {
        console.log('\n📁 Teste 6: Verificando estrutura do projeto...');
        
        const requiredDirs = [
            path.join(__dirname, '..', 'src'),
            path.join(__dirname, '..', 'public'),
            path.join(__dirname, '..', 'data'),
            path.join(__dirname, '..', 'public', 'emulatorjs-data'),
            path.join(__dirname, '..', 'public', 'emulatorjs-data', 'cores')
        ];
        
        let allDirsExist = true;
        
        for (const dir of requiredDirs) {
            if (fs.existsSync(dir)) {
                console.log(`✅ Diretório encontrado: ${path.relative(path.join(__dirname, '..'), dir)}`);
            } else {
                console.log(`❌ Diretório não encontrado: ${path.relative(path.join(__dirname, '..'), dir)}`);
                allDirsExist = false;
            }
        }
        
        if (allDirsExist) {
            console.log('✅ Estrutura do projeto está correta');
            this.pass();
            return true;
        } else {
            this.fail('Estrutura do projeto está incompleta');
            return false;
        }
    }

    async runAllTests() {
        console.log('🧪 Iniciando bateria de testes simples...');
        
        const tests = [
            () => this.testServerRunning(),
            () => this.testRomExists(),
            () => this.testProjectStructure(),
            () => this.testEmulatorFiles(),
            () => this.testMainPageContent(),
            () => this.testCoreIntegrity()
        ];
        
        for (let i = 0; i < tests.length; i++) {
            const success = await tests[i]();
            if (!success) {
                console.log(`\n❌ Teste ${i + 1} falhou. Continuando com os próximos testes...`);
            }
            // Não parar nos erros, continuar todos os testes
        }
        
        return this.printResults();
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
        console.log('📊 RESULTADOS DOS TESTES SIMPLES');
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
        
        if (success) {
            console.log('\n🎉 Todos os testes básicos passaram!');
            console.log('💡 Para teste completo com ROM, execute: npm run test:full');
        } else {
            console.log('\n🔧 Corrija os erros acima antes de prosseguir.');
        }
        
        return success;
    }
}

// Executar testes automaticamente
(async () => {
    const tester = new SimpleEmulatorTester();
    let success = false;
    
    try {
        success = await tester.runAllTests();
    } catch (error) {
        console.error('❌ Erro fatal durante os testes:', error);
    } finally {
        process.exit(success ? 0 : 1);
    }
})();

export default SimpleEmulatorTester;