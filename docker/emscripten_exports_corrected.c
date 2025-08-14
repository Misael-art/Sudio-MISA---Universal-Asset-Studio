/*
 * Genesis Plus GX - Emscripten Memory Exports (Corrected)
 * 
 * Este arquivo exporta ponteiros de memória do core Genesis Plus GX para JavaScript
 * através do Emscripten. Preparado para suportar Genesis/Mega Drive, SMS e Game Gear.
 * 
 * Áreas de Memória Exportadas:
 * - Work RAM: Memória principal do 68000 (64KB)
 * - Z80 RAM: Memória do processador de som Z80 (8KB) 
 * - VDP VRAM: Memória de vídeo (64KB)
 * - VDP CRAM: Paleta de cores (128 bytes)
 * - VDP VSRAM: Scroll vertical (128 bytes)
 * - VDP Registers: Registradores do VDP (32 bytes)
 * - VDP SAT: Sprite Attribute Table (1KB)
 * - Framebuffer: Buffer de renderização
 */

#include <emscripten.h>
#include <stdint.h>
#include <stddef.h>

// Definição do tipo uint8 para compatibilidade com o Genesis Plus GX
#ifndef uint8
typedef uint8_t uint8;
#endif

// Declarações externas das variáveis de memória do Genesis Plus GX
// Baseadas na análise do código fonte em genesis.h e vdp_ctrl.h

// Memória principal do sistema (genesis.h)
extern uint8 work_ram[0x10000];  // 64KB Work RAM do 68000
extern uint8 zram[0x2000];       // 8KB Z80 RAM

// Estrutura do bitmap para framebuffer (definida no core)
typedef struct {
    uint8_t *data;     // Ponteiro para os dados do framebuffer
    int width;         // Largura em pixels
    int height;        // Altura em pixels
    int pitch;         // Bytes por linha
    int depth;         // Bits por pixel
} t_bitmap;

// Variáveis do VDP (vdp_ctrl.h) - usando uint8 conforme definido no core
extern uint8 reg[0x20];          // 32 bytes - Registradores do VDP
extern uint8 sat[0x400];         // 1KB - Sprite Attribute Table
extern uint8 vram[0x10000];      // 64KB - Video RAM
extern uint8 cram[0x80];         // 128 bytes - Color RAM (paleta)
extern uint8 vsram[0x80];        // 128 bytes - Vertical Scroll RAM

// Framebuffer global
extern t_bitmap bitmap;

// Detecção do sistema ativo (valor opaco conforme system.h)
// Evita incluir headers do core para não quebrar o build fora do Makefile principal
// e mantém compatibilidade com o processo de linkagem via .bc
extern unsigned char system_hw;  // corresponde a uint8 em system.h

/*
 * Funções de Exportação para JavaScript
 * Todas marcadas com EMSCRIPTEN_KEEPALIVE para evitar eliminação pelo otimizador
 * Nomes com underscore para corresponder às EXPORTED_FUNCTIONS
 */

// === FRAMEBUFFER ===

EMSCRIPTEN_KEEPALIVE
uint32_t get_frame_buffer_ref(void) {
    return (uint32_t)bitmap.data;
}

EMSCRIPTEN_KEEPALIVE
int get_frame_buffer_width(void) {
    return bitmap.width;
}

EMSCRIPTEN_KEEPALIVE
int get_frame_buffer_height(void) {
    return bitmap.height;
}

EMSCRIPTEN_KEEPALIVE
int get_frame_buffer_pitch(void) {
    return bitmap.pitch;
}

// === WORK RAM (68000) ===

EMSCRIPTEN_KEEPALIVE
uint32_t get_work_ram_ptr(void) {
    return (uint32_t)work_ram;
}

EMSCRIPTEN_KEEPALIVE
int get_work_ram_size(void) {
    return 0x10000;  // 64KB - valor fixo para evitar sizeof() de array extern
}

// === Z80 RAM ===

EMSCRIPTEN_KEEPALIVE
uint32_t get_zram_ptr(void) {
    return (uint32_t)zram;
}

EMSCRIPTEN_KEEPALIVE
int get_zram_size(void) {
    return 0x2000;  // 8KB - valor fixo para evitar sizeof() de array extern
}

// === VDP VRAM ===

