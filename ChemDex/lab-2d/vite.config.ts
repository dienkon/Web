import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env from current directory and parent directory (ChemDex root)
  const envLocal = loadEnv(mode, process.cwd(), '');
  const envParent = loadEnv(mode, path.resolve(process.cwd(), '..'), '');
  const geminiKey =
    envLocal.VITE_GEMINI_API_KEY ||
    envLocal.GEMINI_API_KEY ||
    envParent.VITE_GEMINI_API_KEY ||
    envParent.GEMINI_API_KEY ||
    '';
  const geminiModel =
    envLocal.VITE_GEMINI_MODEL ||
    envLocal.GEMINI_MODEL ||
    envParent.VITE_GEMINI_MODEL ||
    envParent.GEMINI_MODEL ||
    'gemini-2.5-flash';

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    define: {
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiKey),
      'import.meta.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
      'import.meta.env.VITE_GEMINI_MODEL': JSON.stringify(geminiModel),
      'import.meta.env.GEMINI_MODEL': JSON.stringify(geminiModel),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5174,
      open: false,
    },
    test: {
      globals: true,
      environment: 'node',
    },
  };
});

