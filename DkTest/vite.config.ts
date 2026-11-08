import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const mobile = mode === 'mobile';
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), tailwindcss(), ...(mobile ? [{
      name: 'dktest-android-viewport',
      transformIndexHtml: (html: string) => html.replace('viewport-fit=cover', 'viewport-fit=contain'),
    }] : [])],
    define: {
      'process.env': {},
      '__DK_APP_VERSION__': JSON.stringify('1.8.26'),
      '__DK_BUILD_TIME__': JSON.stringify(new Date().toISOString()),
      ...(mobile ? {
        'process.env.NODE_ENV': JSON.stringify('production'),
        'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_MOBILE_API_URL || 'https://dk-test-v3.vercel.app'),
      } : {}),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'clsx',
        'tailwind-merge',
        'lucide-react',
      ],
    },
    build: {
      outDir: mobile ? 'dist-mobile' : 'dist',
      target: ['es2020', 'chrome101', 'safari14', 'firefox91', 'edge101'],
      cssTarget: 'chrome101',
      cssMinify: 'lightningcss',
      modulePreload: {
        polyfill: true,
      },
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1200,
      assetsDir: 'assets',
      sourcemap: false,
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('katex') || id.includes('react-katex')) {
                return 'vendor-katex';
              }
              if (id.includes('mathlive') || id.includes('@cortex-js')) {
                return 'vendor-mathlive';
              }
              if (id.includes('nerdamer')) {
                return 'vendor-nerdamer';
              }
              if (id.includes('mathjs')) {
                return 'vendor-mathjs';
              }
              if (id.includes('recharts')) {
                return 'vendor-charts';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('@dnd-kit')) {
                return 'vendor-dnd';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'vendor-react';
              }
              if (id.includes('mammoth') || id.includes('html2pdf.js')) {
                return 'vendor-documents';
              }
            }
          },
        },
      },
    },
    server: {
      port: 3636,
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://localhost:3636',
          changeOrigin: true,
        },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
