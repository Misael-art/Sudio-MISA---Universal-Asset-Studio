// Exportadores de ponteiros para o core Genesis Plus GX (via Emscripten)
// Este arquivo deve ser compilado junto ao core, garantindo que os símbolos
// abaixo apareçam no Module (com prefixo "_") e apontem para buffers reais.

#include <stdint.h>
#include <emscripten/emscripten.h>

// Estes símbolos DEVEM apontar para as regiões reais do core em runtime.
// Ajuste os nomes/endereços conforme sua árvore do GPGX.
// É responsabilidade do integrador atribuí-los nos pontos corretos do core.
extern uint8_t* g_vram;      // 64 KiB
extern uint8_t* g_cram;      // 128 B
extern uint8_t* g_vsram;     // ~0x50 B
extern uint8_t* g_vdp_regs;  // ~0x20 B
extern uint8_t* g_sat;       // 0x280 B
extern uint8_t* g_frame_rgba; // width * height * 4

#ifdef __cplusplus
extern "C" {
#endif

EMSCRIPTEN_KEEPALIVE uint32_t _get_frame_buffer_ref(void) {
  return (uint32_t) g_frame_rgba;
}

EMSCRIPTEN_KEEPALIVE uint32_t _get_vram_ptr(void) {
  return (uint32_t) g_vram;
}

EMSCRIPTEN_KEEPALIVE uint32_t _get_cram_ptr(void) {
  return (uint32_t) g_cram;
}

EMSCRIPTEN_KEEPALIVE uint32_t _get_vsram_ptr(void) {
  return (uint32_t) g_vsram;
}

EMSCRIPTEN_KEEPALIVE uint32_t _get_vdp_regs_ptr(void) {
  return (uint32_t) g_vdp_regs;
}

EMSCRIPTEN_KEEPALIVE uint32_t _get_sat_ptr(void) {
  return (uint32_t) g_sat;
}

#ifdef __cplusplus
}
#endif

// Linkagem (exemplo):
//  -s EXPORTED_FUNCTIONS='["_malloc","_free","_get_frame_buffer_ref","_get_vram_ptr","_get_cram_ptr","_get_vsram_ptr","_get_vdp_regs_ptr","_get_sat_ptr"]'
//  -s EXPORTED_RUNTIME_METHODS='["cwrap"]'
//  -s ENVIRONMENT='web'
