#!/bin/bash
set -e

echo "=== Genesis Plus GX Direct Emscripten Build ==="

# Clone Genesis Plus GX
echo "Cloning Genesis Plus GX..."
git clone https://github.com/libretro/Genesis-Plus-GX.git genesis-plus-gx
cd genesis-plus-gx

# Create emscripten exports file
echo "Preparing compilation..."

echo "Compiling directly with emcc..."

# Define compiler flags
CFLAGS="-DGIT_VERSION=\"a69c81e4\" -O2 -DNDEBUG -DUSE_LIBTREMOR -DUSE_PER_SOUND_CHANNELS_CONFIG"
CFLAGS="$CFLAGS -I./core -I./core/z80 -I./core/m68k -I./core/ntsc -I./core/sound"
CFLAGS="$CFLAGS -I./core/input_hw -I./core/cd_hw -I./core/cart_hw -I./core/cart_hw/svp"
CFLAGS="$CFLAGS -I./libretro -I./libretro/libretro-common/include"
CFLAGS="$CFLAGS -DUSE_16BPP_RENDERING -DFRONTEND_SUPPORTS_RGB565 -DLSB_FIRST"
CFLAGS="$CFLAGS -DALIGN_LONG -DBYTE_ORDER=LITTLE_ENDIAN -DHAVE_ZLIB"
CFLAGS="$CFLAGS -D__LIBRETRO__ -DUSE_LIBRETRO_VFS -DM68K_OVERCLOCK_SHIFT=20"
CFLAGS="$CFLAGS -DZ80_OVERCLOCK_SHIFT=20 -DHAVE_YM3438_CORE -DHAVE_OPLL_CORE"
CFLAGS="$CFLAGS -DMAXROMSIZE=10485760"

# Collect all source files
SOURCES=""
SOURCES="$SOURCES ./libretro/libretro.c"

# Core files
SOURCES="$SOURCES ./core/genesis.c ./core/vdp_ctrl.c ./core/vdp_render.c"
SOURCES="$SOURCES ./core/system.c ./core/io_ctrl.c ./core/mem68k.c"
SOURCES="$SOURCES ./core/memz80.c ./core/membnk.c ./core/state.c"
SOURCES="$SOURCES ./core/loadrom.c"

# CPU cores
SOURCES="$SOURCES ./core/z80/z80.c"
SOURCES="$SOURCES ./core/m68k/m68kcpu.c ./core/m68k/s68kcpu.c"

# Sound
SOURCES="$SOURCES ./core/sound/sound.c ./core/sound/psg.c"
SOURCES="$SOURCES ./core/sound/ym2612.c ./core/sound/ym2413.c"
SOURCES="$SOURCES ./core/sound/ym3438.c ./core/sound/blip_buf.c"
SOURCES="$SOURCES ./core/sound/eq.c ./core/sound/opll.c"

# NTSC filter
SOURCES="$SOURCES ./core/ntsc/sms_ntsc.c ./core/ntsc/md_ntsc.c"

# Input hardware
SOURCES="$SOURCES ./core/input_hw/input.c ./core/input_hw/gamepad.c"
SOURCES="$SOURCES ./core/input_hw/lightgun.c ./core/input_hw/mouse.c"
SOURCES="$SOURCES ./core/input_hw/activator.c ./core/input_hw/xe_1ap.c"
SOURCES="$SOURCES ./core/input_hw/teamplayer.c ./core/input_hw/paddle.c"
SOURCES="$SOURCES ./core/input_hw/sportspad.c ./core/input_hw/terebi_oekaki.c"
SOURCES="$SOURCES ./core/input_hw/graphic_board.c"

# CD hardware (minimal)
SOURCES="$SOURCES ./core/cd_hw/cd_cart.c ./core/cd_hw/scd.c"

# Cart hardware
SOURCES="$SOURCES ./core/cart_hw/md_cart.c ./core/cart_hw/sms_cart.c"
SOURCES="$SOURCES ./core/cart_hw/sram.c ./core/cart_hw/eeprom_93c.c"
SOURCES="$SOURCES ./core/cart_hw/eeprom_i2c.c ./core/cart_hw/eeprom_spi.c"
SOURCES="$SOURCES ./core/cart_hw/flash_cfi.c ./core/cart_hw/areplay.c"
SOURCES="$SOURCES ./core/cart_hw/ggenie.c ./core/cart_hw/megasd.c"
SOURCES="$SOURCES ./core/cart_hw/svp/svp.c ./core/cart_hw/svp/ssp16.c"

# Tremor (Ogg Vorbis decoder)
SOURCES="$SOURCES ./core/tremor/bitwise.c ./core/tremor/block.c"
SOURCES="$SOURCES ./core/tremor/codebook.c ./core/tremor/floor0.c"
SOURCES="$SOURCES ./core/tremor/floor1.c ./core/tremor/framing.c"
SOURCES="$SOURCES ./core/tremor/info.c ./core/tremor/mapping0.c"
SOURCES="$SOURCES ./core/tremor/mdct.c ./core/tremor/registry.c"
SOURCES="$SOURCES ./core/tremor/res012.c ./core/tremor/sharedbook.c"
SOURCES="$SOURCES ./core/tremor/synthesis.c ./core/tremor/vorbisfile.c"
SOURCES="$SOURCES ./core/tremor/window.c"

echo "Compiling with emcc..."
# Compile directly to JS and WASM
emcc $SOURCES $CFLAGS \
  -o genesis_plus_gx.js \
  -s WASM=1 \
  -s EXPORTED_FUNCTIONS='["_malloc", "_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "getValue", "setValue", "HEAPU8", "HEAPU16", "HEAPU32"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME='"genesis_plus_gx"' \
  -s INITIAL_MEMORY=67108864 \
  -s MAXIMUM_MEMORY=134217728

echo "Build completed successfully!"
echo "Generated files:"
ls -la genesis_plus_gx.js genesis_plus_gx.wasm

echo "Copying files to output..."
mkdir -p /tmp/output
cp genesis_plus_gx.js /tmp/output/
cp genesis_plus_gx.wasm /tmp/output/
echo "Files copied to /tmp/output/"