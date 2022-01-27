import storage from './storage'
import { unstable_batchedUpdates } from 'react-dom'
import { useEffect, useMemo, useReducer, useRef } from 'react'

// todo: explain
const activeHooks: {
    key: string
    forceUpdate: () => void
}[] = []

export type UpdateState<T> = (newValue: T | ((value: T) => T)) => void
export type SetStateParameter<T> = T | undefined | ((value: T | undefined) => T | undefined)
export type LocalStorageProperties = {
    isPersistent: boolean
    removeItem: () => void
}

export default function useLocalStorageState<T = undefined>(
    key: string,
    defaultValue?: T,
): [T | undefined, UpdateState<T | undefined>, LocalStorageProperties] {
    const [id, forceUpdate] = useReducer((number) => number + 1, 0)

    // todo: explain
    const isFirstRenderRef = useRef(true)
    if (isFirstRenderRef.current) {
        isFirstRenderRef.current = false

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

    // todo: explain
    useEffect(() => {
        const entry = { key, forceUpdate }
        activeHooks.push(entry)
        return (): void => {
            activeHooks.splice(activeHooks.indexOf(entry), 1)
        }
    }, [key, forceUpdate])

    return useMemo(
        () => [
            storage.get(key, defaultValue),
            (newValue: SetStateParameter<T>): void => {
                unstable_batchedUpdates(() => {
                    const isCallable = (
                        value: unknown,
                    ): value is (value: T | undefined) => T | undefined =>
                        typeof value === 'function'
                    const newUnwrappedValue = isCallable(newValue)
                        ? newValue(storage.get(key, defaultValue))
                        : newValue

                    storage.set(key, newUnwrappedValue)

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

                    forceUpdate()
                },
            },
        ],

        // todo: explain why
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [id, key],
    )
}
