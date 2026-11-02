import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    resolve: {
        alias: {
            // The Vue bindings import the library by its package name.
            '@danielgindi/selectbox': fileURLToPath(new URL('./src/lib/index.ts', import.meta.url)),
        },
    },
    optimizeDeps: {
        include: ['fast-deep-equal'],
    },
    test: {
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{ts,vue}'],
            exclude: ['src/**/*.d.ts'],
            reporter: ['text', 'html'],
        },
        projects: [
            {
                extends: true,
                test: {
                    name: 'unit',
                    environment: 'node',
                    include: ['tests/unit/**/*.test.ts'],
                },
            },
            {
                extends: true,
                plugins: [vue()],
                test: {
                    name: 'browser',
                    include: ['tests/browser/**/*.test.ts'],
                    setupFiles: ['tests/browser/setup.ts'],
                    browser: {
                        enabled: true,
                        headless: true,
                        screenshotFailures: false,
                        provider: playwright({
                            // Lets environments with a pre-installed Chromium skip `playwright install`.
                            launchOptions: process.env.CHROMIUM_PATH
                                ? { executablePath: process.env.CHROMIUM_PATH }
                                : {},
                        }),
                        instances: [{ browser: 'chromium' }],
                    },
                },
            },
        ],
    },
});
