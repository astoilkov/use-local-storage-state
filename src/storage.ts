/**
 * Abstraction for localStorage that uses an in-memory fallback when localStorage throws an error.
 * Reasons for throwing an error:
 * - maximum quota is exceeded
 * - under Mobile Safari (since iOS 5) when the user enters private mode `localStorage.setItem()`
 *   will throw
 * - trying to access localStorage object when cookies are disabled in Safari throws
 *   "SecurityError: The operation is insecure."
 */

export type Serializer = Pick<typeof JSON, 'stringify' | 'parse'>

class Storage {
    public static data = new Map<string, unknown>()
    private readonly serializer: Serializer
    constructor(serializer: Serializer) {
        this.serializer = serializer
     }
    get<T>(key: string, defaultValue: T): T | undefined {
        try {
            return Storage.data.has(key)
                ? (Storage.data.get(key) as T | undefined)
                : parseJSON(localStorage.getItem(key), this.serializer.parse)
        } catch {
            return defaultValue
        }
    }
    set<T>(key: string, value: T): void {
        try {
            localStorage.setItem(key, this.serializer.stringify(value))

            Storage.data.delete(key)
        } catch {
            Storage.data.set(key, value)
        }
    }
    remove(key: string): void {
        Storage.data.delete(key)
        localStorage.removeItem(key)
    }
}

/**
 * A wrapper for `JSON.parse()` which supports the return value of `JSON.stringify(undefined)`
 * which returns the string `"undefined"` and this method returns the value `undefined`.
 */
function parseJSON<T>(value: string | null, parse: typeof JSON.parse): T | undefined {
    return value === 'undefined'
        ? undefined
        : // - `JSON.parse()` TypeScript types don't accept non-string values, this is why we pass
          //   empty string which will throw an error
          // - when `value` is `null`, we will pass empty string and the `JSON.parse()` will throw
          //   an error which we need and is required by the parent function
          parse(value ?? '')
}

export default Storage