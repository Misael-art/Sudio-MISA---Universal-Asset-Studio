import React, { useEffect, useRef } from 'react';
import type { FrameIR } from '@/emulation/ir';

interface FramePreviewProps {
  frame: FrameIR;
}

export const FramePreview: React.FC<FramePreviewProps> = ({ frame }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const fb = frame.framebuffer?.image;
    if (!fb) return;
    canvas.width = fb.width; canvas.height = fb.height;
    ctx.putImageData(fb, 0, 0);
  }, [frame]);

  return (
    <div>
      <div className="text-sm text-gray-600 mb-1">Preview do Frame (framebuffer)</div>
      <canvas ref={canvasRef} className="border rounded bg-black" />
    </div>
  );
};

export default FramePreview;

