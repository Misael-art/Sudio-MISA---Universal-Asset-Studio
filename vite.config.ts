import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

function serveDataMiddleware() {
  return {
    name: 'serve-data-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const url = req.url || '';
          if (!url.startsWith('/data/')) return next();
          const filePath = path.join(process.cwd(), url.replace(/^\/+/, ''));
          if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
            res.statusCode = 404;
            res.end('Not Found');
            return;
          }
          res.setHeader('Cache-Control', 'no-cache');
          fs.createReadStream(filePath).pipe(res);
        } catch (error) {
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      });
    },
    closeBundle() {
      // Copy /data to dist/data on build
      const srcDir = path.resolve(process.cwd(), 'data');
      const outDir = path.resolve(process.cwd(), 'dist', 'data');
      if (!fs.existsSync(srcDir)) return;
      const copyRecursive = (src: string, dest: string) => {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);
          if (entry.isDirectory()) copyRecursive(srcPath, destPath);
          else fs.copyFileSync(srcPath, destPath);
        }
      };
      copyRecursive(srcDir, outDir);
    }
  } as const;
}

export default defineConfig({
  plugins: [react(), serveDataMiddleware()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    host: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['@vite/client', '@vite/env']
  }
});
