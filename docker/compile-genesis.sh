#!/bin/bash
set -e

echo "=== Genesis Plus GX Docker Build ==="

# Clone Genesis Plus GX
echo "Cloning Genesis Plus GX..."
git clone https://github.com/libretro/Genesis-Plus-GX.git genesis-plus-gx
cd genesis-plus-gx

# Create emscripten exports file
echo "Creating emscripten exports..."
cat > emscripten_exports.c << 'EOF'
#include <emscripten.h>
#include <stdint.h>

// External variables from Genesis Plus GX core
extern uint8_t work_ram[0x10000];  // 64KB Work RAM
extern uint8_t zram[0x2000];       // 8KB Z80 RAM
extern uint16_t cram[0x40];        // Color RAM (64 colors)
extern uint8_t vram[0x10000];      // 64KB Video RAM
extern uint8_t vsram[0x50];        // Vertical Scroll RAM
extern uint8_t reg[0x20];          // VDP registers
extern uint8_t sat[0x400];         // Sprite Attribute Table

/**
 * Get Work RAM pointer (68000 main RAM)
 * Size: 64KB (0x10000 bytes)
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_work_ram_ptr(void) {
    return (uint32_t)work_ram;
}

/**
 * Get Z80 RAM pointer
 * Size: 8KB (0x2000 bytes)
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_z80_ram_ptr(void) {
    return (uint32_t)zram;
}

/**
 * Get Color RAM pointer (palette data)
 * Size: 128 bytes (64 colors * 2 bytes each)
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_cram_ptr(void) {
    return (uint32_t)cram;
}

/**
 * Get Video RAM pointer (pattern and nametable data)
 * Size: 64KB (0x10000 bytes)
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_vram_ptr(void) {
    return (uint32_t)vram;
}

/**
 * Get Vertical Scroll RAM pointer
 * Size: ~80 bytes (0x50 bytes)
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_vsram_ptr(void) {
    return (uint32_t)vsram;
}

/**
 * Get VDP registers pointer
 * Size: ~32 bytes (0x20 bytes)
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_vdp_regs_ptr(void) {
    return (uint32_t)reg;
}

/**
 * Get Sprite Attribute Table pointer
 * Size: 1024 bytes (0x400 bytes)
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_sat_ptr(void) {
    return (uint32_t)sat;
}
EOF

echo "Compiling bytecode..."
# Compile to bytecode first
make -f Makefile.libretro platform=emscripten TARGET_NAME=genesis_plus_gx HAVE_CHD=0 HAVE_CDROM=0 DEBUG=0

echo "Converting to JavaScript and WASM..."
# Convert bytecode to JS and WASM
emcc genesis_plus_gx_libretro_emscripten.bc \
  -o genesis_plus_gx.js \
  -s WASM=1 \
  -s EXPORTED_FUNCTIONS='["_main", "_malloc", "_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME='"genesis_plus_gx"' \
  -O2

echo "Build completed successfully!"
echo "Generated files:"
ls -la genesis_plus_gx.js genesis_plus_gx.wasm