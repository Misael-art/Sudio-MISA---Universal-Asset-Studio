#include <emscripten.h>
#include <stdint.h>

// Forward declarations from Genesis Plus GX core
// These variables are defined in core/vdp_ctrl.c and core/system.c
extern uint8_t reg[0x20];          // VDP registers (32 bytes)
extern uint8_t sat[0x400];         // Sprite Attribute Table (1024 bytes)
extern uint8_t vram[0x10000];      // Video RAM (64KB)
extern uint8_t cram[0x80];         // Color RAM (128 bytes)
extern uint8_t vsram[0x80];        // Vertical Scroll RAM (128 bytes)

// Bitmap structure from core/system.h
typedef struct {
  uint8_t *data;      /* Bitmap data */
  int width;          /* Bitmap width */
  int height;         /* Bitmap height */
  int pitch;          /* Bitmap pitch */
  struct {
    int x;            /* X offset of viewport within bitmap */
    int y;            /* Y offset of viewport within bitmap */
    int w;            /* Width of viewport */
    int h;            /* Height of viewport */
    int ow;           /* Previous width of viewport */
    int oh;           /* Previous height of viewport */
    int changed;      /* 1= Viewport width or height have changed */
  } viewport;
} t_bitmap;

extern t_bitmap bitmap;             // Framebuffer structure

/**
 * Função para obter referência do framebuffer
 * @return Ponteiro para o framebuffer RGB565
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_frame_buffer_ref(void) {
    return (uint32_t)bitmap.data;
}

/**
 * Função para obter ponteiro da VRAM
 * @return Ponteiro para Video RAM (65536 bytes)
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_vram_ptr(void) {
    return (uint32_t)vram;
}

/**
 * Função para obter ponteiro da CRAM
 * @return Ponteiro para Color RAM (128 bytes)
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_cram_ptr(void) {
    return (uint32_t)cram;
}

/**
 * Função para obter ponteiro da VSRAM
 * @return Ponteiro para Vertical Scroll RAM (80 bytes)
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_vsram_ptr(void) {
    return (uint32_t)vsram;
}

/**
 * Função para obter ponteiro dos registradores VDP
 * @return Ponteiro para registradores VDP (32 bytes)
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_vdp_regs_ptr(void) {
    return (uint32_t)reg;
}

/**
 * Função para obter ponteiro da SAT
 * @return Ponteiro para Sprite Attribute Table (640 bytes)
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_sat_ptr(void) {
    return (uint32_t)sat;
}