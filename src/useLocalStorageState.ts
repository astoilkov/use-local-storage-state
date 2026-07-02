import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'

// in memory fallback used when `localStorage` throws an error
export const inMemoryData = new Map<string, unknown>()

export type LocalStorageOptions<T> = {
    defaultValue?: T | (() => T)
    defaultServerValue?: T | (() => T)
    storageSync?: boolean
    serializer?: {
        stringify: (value: unknown) => string
        parse: (value: string) => unknown
    }
}

// - `useLocalStorageState()` return type
// - first two values are the same as `useState`
export type LocalStorageState<T> = [
    T,
    Dispatch<SetStateAction<T>>,
    {
        isPersistent: boolean
        removeItem: () => void
    },
]

export default function useLocalStorageState(
    key: string,
    options?: LocalStorageOptions<undefined>,
): LocalStorageState<unknown>
export default function useLocalStorageState<T>(
    key: string,
    options?: Omit<LocalStorageOptions<T | undefined>, 'defaultValue'>,
): LocalStorageState<T | undefined>
export default function useLocalStorageState<T>(
    key: string,
    options?: LocalStorageOptions<T>,
): LocalStorageState<T>
export default function useLocalStorageState<T = undefined>(
    key: string,
    options?: LocalStorageOptions<T | undefined>,
): LocalStorageState<T | undefined> {
    const serializer = options?.serializer
    const storageSync = options?.storageSync ?? true
    const parse = serializer?.parse ?? parseJSON
    const stringify = serializer?.stringify ?? JSON.stringify
    const [defaultValue] = useState(options?.defaultValue)
    const [defaultServerValue] = useState(options?.defaultServerValue)

    // we keep the `parsed` value in a ref because `useSyncExternalStore` requires a cached version
    const storageItem = useRef<{ string?: string | null; parsed?: T }>({})

    const value = useSyncExternalStore(
        // useSyncExternalStore.subscribe
        useCallback(
            (onStoreChange) => {
                const onChange = (localKey: string): void => {
                    if (key === localKey) {
                        onStoreChange()
                    }
                }
                callbacks.add(onChange)
                return (): boolean => callbacks.delete(onChange)
            },
            [key],
        ),

        // useSyncExternalStore.getSnapshot
        () => {
            const item = storageItem.current

            let string: string | null = null
            try {
                string = localStorage.getItem(key)
            } catch {
                // reading from `localStorage` can throw:
                // - in Firefox, `localStorage` is `null` when `dom.storage.enabled` is set to
                //   `false` in `about:config`:
                //   https://github.com/astoilkov/use-local-storage-state/issues/80
                // - in Safari, accessing `localStorage` throws "SecurityError: The operation is
                //   insecure." when cookies are disabled
                if (!inMemoryData.has(key)) {
                    inMemoryData.set(key, defaultValue)
                }
            }

            if (inMemoryData.has(key)) {
                item.parsed = inMemoryData.get(key) as T | undefined
            } else if (string !== item.string) {
                try {
                    item.parsed = string === null ? defaultValue : (parse(string) as T)
                } catch {
                    item.parsed = defaultValue
                }
            }

            item.string = string

            // store default value in localStorage:
            // - initial issue: https://github.com/astoilkov/use-local-storage-state/issues/26
            //   issues that were caused by incorrect initial and secondary implementations:
            //   - https://github.com/astoilkov/use-local-storage-state/issues/30
            //   - https://github.com/astoilkov/use-local-storage-state/issues/33
            if (defaultValue !== undefined && string === null) {
                // reasons for `localStorage` to throw an error:
                // - maximum quota is exceeded
                // - under Mobile Safari (since iOS 5) when the user enters private mode
                //   `localStorage.setItem()` will throw
                // - trying to access localStorage object when cookies are disabled in Safari throws
                //   "SecurityError: The operation is insecure."
                goodTry(() => {
                    const string = stringify(defaultValue)
                    localStorage.setItem(key, string)
                    item.string = string
                    item.parsed = defaultValue
                })
            }

            return item.parsed
        },

        // useSyncExternalStore.getServerSnapshot
        () => defaultServerValue ?? defaultValue,
    )
    const setState = useCallback(
        (newValue: SetStateAction<T | undefined>): void => {
            const value =
                newValue instanceof Function ? newValue(storageItem.current.parsed) : newValue

            // reasons for `localStorage` to throw an error:
            // - maximum quota is exceeded
            // - under Mobile Safari (since iOS 5) when the user enters private mode
            //   `localStorage.setItem()` will throw
            // - trying to access `localStorage` object when cookies are disabled in Safari throws
            //   "SecurityError: The operation is insecure."
            try {
                localStorage.setItem(key, stringify(value))

                inMemoryData.delete(key)
            } catch {
                inMemoryData.set(key, value)
            }

            triggerCallbacks(key)
        },
        [key, stringify],
    )
    const removeItem = useCallback(() => {
        goodTry(() => localStorage.removeItem(key))

        inMemoryData.delete(key)

        triggerCallbacks(key)
    }, [key])

    // - syncs change across tabs, windows, iframes
    // - the `storage` event is called only in all tabs, windows, iframe's except the one that
    //   triggered the change
    useEffect(() => {
        if (!storageSync) {
            return undefined
        }

        const onStorage = (e: StorageEvent): void => {
            if (e.key === key && e.storageArea === goodTry(() => localStorage)) {
                triggerCallbacks(key)
            }
        }

        window.addEventListener('storage', onStorage)

        return (): void => window.removeEventListener('storage', onStorage)
    }, [key, storageSync])

    return useMemo(
        () => [
            value,
            setState,
            {
                isPersistent: !inMemoryData.has(key),
                removeItem,
            },
        ],
        [key, setState, value, removeItem],
    )
}

// notifies all instances using the same `key` to update
const callbacks = new Set<(key: string) => void>()
const triggerCallbacks = (key: string): void => {
    for (const callback of [...callbacks]) {
        callback(key)
    }
}

// a wrapper for `JSON.parse()` that supports "undefined" value. otherwise,
// `JSON.parse(JSON.stringify(undefined))` returns the string "undefined" not the value `undefined`
const parseJSON = (value: string): unknown =>
    value === 'undefined' ? undefined : JSON.parse(value)

const goodTry = <T,>(tryFn: () => T): T | undefined => {
    try {
        return tryFn()
    } catch {}
}
