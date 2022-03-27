import storage from './storage'
import { unstable_batchedUpdates } from 'react-dom'
import type { Dispatch, SetStateAction } from 'react'
import { useRef, useMemo, useEffect, useReducer, useCallback } from 'react'

// `activeHooks` holds all active hooks. we use the array to update all hooks with the same key —
// calling `setValue` of one hook triggers an update for all other hooks with the same key
const activeHooks = new Set<{
    key: string
    forceUpdate: () => void
}>()

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
    options?: { ssr: boolean },
): LocalStorageState<unknown>
export default function useLocalStorageState<T>(
    key: string,
    options?: { ssr: boolean },
): LocalStorageState<T | undefined>
export default function useLocalStorageState<T>(
    key: string,
    options?: { defaultValue?: T; ssr?: boolean },
): LocalStorageState<T>
export default function useLocalStorageState<T = undefined>(
    key: string,
    options?: { defaultValue?: T; ssr?: boolean },
): LocalStorageState<T | undefined> {
    // SSR support
    if (typeof window === 'undefined') {
        return [
            options?.defaultValue,
            (): void => {},
            { isPersistent: true, removeItem: (): void => {} },
        ]
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useClientLocalStorageState(key, options)
}

function useClientLocalStorageState<T>(
    key: string,
    options?: { defaultValue?: T; ssr?: boolean },
): LocalStorageState<T | undefined> {
    const defaultValue = useRef(options?.defaultValue).current
    // `id` changes every time a change in the `localStorage` occurs
    const [id, forceUpdate] = useReducer((number) => number + 1, 0)
    const updateHooks = useCallback(() => {
        unstable_batchedUpdates(() => {
            for (const hook of activeHooks) {
                if (hook.key === key) {
                    hook.forceUpdate()
                }
            }
        })
    }, [key])
    const setState = useCallback(
        (newValue: SetStateAction<T | undefined>): void => {
            storage.set(
                key,
                newValue instanceof Function ? newValue(storage.get(key, defaultValue)) : newValue,
            )

            updateHooks()
        },
        [key, updateHooks, defaultValue],
    )

    // - syncs change across tabs, windows, iframe's
    // - the `storage` event is called only in all tabs, windows, iframe's except the one that
    //   triggered the change
    useEffect(() => {
        const onStorage = (e: StorageEvent): void => {
            if (e.storageArea === localStorage && e.key === key) {
                forceUpdate()
            }
        }

        window.addEventListener('storage', onStorage)

        return (): void => window.removeEventListener('storage', onStorage)
    }, [key])

    // - adds this hook to the `activeHooks` array. see the `activeHooks` declaration above for a
    //   more detailed explanation
    // - not inside a React effect because:
    //   - it fixes "🐛 `setValue()` during render doesn't work":
    //     https://github.com/astoilkov/use-local-storage-state/issues/43
    //   - if you call `setValue()` during render and you have two localStorage instances with the
    //     same key — React throws an error. we want this behavior because otherwise it will just
    //     silently fail
    const activeHookRef = useRef({ key, forceUpdate })
    activeHooks.delete(activeHookRef.current)
    activeHookRef.current = { key, forceUpdate }
    activeHooks.add(activeHookRef.current)
    useEffect(
        () => () => {
            activeHooks.delete(activeHookRef.current)
        },
        [],
    )

    // - SSR support
    // - not inside a `useLayoutEffect` because this way we skip the calls to `useEffect()` and
    //   `useLayoutEffect()` for the first render (which also increases performance)
    // - inspired by: https://github.com/astoilkov/use-local-storage-state/pull/40
    // - related: https://github.com/astoilkov/use-local-storage-state/issues/39
    // - related: https://github.com/astoilkov/use-local-storage-state/issues/43
    const isFirstRenderRef = useRef(true)
    const isFirstSsrRender = useRef(options?.ssr).current === true && isFirstRenderRef.current
    isFirstRenderRef.current = false
    if (
        isFirstSsrRender &&
        (storage.data.has(key) || defaultValue !== storage.get(key, defaultValue))
    ) {
        forceUpdate()
    }

    // initial issue: https://github.com/astoilkov/use-local-storage-state/issues/26
    // issues that were caused by incorrect initial and secondary implementations:
    // - https://github.com/astoilkov/use-local-storage-state/issues/30
    // - https://github.com/astoilkov/use-local-storage-state/issues/33
    if (
        defaultValue !== undefined &&
        !storage.data.has(key) &&
        localStorage.getItem(key) === null
    ) {
        storage.set(key, defaultValue)
    }

    return useMemo(
        () => [
            isFirstSsrRender ? defaultValue : storage.get(key, defaultValue),
            setState,
            {
                isPersistent: isFirstSsrRender || !storage.data.has(key),
                removeItem(): void {
                    storage.remove(key)

                    updateHooks()
                },
            },
        ],

        // disabling eslint warning for the following reasons:
        // - `id` is needed because when it changes that means the data in `localStorage` has
        //   changed and we need to update the returned value. However, the eslint rule wants us to
        //   remove the `id` from the dependencies array.
        // - `defaultValue` never changes so we can skip it and reduce package size
        // - `setState` changes when `key` changes so we can skip it and reduce package size
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [id, key],
    )
}
