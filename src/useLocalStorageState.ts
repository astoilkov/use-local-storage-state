import storage from './storage'
import type { Dispatch, SetStateAction } from 'react'
import { useRef, useMemo, useEffect, useCallback, useSyncExternalStore } from 'react'

export type LocalStorageOptions<T> = {
    defaultValue?: T
    storageSync?: boolean
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

const callbacks = new Set<(key: string) => void>()
function triggerCallbacks(key: string): void {
    for (const callback of [...callbacks]) {
        callback(key)
    }
}

export default function useLocalStorageState(
    key: string,
    options?: Omit<LocalStorageOptions<unknown>, 'defaultValue'>,
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
    const defaultValue = options?.defaultValue

    // SSR support
    if (typeof window === 'undefined') {
        return [
            defaultValue,
            (): void => {},
            {
                isPersistent: true,
                removeItem: (): void => {},
            },
        ]
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useClientLocalStorageState(key, defaultValue, options?.storageSync)
}

function useClientLocalStorageState<T>(
    key: string,
    defaultValue: T | undefined,
    storageSync: boolean = true,
): LocalStorageState<T | undefined> {
    const initialDefaultValue = useRef(defaultValue).current

    // store default value in localStorage:
    // - initial issue: https://github.com/astoilkov/use-local-storage-state/issues/26
    //   issues that were caused by incorrect initial and secondary implementations:
    //   - https://github.com/astoilkov/use-local-storage-state/issues/30
    //   - https://github.com/astoilkov/use-local-storage-state/issues/33
    if (
        !storage.data.has(key) &&
        initialDefaultValue !== undefined &&
        localStorage.getItem(key) === null
    ) {
        storage.set(key, initialDefaultValue)
    }

    const storageValue = useRef<{ item: string | null; parsed: T | undefined }>({
        item: null,
        parsed: initialDefaultValue,
    })
    const value = useSyncExternalStore(
        useCallback(
            (onStoreChange) => {
                const onChange = (localKey: string): void => {
                    if (key === localKey) {
                        onStoreChange()
                    }
                }
                callbacks.add(onChange)
                return (): void => {
                    callbacks.delete(onChange)
                }
            },
            [key],
        ),

        // eslint-disable-next-line react-hooks/exhaustive-deps
        () => {
            const item = localStorage.getItem(key)
            if (item !== storageValue.current.item || storage.data.has(key)) {
                storageValue.current = {
                    item,
                    parsed: storage.get(key, initialDefaultValue),
                }
            }

            return storageValue.current.parsed
        },

        // istanbul ignore next
        () => initialDefaultValue,
    )
    const setState = useCallback(
        (newValue: SetStateAction<T | undefined>): void => {
            const value =
                newValue instanceof Function
                    ? newValue(storage.get(key, initialDefaultValue))
                    : newValue

            storage.set(key, value)

            triggerCallbacks(key)
        },
        [key, initialDefaultValue],
    )

    // - syncs change across tabs, windows, iframes
    // - the `storage` event is called only in all tabs, windows, iframe's except the one that
    //   triggered the change
    useEffect(() => {
        if (!storageSync) {
            return undefined
        }

        const onStorage = (e: StorageEvent): void => {
            if (e.storageArea === localStorage && e.key === key) {
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
                isPersistent: value === initialDefaultValue || !storage.data.has(key),
                removeItem(): void {
                    storage.remove(key)

                    triggerCallbacks(key)
                },
            },
        ],
        [key, setState, value, initialDefaultValue],
    )
}
