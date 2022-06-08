const confusingBrowserGlobals = require('confusing-browser-globals')

module.exports = {
    parser: '@typescript-eslint/parser',

    extends: [
        'strictest/eslint',
        'strictest/promise',
        'strictest/react',
        'strictest/react-hooks',
        'strictest/typescript-eslint',
        'strictest/unicorn',
    ],

    plugins: ['promise', 'react', 'react-hooks', '@typescript-eslint', 'unicorn'],

    parserOptions: {
        // enables the use of `import { a } from b` syntax. required for TypeScript imports
        sourceType: 'module',

        project: './tsconfig.json',
    },

    env: {
        es6: true,
        browser: true,
    },

    rules: {
        'no-restricted-globals': ['error', ...confusingBrowserGlobals],
    },
}
