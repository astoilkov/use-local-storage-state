import { useMemo } from 'react'
import useSsrMismatch from './useSsrMismatch'
import createLocalStorageStateHook from './createLocalStorageStateHook'
import { UpdateState, LocalStorageProperties } from './useLocalStorageStateBase'

export default function createSsrLocalStorageStateHook(
    key: string,
): () => [unknown, UpdateState<unknown>, LocalStorageProperties]
export default function createSsrLocalStorageStateHook<T = undefined>(
    key: string,
): () => [T | undefined, UpdateState<T | undefined>, LocalStorageProperties]
export default function createSsrLocalStorageStateHook<T>(
    key: string,
    defaultValue: T | (() => T),
): () => [T, UpdateState<T>, LocalStorageProperties]
export default function createSsrLocalStorageStateHook<T>(
    key: string,
    defaultValue?: T | (() => T),
): () => [T | undefined, UpdateState<T | undefined>, LocalStorageProperties] {
    const useLocalStorageStateHook = createLocalStorageStateHook(key, defaultValue)
    return function useLocalStorage(): [
        T | undefined,
        UpdateState<T | undefined>,
        LocalStorageProperties,
    ] {
        const [value, setValue, properties] = useLocalStorageStateHook()
        const hydratedValue = useSsrMismatch(defaultValue, value)

        return useMemo(
            () => [hydratedValue, setValue, properties],
            [hydratedValue, setValue, properties],
        )
    }
}
