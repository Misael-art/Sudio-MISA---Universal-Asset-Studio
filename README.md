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
  (Sem fallback por SaveState: apenas dados reais via ponteiros do core.)

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
  (Sem fallback por SaveState: apenas dados reais via ponteiros do core.)

### Diagnóstico e Logs (T+ms)
- O hook instrumenta chamadas críticas com tempos relativos ao `loadRomFile` (T+ms):
  - `ready`, `createText`, `downloadGameCore`, `await Module`, `Module ready`, `downloadFiles`, `saveDatabaseLoaded`, `gameManager ready`, `start`, `Module.callMain`, `running`.
- `isReady` só fica `true` após `Module` disponível (evita corridas de inicialização).
- Wrappers seguros envolvem métodos internos do EJS para auditoria sem alterar o minificado.

### Fluxo de Emulação (EmulatorJS) - Corrigido

Após a refatoração para garantir uma inicialização determinística, o fluxo de interação com o hook `useEmulator` foi simplificado e tornado mais robusto. O padrão de *race condition* foi eliminado.

O fluxo correto é:

1.  **Inicialização do Motor:** A UI monta o componente que utiliza o hook `useEmulator`. O hook, por sua vez, inicializa o motor do EmulatorJS, carrega o `loader.js` e prepara a instância do emulador, mas **não inicia a emulação automaticamente** (`EJS_startOnLoaded = false`). O estado `isReady` do hook se torna `true` quando este processo termina.

2.  **Carregamento da ROM:** O usuário seleciona um arquivo de ROM. A UI, ao detectar a seleção e verificar que `isReady` é `true`, chama a função `loadRomFile(file)` exportada pelo hook.

3.  **Início da Emulação:** A função `loadRomFile` assume o controle:
    - Define `window.EJS_gameUrl` com o arquivo da ROM.
    - Dispara a sequência de carregamento do core (`downloadGameCore`), que por sua vez carrega a ROM, monta o sistema de arquivos e inicia a emulação.

4.  **Confirmação via Evento:** O hook escuta o evento `on('start')` do emulador. Quando este evento é recebido, o estado `isRunning` do hook se torna `true`, sinalizando para a UI que a emulação está de fato rodando e que os snapshots de memória são válidos.

5.  **Processamento Reativo:** A UI reage à mudança do estado `isRunning` e à chegada de novos `snapshot`s para automaticamente enviar os dados de memória (VRAM/CRAM) para o worker, sem a necessidade de um gatilho manual.

Este novo fluxo elimina a necessidade de polling, remove chamadas duplicadas e garante que as operações ocorram em uma sequência previsível e livre de erros de concorrência.

Cwraps esperados (MD):
- `_get_frame_buffer_ref()`
- `_get_vram_ptr()` (0x10000)
- `_get_cram_ptr()` (0x80)
- `_get_vsram_ptr()` (~0x50)
- `_get_vdp_regs_ptr()` (~0x20)
- `_get_sat_ptr()` (0x280)

Consulte `.trae/documents/plano-implementacao-completo.md` (seção 0.3) para instruções de rebuild do core.

### Build do Core (Genesis Plus GX)
- Script: `scripts/build-genesis-universal.ps1` recompila o core com exports requeridos.
- Requer Docker Desktop ativo (padrão). Executar:
  ```powershell
  ./scripts/build-genesis-universal.ps1 -Clean
  ```
- Valida a presença dos exports e instala artefatos em `public/emulatorjs-data/cores/`.

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
  - SaveState: desativado como fonte de dados para cumprir "Sem dados mock/simulados"
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
