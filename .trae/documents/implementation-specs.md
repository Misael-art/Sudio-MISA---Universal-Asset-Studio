# Especificações de Implementação - Universal Asset Studio

## Implementação Imediata - Checklist de Desenvolvimento

### ✅ Status Atual
- Genesis Plus GX compilado com sucesso
- Funções de exportação validadas no JavaScript
- Artefatos `.js` e `.wasm` gerados
- Docker build funcional

### 🔄 Próximos Passos Imediatos

#### 1. Configuração do Projeto React (Prioridade Alta)

```bash
# Instalar dependências necessárias
npm install @types/emscripten
npm install --save-dev @types/node
```

**Arquivo: `src/types/emscripten.d.ts`**
```typescript
// Definições TypeScript para Emscripten
declare global {
  interface Window {
    genesis_plus_gx: () => Promise<EmscriptenModule>;
  }
}

interface EmscriptenModule {
  HEAPU8: Uint8Array;
  cwrap: (name: string, returnType: string, argTypes: string[]) => (...args: any[]) => any;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
}

export {};
```

**Arquivo: `public/index.html` (Modificação)**
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Universal Asset Studio</title>
    <!-- Carregar o core Genesis Plus GX -->
    <script src="/genesis_plus_gx.js"></script>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

#### 2. Implementação do Hook Principal (Prioridade Alta)

