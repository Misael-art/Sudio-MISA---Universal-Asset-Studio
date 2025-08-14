#!/bin/bash
set -e

echo "=== Genesis Plus GX Docker Build ==="

# Clone Genesis Plus GX
echo "Cloning Genesis Plus GX (ekeeke upstream)..."
git clone https://github.com/ekeeke/Genesis-Plus-GX.git genesis-plus-gx
cd genesis-plus-gx

# Copy corrected emscripten exports file
echo "Copying corrected emscripten exports file..."
if [ ! -f "/build/emscripten_exports_corrected.c" ]; then
    echo "ERROR: emscripten_exports_corrected.c not found in /build/"
    echo "Available files in /build/:"
    ls -la /build/
    exit 1
fi

cp /build/emscripten_exports_corrected.c ./emscripten_exports.c
echo "Emscripten exports file copied successfully!"

echo "Compiling bytecode..."
# Compile to bytecode first (usar toolchain do Emscripten)
# Suporte opcional ao Sega CD controlado por variável de ambiente ENABLE_SCD (0 por padrão)
ENABLE_SCD=${ENABLE_SCD:-0}
echo "ENABLE_SCD=${ENABLE_SCD} (HAVE_CDROM=${ENABLE_SCD})"
emmake make -f Makefile.libretro platform=emscripten TARGET_NAME=genesis_plus_gx HAVE_CHD=0 HAVE_CDROM=${ENABLE_SCD} DEBUG=0

echo "Converting to JavaScript and WASM..."
# Convert bytecode to JS and WASM with corrected exports
echo "Converting bytecode to JavaScript and WASM..."
# Detect bytecode file automatically
CORE_BC=""
if ls *.bc >/dev/null 2>&1; then
  CORE_BC=$(ls -1 *.bc | head -n 1)
fi
if [ -z "$CORE_BC" ]; then
  echo "ERROR: No .bc file found after make"
  ls -la
  exit 1
fi
echo "Using bytecode: $CORE_BC"

# Compilar arquivo de exports separadamente para bytecode
echo "Compilando arquivo de exports para bytecode..."
emcc -c emscripten_exports.c -o emscripten_exports.bc

# Verificar se o arquivo de exports foi compilado
if [ ! -f "emscripten_exports.bc" ]; then
    echo "ERROR: Falha ao compilar emscripten_exports.c"
    exit 1
fi

# Link bytecode do core com bytecode dos exports
echo "Linkando bytecode do core com exports..."
emcc "$CORE_BC" emscripten_exports.bc \
  -o genesis_plus_gx.js \
  -s WASM=1 \
  -s ENVIRONMENT=web \
  -s NO_EXIT_RUNTIME=1 \
  -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s FORCE_FILESYSTEM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME='"genesis_plus_gx"' \
  -s EXTRA_EXPORTED_RUNTIME_METHODS='[]' \
  -s EXPORTED_FUNCTIONS='["_malloc", "_free", "_get_frame_buffer_ref", "_get_frame_buffer_width", "_get_frame_buffer_height", "_get_frame_buffer_pitch", "_get_work_ram_ptr", "_get_work_ram_size", "_get_zram_ptr", "_get_zram_size", "_get_vram_ptr", "_get_vram_size", "_get_cram_ptr", "_get_cram_size", "_get_vsram_ptr", "_get_vsram_size", "_get_vdp_regs_ptr", "_get_vdp_regs_size", "_get_sat_ptr", "_get_sat_size", "_is_core_initialized", "_get_total_memory_size", "_get_active_system_code"]' \
  -O2

# Verify build success
if [ ! -f "genesis_plus_gx.js" ] || [ ! -f "genesis_plus_gx.wasm" ]; then
    echo "ERROR: Build failed - missing output files"
    echo "Expected files: genesis_plus_gx.js, genesis_plus_gx.wasm"
    echo "Available files in current directory:"
    ls -la
    exit 1
fi

echo "Build completed successfully!"
echo "Generated files:"
ls -la genesis_plus_gx.js genesis_plus_gx.wasm

# Verify file sizes are reasonable
JS_SIZE=$(stat -c%s "genesis_plus_gx.js" 2>/dev/null || echo "0")
WASM_SIZE=$(stat -c%s "genesis_plus_gx.wasm" 2>/dev/null || echo "0")

echo "File sizes:"
echo "  genesis_plus_gx.js: ${JS_SIZE} bytes"
echo "  genesis_plus_gx.wasm: ${WASM_SIZE} bytes"

if [ "$JS_SIZE" -lt 1000 ] || [ "$WASM_SIZE" -lt 10000 ]; then
    echo "WARNING: Generated files seem too small; continuing to copy for inspection"
fi

echo "Attempting to copy outputs to mounted /output if available..."
if [ -d "/output" ]; then
    cp -f genesis_plus_gx.js genesis_plus_gx.wasm /output/
    echo "Copied genesis_plus_gx.js and genesis_plus_gx.wasm to /output"
else
    echo "No /output mount detected; outputs remain in container at $(pwd)"
fi

echo "Genesis Plus GX core build completed successfully with corrected exports!"

# Post-process: anexar definição de EJS_Runtime ao final do arquivo JS para compatibilidade com EmulatorJS
cat >> genesis_plus_gx.js <<'EOF'

// UAS: Definição do runtime para o EmulatorJS
;(function(){
  try {
    if (typeof window !== 'undefined') {
      console.log('[EMULATOR][core] 🚀 Pós-build: definindo window.EJS_Runtime = genesis_plus_gx');
      console.log('[EMULATOR][core] - typeof genesis_plus_gx =', typeof genesis_plus_gx);
      window.EJS_Runtime = genesis_plus_gx;
      try {
        window.dispatchEvent(new CustomEvent('EJS_Runtime_Ready', { detail: { type: typeof window.EJS_Runtime, ts: Date.now() } }));
      } catch (e) { /* ignore */ }
    }
  } catch (e) { try { console.warn('[EMULATOR][core] Pós-build: falha ao definir EJS_Runtime', e); } catch(_){} }
})();
EOF

echo "Appended EJS_Runtime postlude to genesis_plus_gx.js"