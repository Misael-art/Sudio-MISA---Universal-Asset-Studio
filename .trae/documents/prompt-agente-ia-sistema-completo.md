# Prompt Robusto para Agente de IA - Sistema Universal de Asset Studio

## Contexto e Objetivo Principal

Você é um **Especialista em Engenharia de Software e Arquitetura de Sistemas de Emulação** responsável por transformar o atual "Universal Asset Studio" em uma plataforma completa, robusta e escalável para extração, análise e edição de assets de ROMs de múltiplos sistemas de videogame retro.

## Missão Crítica

Implementar um sistema **production-ready** que suporte múltiplos cores de emulação com interface de usuário de primeira linha, garantindo:
- **Funcionalidade completa** com ROMs reais
- **Experiência do usuário (UX)** intuitiva e profissional
- **Experiência do cliente (CX)** sem fricções
- **Arquitetura escalável** para novos sistemas
- **Performance otimizada** para processamento em tempo real

---

## FASE 1: PREPARAÇÃO DO SISTEMA PARA MÚLTIPLOS CORES

### 1.1 Arquitetura de Cores Unificada

**ATIVIDADE CRÍTICA:** Implementar sistema de detecção e carregamento dinâmico de cores

```typescript
// Estrutura obrigatória a implementar
interface CoreDescriptor {
  id: string;
  name: string;
  systems: string[];
  fileExtensions: string[];
  wasmPath: string;
  jsPath: string;
  exports: CoreExports;
  memoryLayout: MemoryLayout;
  capabilities: CoreCapabilities;
}

interface CoreRegistry {
  registerCore(descriptor: CoreDescriptor): void;
  getCoreForSystem(system: string): CoreDescriptor | null;
  getCoreForFile(filename: string): CoreDescriptor | null;
  listAvailableCores(): CoreDescriptor[];
  validateCoreIntegrity(coreId: string): Promise<boolean>;
}
```

**DELIVERABLES:**
- [ ] Sistema de registro automático de cores
- [ ] Validação de integridade de cores na inicialização
- [ ] Interface unificada para comunicação com qualquer core
- [ ] Sistema de fallback para cores corrompidos

### 1.2 Gerenciamento de Memória Unificado

**ATIVIDADE CRÍTICA:** Criar abstração para diferentes layouts de memória

```typescript
interface MemoryManager {
  // Métodos obrigatórios para qualquer sistema
  getFrameBuffer(): Uint8Array;
  getVideoMemory(): Uint8Array;
  getColorMemory(): Uint8Array;
  getSpriteMemory(): Uint8Array;
  getPaletteMemory(): Uint8Array;
  
  // Métodos específicos por sistema
  getSystemSpecificMemory(region: string): Uint8Array;
  mapMemoryRegion(address: number, size: number): Uint8Array;
}
```

**DELIVERABLES:**
- [ ] Mapeamento automático de regiões de memória
- [ ] Cache inteligente para otimização de performance
- [ ] Sistema de sincronização em tempo real
- [ ] Detecção automática de mudanças na memória

### 1.3 Sistema de Detecção Automática

**ATIVIDADE CRÍTICA:** Implementar detecção inteligente de sistema baseada em ROM

```typescript
interface ROMAnalyzer {
  analyzeROM(romData: Uint8Array): ROMAnalysis;
  detectSystem(romData: Uint8Array): string;
  extractMetadata(romData: Uint8Array): ROMMetadata;
  validateROM(romData: Uint8Array, expectedSystem: string): boolean;
}

interface ROMAnalysis {
  system: string;
  confidence: number;
  metadata: ROMMetadata;
  supportedFeatures: string[];
  estimatedAssetCount: AssetEstimate;
}
```

**DELIVERABLES:**
- [ ] Algoritmo de detecção por header analysis
- [ ] Detecção por padrões de dados
- [ ] Sistema de confiança com múltiplos algoritmos
- [ ] Cache de análises para ROMs conhecidas

---

## FASE 2: IMPLEMENTAÇÃO DE CORES ESSENCIAIS

### 2.1 Core Genesis Plus GX (Prioridade Máxima)

**ATIVIDADE CRÍTICA:** Recompilação completa com exports necessários

**EXPORTS OBRIGATÓRIOS:**
```c
// Exports que DEVEM estar presentes no core compilado
extern "C" {
    uint8_t* get_frame_buffer_ref();
    uint8_t* get_vram_ptr();
    uint8_t* get_cram_ptr();
    uint8_t* get_vsram_ptr();
    uint8_t* get_oam_ptr();
    uint8_t* get_palette_ptr();
    uint32_t get_vram_size();
    uint32_t get_cram_size();
    uint32_t get_vsram_size();
    uint32_t get_oam_size();
    uint32_t get_palette_size();
    void force_frame_update();
    uint32_t get_frame_count();
}
```