**Arquivo: `src/hooks/useGenesisCore.ts`**
```typescript
import { useState, useEffect, useCallback, useRef } from 'react';

interface CoreFunctions {
  getWorkRamPtr: () => number;
  getWorkRamSize: () => number;
  getVramPtr: () => number;
  getVramSize: () => number;
  getCramPtr: () => number;
  getCramSize: () => number;
  getVsramPtr: () => number;
  getVsramSize: () => number;
  getVdpRegsPtr: () => number;
  getVdpRegsSize: () => number;
  getSatPtr: () => number;
  getSatSize: () => number;
  getFrameBufferRef: () => number;
  getFrameBufferWidth: () => number;
  getFrameBufferHeight: () => number;
  getFrameBufferPitch: () => number;
  getActiveSystemCode: () => number;
  isCoreInitialized: () => number;
  getTotalMemorySize: () => number;
}

interface MemorySnapshot {
  workRam: Uint8Array;
  vram: Uint8Array;
  cram: Uint8Array;
  vsram: Uint8Array;
  vdpRegs: Uint8Array;
  sat: Uint8Array;
  framebuffer: {
    data: Uint8Array;
    width: number;
    height: number;
    pitch: number;
  };
  systemCode: number;
  timestamp: number;
}

interface UseGenesisCoreReturn {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  memorySnapshot: MemorySnapshot | null;
  captureMemory: () => Promise<MemorySnapshot | null>;
  systemInfo: {
    name: string;
    code: number;
    type: string;
  } | null;
}

export const useGenesisCore = (): UseGenesisCoreReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memorySnapshot, setMemorySnapshot] = useState<MemorySnapshot | null>(null);
  const [systemInfo, setSystemInfo] = useState<{ name: string; code: number; type: string } | null>(null);
  
  const coreRef = useRef<any>(null);
  const functionsRef = useRef<CoreFunctions | null>(null);

  // Mapeamento de códigos de sistema
  const getSystemInfo = useCallback((code: number) => {
    const systems = {
      0: { name: 'Master System', type: 'sms' },
      1: { name: 'Game Gear', type: 'gamegear' },
      2: { name: 'Mega Drive/Genesis', type: 'megadrive' },
      3: { name: 'Sega CD/Mega CD', type: 'segacd' }
    };
    return systems[code as keyof typeof systems] || { name: 'Unknown', type: 'unknown' };
  }, []);

  // Inicialização do core
  useEffect(() => {
    const initializeCore = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Aguardar o core estar disponível
        let attempts = 0;
        const maxAttempts = 50; // 5 segundos
        
        while (!window.genesis_plus_gx && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (!window.genesis_plus_gx) {
          throw new Error('Genesis Plus GX core não foi carregado. Verifique se genesis_plus_gx.js está no diretório public.');
        }

        console.log('Inicializando Genesis Plus GX core...');
        const core = await window.genesis_plus_gx();
        coreRef.current = core;

        // Configurar funções de acesso
        const functions: CoreFunctions = {
          getWorkRamPtr: core.cwrap('_get_work_ram_ptr', 'number', []),
          getWorkRamSize: core.cwrap('_get_work_ram_size', 'number', []),
          getVramPtr: core.cwrap('_get_vram_ptr', 'number', []),
          getVramSize: core.cwrap('_get_vram_size', 'number', []),
          getCramPtr: core.cwrap('_get_cram_ptr', 'number', []),
          getCramSize: core.cwrap('_get_cram_size', 'number', []),
          getVsramPtr: core.cwrap('_get_vsram_ptr', 'number', []),
          getVsramSize: core.cwrap('_get_vsram_size', 'number', []),
          getVdpRegsPtr: core.cwrap('_get_vdp_regs_ptr', 'number', []),
          getVdpRegsSize: core.cwrap('_get_vdp_regs_size', 'number', []),
          getSatPtr: core.cwrap('_get_sat_ptr', 'number', []),
          getSatSize: core.cwrap('_get_sat_size', 'number', []),
          getFrameBufferRef: core.cwrap('_get_frame_buffer_ref', 'number', []),
          getFrameBufferWidth: core.cwrap('_get_frame_buffer_width', 'number', []),
          getFrameBufferHeight: core.cwrap('_get_frame_buffer_height', 'number', []),
          getFrameBufferPitch: core.cwrap('_get_frame_buffer_pitch', 'number', []),
          getActiveSystemCode: core.cwrap('_get_active_system_code', 'number', []),
          isCoreInitialized: core.cwrap('_is_core_initialized', 'number', []),
          getTotalMemorySize: core.cwrap('_get_total_memory_size', 'number', [])
        };

        functionsRef.current = functions;

        // Verificar se o core está realmente inicializado
        const coreInitialized = functions.isCoreInitialized();
        console.log('Core initialized status:', coreInitialized);

        // Obter informações do sistema
        const systemCode = functions.getActiveSystemCode();
        const sysInfo = getSystemInfo(systemCode);
        setSystemInfo({ ...sysInfo, code: systemCode });

        setIsInitialized(true);
        console.log('Genesis Plus GX core inicializado com sucesso!');
        console.log('Sistema detectado:', sysInfo.name);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao inicializar core';
        setError(errorMessage);
        console.error('Erro na inicialização:', errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    initializeCore();
  }, [getSystemInfo]);

  // Função para capturar snapshot de memória
  const captureMemory = useCallback(async (): Promise<MemorySnapshot | null> => {
    if (!coreRef.current || !functionsRef.current || !isInitialized) {
      console.warn('Core não inicializado para captura de memória');
      return null;
    }

    try {
      const core = coreRef.current;
      const funcs = functionsRef.current;
      const heap = core.HEAPU8;

      console.log('Capturando snapshot de memória...');

      // Capturar Work RAM
      const workRamPtr = funcs.getWorkRamPtr();
      const workRamSize = funcs.getWorkRamSize();
      const workRam = new Uint8Array(heap.buffer, workRamPtr, workRamSize);
      console.log(`Work RAM: ${workRamSize} bytes at 0x${workRamPtr.toString(16)}`);

      // Capturar VRAM
      const vramPtr = funcs.getVramPtr();
      const vramSize = funcs.getVramSize();
      const vram = new Uint8Array(heap.buffer, vramPtr, vramSize);
      console.log(`VRAM: ${vramSize} bytes at 0x${vramPtr.toString(16)}`);

      // Capturar CRAM
      const cramPtr = funcs.getCramPtr();
      const cramSize = funcs.getCramSize();
      const cram = new Uint8Array(heap.buffer, cramPtr, cramSize);
      console.log(`CRAM: ${cramSize} bytes at 0x${cramPtr.toString(16)}`);

      // Capturar VSRAM
      const vsramPtr = funcs.getVsramPtr();
      const vsramSize = funcs.getVsramSize();
      const vsram = new Uint8Array(heap.buffer, vsramPtr, vsramSize);
      console.log(`VSRAM: ${vsramSize} bytes at 0x${vsramPtr.toString(16)}`);

      // Capturar registradores VDP
      const vdpRegsPtr = funcs.getVdpRegsPtr();
      const vdpRegsSize = funcs.getVdpRegsSize();
      const vdpRegs = new Uint8Array(heap.buffer, vdpRegsPtr, vdpRegsSize);
      console.log(`VDP Regs: ${vdpRegsSize} bytes at 0x${vdpRegsPtr.toString(16)}`);

      // Capturar SAT
      const satPtr = funcs.getSatPtr();
      const satSize = funcs.getSatSize();
      const sat = new Uint8Array(heap.buffer, satPtr, satSize);
      console.log(`SAT: ${satSize} bytes at 0x${satPtr.toString(16)}`);

      // Capturar framebuffer
      const fbPtr = funcs.getFrameBufferRef();
      const fbWidth = funcs.getFrameBufferWidth();
      const fbHeight = funcs.getFrameBufferHeight();
      const fbPitch = funcs.getFrameBufferPitch();
      const framebufferData = new Uint8Array(heap.buffer, fbPtr, fbPitch * fbHeight);
      console.log(`Framebuffer: ${fbWidth}x${fbHeight}, pitch=${fbPitch} at 0x${fbPtr.toString(16)}`);

      // Obter código do sistema
      const systemCode = funcs.getActiveSystemCode();

      const snapshot: MemorySnapshot = {
        workRam: new Uint8Array(workRam),
        vram: new Uint8Array(vram),
        cram: new Uint8Array(cram),
        vsram: new Uint8Array(vsram),
        vdpRegs: new Uint8Array(vdpRegs),
        sat: new Uint8Array(sat),
        framebuffer: {
          data: new Uint8Array(framebufferData),
          width: fbWidth,
          height: fbHeight,
          pitch: fbPitch
        },
        systemCode,
        timestamp: Date.now()
      };

      setMemorySnapshot(snapshot);
      console.log('Snapshot de memória capturado com sucesso!');
      return snapshot;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao capturar memória';
      setError(errorMessage);
      console.error('Erro na captura de memória:', errorMessage);
      return null;
    }
  }, [isInitialized]);

  return {
    isInitialized,
    isLoading,
    error,
    memorySnapshot,
    captureMemory,
    systemInfo
  };
};
```

