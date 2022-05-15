import nullValue from './storage/nullValue'
import type Storage from './storage/Storage'
import type { Dispatch, SetStateAction } from 'react'
import localStorageJson from './storage/localStorageJson'
import {
    useRef,
    useMemo,
    useEffect,
    useCallback,
    useSyncExternalStore,
    useLayoutEffect,
} from 'react'

export type LocalStorageOptions<T> = {
    defaultValue?: T
    storage?: Storage
    crossSync?: boolean
}

// - `useLocalStorageState()` return type
// - first two values are the same as `useState`
export type LocalStorageState<T> = [
    T,
    Dispatch<SetStateAction<T>>,
    {
        removeItem: () => void
    },
]

type Store<T> = {
    value: T
    callback: () => void
}

// `activeHooks` holds all active hooks. we use the array to update all hooks with the same key —
// calling `setValue` of one hook triggers an update for all other hooks with the same key
const activeHooks = new Set<{
    key: string
    store: Store<unknown>
}>()

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
        return [defaultValue, (): void => {}, { removeItem: (): void => {} }]
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useClientLocalStorageState(key, defaultValue, options?.storage, options?.crossSync)
}

function useClientLocalStorageState<T>(
    key: string,
    defaultValue: T | undefined,
    storage: Storage = localStorageJson,
    crossSync: boolean = true,
): LocalStorageState<T | undefined> {
    const initialDefaultValue = useRef(defaultValue).current
    const getStorageValue = useCallback(() => {
        try {
            const value = storage.getItem(key)
            const result = value === nullValue ? null : value === null ? initialDefaultValue : value
            return result as T
        } catch {
            return initialDefaultValue
        }
    }, [key, storage, initialDefaultValue])
    const store = useRef<Store<T | undefined>>({
        callback: () => {},
        value: getStorageValue(),
    }).current
    const value = useSyncExternalStore(
        (onStoreChange) => {
            store.callback = onStoreChange
            return (): void => {
                store.callback = (): void => {}
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        () => store.value,

        // istanbul ignore next
        () => initialDefaultValue,
    )
    const setState = useCallback(
        (newValue: SetStateAction<T | undefined>): void => {
            try {
                const value = newValue instanceof Function ? newValue(getStorageValue()) : newValue

                store.value = value
                storage.setItem(key, value)

                store.callback()

                for (const hook of activeHooks) {
                    if (hook.key === key) {
                        hook.store.value = value

                        hook.store.callback()
                    }
                }
            } catch {}
        },
        [key, store, storage, getStorageValue],
    )

    // - adds this hook to the `activeHooks` array. see the `activeHooks` declaration above for a
    //   more detailed explanation
    useLayoutEffect(() => {
        const hook = { key, store }
        activeHooks.add(hook)
        return (): void => {
            activeHooks.delete(hook)
        }
    }, [key, store])

    const isFirstRender = useRef(true)
    useLayoutEffect(() => {
        if (!isFirstRender.current) {
            store.value = getStorageValue()

            store.callback()
        }

        isFirstRender.current = false
    }, [getStorageValue, key, store])

    // - syncs change across tabs, windows, iframes
    // - the `storage` event is called only in all tabs, windows, iframe's except the one that
    //   triggered the change
    useEffect(() => {
        if (!crossSync) {
            return undefined
        }

        const onStorage = (e: StorageEvent): void => {
            if (e.storageArea === localStorage && e.key === key) {
                store.value = getStorageValue()

                store.callback()
            }
        }

        window.addEventListener('storage', onStorage)

        return (): void => {
            window.removeEventListener('storage', onStorage)
        }
    }, [key, store, getStorageValue, crossSync])

    // initial issue: https://github.com/astoilkov/use-local-storage-state/issues/26
    // issues that were caused by incorrect initial and secondary implementations:
    // - https://github.com/astoilkov/use-local-storage-state/issues/30
    // - https://github.com/astoilkov/use-local-storage-state/issues/33
    try {
        if (initialDefaultValue !== undefined && storage.getItem(key) === null) {
            storage.setItem(key, initialDefaultValue)
        }
    } catch {}

    return useMemo(
        () => [
            value,
            setState,
            {
                removeItem(): void {
                    storage.removeItem(key)

                    store.value = initialDefaultValue

                    store.callback()
                },
            },
        ],
        [initialDefaultValue, key, setState, storage, store, value],
    )
}