**DELIVERABLES:**
- [ ] Core recompilado com todos os exports
- [ ] Validação automática de exports na inicialização
- [ ] Testes unitários para cada função exportada
- [ ] Documentação completa dos ponteiros de memória

### 2.2 Core Super Nintendo (SNES9x)

**ATIVIDADE CRÍTICA:** Implementação completa para SNES

**ESPECIFICAÇÕES TÉCNICAS:**
- VRAM: 64KB (tiles, sprites, backgrounds)
- CGRAM: 512 bytes (256 cores, 15-bit)
- OAM: 544 bytes (128 sprites)
- Modos de vídeo: 0-7 com diferentes capacidades

**DELIVERABLES:**
- [ ] Core SNES9x compilado com exports customizados
- [ ] Decodificador de tiles SNES (2bpp, 4bpp, 8bpp)
- [ ] Sistema de paletas SNES (15-bit color)
- [ ] Suporte para Mode 7 (rotação/escala)

### 2.3 Core Game Boy (SameBoy)

**ATIVIDADE CRÍTICA:** Suporte completo para Game Boy/Game Boy Color

**ESPECIFICAÇÕES TÉCNICAS:**
- VRAM: 8KB (GB) / 16KB (GBC)
- OAM: 160 bytes (40 sprites)
- Paletas: 4 cores (GB) / 32 paletas de 4 cores (GBC)
- Tiles: 8x8 pixels, 2bpp

**DELIVERABLES:**
- [ ] Core SameBoy com exports necessários
- [ ] Decodificador de tiles Game Boy
- [ ] Sistema de paletas monocromáticas e coloridas
- [ ] Suporte para sprites 8x8 e 8x16

### 2.4 Core NES (QuickNES)

**ATIVIDADE CRÍTICA:** Implementação para Nintendo Entertainment System

**ESPECIFICAÇÕES TÉCNICAS:**
- Pattern Tables: 8KB (tiles 8x8)
- Name Tables: 2KB (backgrounds)
- Attribute Tables: 64 bytes (paletas por região)
- Sprite RAM: 256 bytes (64 sprites)

**DELIVERABLES:**
- [ ] Core QuickNES compilado
- [ ] Decodificador de Pattern Tables
- [ ] Sistema de paletas NES (64 cores fixas)
- [ ] Extração de sprites e backgrounds

---

## FASE 3: INTERFACE DE USUÁRIO DE PRIMEIRA LINHA

### 3.1 Dashboard Principal

**ATIVIDADE CRÍTICA:** Interface moderna e intuitiva

**COMPONENTES OBRIGATÓRIOS:**
```typescript
interface MainDashboard {
  // Área de upload com drag & drop
  romUploader: ROMUploader;
  
  // Detecção automática e seleção manual
  systemDetector: SystemDetector;
  
  // Preview em tempo real
  livePreview: LivePreview;
  
  // Estatísticas da ROM
  romStatistics: ROMStatistics;
  
  // Ações rápidas
  quickActions: QuickActions;
}
```

**DELIVERABLES:**
- [ ] Interface responsiva (desktop/tablet/mobile)
- [ ] Drag & drop com preview visual
- [ ] Indicadores de progresso em tempo real
- [ ] Tooltips e ajuda contextual
- [ ] Temas claro/escuro

### 3.2 Editor de Sprites Avançado

**ATIVIDADE CRÍTICA:** Editor profissional com ferramentas completas

**FERRAMENTAS OBRIGATÓRIAS:**
- [ ] Pixel art editor com zoom até 32x
- [ ] Paleta de cores com picker avançado
- [ ] Layers e transparência
- [ ] Animação frame-by-frame
- [ ] Onion skinning
- [ ] Grid e guides configuráveis
- [ ] Undo/Redo ilimitado
- [ ] Seleção por região (retângulo, laço, varinha)
- [ ] Transformações (rotação, espelhamento, escala)
- [ ] Filtros e efeitos

**DELIVERABLES:**
- [ ] Interface similar ao Aseprite/Photoshop
- [ ] Shortcuts de teclado configuráveis
- [ ] Workspace personalizável
- [ ] Preview de animação em tempo real

### 3.3 Gerenciador de Assets

**ATIVIDADE CRÍTICA:** Organização e catalogação profissional

