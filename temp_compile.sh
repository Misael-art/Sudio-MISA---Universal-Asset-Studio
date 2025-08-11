#!/bin/bash
set -e

# Collect all object files
OBJ_FILES=$(find temp/manual-build/genesis-plus-gx -name '*.o' | tr '\n' ' ')

# Compile with emcc
emcc $OBJ_FILES .trae/build/genesis/ejs_exports.c \
  -O3 \
  -s EXPORTED_FUNCTIONS="['_malloc','_free','_get_frame_buffer_ref','_get_vram_ptr','_get_cram_ptr','_get_vsram_ptr','_get_vdp_regs_ptr','_get_sat_ptr']" \
  -s EXPORTED_RUNTIME_METHODS="['cwrap']" \
  -s ENVIRONMENT="web" \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s INITIAL_MEMORY=67108864 \
  -s MAXIMUM_MEMORY=134217728 \
  -o public/emulatorjs-data/cores/genesis_plus_gx_new.js

echo "Compilation completed successfully!"