import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const src = path => fileURLToPath(new URL(path, import.meta.url));

// Serves/builds the docs & demo page in `example/`
export default defineConfig({
    root: 'example',
    base: './',
    plugins: [vue()],
    resolve: {
        // Demos import the package by name, exactly like consumers do
        alias: [
            { find: /^@danielgindi\/selectbox\/vue$/, replacement: src('./src/vue/index.ts') },
            { find: /^@danielgindi\/selectbox$/, replacement: src('./src/lib/index.ts') },
        ],
    },
    optimizeDeps: {
        include: ['fast-deep-equal'],
    },
    build: {
        outDir: '../dist-docs',
        emptyOutDir: true,
    },
    server: {
        open: true,
    },
});
