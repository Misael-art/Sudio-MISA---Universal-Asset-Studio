#include <emscripten.h>
#include <stdint.h>
#include <stddef.h>

// Minimal exports focusing only on essential functions
// This version avoids extern declarations that cause linking issues

/**
 * FRAMEBUFFER EXPORTS
 * These functions provide access to the rendered framebuffer
 * Note: Using placeholder implementations that will be replaced by actual core functions
 */

/**
 * Get framebuffer data pointer
 * @return Pointer to framebuffer RGB565 data
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_framebuffer_ptr(void) {
    // This will be implemented by the core
    return 0;
}

/**
 * Get framebuffer width
 * @return Framebuffer width in pixels
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_framebuffer_width(void) {
    // Standard Genesis resolution
    return 320;
}

/**
 * Get framebuffer height
 * @return Framebuffer height in pixels
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_framebuffer_height(void) {
    // Standard Genesis resolution
    return 224;
}

/**
 * Get framebuffer pitch (bytes per line)
 * @return Framebuffer pitch in bytes
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_framebuffer_pitch(void) {
    // 320 pixels * 2 bytes per pixel (RGB565)
    return 640;
}

/**
 * UTILITY FUNCTIONS
 * Helper functions for core status
 */

/**
 * Check if core is initialized and memory is accessible
 * @return 1 if initialized, 0 if not
 */
EMSCRIPTEN_KEEPALIVE uint32_t _is_core_initialized(void) {
    // Simple check - always return 1 for now
    return 1;
}

/**
 * Get total accessible memory size
 * @return Total size of all accessible memory areas
 */
EMSCRIPTEN_KEEPALIVE uint32_t _get_total_memory_size(void) {
    return 0x800 +    // boot_rom
           0x10000 +  // work_ram
           0x2000 +   // zram
           0x20 +     // reg
           0x400 +    // sat
           0x10000 +  // vram
           0x80 +     // cram
           0x80;      // vsram
}

/**
 * PLACEHOLDER MEMORY EXPORTS
 * These return 0 for now but provide the interface
 * The actual implementations will be added once the core links successfully
 */

EMSCRIPTEN_KEEPALIVE uint32_t _get_work_ram_ptr(void) { return 0; }
EMSCRIPTEN_KEEPALIVE uint32_t _get_work_ram_size(void) { return 0x10000; }
EMSCRIPTEN_KEEPALIVE uint32_t _get_zram_ptr(void) { return 0; }
EMSCRIPTEN_KEEPALIVE uint32_t _get_zram_size(void) { return 0x2000; }
EMSCRIPTEN_KEEPALIVE uint32_t _get_boot_rom_ptr(void) { return 0; }
EMSCRIPTEN_KEEPALIVE uint32_t _get_boot_rom_size(void) { return 0x800; }
EMSCRIPTEN_KEEPALIVE uint32_t _get_vdp_reg_ptr(void) { return 0; }
EMSCRIPTEN_KEEPALIVE uint32_t _get_vdp_reg_size(void) { return 0x20; }
EMSCRIPTEN_KEEPALIVE uint32_t _get_sat_ptr(void) { return 0; }
EMSCRIPTEN_KEEPALIVE uint32_t _get_sat_size(void) { return 0x400; }
EMSCRIPTEN_KEEPALIVE uint32_t _get_vram_ptr(void) { return 0; }
EMSCRIPTEN_KEEPALIVE uint32_t _get_vram_size(void) { return 0x10000; }
EMSCRIPTEN_KEEPALIVE uint32_t _get_cram_ptr(void) { return 0; }
EMSCRIPTEN_KEEPALIVE uint32_t _get_cram_size(void) { return 0x80; }
EMSCRIPTEN_KEEPALIVE uint32_t _get_vsram_ptr(void) { return 0; }
EMSCRIPTEN_KEEPALIVE uint32_t _get_vsram_size(void) { return 0x80; }