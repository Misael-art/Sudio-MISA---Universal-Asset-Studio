// Simple worker for testing
// This worker will help identify if the issue is with the complex initialization

import { WorkerMessage, WorkerResponse } from '../types/worker';

// Simple message handler
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  try {
    const { type, payload } = event.data;
    
    self.postMessage({
      status: 'info',
      message: `Simple worker received: ${type}`
    });
    
    if (type === 'LOAD_ROM' || type === 'EXTRACT_ASSETS') {
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate simple mock data
      const vramData = new Uint8Array(0x10000);
      const cramData = new Uint8Array(0x80);
      const vsramData = new Uint8Array(0x80);
      
      // Fill with test pattern
      for (let i = 0; i < cramData.length; i += 2) {
        cramData[i] = 0x00;
        cramData[i + 1] = 0x0E; // White color
      }
      
      self.postMessage({
        status: 'complete',
        message: 'Simple worker processing complete',
        payload: {
          vram: vramData,
          cram: cramData,
          vsram: vsramData,
          system: payload.system
        },
        isMock: true
      });
    }
  } catch (error: any) {
    self.postMessage({
      status: 'error',
      message: `Simple worker error: ${error.message}`
    });
  }
};

// Send ready message
self.postMessage({
  status: 'info',
  message: 'Simple worker loaded and ready'
});