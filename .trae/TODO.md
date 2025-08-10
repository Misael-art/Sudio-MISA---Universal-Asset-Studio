# TODO: Roadmap de Execução (Próximas Ações Práticas)

## Núcleo de Emulação (exports cwrap) – Prioridade Máxima
- [ ] Mega Drive (Genesis Plus GX port via EmulatorJS)
  - [ ] Expor ponteiros em `Module` (funções cwrap) e confirmar no CoreExportsPanel:
    - [ ] `_get_frame_buffer_ref()` → framebuffer RGBA
    - [ ] `_get_vram_ptr()` → VRAM (0x10000)
    - [ ] `_get_cram_ptr()` → CRAM (0x80)
    - [ ] `_get_vsram_ptr()` → VSRAM (~0x50)
    - [ ] `_get_vdp_regs_ptr()` → bloco de registradores VDP (~0x20)
    - [ ] (Opcional) `_get_sat_ptr()` → SAT (0x280)
  - [ ] Atualizar `src/emulation/cores.ts` com os nomes definitivos caso diferenciem dos placeholders
  - [ ] Validar na UI (Analyzer → Exports do Core) que todos aparecem como “OK”

  - [ ] Rebuild do core MD realizado e artefatos substituídos em `public/emulatorjs-data/cores/`

- [ ] SNES (SNES9x port via EmulatorJS)
  - [ ] Expor `framebuffer`, `vram_ptr` (0x8000), `cgram_ptr` (0x200), `oam_ptr` (~0x220), `ppu_regs_ptr` (~0x40)
  - [ ] Atualizar `cores.ts` e validar na UI

- [ ] NES (FCEUX/Mesen port via EmulatorJS – conforme usado)
  - [ ] Expor `framebuffer`, `chr_ptr` (VRAM 0x2000), `pal_ptr` (32), `oam_ptr` (256), `ppu_regs_ptr` (~0x20)
  - [ ] Atualizar `cores.ts` e validar

- [ ] GB/GBC/GBA
  - [ ] Expor ponteiros de VRAM, paletas (CGB/GBA), OAM, regs LCD/PPU
  - [ ] Atualizar `cores.ts` e validar

## Adapters: Reconstrução Fiel “Como no Jogo”
- [ ] Mega Drive
  - [ ] Consumir regs VDP reais e reconstruir Plane A/B/Window com bases corretas
  - [x] Aplicar scroll por linha/coluna (quando se aplicar) e prioridade (pipeline no render preparado)
  - [x] Respeitar tamanhos de planos (32x32/64x32/32x64/64x64) via registradores
  - [x] Ajustar paleta por tile (usar `paletteIndex` do tilemap) na composição (não fixar apenas paleta 0)
  - [ ] Validar com diff visual (Analyzer) e reduzir percent diff para cenas de teste (< 5%)

- [ ] SNES
  - [ ] Decodificar CGRAM 15-bit; VRAM 2/4/8bpp por modo; OAM (sprites)
  - [ ] Compor BGs respeitando modos PPU/priority/window/subscreen
  - [ ] Validar com diff visual

- [ ] NES
  - [ ] Name Tables + Attribute Tables; paletas PPU; OAM; composição básica
  - [ ] Validar com diff visual

- [ ] GB/GBC/GBA
  - [ ] DMG/CGB: bancos VRAM e paletas; OAM; scroll/window; prioridades
  - [ ] GBA: modos text/rotation; paletas BG/OAM; OAM affine; múltiplas camadas

## Fallback por SaveState (se exports demorarem)
- [ ] Implementar parsers em `src/emulation/state/` por sistema, começando por Mega Drive
  - [ ] Extrair VRAM/CRAM/VSRAM/SAT/regs do dump (documentar formato do save state do core)
  - [ ] Integrar no `useEmulator` quando `*_ptr` não existir

## Editor e IA
- [ ] Pixel Editor
  - [ ] Ferramentas: lápis, borracha, balde, seleção por cor
  - [ ] Camadas simples (opc.) e undo/redo (histórico)

- [ ] IA (OpenRouter/OpenAI/Gemini)
  - [ ] Endpoint para “Análise de Paleta” (ramps/unificação)
  - [ ] “Sugestão de Sacrifício” para redução de cores
  - [ ] “Validação de Qualidade” com nota e parecer técnico
  - [ ] Requantização assistida: aplicar sugestões ao sprite/tileset respeitando limites do hardware

## Export/Import e Reinjeção
- [ ] Exportação
  - [ ] Confirmar fluxos de export PNG/JSON (reconstrução, framebuffer, spritesheet)
  - [ ] Expandir metadados (endereços, bancos, prioridade, flips) quando disponível

- [ ] Importação
  - [ ] Finalizar recorte → validações → requantização (IA) → conversão para tiles/VRAM
  - [ ] Reinjeção em ROM (endereços/bancos) com auditoria (log offsets; checksums antes/depois)

## UI/UX e Qualidade
- [ ] Analyzer
  - [ ] Refinar diffs: highlight por camada, mediana de erro por tile, hotspots
  - [ ] Mostrar bases e regs usados (VDP/PPU) e contagens de tiles não vazios

- [ ] Testes
  - [ ] Unitários (decoders por sistema; hashing de tiles com flips)
  - [ ] Integração (snapshot→IR→render→diff) com thresholds por sistema

## Documentação
- [ ] Atualizar @documents com a fase corrente e instruções para habilitar exports no core
- [ ] Citar símbolos esperados por sistema e tamanhos de memória (ref. `cores.ts`)

- [x] 1: Baixar e configurar EmulatorJS/Genesis Plus GX localmente na pasta /public (priority: High)
- [x] 2: Modificar megadrive.worker.ts para usar o emulador real em vez do generateTestFrame (priority: High)
- [x] 3: Implementar carregamento da ROM real no emulador Genesis Plus GX (priority: High)
- [x] 4: Capturar framebuffer real do emulador e enviar para EmulatorScreen (priority: High)
- [x] 5: Corrigir erros de compilação no megadrive.worker.ts (priority: High)
- [x] 6: Implementar integração direta com Genesis Plus GX core (priority: High)
- [x] 7: Testar emulação real da ROM com o core corrigido (priority: High)
- [x] 8: Remover dependência do core Genesis Plus GX inexistente que causa reloads infinitos (priority: High)
- [x] 9: Criar worker simplificado funcional para processar ROMs da pasta /data/ (priority: High)
- [x] 10: Implementar suíte de testes automatizada para todas as ROMs (priority: High)