**FUNCIONALIDADES OBRIGATÓRIAS:**
```typescript
interface AssetManager {
  // Organização hierárquica
  createFolder(name: string, parent?: string): void;
  moveAsset(assetId: string, targetFolder: string): void;
  
  // Busca e filtros
  searchAssets(query: string, filters: AssetFilters): Asset[];
  filterByType(type: AssetType): Asset[];
  filterBySize(minSize: number, maxSize: number): Asset[];
  
  // Metadados e tags
  addTag(assetId: string, tag: string): void;
  setMetadata(assetId: string, metadata: AssetMetadata): void;
  
  // Batch operations
  batchExport(assetIds: string[], format: ExportFormat): void;
  batchRename(assetIds: string[], pattern: string): void;
}
```

**DELIVERABLES:**
- [ ] Interface tipo file explorer
- [ ] Thumbnails em alta qualidade
- [ ] Busca instantânea com filtros
- [ ] Operações em lote
- [ ] Sistema de tags e categorias

### 3.4 Exportador Universal

**ATIVIDADE CRÍTICA:** Sistema de exportação profissional

**FORMATOS SUPORTADOS:**
- [ ] PNG (individual/spritesheet)
- [ ] GIF (animações)
- [ ] SVG (vetorial quando possível)
- [ ] JSON (metadados)
- [ ] XML (dados estruturados)
- [ ] CSV (tabelas)
- [ ] Formatos nativos (Aseprite, Photoshop)
- [ ] Formatos de game engines (Unity, Godot, Unreal)

**DELIVERABLES:**
- [ ] Templates de exportação configuráveis
- [ ] Preview antes da exportação
- [ ] Compressão otimizada
- [ ] Batch export com progress

---

## FASE 4: FUNCIONALIDADES AVANÇADAS

### 4.1 Análise Inteligente de Assets

**ATIVIDADE CRÍTICA:** IA para categorização automática

```typescript
interface AssetAnalyzer {
  // Detecção automática de tipo
  detectAssetType(imageData: ImageData): AssetType;
  
  // Análise de conteúdo
  analyzeContent(asset: Asset): ContentAnalysis;
  
  // Sugestões inteligentes
  suggestTags(asset: Asset): string[];
  suggestGrouping(assets: Asset[]): AssetGroup[];
  
  // Detecção de duplicatas
  findSimilarAssets(asset: Asset, threshold: number): Asset[];
  detectDuplicates(assets: Asset[]): DuplicateGroup[];
}
```

**DELIVERABLES:**
- [ ] Algoritmos de computer vision
- [ ] Machine learning para categorização
- [ ] Detecção de sprites similares
- [ ] Análise de paletas de cores

### 4.2 Sistema de Animação

**ATIVIDADE CRÍTICA:** Editor de animações profissional

**FUNCIONALIDADES:**
- [ ] Timeline com keyframes
- [ ] Interpolação automática
- [ ] Curvas de animação (ease-in, ease-out)
- [ ] Layers de animação
- [ ] Preview em tempo real
- [ ] Export para GIF/MP4
- [ ] Sprite sheets animados

### 4.3 Ferramentas de Desenvolvimento

**ATIVIDADE CRÍTICA:** Utilitários para desenvolvedores

```typescript
interface DevTools {
  // Geração de código
  generateCode(assets: Asset[], language: string): string;
  
  // Otimização automática
  optimizeAssets(assets: Asset[]): OptimizedAsset[];
  
  // Validação
  validateAssets(assets: Asset[]): ValidationResult[];
  
  // Métricas
  calculateMetrics(assets: Asset[]): AssetMetrics;
}
```

**DELIVERABLES:**
- [ ] Gerador de código (C, C++, Assembly)
- [ ] Otimizador de paletas
- [ ] Compressor de sprites
- [ ] Validador de formatos

---

## FASE 5: PERFORMANCE E OTIMIZAÇÃO

### 5.1 Otimização de Performance

**ATIVIDADES CRÍTICAS:**
- [ ] Web Workers para processamento pesado
- [ ] Lazy loading de assets
- [ ] Virtual scrolling para listas grandes
- [ ] Caching inteligente
- [ ] Compressão de dados em memória
- [ ] Streaming de dados grandes

### 5.2 Testes e Qualidade

**ATIVIDADES CRÍTICAS:**
- [ ] Testes unitários (>90% coverage)
- [ ] Testes de integração
- [ ] Testes de performance
- [ ] Testes de usabilidade
- [ ] Testes cross-browser
- [ ] Testes de acessibilidade

