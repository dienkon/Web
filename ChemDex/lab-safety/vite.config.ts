import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'dev-serve-source-html',
        apply: 'serve',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const rawUrl = req.url?.split('?')[0] || '';
            if (
              rawUrl === '/' ||
              rawUrl === '/index.html' ||
              rawUrl === '/lab-safety' ||
              rawUrl === '/lab-safety/' ||
              rawUrl === '/lab-safety/index.html'
            ) {
              const query = req.url?.includes('?') ? '?' + req.url.split('?')[1] : '';
              req.url = '/index.source.html' + query;
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.source.html'),
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
