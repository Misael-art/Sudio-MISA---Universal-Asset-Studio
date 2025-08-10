# Sudio MISA — Universal Asset Studio

Transforme gráficos de ROMs clássicas em assets editáveis e auditáveis. O Sudio MISA reconstrói fielmente camadas (BG/Window), sprites e paletas diretamente da emulação real (EmulatorJS), permitindo análise visual (diff), exportação/importação e edição assistida por IA.

## Sumário
- Visão Geral
- Arquitetura
- Requisitos
- Instalação e Execução
- Fluxo de Emulação (EmulatorJS)
- Reconstrução/Renderização
- Export/Import
- Editor (WIP)
- Roadmap e Critérios de Aceite
- Contribuição
- Segurança e Privacidade
- Licença

## Visão Geral
- Multi-sistema: Mega Drive (prioridade), SNES, NES, GB/GBC/GBA (em progresso).
- Reconstrução fiel “como no jogo”: plane/tiles/paletas/prioridade/scroll.
- Análise visual: framebuffer real vs reconstrução (diff e pontuação).
- Exporta PNG/JSON; Importa PNG+JSON e valida metadados.
- Fallback via SaveState quando ponteiros diretos do core não estiverem disponíveis.

## Arquitetura
- UI/React + TypeScript + Vite
- Hook `useEmulator` gerencia EmulatorJS por core/sistema
- IR comum (`src/emulation/ir/`): `FrameIR`, `Layer`, `Tileset`, `Tile`, `Sprite`
- Adapters por sistema (`src/emulation/adapters/`): decodificadores e reconstrução
- Renderizador (`src/emulation/render.ts`): compõe camadas e sprites com prioridade
- Descritores de cores (`src/emulation/cores.ts`): nomes de exports e tamanhos

Referências de diretórios importantes:
- `public/emulatorjs-data/`: cores/loader/wasm do EmulatorJS
- `src/emulation/`: IR, adapters, render, state, descritores
- `src/components/`: Analyzer, viewers e utilitários de UI

## Requisitos
- Node.js LTS (>= 18)
- Navegador moderno com WebAssembly
- Cores do EmulatorJS localmente em `public/emulatorjs-data/`

## Instalação e Execução
```bash
npm install
npm run dev
```
Abra `http://localhost:5173`.

## Fluxo de Emulação (EmulatorJS)
- `useEmulator` carrega o core especificado e inicia o loop de captura.
- Captura de framebuffer e ponteiros de memória via exports cwrap do core.
- Fallback por SaveState quando necessário.

Cwraps esperados (MD):
- `_get_frame_buffer_ref()`
- `_get_vram_ptr()` (0x10000)
- `_get_cram_ptr()` (0x80)
- `_get_vsram_ptr()` (~0x50)
- `_get_vdp_regs_ptr()` (~0x20)
- `_get_sat_ptr()` (0x280)

Consulte `.trae/documents/plano-implementacao-completo.md` (seção 0.3) para instruções de rebuild do core.

## Reconstrução/Renderização
- `MegaDriveAdapter` decodifica tiles 4bpp de VRAM em `pixelIndices` e reconstrói:
  - Plane A, Plane B e Window via bases VDP; flips e `paletteIndex` por célula
  - SAT/Sprites (quando disponível) e composição com prioridade
- `render.ts` aplica paleta por tile (paletas do frame) e respeita:
  - Scroll com wrap e pipeline de prioridade (BG low → Sprites → BG high)

## Export/Import
- Exporta PNG (framebuffer/reconstrução) e metadados JSON (endereços/tiles/paletas quando disponíveis)
- Importa sprites (PNG+JSON), valida metadados e alimenta a UI/loja de assets

## Editor (WIP)
- Ferramentas atuais: lápis básico
- Próximas: borracha, balde, seleção por cor, Undo/Redo

## Roadmap e Critérios de Aceite
- Ver `.trae/TODO.md` para lista acionável e `.trae/documents/plano-implementacao-completo.md` para detalhes
- Critérios (etapas principais):
  - Core MD: exports “OK” no `CoreExportsPanel`
  - Adapter MD: diff < 5% em cenas de teste (Analyzer)
  - SaveState: fallback funcional
  - Multi-sistema: export/adapter/validação por sistema

## Contribuição
- Padrões: TypeScript, nomes descritivos, controle de fluxo simples (early return), sem gambiarras
- Commits descritivos (ex.: `feat:`, `fix:`, `docs:`)
- Tratamento de erros explícito com mensagens claras (o que/por que/como corrigir)

## Segurança e Privacidade
- Sem upload automático de ROMs; processamento local
- Cuidados ao publicar/compartilhar save states e assets gerados

## Licença
- Definir conforme necessidade do projeto
