import { useState, useEffect, useMemo, useRef } from 'react'

/**
 * A wrapper for `JSON.parse()` which supports the return value of `JSON.stringify(undefined)`
 * which returns the string `"undefined"` and this method returns the value `undefined`.
 */
function parseJSON(value: string | null) {
    return value === 'undefined'
        ? undefined
        : // JSON.parse() doesn't accept non-string values, this is why we pass empty
          // string which will throw an error which can be handled
          JSON.parse(value ?? '')
}

/**
 * Abstraction for web storage that uses an in-memory fallback when localStorage/sessionStorage throws an error.
 * Reasons for throwing an error:
 * - maximum quota is exceeded
 * - under Mobile Safari (since iOS 5) when the user enters private mode `localStorage.setItem()`
 *   will throw
 * - trying to access localStorage object when cookies are disabled in Safari throws
 *   "SecurityError: The operation is insecure."
 */
interface MemoryStorage {
    get<T>(key: string, defaultValue: T | (() => T)): T
    set<T>(key: string, value: T): boolean
    remove(key: string): void
}

const createStorage = (provider: Storage): MemoryStorage => {
    const data: Record<string, unknown> = {}

    return {
        get<T>(key: string, defaultValue: T | (() => T)): T {
            try {
                return data[key] ?? parseJSON(provider.getItem(key))
            } catch {
                return unwrapValue(defaultValue)
            }
        },
        set<T>(key: string, value: T): boolean {
            try {
                provider.setItem(key, JSON.stringify(value))

                data[key] = undefined

                return true
            } catch {
                data[key] = value
                return false
            }
        },
        remove(key: string): void {
            data[key] = undefined

            try {
                provider.removeItem(key)
            } catch {}
        },
    }
}

const storages = new Map([
    [localStorage, createStorage(localStorage)],
    [sessionStorage, createStorage(sessionStorage)],
])

/**
 * Used to track usages of `useLocalStorageState()` with identical `key` values. If we encounter
 * duplicates we throw an error to the user telling them to use `createLocalStorageStateHook`
 * instead.
 */
type StorageKeys = Set<string>;

const initializedStorageKeys = new Map([
    [localStorage, new Set<string>()],
    [sessionStorage, new Set<string>()],
])

const unwrapValue = <T>(valueOrCallback: T | (() => T)): T => {
    const isCallable = (value: unknown): value is () => T => typeof value === 'function'
    return isCallable(valueOrCallback) ? valueOrCallback() : valueOrCallback
}

type SetStateParameter<T> = T | undefined | ((value: T | undefined) => T | undefined)
type UpdateState<T> = {
    (newValue: T | ((value: T) => T)): void
    reset: () => void
}

export default function useLocalStorageState<T = undefined>(
    key: string,
    provider?: Storage,
): [T | undefined, UpdateState<T | undefined>, boolean]
export default function useLocalStorageState<T>(
    key: string,
    defaultValue: T | (() => T),
    provider?: Storage,
): [T, UpdateState<T>, boolean]
export default function useLocalStorageState<T = undefined>(
    key: string,
    defaultValue?: T | (() => T),
    provider: Storage = localStorage,
): [T | undefined, UpdateState<T | undefined>, boolean] {
    // we don't support updating the `defaultValue` the same way `useState()` doesn't support it
    const defaultValueRef = useRef(defaultValue)
    const storage = storages.get(provider) as MemoryStorage
    const [state, setState] = useState(() => {
        return {
            value: storage.get(key, defaultValueRef.current),
            isPersistent: (() => {
                /**
                 * We want to return `true` on the server. If you render a message based on `isPersistent` and the
                 * server returns `false` then the message will flicker until hydration is done:
                 * `{!isPersistent && <span>You changes aren't being persisted.</span>}`
                 */
                if (typeof window === 'undefined') {
                    return true
                }
                try {
                    provider.setItem('--use-web-storage-state--', 'dummy')
                    provider.removeItem('--use-web-storage-state--')
                    return true
                } catch {
                    return false
                }
            })(),
        }
    })
    const updateValue = useMemo(() => {
        const fn = (newValue: SetStateParameter<T>) => {
            setState((state) => {
                const isCallable = (
                    value: unknown,
                ): value is (value: T | undefined) => T | undefined => typeof value === 'function'
                const value = isCallable(newValue) ? newValue(state.value) : newValue

                return {
                    value,
                    isPersistent: storage.set(key, value),
                }
            })
        }
        fn.reset = () => {
            storage.remove(key)
            setState({
                value: unwrapValue(defaultValueRef.current),
                isPersistent: state.isPersistent,
            })
        }

        return fn
    }, [key])

    /**
     * Detects incorrect usage of the library and throws an error with a suggestion how to fix it.
     */
    useEffect(() => {
        if ((initializedStorageKeys.get(provider) as StorageKeys).has(key)) {
            throw new Error(
                `Multiple instances of useLocalStorageState() has been initialized with the same key. ` +
                    `Use createLocalStorageStateHook() instead. ` +
                    `Example implementation: ` +
                    `https://github.com/astoilkov/use-local-storage-state#create-local-storage-state-hook-example`,
            )
        }
        (initializedStorageKeys.get(provider) as StorageKeys).add(key)

        return () => void (initializedStorageKeys.get(provider) as StorageKeys).delete(key)
    }, [])

    /**
     * Syncs changes across tabs and iframe's.
     */
    useEffect(() => {
        const onStorage = (e: StorageEvent): void => {
            if (e.storageArea === provider && e.key === key) {
                setState({
                    value: storage.get(key, defaultValueRef.current),
                    isPersistent: false,
                })
            }
        }

        window.addEventListener('storage', onStorage)

        return (): void => window.removeEventListener('storage', onStorage)
    }, [])

    return [state.value, updateValue, state.isPersistent]
}

export function createLocalStorageStateHook<T = undefined>(
    key: string,
    provider?: Storage,
): () => [T | undefined, UpdateState<T | undefined>, boolean]
export function createLocalStorageStateHook<T>(
    key: string,
    defaultValue: T | (() => T),
    provider?: Storage,
): () => [T, UpdateState<T>, boolean]
export function createLocalStorageStateHook<T>(
    key: string,
    defaultValue?: T | (() => T),
    provider: Storage = localStorage,
): () => [T | undefined, UpdateState<T | undefined>, boolean] {
    const updates: UpdateState<T | undefined>[] = []
    return function useLocalStorageStateHook(): [
        T | undefined,
        UpdateState<T | undefined>,
        boolean,
    ] {
        const [value, setValue, isPersistent] = useLocalStorageState<T | undefined>(
            key,
            defaultValue,
            provider,
        )
        const updateValue = useMemo(() => {
            const fn = (newValue: SetStateParameter<T>) => {
                for (const update of updates) {
                    update(newValue)
                }
            }
            fn.reset = () => {
                for (const update of updates) {
                    update.reset()
                }
            }
            return fn
        }, [])

        useEffect(() => {
            (initializedStorageKeys.get(provider) as StorageKeys).delete(key)
        }, [])

        useEffect(() => {
            updates.push(setValue)
            return () => void updates.splice(updates.indexOf(setValue), 1)
        }, [setValue])

        return [value, updateValue, isPersistent]
    }
}
