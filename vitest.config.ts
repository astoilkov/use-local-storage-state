import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        restoreMocks: true,
        // otherwise @testing-library/react can't cleanup after tests
        globals: true,
        coverage: {
            enabled: true,
            extension: 'js',
            include: ['src/**/*'],
        },
    },
})
