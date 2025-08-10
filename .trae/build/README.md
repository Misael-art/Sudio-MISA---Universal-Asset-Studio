# Build Automation Notes

Este diretório contém scripts/modelos para compilar e linkar cores do EmulatorJS com Emscripten, visando máxima automação e reprodutibilidade.

## Genesis Plus GX (Mega Drive)

Arquivos:
- `.trae/build/genesis/ejs_exports.c`: exporta ponteiros de VRAM/CRAM/VSRAM/VDP/SAT e framebuffer via `EMSCRIPTEN_KEEPALIVE`.
- `.trae/build/genesis/compile-genesis-direct.sh`: script bash para linkar via Docker (container `genesis-build`).
- `.trae/build/genesis/compile-genesis-direct.bat`: script equivalente para Windows.

Requisitos gerais:
- Container Docker `genesis-build` com Emscripten (emcc/emar) disponível.
- Objetos do core (.o) ou fontes (.c/.cpp) listados em arquivo de resposta.

Flags essenciais:
- `-s EXPORTED_FUNCTIONS=['_malloc','_free','_get_frame_buffer_ref','_get_vram_ptr','_get_cram_ptr','_get_vsram_ptr','_get_vdp_regs_ptr','_get_sat_ptr']`
- `-s EXPORTED_RUNTIME_METHODS=['cwrap']`
- `-s ENVIRONMENT='web'`
- Memória: ajuste `INITIAL_MEMORY`/`MAXIMUM_MEMORY` conforme necessário.

Saída esperada:
- `public/emulatorjs-data/cores/genesis_plus_gx.js`
- `public/emulatorjs-data/cores/genesis_plus_gx.wasm`

## Roadmap para automação multi-core

- Padronizar um arquivo `exports_<core>.c` por sistema (SNES, NES, GB/C, GBA), alinhado com `src/emulation/cores.ts`.
- Adicionar scripts `compile-<core>-direct.sh/.bat` por core com as mesmas flags e variáveis de ambiente.
- Integrar um orquestrador (ex.: `npm run build:cores`) que invoque cada script com variáveis (`CORE_OBJS_DIR`/`SOURCES_RSP`) específicas, registrando logs e validando artefatos.
- Validar automaticamente no pós-build chamando uma página de teste que exibe o `CoreExportsPanel` e garantindo "OK" para todos os símbolos esperados.