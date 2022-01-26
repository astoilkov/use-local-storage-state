import { useMemo } from 'react'
import useSsrMismatch from './useSsrMismatch'
import useLocalStorageState, { LocalStorageProperties, UpdateState } from './useLocalStorageState'

export default function createLocalStorageHook(
    key: string,
): () => [unknown, UpdateState<unknown>, LocalStorageProperties]
export default function createLocalStorageHook<T = undefined>(
    key: string,
): () => [T | undefined, UpdateState<T | undefined>, LocalStorageProperties]
export default function createLocalStorageHook<T>(
    key: string,
    defaultValue: T | (() => T),
): () => [T, UpdateState<T>, LocalStorageProperties]
export default function createLocalStorageHook<T>(
    key: string,
    defaultValue?: T | (() => T),
): () => [T | undefined, UpdateState<T | undefined>, LocalStorageProperties] {
    return function useLocalStorage(): [
        T | undefined,
        UpdateState<T | undefined>,
        LocalStorageProperties,
    ] {
        const [value, setValue, properties] = useLocalStorageState(key, defaultValue)
        const hydratedValue = useSsrMismatch(defaultValue, value)

        // todo: think about this
        // const isPersistent = useSsrMismatch(true, properties.isPersistent)

        return useMemo(
            () => [hydratedValue, setValue, properties],
            [hydratedValue, setValue, properties],
        )
    }
}
