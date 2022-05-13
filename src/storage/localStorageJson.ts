import parseJSON from './parseJson'
import type Storage from './Storage'

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

export default localStorageJson