EMSCRIPTEN_KEEPALIVE
uint32_t get_vram_ptr(void) {
    return (uint32_t)vram;
}

EMSCRIPTEN_KEEPALIVE
int get_vram_size(void) {
    return 0x10000;  // 64KB - valor fixo para evitar sizeof() de array extern
}

// === VDP CRAM (Paleta de Cores) ===

EMSCRIPTEN_KEEPALIVE
uint32_t get_cram_ptr(void) {
    return (uint32_t)cram;
}

EMSCRIPTEN_KEEPALIVE
int get_cram_size(void) {
    return 0x80;  // 128 bytes - valor fixo para evitar sizeof() de array extern
}

// === VDP VSRAM (Scroll Vertical) ===

EMSCRIPTEN_KEEPALIVE
uint32_t get_vsram_ptr(void) {
    return (uint32_t)vsram;
}

EMSCRIPTEN_KEEPALIVE
int get_vsram_size(void) {
    return 0x80;  // 128 bytes - valor fixo para evitar sizeof() de array extern
}

// === VDP Registers ===

EMSCRIPTEN_KEEPALIVE
uint32_t get_vdp_regs_ptr(void) {
    return (uint32_t)reg;
}

EMSCRIPTEN_KEEPALIVE
int get_vdp_regs_size(void) {
    return 0x20;  // 32 bytes - valor fixo para evitar sizeof() de array extern
}

// === VDP SAT (Sprite Attribute Table) ===

EMSCRIPTEN_KEEPALIVE
uint32_t get_sat_ptr(void) {
    return (uint32_t)sat;
}

EMSCRIPTEN_KEEPALIVE
int get_sat_size(void) {
    return 0x400;  // 1KB - valor fixo para evitar sizeof() de array extern
}

// === UTILITÁRIOS ===

/**
 * Verifica se o core foi inicializado corretamente
 * Corrigido: Remove comparação desnecessária de array com NULL
 */
EMSCRIPTEN_KEEPALIVE
int is_core_initialized(void) {
    // Verifica se o framebuffer foi alocado (bitmap.data é ponteiro, não array)
    return (bitmap.data != NULL) ? 1 : 0;
}

/**
 * Retorna o tamanho total de memória acessível
 * Útil para ferramentas de debug e análise
 */
EMSCRIPTEN_KEEPALIVE
int get_total_memory_size(void) {
    return 0x10000 + 0x2000 + 0x10000 + 0x80 + 0x80 + 0x20 + 0x400;
    // work_ram + zram + vram + cram + vsram + reg + sat
}

/**
 * Identificador do sistema/hardware ativo
 * Retorna o valor bruto de system_hw (definido no core), sem interpretação aqui
 * A interpretação (ex.: MD, SMS, GG, MCD) deve ser feita no lado JS para manter flexibilidade
 */
EMSCRIPTEN_KEEPALIVE
int get_active_system_code(void) {
    return (int)system_hw;
}

/*
 * Notas para Expansão Futura (SMS/Game Gear):
 * 
 * Master System (SMS):
 * - Work RAM: 8KB (0x2000 bytes)
 * - VRAM: 16KB (0x4000 bytes) 
 * - CRAM: 32 bytes (0x20 bytes)
 * - Sem VSRAM (scroll por registradores)
 * 
 * Game Gear:
 * - Similar ao SMS mas com CRAM expandida: 64 bytes (0x40 bytes)
 * - Paleta de 4096 cores vs 64 do SMS
 * 
 * Para suportar múltiplos sistemas, considere:
 * 1. Funções condicionais baseadas no sistema ativo
 * 2. Estruturas de dados unificadas
 * 3. Mapeamento dinâmico de memória
 */

/*
 * Notas para Expansão Futura (Sega CD/Mega CD):
 * - PRG-RAM: 512KB (0x80000)
 * - Word RAM: 256KB (0x40000)
 * - PCM RAM: 64KB (0x10000)
 * - BRAM: 8KB (0x2000)
 * Estas regiões são externas ao VDP do Mega Drive e exigem novas APIs dedicadas
 * quando a emulação do MCD estiver habilitada (HAVE_CDROM=1). Mantemos este
 * arquivo livre de condicionais de MCD por ora, expondo apenas _get_active_system_code()
 * para que o lado JS possa selecionar visões de memória adequadas sem quebrar o core MD.
 */