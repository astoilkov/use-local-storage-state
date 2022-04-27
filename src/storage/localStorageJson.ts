import type Storage from './Storage'
import nullValue from './nullValue'

const localStorageJson: Storage = {
    getItem(key: string): unknown {
        return parseJSON(localStorage.getItem(key))
    },

    setItem(key: string, value: unknown): void {
        localStorage.setItem(key, JSON.stringify(value))
    },

    removeItem(key: string): void {
        localStorage.removeItem(key)
    },
}

/**
 * A wrapper for `JSON.parse()` which supports the return value of `JSON.stringify(undefined)`
 * which returns the string `"undefined"` and this method returns the value `undefined`.
 */
function parseJSON<T>(value: string | null): T | undefined {
    return value === 'undefined'
        ? undefined
        : value === 'null'
        ? nullValue
        : value === null
        ? null
        : JSON.parse(value)
}

export default localStorageJson
