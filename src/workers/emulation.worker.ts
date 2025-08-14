// Universal Asset Studio - Emulation Worker (Real Decoder)
// Remove totalmente dados simulados. Este worker recebe regiões de memória reais
// (VRAM/CRAM e SAT ou VSRAM) vindas da thread principal e decodifica sprites.

import { MegaDrivePaletteDecoder } from '../lib/decoders/MegaDrivePaletteDecoder';
import { MegaDriveTileDecoder } from '../lib/decoders/MegaDriveTileDecoder';
import { MegaDriveSpriteDecoder } from '../lib/decoders/MegaDriveSpriteDecoder';

type ExtractAssetsPayload = {
  system: string;
  vram?: Uint8Array;
  cram?: Uint8Array;
  vsram?: Uint8Array;
  sat?: Uint8Array;
};

type ExtractFromFramebufferPayload = {
  width: number;
  height: number;
  framebuffer: Uint8ClampedArray; // RGBA
};

interface WorkerEnvelope<T = any> {
  type: string;
  payload?: T;
}

function postInfo(message: string): void {
  // @ts-ignore
  self.postMessage({ status: 'info', message });
}

function postError(message: string): void {
  // @ts-ignore
  self.postMessage({ status: 'error', message });
}

function postComplete(message: string, payload?: unknown): void {
  // @ts-ignore
  self.postMessage({ status: 'complete', message, payload });
}

// Handlers globais para capturar erros de inicialização do worker com detalhes
// @ts-ignore
self.addEventListener('error', (e: ErrorEvent) => {
  // @ts-ignore
  self.postMessage({ status: 'error', message: `Init error: ${e.message} (${e.filename || 'n/d'}:${e.lineno || 0}:${e.colno || 0})` });
});
// @ts-ignore
self.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
  // @ts-ignore
  self.postMessage({ status: 'error', message: `Unhandled rejection: ${e.reason instanceof Error ? e.reason.message : String(e.reason)}` });
});

postInfo('Worker de decodificação carregado');

self.onmessage = async (event: MessageEvent<WorkerEnvelope<ExtractAssetsPayload | ExtractFromFramebufferPayload>>) => {
  const { type, payload } = event.data || {} as WorkerEnvelope<ExtractAssetsPayload | ExtractFromFramebufferPayload>;
  try {
    switch (type) {
      case 'EXTRACT_ASSETS': {
        if (!payload) {
          postError('Payload ausente em EXTRACT_ASSETS');
          return;
        }
        const extractPayload = payload as ExtractAssetsPayload;
        const { system, vram, cram, vsram, sat } = extractPayload;
        if (system !== 'megadrive') {
          postError(`Sistema não suportado no worker: ${system}`);
          return;
        }
        if (!vram || !cram) {
          postError('VRAM/CRAM ausentes no payload');
          return;
        }
        postInfo(`Decodificando Mega Drive: VRAM=${vram.byteLength} bytes, CRAM=${cram.byteLength} bytes, SAT/VSRAM=${sat?.byteLength ?? vsram?.byteLength ?? 0} bytes`);

        // 1) Paletas
        const palettes = MegaDrivePaletteDecoder.decode(cram);
        // 2) Tiles
        const tiles = MegaDriveTileDecoder.decode(vram);
        // 3) Tabela de sprites: exigir SAT real; VSRAM não é substituto de SAT
        if (!sat) {
          throw new Error('SAT ausente: o core deve exportar ponteiro válido para a Sprite Attribute Table (_get_sat_ptr).');
        }
        const spriteTable = sat;
        // 4) Sprites
        const sprites = MegaDriveSpriteDecoder.decode(spriteTable, vram, palettes);

        postComplete('Decodificação concluída', {
          sprites,
          stats: {
            totalSprites: sprites.length,
            vramSize: vram.byteLength,
            cramSize: cram.byteLength,
            tableSize: spriteTable.byteLength,
          }
        });
        return;
      }

      case 'EXTRACT_FROM_FRAMEBUFFER': {
        const p = payload as ExtractFromFramebufferPayload;
        if (!p || !p.framebuffer || !p.width || !p.height) {
          postError('Payload inválido em EXTRACT_FROM_FRAMEBUFFER');
          return;
        }
        postInfo(`Segmentando framebuffer ${p.width}x${p.height} para sprites iniciais`);
        const sprites = segmentSpritesFromFramebuffer(p.framebuffer, p.width, p.height);
        postComplete('Segmentação concluída (framebuffer)', { sprites, stats: { totalSprites: sprites.length } });
        return;
      }

      default:
        postError(`Tipo de mensagem não suportado: ${type}`);
        return;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    postError(`Falha no worker: ${msg}`);
  }
};

// Heurística simples: divide o framebuffer em blocos fixos, mede variação e seleciona trechos com mais detalhe
function segmentSpritesFromFramebuffer(buffer: Uint8ClampedArray, width: number, height: number): ImageData[] {
  const tileSize = 32;
  const step = 16; // sobreposição parcial
  const candidates: { x: number; y: number; score: number }[] = [];
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  for (let y = 0; y <= height - tileSize; y += step) {
    for (let x = 0; x <= width - tileSize; x += step) {
      let sum = 0, sum2 = 0, n = 0;
      for (let ty = 0; ty < tileSize; ty += 2) { // subamostragem leve
        const row = (y + ty) * width;
        for (let tx = 0; tx < tileSize; tx += 2) {
          const idx = ((row + (x + tx)) << 2);
          const r = buffer[idx], g = buffer[idx + 1], b = buffer[idx + 2];
          const lum = (r * 299 + g * 587 + b * 114) / 1000;
          sum += lum;
          sum2 += lum * lum;
          n++;
        }
      }
      const mean = sum / n;
      const variance = clamp(sum2 / n - mean * mean, 0, 65025);
      candidates.push({ x, y, score: variance });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const top = candidates.slice(0, 12); // pega top N
  const sprites: ImageData[] = [];
  for (const c of top) {
    const img = new ImageData(tileSize, tileSize);
    for (let ty = 0; ty < tileSize; ty++) {
      const srcRow = (c.y + ty) * width;
      for (let tx = 0; tx < tileSize; tx++) {
        const srcIdx = ((srcRow + (c.x + tx)) << 2);
        const dstIdx = ((ty * tileSize + tx) << 2);
        img.data[dstIdx] = buffer[srcIdx];
        img.data[dstIdx + 1] = buffer[srcIdx + 1];
        img.data[dstIdx + 2] = buffer[srcIdx + 2];
        img.data[dstIdx + 3] = buffer[srcIdx + 3];
      }
    }
    sprites.push(img);
  }
  return sprites;
}