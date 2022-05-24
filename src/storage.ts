const callbacks = new Set<(key: string) => void>()

/**
 * Abstraction for localStorage that uses an in-memory fallback when localStorage throws an error.
 * Reasons for throwing an error:
 * - maximum quota is exceeded
 * - under Mobile Safari (since iOS 5) when the user enters private mode `localStorage.setItem()`
 *   will throw
 * - trying to access localStorage object when cookies are disabled in Safari throws
 *   "SecurityError: The operation is insecure."
 */
export default {
    data: new Map<
        string,
        {
            persistent: boolean
            parsedValue: unknown
            stringValue: string | null
        }
    >(),

    get<T>(key: string, defaultValue: T): T | undefined {
        const item = this.data.get(key)

        // initial issue: https://github.com/astoilkov/use-local-storage-state/issues/26
        // issues that were caused by incorrect initial and secondary implementations:
        // - https://github.com/astoilkov/use-local-storage-state/issues/30
        // - https://github.com/astoilkov/use-local-storage-state/issues/33
        if (
            item === undefined &&
            defaultValue !== undefined &&
            localStorage.getItem(key) === null
        ) {
            try {
                localStorage.setItem(key, JSON.stringify(defaultValue))
            } catch {}
        }

        const stringValue = localStorage.getItem(key)

        if (item === undefined || item.stringValue !== stringValue) {
            try {
                const parsedValue = parseJSON(stringValue)
                this.data.set(key, {
                    parsedValue,
                    stringValue,
                    persistent: true,
                })
                return parsedValue as T
            } catch {
                this.data.delete(key)
                return defaultValue
            }
        }

        return item.parsedValue as T
    },

    set<T>(key: string, value: T): void {
        const stringValue = JSON.stringify(value)
        try {
            localStorage.setItem(key, stringValue)

            this.data.set(key, {
                persistent: true,
                parsedValue: value,
                stringValue,
            })
        } catch {
            this.data.set(key, {
                persistent: false,
                parsedValue: value,
                stringValue,
            })
        }

        this.triggerChange(key)
    },

    remove(key: string): void {
        this.data.delete(key)
        localStorage.removeItem(key)

        this.triggerChange(key)
    },

    triggerChange(key: string): void {
        for (const callback of [...callbacks]) {
            callback(key)
        }
    },

    onChange(callback: (key: string) => void): void {
        callbacks.add(callback)
    },

    offChange(callback: (key: string) => void): void {
        callbacks.delete(callback)
    },
}

/**
 * A wrapper for `JSON.parse()` which supports the return value of `JSON.stringify(undefined)`
 * which returns the string `"undefined"` and this method returns the value `undefined`.
 */
function parseJSON<T>(value: string | null): T | undefined {
    return value === 'undefined'
        ? undefined
        : // - `JSON.parse()` TypeScript types don't accept non-string values, this is why we pass
          //   empty string which will throw an error
          // - when `value` is `null`, we will pass empty string and the `JSON.parse()` will throw
          //   an error which we need and is required by the parent function
          JSON.parse(value ?? '')
}