### 5.3 Documentação e Suporte

**ATIVIDADES CRÍTICAS:**
- [ ] Documentação técnica completa
- [ ] Tutoriais interativos
- [ ] API documentation
- [ ] Troubleshooting guide
- [ ] Video tutorials
- [ ] Community support

---

## CHECKLIST DE IMPLEMENTAÇÃO COMPLETA

### ✅ Cores de Emulação
- [ ] Genesis/Mega Drive (Genesis Plus GX) - 100% funcional
- [ ] Super Nintendo (SNES9x) - 100% funcional
- [ ] Game Boy/Game Boy Color (SameBoy) - 100% funcional
- [ ] NES (QuickNES) - 100% funcional
- [ ] Game Boy Advance (mGBA) - Futuro
- [ ] PlayStation (Beetle PSX) - Futuro

### ✅ Funcionalidades Core
- [ ] Upload e detecção automática de ROMs
- [ ] Extração de sprites em tempo real
- [ ] Extração de paletas de cores
- [ ] Extração de tiles/backgrounds
- [ ] Extração de assets de áudio
- [ ] Sistema de preview em tempo real

### ✅ Interface de Usuário
- [ ] Dashboard principal responsivo
- [ ] Editor de sprites profissional
- [ ] Gerenciador de assets
- [ ] Sistema de exportação universal
- [ ] Configurações avançadas
- [ ] Sistema de ajuda integrado

### ✅ Funcionalidades Avançadas
- [ ] Análise inteligente de assets
- [ ] Editor de animações
- [ ] Ferramentas de desenvolvimento
- [ ] Sistema de plugins
- [ ] API para integrações
- [ ] Suporte offline (PWA)

### ✅ Qualidade e Performance
- [ ] Performance otimizada (60fps)
- [ ] Testes automatizados
- [ ] Documentação completa
- [ ] Suporte multi-idioma
- [ ] Acessibilidade (WCAG 2.1)
- [ ] Cross-browser compatibility

---

## CRITÉRIOS DE SUCESSO

### Funcionalidade
- ✅ Carrega qualquer ROM dos sistemas suportados
- ✅ Extrai assets automaticamente em <5 segundos
- ✅ Interface responsiva em qualquer dispositivo
- ✅ Exporta em todos os formatos populares
- ✅ Zero crashes ou erros críticos

### Performance
- ✅ Carregamento inicial <3 segundos
- ✅ Processamento de ROM <10 segundos
- ✅ Interface fluida 60fps
- ✅ Uso de memória <500MB
- ✅ Suporte para ROMs até 32MB

### Experiência do Usuário
- ✅ Curva de aprendizado <30 minutos
- ✅ Workflow intuitivo
- ✅ Feedback visual constante
- ✅ Recuperação de erros automática
- ✅ Ajuda contextual sempre disponível

---

## ARQUITETURA TÉCNICA FINAL

```typescript
// Estrutura final do sistema
interface UniversalAssetStudio {
  // Core System
  coreManager: CoreManager;
  memoryManager: MemoryManager;
  romAnalyzer: ROMAnalyzer;
  
  // Asset Processing
  assetExtractor: AssetExtractor;
  assetProcessor: AssetProcessor;
  assetOptimizer: AssetOptimizer;
  
  // User Interface
  dashboard: Dashboard;
  spriteEditor: SpriteEditor;
  assetManager: AssetManager;
  exportManager: ExportManager;
  
  // Advanced Features
  animationEditor: AnimationEditor;
  assetAnalyzer: AssetAnalyzer;
  devTools: DevTools;
  
  // System Services
  cacheManager: CacheManager;
  errorHandler: ErrorHandler;
  performanceMonitor: PerformanceMonitor;
}
```

---

## ENTREGÁVEIS FINAIS

1. **Sistema Completo Funcional**
   - Aplicação web responsiva
   - Suporte para 4+ sistemas de videogame
   - Interface profissional

2. **Documentação Técnica**
   - Manual do usuário
   - Documentação da API
   - Guias de desenvolvimento

3. **Testes e Validação**
   - Suite de testes automatizados
   - Relatórios de performance
   - Validação com ROMs reais

4. **Deploy e Distribuição**
   - Build otimizado para produção
   - CI/CD pipeline
   - Monitoramento e analytics

---

**IMPORTANTE:** Este prompt deve ser seguido rigorosamente, com cada fase sendo completada e validada antes de prosseguir para a próxima. O sucesso será medido pela capacidade do sistema de processar ROMs reais e extrair assets utilizáveis em projetos de desenvolvimento de jogos.