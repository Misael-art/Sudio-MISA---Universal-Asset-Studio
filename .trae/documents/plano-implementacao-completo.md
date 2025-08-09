# Plano de Implementação Completo - Universal Asset Studio

## Análise do Problema Atual

### Problemas Identificados nos Logs:
1. **CRÍTICO**: Sistema usa dados simulados (mock) em vez de emulação real
2. **ERRO**: "ROM nao disponivel para processamento" - MegaDriveCore não recebe dados
3. **LIMITAÇÃO**: Worker gera apenas 3 sprites simulados, não extrai da ROM real
4. **ARQUITETURA**: Falta integração real com Genesis Plus GX

### Status Atual:
- ✅ Interface de carregamento de ROM funcional
- ✅ Sistema de logs implementado
- ✅ Worker básico criado
- ❌ Emulação real da ROM não implementada no fluxo principal
- ❌ Extração de sprites "como no jogo" ainda não está operacional
- ❌ Dados de memória simulados dificultam validação

## Direção Arquitetural Atualizada

- Hook `useEmulator` multi-sistema (EmulatorJS local) e descritores em `src/emulation/cores.ts`.
- Adapters por sistema para reconstrução fiel (Tilemaps/Sprites/Paletas) em IR comum.
- Export/Import com métricas; IA para análise/otimização/validação.

## Plano de Implementação Sequencial

### FASE 0: Fundação do Runtime Real (PRIORIDADE MÁXIMA)

#### 0.1 - Implementação de Emulação Real
**Objetivo**: Substituir mock por emulação real via EmulatorJS (Genesis Plus GX) e preparar base multi-sistema

**Tarefas**:
1. **Consolidar EmulatorJS local e descritores**
   - Verificar `/public/emulatorjs-data/` (loader.js, cores, wasm).
   - `src/emulation/cores.ts`: mapear MD, SNES, NES, GB/GBC/GBA, PCE, SMS, GG, SS, PSX, N64.

2. **Hook de Emulação Genérico (feito)**
   - `useEmulator`: inicia core correto, executa frame loop e captura framebuffer/snapshot.

3. **Implementar Extração Real de Memória**
   - Expor via `cwrap` ponteiros a VRAM/CRAM/VSRAM/OAM/Palettes e registradores.
   - Fallback: processamento de SaveStates.
   - Remover mock após validação.

**Critério de Sucesso**: ROM executa e snapshot traz dados reais (framebuffer + memórias quando possível)

#### 0.3 - Expor ponteiros no core Genesis Plus GX (EmulatorJS)
**Objetivo**: Tornar disponíveis via `Module` os ponteiros nativos a regiões de vídeo do Mega Drive

**Exports necessários (nomes estáveis):**
- `_get_frame_buffer_ref()` → frame RGBA
- `_get_vram_ptr()` → VRAM (0x10000)
- `_get_cram_ptr()` → CRAM (0x80)
- `_get_vsram_ptr()` → VSRAM (~0x50)
- `_get_vdp_regs_ptr()` → bloco de registradores VDP (~0x20)
- (Opcional) `_get_sat_ptr()` → SAT (0x280)

**Passos (alto nível):**
1. No código C/C++ do core (port do Genesis Plus GX usado pelo EmulatorJS), implementar funções `EMSCRIPTEN_KEEPALIVE` retornando os ponteiros (uint32/uintptr).
2. Incluir as funções em `-s EXPORTED_FUNCTIONS` no link (Emscripten).
3. Garantir que os ponteiros apontem para buffers vivos durante a execução (não temporários/copias).
4. Recompilar o core via `@emulatorjs/build` e substituir os artefatos em `public/emulatorjs-data/cores/`.
5. Validar no painel `CoreExportsPanel` (UI) que todos os símbolos estão "OK".

Notas:
- `src/emulation/cores.ts` já lista os nomes esperados; mantenha esses nomes ao exportar.
- O `useEmulator` consome automaticamente essas funções quando presentes.

#### 0.2 - Correção do Fluxo de Dados
**Objetivo**: Corrigir erro "ROM nao disponivel para processamento"

**Tarefas**:
1. **Corrigir MegaDriveCore.processarDadosDoWorker**
   - Verificar recebimento correto dos dados do worker
   - Corrigir validação de dados
   - Implementar tratamento de erros adequado

2. **Sincronizar Worker ↔ MainInterface**
   - Garantir que dados reais sejam enviados do worker
   - Corrigir formato de mensagens entre worker e UI
   - Implementar retry em caso de falha

**Critério de Sucesso**: Dados reais fluem do worker para a interface sem erros

### FASE 1: Reconstrução fiel de Sprites/Tilemaps

#### 1.1 - Decodificação Real de Sprites
**Objetivo**: Extrair sprites reais da ROM emulada

**Tarefas**:
1. **Adapters por Sistema (iniciar MD)**
   - Decodificar paletas (CRAM/CG-RAM), tiles (bpp/planar), tilemaps e sprites (OAM/SAT) com registradores de vídeo.

2. **Validação Visual**
   - Comparar IR renderizado com framebuffer (diff + métricas de qualidade).