#### 3. Componente Principal de Teste (Prioridade Alta)

**Arquivo: `src/components/CoreTester.tsx`**
```typescript
import React from 'react';
import { useGenesisCore } from '../hooks/useGenesisCore';

/**
 * Componente de teste para validar a integração do Genesis Plus GX
 * Implementa o Pilar 0: Verificação de funcionalidade básica
 */
export const CoreTester: React.FC = () => {
  const {
    isInitialized,
    isLoading,
    error,
    memorySnapshot,
    captureMemory,
    systemInfo
  } = useGenesisCore();

  const handleCaptureMemory = async () => {
    const snapshot = await captureMemory();
    if (snapshot) {
      console.log('Snapshot capturado:', snapshot);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)}KB`;
    }
    return `${bytes} bytes`;
  };

  if (isLoading) {
    return (
      <div className="core-tester loading">
        <h2>🔄 Carregando Genesis Plus GX Core...</h2>
        <p>Aguarde enquanto o core é inicializado.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="core-tester error">
        <h2>❌ Erro na Inicialização</h2>
        <p><strong>Erro:</strong> {error}</p>
        <div className="troubleshooting">
          <h3>Soluções:</h3>
          <ul>
            <li>Verifique se <code>genesis_plus_gx.js</code> está em <code>/public</code></li>
            <li>Verifique se <code>genesis_plus_gx.wasm</code> está em <code>/public</code></li>
            <li>Recompile o core se necessário</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="core-tester success">
      <div className="header">
        <h2>✅ Genesis Plus GX Core Inicializado</h2>
        {systemInfo && (
          <div className="system-info">
            <span className="system-name">{systemInfo.name}</span>
            <span className="system-code">Código: {systemInfo.code}</span>
            <span className="system-type">Tipo: {systemInfo.type}</span>
          </div>
        )}
      </div>

      <div className="controls">
        <button 
          onClick={handleCaptureMemory}
          className="capture-button"
          disabled={!isInitialized}
        >
          📸 Capturar Memória
        </button>
      </div>

      {memorySnapshot && (
        <div className="memory-snapshot">
          <h3>📊 Snapshot de Memória</h3>
          <div className="timestamp">
            Capturado em: {new Date(memorySnapshot.timestamp).toLocaleString()}
          </div>
          
          <div className="memory-regions">
            <div className="memory-region">
              <h4>Work RAM</h4>
              <span className="size">{formatBytes(memorySnapshot.workRam.length)}</span>
              <span className="preview">
                Primeiros bytes: {Array.from(memorySnapshot.workRam.slice(0, 8))
                  .map(b => b.toString(16).padStart(2, '0'))
                  .join(' ')}
              </span>
            </div>

            <div className="memory-region">
              <h4>VRAM</h4>
              <span className="size">{formatBytes(memorySnapshot.vram.length)}</span>
              <span className="preview">
                Primeiros bytes: {Array.from(memorySnapshot.vram.slice(0, 8))
                  .map(b => b.toString(16).padStart(2, '0'))
                  .join(' ')}
              </span>
            </div>

            <div className="memory-region">
              <h4>CRAM (Paletas)</h4>
              <span className="size">{formatBytes(memorySnapshot.cram.length)}</span>
              <span className="preview">
                Primeiros bytes: {Array.from(memorySnapshot.cram.slice(0, 8))
                  .map(b => b.toString(16).padStart(2, '0'))
                  .join(' ')}
              </span>
            </div>

            <div className="memory-region">
              <h4>VSRAM</h4>
              <span className="size">{formatBytes(memorySnapshot.vsram.length)}</span>
              <span className="preview">
                Primeiros bytes: {Array.from(memorySnapshot.vsram.slice(0, 8))
                  .map(b => b.toString(16).padStart(2, '0'))
                  .join(' ')}
              </span>
            </div>

            <div className="memory-region">
              <h4>SAT (Sprites)</h4>
              <span className="size">{formatBytes(memorySnapshot.sat.length)}</span>
              <span className="preview">
                Primeiros bytes: {Array.from(memorySnapshot.sat.slice(0, 8))
                  .map(b => b.toString(16).padStart(2, '0'))
                  .join(' ')}
              </span>
            </div>

            <div className="memory-region">
              <h4>Framebuffer</h4>
              <span className="size">
                {memorySnapshot.framebuffer.width}x{memorySnapshot.framebuffer.height} 
                ({formatBytes(memorySnapshot.framebuffer.data.length)})
              </span>
              <span className="preview">
                Pitch: {memorySnapshot.framebuffer.pitch}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="next-steps">
        <h3>🚀 Próximos Passos</h3>
        <ul>
          <li>✅ Core inicializado com sucesso</li>
          <li>✅ Acesso à memória funcionando</li>
          <li>🔄 Implementar decodificadores de paleta</li>
          <li>🔄 Implementar decodificadores de sprite</li>
          <li>🔄 Criar interface de galeria</li>
        </ul>
      </div>
    </div>
  );
};
```

#### 4. Estilos CSS Básicos (Prioridade Média)

**Arquivo: `src/components/CoreTester.css`**
```css
.core-tester {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.core-tester.loading {
  text-align: center;
  padding: 60px 20px;
}

.core-tester.loading h2 {
  color: #2563eb;
  margin-bottom: 10px;
}

.core-tester.error {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 20px;
}

.core-tester.error h2 {
  color: #dc2626;
  margin-bottom: 15px;
}

.core-tester.error .troubleshooting {
  margin-top: 20px;
  padding: 15px;
  background-color: #f9fafb;
  border-radius: 6px;
}

.core-tester.error .troubleshooting h3 {
  color: #374151;
  margin-bottom: 10px;
}

.core-tester.error .troubleshooting code {
  background-color: #e5e7eb;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}

.core-tester.success {
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.header h2 {
  color: #059669;
  margin: 0;
}

.system-info {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.system-info span {
  background-color: #dcfce7;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.9em;
  font-weight: 500;
}

.system-name {
  color: #059669;
  font-weight: 600;
}

.system-code, .system-type {
  color: #065f46;
}

.controls {
  margin: 20px 0;
}

.capture-button {
  background-color: #2563eb;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 1em;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.capture-button:hover:not(:disabled) {
  background-color: #1d4ed8;
}

.capture-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.memory-snapshot {
  margin-top: 30px;
  padding: 20px;
  background-color: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.memory-snapshot h3 {
  color: #1e293b;
  margin-bottom: 15px;
}

.timestamp {
  color: #64748b;
  font-size: 0.9em;
  margin-bottom: 20px;
}

.memory-regions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
}

.memory-region {
  background-color: white;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.memory-region h4 {
  color: #1e293b;
  margin: 0 0 10px 0;
  font-size: 1.1em;
}

.memory-region .size {
  display: block;
  color: #2563eb;
  font-weight: 600;
  margin-bottom: 8px;
}

.memory-region .preview {
  display: block;
  color: #64748b;
  font-family: 'Courier New', monospace;
  font-size: 0.85em;
  background-color: #f1f5f9;
  padding: 8px;
  border-radius: 4px;
  word-break: break-all;
}

.next-steps {
  margin-top: 30px;
  padding: 20px;
  background-color: #fffbeb;
  border: 1px solid #fed7aa;
  border-radius: 8px;
}

.next-steps h3 {
  color: #92400e;
  margin-bottom: 15px;
}

.next-steps ul {
  list-style: none;
  padding: 0;
}

.next-steps li {
  padding: 5px 0;
  color: #78350f;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .system-info {
    width: 100%;
  }
  
  .memory-regions {
    grid-template-columns: 1fr;
  }
}
```

#### 5. Atualização do App Principal

**Arquivo: `src/App.tsx`**
```typescript
import React from 'react';
import { CoreTester } from './components/CoreTester';
import './components/CoreTester.css';

/**
 * Aplicação principal do Universal Asset Studio
 * Fase inicial: Teste e validação do core Genesis Plus GX
 */
function App() {
  return (
    <div className="App">
      <header className="app-header">
        <h1>🎮 Universal Asset Studio</h1>
        <p>Extrator de Assets para Sistemas Sega</p>
      </header>
      
      <main>
        <CoreTester />
      </main>
      
      <footer className="app-footer">
        <p>Powered by Genesis Plus GX • Compilado via Emscripten</p>
      </footer>
    </div>
  );
}

export default App;
```

**Arquivo: `src/App.css`**
```css
.App {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px 0;
}

.app-header {
  text-align: center;
  margin-bottom: 40px;
  color: white;
}

.app-header h1 {
  font-size: 2.5em;
  margin-bottom: 10px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.app-header p {
  font-size: 1.2em;
  opacity: 0.9;
}

.app-footer {
  text-align: center;
  margin-top: 40px;
  color: white;
  opacity: 0.8;
  font-size: 0.9em;
}
```

## Validação de Implementação

### Critérios de Sucesso - Fase 1

**✅ Contrato de Sucesso:**
1. **Inicialização Visual**: Interface mostra "✅ Genesis Plus GX Core Inicializado"
2. **Detecção de Sistema**: Nome do sistema (ex: "Mega Drive/Genesis") é exibido
3. **Captura de Memória**: Botão "📸 Capturar Memória" funciona sem erros
4. **Dados Visíveis**: Snapshot mostra tamanhos corretos de memória:
   - Work RAM: 64KB (Mega Drive)
   - VRAM: 64KB
   - CRAM: 128 bytes
   - VSRAM: 128 bytes
5. **Preview Hex**: Primeiros bytes de cada região são exibidos em hexadecimal

### Comandos de Teste

```bash
# 1. Instalar dependências
npm install

# 2. Copiar artefatos do core
cp genesis_plus_gx.js public/
cp genesis_plus_gx.wasm public/

# 3. Executar em modo desenvolvimento
npm run dev

# 4. Abrir http://localhost:5173
# 5. Verificar console do navegador para logs
# 6. Clicar em "Capturar Memória" e verificar dados
```

### Troubleshooting Comum

| Problema | Causa Provável | Solução |
|----------|----------------|----------|
| "Genesis Plus GX core não foi carregado" | Arquivos .js/.wasm não estão em /public | Copiar artefatos para /public |
| "Core initialized status: 0" | Core não foi inicializado internamente | Verificar se ROM foi carregada |
| Erro de CORS | Headers não configurados | Adicionar headers CORS no Vite |
| Funções cwrap falham | Funções não exportadas | Verificar lista de exports no build |

### Próxima Fase - Decodificadores

Após validar a Fase 1, implementar:

1. **PaletteDecoder.ts** - Decodificação de CRAM para cores CSS
2. **SpriteDecoder.ts** - Extração de sprites da VRAM/SAT
3. **SpriteGallery.tsx** - Interface para exibir sprites
4. **PaletteViewer.tsx** - Visualizador de paletas

**Critério de Sucesso da Fase 2:**
- Galeria exibe pelo menos 10 sprites decodificados com cores corretas
- Paletas mostram 64 cores organizadas em 4 grupos de 16
- Sprites são clicáveis e mostram detalhes (posição, tamanho, paleta)

Esta implementação garante uma base sólida e testável para o desenvolvimento incremental do Universal Asset Studio.