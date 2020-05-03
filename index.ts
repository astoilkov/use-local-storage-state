import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react'

/**
 * Abstraction for localStorage that uses an in-memory fallback when localStorage throws an error.
 * Reasons for throwing an error:
 * - maximum quota is exceeded
 * - under Mobile Safari (since iOS 5) when the user enters private mode `localStorage.setItem()`
 *   will throw
 * - trying to access localStorage object when cookies are disabled in Safari throws
 *   "SecurityError: The operation is insecure."
 */
const data: Record<string, unknown> = {}
const storage = {
    get<T>(key: string, defaultValue: T): T {
        try {
            return data[key] ?? JSON.parse(localStorage.getItem(key) ?? '')
        } catch {
            return defaultValue
        }
    },
    set<T>(key: string, value: T): boolean {
        try {
            localStorage.setItem(key, JSON.stringify(value))

            data[key] = undefined

            return true
        } catch {
            data[key] = value
            return false
        }
    },
}

/**
 * Used to track usages of `useLocalStorageState()` with identical `key` values. If we encounter
 * duplicates we throw an error to the user telling them to use `createLocalStorageStateHook`
 * instead.
 */
const initializedStorageKeys = new Set<string>()

type SetStateParameter<T> = T | undefined | ((value: T | undefined) => T | undefined)

export default function useLocalStorageState<T = undefined>(
    key: string,
): [T | undefined, Dispatch<SetStateAction<T | undefined>>, boolean]
export default function useLocalStorageState<T>(
    key: string,
    defaultValue: T | (() => T),
): [T, Dispatch<SetStateAction<T>>, boolean]
export default function useLocalStorageState<T = undefined>(
    key: string,
    defaultValue?: T | (() => T),
): [T | undefined, Dispatch<SetStateAction<T | undefined>>, boolean] {
    const [state, setState] = useState(() => {
        const isCallable = (value: unknown): value is () => T => typeof value === 'function'
        return {
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
                    localStorage.setItem('--use-local-storage-state--', 'dummy')
                    localStorage.removeItem('--use-local-storage-state--')
                    return true
                } catch {
                    return false
                }
            })(),
            value: isCallable(defaultValue)
                ? storage.get(key, defaultValue())
                : storage.get(key, defaultValue),
        }
    })
    const updateValue = useCallback(
        (newValue: SetStateParameter<T>) => {
            setState((state) => {
                const isCallable = (
                    value: unknown,
                ): value is (value: T | undefined) => T | undefined => typeof value === 'function'
                const value = isCallable(newValue) ? newValue(state.value) : newValue

                return {
                    value: value,
                    isPersistent: storage.set(key, value),
                }
            })
        },
        [key],
    )

    /**
     * Detects incorrect usage of the library and throws an error with a suggestion how to fix it.
     */
    useEffect(() => {
        if (initializedStorageKeys.has(key)) {
            throw new Error(
                `Multiple instances of useLocalStorageState() initialized with the same key. ` +
                    `Use createLocalStorageStateHook() instead. ` +
                    `Look at the example here: ` +
                    `https://github.com/astoilkov/use-local-storage-state#create-local-storage-state-hook-example`,
            )
        } else {
            initializedStorageKeys.add(key)
        }

        return () => void initializedStorageKeys.delete(key)
    }, [])

    /**
     * Syncs changes across tabs and iframe's.
     */
    useEffect(() => {
        const onStorage = (e: StorageEvent): void => {
            if (e.storageArea === localStorage && e.key === key) {
                setState({
                    isPersistent: true,
                    value: e.newValue === null ? defaultValue : JSON.parse(e.newValue),
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
): () => [T | undefined, Dispatch<SetStateAction<T | undefined>>, boolean]
export function createLocalStorageStateHook<T>(
    key: string,
    defaultValue: T | (() => T),
): () => [T, Dispatch<SetStateAction<T>>, boolean]
export function createLocalStorageStateHook<T>(
    key: string,
    defaultValue?: T | (() => T),
): () => [T | undefined, Dispatch<SetStateAction<T | undefined>>, boolean] {
    const updates: ((newValue: SetStateParameter<T>) => void)[] = []
    return function useLocalStorageStateHook(): [
        T | undefined,
        Dispatch<SetStateAction<T | undefined>>,
        boolean,
    ] {
        const [value, setValue, isPersistent] = useLocalStorageState<T | undefined>(
            key,
            defaultValue,
        )
        const updateValue = useCallback((newValue: SetStateParameter<T>) => {
            for (const update of updates) {
                update(newValue)
            }
        }, [])

        useEffect(() => {
            initializedStorageKeys.delete(key)
        }, [])

        useEffect(() => {
            updates.push(setValue)
            return () => void updates.splice(updates.indexOf(setValue), 1)
        }, [setValue])

        return [value, updateValue, isPersistent]
    }
}
