import storage from './storage'
import { unstable_batchedUpdates } from 'react-dom'
import { useEffect, useMemo, useReducer } from 'react'
import { LocalStorageProperties, UpdateState } from './createLocalStorageHook'

// `activeHooks` holds all active hooks. we use the array to update all hooks with the same key —
// calling `setValue` of one hook triggers an update for all other hooks with the same key
const activeHooks: {
    key: string
    forceUpdate: () => void
}[] = []

export default function useLocalStorageState<T = undefined>(
    key: string,
    defaultValue: T,
): [T | undefined, UpdateState<T | undefined>, LocalStorageProperties] {
    // `id` changes every time a change in the `localStorage` occurs
    const [id, forceUpdate] = useReducer((number) => number + 1, 0)

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

        // `key` never changes
    }, [key])

    // add this hook to the `activeHooks` array. see the `activeHooks` declaration above for a
    // more detailed explanation
    useEffect(() => {
        const entry = { key, forceUpdate }
        activeHooks.push(entry)
        return (): void => {
            activeHooks.splice(activeHooks.indexOf(entry), 1)
        }

        // both `key` and `forceUpdate` never change
    }, [key, forceUpdate])

    return useMemo(
        () => [
            storage.get(key, defaultValue),
            (newValue: T | undefined | ((value: T | undefined) => T | undefined)): void => {
                const isCallable = (
                    value: unknown,
                ): value is (value: T | undefined) => T | undefined => typeof value === 'function'
                const newUnwrappedValue = isCallable(newValue)
                    ? newValue(storage.get(key, defaultValue))
                    : newValue

                storage.set(key, newUnwrappedValue)

                unstable_batchedUpdates(() => {
                    for (const update of activeHooks) {
                        if (update.key === key) {
                            update.forceUpdate()
                        }
                    }
                })
            },
            {
                isPersistent: !storage.data.has(key),
                removeItem(): void {
                    storage.remove(key)

                    for (const update of activeHooks) {
                        if (update.key === key) {
                            update.forceUpdate()
                        }
                    }
                },
            },
        ],

        // disabling eslint warning for the following reasons:
        // - `id` is needed because when it changes that means the data in `localStorage` has
        //   changed and we need to update the returned value. However, the eslint rule wants us to
        //   remove the `id` from the dependencies array.
        // - `key` never changes so we can skip it and reduce package size
        // - `defaultValue` never changes so we can skip it and reduce package size
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [id],
    )
}
