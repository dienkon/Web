import { chemicalNamesPlugin } from '../scripts/chemical-names.mjs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [chemicalNamesPlugin(),
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
              rawUrl === '/lab' ||
              rawUrl === '/lab/' ||
              rawUrl === '/lab/index.html'
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
        output: {
          manualChunks(id) {
            const norm = id.replace(/\\/g, '/');
            if (norm.includes('node_modules')) {
              if (norm.includes('/node_modules/three/')) return 'vendor-three';
              if (norm.includes('/node_modules/@react-three/postprocessing/') || norm.includes('/node_modules/postprocessing/') || norm.includes('/node_modules/n8ao/')) return 'vendor-postfx';
              if (norm.includes('/node_modules/@react-three/') || norm.includes('/node_modules/three-stdlib/') || norm.includes('/node_modules/troika-')) return 'vendor-r3f';
              if (norm.includes('/node_modules/recharts/') || norm.includes('/node_modules/d3-') || norm.includes('/node_modules/victory-vendor/')) return 'vendor-charts';
              if (norm.includes('/node_modules/firebase/') || norm.includes('/node_modules/@firebase/')) return 'vendor-firebase';
              if (norm.includes('/node_modules/framer-motion/') || norm.includes('/node_modules/motion/')) return 'vendor-motion';
              if (norm.includes('/node_modules/lucide-react/') || norm.includes('/node_modules/zod/') || norm.includes('/node_modules/@google/genai/')) return 'vendor-ui';
              if (norm.includes('/node_modules/react/') || norm.includes('/node_modules/react-dom/') || norm.includes('/node_modules/scheduler/') || norm.includes('/node_modules/zustand/')) return 'vendor-react';
            }
            if (norm.includes('/src/vfx/programs/library/')) return 'vfx-programs';
          },
        },
        input: {
          main: path.resolve(__dirname, 'index.source.html'),
        },
      },
    },
    server: {
      port: 6767,
      proxy: {
        '/api': {
          target: 'http://localhost:5500',
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        // Audit outputs are not app inputs. Saving reports must not reload a
        // running experiment or tear down a fullscreen presentation.
        ignored: ['**/artifacts/**'],
      },
    },
    preview: {
      port: 6767,
    },
  };
});
