# Exports esperados por sistema e tamanhos de memória

Fonte da verdade no código: `src/emulation/cores.ts`.

Observação importante
- Os nomes abaixo devem ser exportados pelo `Module` do core (Emscripten), preferencialmente com os prefixos exatos.
- Tamanhos representam a janela mínima segura a ser lida pela UI para validação/dump.

## Mega Drive (Genesis Plus GX)
- `_get_frame_buffer_ref()` → framebuffer RGBA (largura x altura x 4)
- `_get_vram_ptr()` → 0x10000 bytes
- `_get_cram_ptr()` → 0x80 bytes
- `_get_vsram_ptr()` → ~0x50 bytes
- `_get_vdp_regs_ptr()` → ~0x20 bytes
- `_get_sat_ptr()` → 0x280 bytes

## SNES (SNES9x port)
- `_get_framebuffer_ptr()`/`_get_frame_buffer_ref()` → framebuffer
- `_get_vram_ptr()` → 0x8000 bytes
- `_get_cgram_ptr()` → 0x200 bytes (CGRAM)
- `_get_oam_ptr()` → ~0x220 bytes (OAM)
- `_get_ppu_regs_ptr()` → ~0x40 bytes

## NES (FCEUX/Mesen)
- `_get_framebuffer_ptr()` → framebuffer
- `_get_chr_ptr()` → 0x2000 bytes (CHR/VRAM)
- `_get_pal_ptr()` → 32 bytes (paletas PPU)
- `_get_oam_ptr()` → 256 bytes
- `_get_ppu_regs_ptr()` → ~0x20 bytes

## GB
- `_get_framebuffer_ptr()` → framebuffer
- `_get_vram_ptr()` → 0x2000 bytes
- `_get_palette_ptr()` → (quando aplicável) 0x40 bytes
- `_get_oam_ptr()` → 160 bytes
- `_get_lcd_regs_ptr()` → ~0x40 bytes

## GBC
- `_get_framebuffer_ptr()` → framebuffer
- `_get_vram_ptr()` → 0x4000 bytes
- `_get_palette_ptr()` → 0x40 bytes
- `_get_oam_ptr()` → 160 bytes
- `_get_lcd_regs_ptr()` → ~0x40 bytes

## GBA
- `_get_framebuffer_ptr()` → framebuffer
- `_get_vram_ptr()` → 0x18000 bytes
- `_get_palette_ptr()` → 0x400 bytes
- `_get_oam_ptr()` → 0x400 bytes
- `_get_ppu_regs_ptr()` → ~0x40 bytes

## PCE / TG-16
- `_get_framebuffer_ptr()` → framebuffer
- `_get_vram_ptr()` → (dependente do port; usar valor configurado no core)
- `_get_palette_ptr()` → (dependente do port)
- `_get_oam_ptr()` → (dependente do port)

## SMS / GG
- `_get_framebuffer_ptr()` → framebuffer
- `_get_vram_ptr()` → (dependente do port)
- `_get_palette_ptr()` → (dependente do port)
- `_get_oam_ptr()` → (dependente do port)

## Saturn / PSX / N64
- `_get_framebuffer_ptr()` → framebuffer
- Demais regiões variam amplamente por port/implementação; mapear conforme suporte futuro.

Validação na UI
- O painel `CoreExportsPanel` confere a presença dos símbolos e tenta validar o tamanho esperado abrindo uma visão da memória WASM (sem copiar). Um símbolo será marcado como:
  - "OK" quando a função existe; e
  - `sizeOk: true` quando a leitura da janela esperada não estoura limites de memória.

Rebuild do core
- Instruções detalhadas e exemplo em C estão no documento: `.trae/documents/plano-implementacao-completo.md` (Seção 0.3).