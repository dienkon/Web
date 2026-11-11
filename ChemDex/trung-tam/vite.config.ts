import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(() => {
  return {
    base: '/trung-tam/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          chunkFileNames(chunk) {
            const file = chunk.facadeModuleId?.replace(/\\/g, '/') ?? '';
            const substance = /\/src\/data\/(?:reference|docs)\/([a-z0-9-]+)\/index\.json$/.exec(file)?.[1];
            return substance ? `assets/tai-lieu/${substance}/noi-dung-[hash].js` : 'assets/[name]-[hash].js';
          },
        },
        input: {
          main: path.resolve(__dirname, 'index.source.html'),
        },
      },
    },
  };
});