**Critério de Sucesso**: Sprites e tilemaps casam com a composição do jogo

#### 1.2 - Interface de Visualização
**Objetivo**: Exibir sprites extraídos na interface

**Tarefas**:
1. **Implementar Galeria de Sprites**
   - Criar componente SpriteGallery
   - Exibir grid de sprites extraídos
   - Adicionar informações de cada sprite (tamanho, posição)

2. **Adicionar Controles de Visualização**
   - Zoom in/out
   - Filtros por tamanho
   - Busca por índice

**Critério de Sucesso**: Interface mostra todos os sprites extraídos organizadamente

### FASE 2: Editor/Export/Import + IA

#### 2.1 - Editor de Sprites
**Objetivo**: Permitir edição básica de sprites

**Tarefas**:
1. **Implementar SpriteEditor**
   - Canvas de edição pixel-a-pixel
   - Ferramentas básicas (pincel, balde)
   - Preview em tempo real

2. **Sistema de Paletas**
   - Visualizar paletas extraídas
   - Trocar cores de sprites
   - Criar paletas customizadas

#### 2.2 - Sistema de Exportação/Importação
**Objetivo**: Exportar sprites em formatos úteis

**Tarefas**:
1. **Exportação PNG**
   - Sprites individuais
   - Sprite sheets
   - Múltiplas resoluções

2. **Exportação/Importação de Dados**
   - JSON/XML de métricas; Importação com validação, requantização por IA e reinjeção em ROM

### FASE 3: Expansão Multi-Sistema

#### 3.1 - Suporte a SNES
**Objetivo**: Adicionar suporte ao Super Nintendo

**Tarefas**:
1. **Integrar SNES9x Core**
2. **Implementar SNESCore**
3. **Adaptar decodificadores para formato SNES**

#### 3.2 - Suporte a Game Boy
**Objetivo**: Adicionar suporte ao Game Boy

**Tarefas**:
1. **Integrar Gambatte Core**
2. **Implementar GameBoyCore**
3. **Adaptar para paletas monocromáticas**

## Cronograma de Implementação

### Semana 1: FASE 0 (Crítica)
- Dias 1-2: EmulatorJS + descritores + `/data` estável
- Dias 3-4: Exports de memória/regs + fallback SaveState
- Dias 5-7: Snapshot real integrado

### Semana 2: FASE 1
- Dias 1-3: IR + Adapter MD (paletas/tiles/tilemaps/sprites/regs)
- Dias 4-5: Composição `Frame` + comparador framebuffer
- Dias 6-7: Viewers (Tilemap/Sprite/Palette) e métricas

### Semana 3-4: FASE 2
- Semana 3: Editor + paletas + IA (análise/unificação/sacrifício)
- Semana 4: Export/Import PNG+JSON e reinjeção

### Semana 5+: FASE 3
- SNES/GB/GBC/GBA/NES/PCE/SMS/GG/SS/PSX/N64 conforme prioridade

## Arquivos Prioritários para Modificação

### Críticos (FASE 0):
1. `src/hooks/useEmulator.ts` (feito)
2. `src/emulation/cores.ts` (feito)
3. `src/emulation/types.ts` (parcial IR)
4. `vite.config.ts` (`/data` dev+build feito)

### Importantes (FASE 1):
1. `src/lib/decoders/MegaDriveSpriteDecoder.ts` - Aprimorar decodificação
2. `src/components/SpriteEditor.tsx` - Implementar visualização
3. `src/lib/decoders/MegaDrivePaletteDecoder.ts` - Validar paletas

### Secundários (FASE 2+):
1. Novos componentes de edição
2. Sistema de exportação
3. Cores para outros sistemas

## Critérios de Sucesso por Fase

### FASE 0 - Sucesso:
- ✅ ROM real executa no EmulatorJS
- ✅ Snapshot real (framebuffer + memórias quando expostas)
- ✅ Zero erros de fluxo
- ✅ Logs mostram execução e captura

### FASE 1 - Sucesso:
- ✅ Sprites reais visíveis na interface
- ✅ Sonic reconhecível no Sprite #0
- ✅ Pelo menos 20+ sprites extraídos corretamente
- ✅ Cores e dimensões corretas

### FASE 2 - Sucesso:
- ✅ Editor funcional com edição pixel-a-pixel
- ✅ Exportação PNG funcionando
- ✅ Sistema de paletas operacional

### FASE 3 - Sucesso:
- ✅ Pelo menos 2 sistemas adicionais funcionando
- ✅ Interface unificada para múltiplos sistemas

## Próximos Passos Imediatos

1. **AGORA**: Baixar Genesis Plus GX e colocar em `/public/cores/genesis/`
2. **HOJE**: Refatorar `emulation.worker.ts` para usar core real
3. **AMANHÃ**: Corrigir `MegaDriveCore.ts` para processar dados reais
4. **Esta Semana**: Completar FASE 0 integralmente

---

**NOTA IMPORTANTE**: Este plano prioriza a funcionalidade core (emulação real) antes de qualquer feature secundária. Sem a FASE 0 completa, todas as outras fases são inúteis.