#!/usr/bin/env bash
set -euo pipefail

# Modelo de link do core Genesis Plus GX (EmulatorJS) via Docker (container genesis-build)
# Requisitos:
# - Container 'genesis-build' com Emscripten instalado (emcc/emar)
# - Objetos ou fontes do core já preparados (ver notas abaixo)
# - Este script deve ser executado a partir da raiz do repositório
#
# Uso rápido (linkando objetos já compilados):
#   CORE_OBJS_DIR=</caminho/para/objs> \
#   ./.trae/build/genesis/compile-genesis-direct.sh
#
# Uso alternativo (compilando fontes diretamente):
#   Defina SOURCES_RSP com um arquivo de resposta (um caminho por linha com os .c/.cpp do core)
#   SOURCES_RSP=.trae/build/genesis/sources.rsp \
#   ./.trae/build/genesis/compile-genesis-direct.sh
#
# Saída:
#   public/emulatorjs-data/cores/genesis_plus_gx.js
#   public/emulatorjs-data/cores/genesis_plus_gx.wasm

CONTAINER_NAME=${CONTAINER_NAME:-genesis-build}
WORKDIR=/work
ROOT_DIR=$(pwd)
OUT_DIR=${OUT_DIR:-public/emulatorjs-data/cores}
EXPORTS_FILE=.trae/build/genesis/ejs_exports.c
OUT_JS=${OUT_JS:-genesis_plus_gx.js}

mkdir -p "$OUT_DIR"

# Flags de export obrigatórias
EXPORTED_FUNCS="['_malloc','_free','_get_frame_buffer_ref','_get_vram_ptr','_get_cram_ptr','_get_vsram_ptr','_get_vdp_regs_ptr','_get_sat_ptr']"
EXPORTED_RUNTIME="['cwrap']"

# Memória/ambiente
INITIAL_MEMORY=${INITIAL_MEMORY:-67108864}     # 64 MiB
MAXIMUM_MEMORY=${MAXIMUM_MEMORY:-134217728}    # 128 MiB
ENVIRONMENT=${ENVIRONMENT:-web}

set -x

if [[ -n "${CORE_OBJS_DIR:-}" && -d "$CORE_OBJS_DIR" ]]; then
  # Linkando objetos previamente compilados + arquivo de exports C
  docker run --rm -v "$ROOT_DIR":"$WORKDIR" -w "$WORKDIR" "$CONTAINER_NAME" \
    emcc "$CORE_OBJS_DIR"/*.o "$EXPORTS_FILE" \
    -O3 \
    -s EXPORTED_FUNCTIONS="$EXPORTED_FUNCS" \
    -s EXPORTED_RUNTIME_METHODS="$EXPORTED_RUNTIME" \
    -s ENVIRONMENT="$ENVIRONMENT" \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s INITIAL_MEMORY=$INITIAL_MEMORY \
    -s MAXIMUM_MEMORY=$MAXIMUM_MEMORY \
    -o "$OUT_DIR/$OUT_JS"
elif [[ -n "${SOURCES_RSP:-}" && -f "$SOURCES_RSP" ]]; then
  # Compilando fontes diretamente a partir de um arquivo de resposta (um caminho por linha)
  docker run --rm -v "$ROOT_DIR":"$WORKDIR" -w "$WORKDIR" "$CONTAINER_NAME" \
    bash -lc 'emcc -O3 $(tr "\n" " " < '"$SOURCES_RSP"') '"$EXPORTS_FILE"' \
      -s EXPORTED_FUNCTIONS='"$EXPORTED_FUNCS"' \
      -s EXPORTED_RUNTIME_METHODS='"$EXPORTED_RUNTIME"' \
      -s ENVIRONMENT='"$ENVIRONMENT"' \
      -s ALLOW_MEMORY_GROWTH=1 \
      -s INITIAL_MEMORY='"$INITIAL_MEMORY"' \
      -s MAXIMUM_MEMORY='"$MAXIMUM_MEMORY"' \
      -o '"$OUT_DIR/$OUT_JS"''
else
  echo "[ERRO] Defina CORE_OBJS_DIR (com .o do core) ou SOURCES_RSP (lista de fontes)." >&2
  exit 1
fi

set +x

echo "\n[OK] Core linkado em $OUT_DIR/$OUT_JS"