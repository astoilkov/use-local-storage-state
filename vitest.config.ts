import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        restoreMocks: true,
        // otherwise @testing-library/react can't cleanup after tests
        globals: true,
        // Node ≥22 ships a native localStorage global (on by default since Node 25) that shadows
        // jsdom's on the bare `localStorage` used throughout the tests — disable it in the workers.
        // Set for both pools since the default has changed across vitest versions.
        poolOptions: {
            threads: { execArgv: ['--no-experimental-webstorage'] },
            forks: { execArgv: ['--no-experimental-webstorage'] },
        },
        coverage: {
            enabled: true,
            extension: 'js',
            include: ['src/**/*'],
        },
    },
})
