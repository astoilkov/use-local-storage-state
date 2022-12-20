import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        restoreMocks: true,
        environment: 'jsdom',
        include: ['./test/**.{ts,tsx}'],
    },
})
