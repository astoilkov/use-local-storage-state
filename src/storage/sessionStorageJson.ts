import parseJSON from './parseJson'
import type Storage from './Storage'

const sessionStorageJson: Storage = {
    getItem(key: string): unknown {
        return parseJSON(sessionStorage.getItem(key))
    },

    setItem(key: string, value: unknown): void {
        sessionStorage.setItem(key, JSON.stringify(value))
    },

    removeItem(key: string): void {
        sessionStorage.removeItem(key)
    },
}

export default sessionStorageJson
