import { useState, useEffect, useMemo, useCallback, useRef } from 'react'

/**
 * A wrapper for `JSON.parse()` which supports the return value of `JSON.stringify(undefined)`
 * which returns the string `"undefined"` and this method returns the value `undefined`.
 */
function parseJSON<T>(value: string | null): T | undefined {
    return value === 'undefined'
        ? undefined
        : // JSON.parse() doesn't accept non-string values, this is why we pass empty
          // string which will throw an error which can be handled
          JSON.parse(value ?? '')
}

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
    get<T>(key: string, defaultValue: T): T | undefined {
        try {
            return (data[key] as T | undefined) ?? parseJSON<T>(localStorage.getItem(key))
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
    remove(key: string): void {
        data[key] = undefined

        try {
            localStorage.removeItem(key)
        } catch {}
    },
}

/**
 * Used to track usages of `useLocalStorageState()` with identical `key` values. If we encounter
 * duplicates we throw an error to the user telling them to use `createLocalStorageStateHook`
 * instead.
 */
const initializedStorageKeys = new Set<string>()

type SetStateParameter<T> = T | undefined | ((value: T | undefined) => T | undefined)
type UpdateState<T> = {
    reset: () => void
    (newValue: T | ((value: T) => T)): void
}

export default function useLocalStorageState<T = undefined>(
    key: string,
): [T | undefined, UpdateState<T | undefined>, boolean]
export default function useLocalStorageState<T>(
    key: string,
    defaultValue: T | (() => T),
): [T, UpdateState<T>, boolean]
export default function useLocalStorageState<T = undefined>(
    key: string,
    defaultValue?: T | (() => T),
): [T | undefined, UpdateState<T | undefined>, boolean] {
    // we don't support updating the `defaultValue` the same way `useState()` doesn't support it
    const [defaultValueState] = useState(() => {
        const isCallable = (value: unknown): value is () => T => typeof value === 'function'
        return isCallable(defaultValue) ? defaultValue() : defaultValue
    })
    const getDefaultState = useCallback(() => {
        return {
            value: storage.get(key, defaultValueState),
            isPersistent: ((): boolean => {
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
        }
    }, [defaultValueState, key])
    const [state, setState] = useState(getDefaultState)
    const updateValue = useMemo(() => {
        const fn = (newValue: SetStateParameter<T>): void => {
            const isCallable = (value: unknown): value is (value: T | undefined) => T | undefined =>
                typeof value === 'function'

            if (isCallable(newValue)) {
                setState((state) => ({
                    value: newValue(state.value),
                    isPersistent: storage.set(key, newValue),
                }))
            } else {
                setState({
                    value: newValue,
                    isPersistent: storage.set(key, newValue),
                })
            }
        }
        fn.reset = (): void => {
            storage.remove(key)
            setState((state) => ({
                value: defaultValueState,
                isPersistent: state.isPersistent,
            }))
        }

        return fn
    }, [key, defaultValueState])

    /**
     * Detects incorrect usage of the library and throws an error with a suggestion how to fix it.
     */
    useEffect(() => {
        if (initializedStorageKeys.has(key)) {
            throw new Error(
                `Multiple instances of useLocalStorageState() has been initialized with the same key. ` +
                    `Use createLocalStorageStateHook() instead. ` +
                    `Example implementation: ` +
                    `https://github.com/astoilkov/use-local-storage-state#create-local-storage-state-hook-example`,
            )
        } else {
            initializedStorageKeys.add(key)
        }

        return (): void => void initializedStorageKeys.delete(key)
    }, [key])

    /**
     * Syncs changes across tabs and iframe's.
     */
    useEffect(() => {
        const onStorage = (e: StorageEvent): void => {
            if (e.storageArea === localStorage && e.key === key) {
                setState({
                    value: storage.get(key, defaultValueState),
                    isPersistent: true,
                })
            }
        }

        window.addEventListener('storage', onStorage)

        return (): void => window.removeEventListener('storage', onStorage)
    }, [key, defaultValueState])

    /**
     * Update the state when the `key` property changes.
     */
    const isFirstRender = useRef(true)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }
        setState(getDefaultState())
    }, [getDefaultState])

    return [state.value, updateValue, state.isPersistent]
}

export function createLocalStorageStateHook<T = undefined>(
    key: string,
): () => [T | undefined, UpdateState<T | undefined>, boolean]
export function createLocalStorageStateHook<T>(
    key: string,
    defaultValue: T | (() => T),
): () => [T, UpdateState<T>, boolean]
export function createLocalStorageStateHook<T>(
    key: string,
    defaultValue?: T | (() => T),
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
        )
        const updateValue = useMemo(() => {
            const fn = (newValue: SetStateParameter<T>): void => {
                for (const update of updates) {
                    update(newValue)
                }
            }
            fn.reset = (): void => {
                for (const update of updates) {
                    update.reset()
                }
            }
            return fn
        }, [])

        useEffect(() => {
            initializedStorageKeys.delete(key)
        }, [])

        useEffect(() => {
            updates.push(setValue)
            return (): void => void updates.splice(updates.indexOf(setValue), 1)
        }, [setValue])

        return [value, updateValue, isPersistent]
    }
}
