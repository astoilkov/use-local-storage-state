import { useMemo } from 'react'
import useSsrMismatch from './useSsrMismatch'
import useLocalStorageState, { LocalStorageProperties, UpdateState } from './useLocalStorageState'

export default function createLocalStorageHook(
    key: string,
): () => [unknown, UpdateState<unknown>, LocalStorageProperties]
export default function createLocalStorageHook<T>(
    key: string,
    options?: { defaultValue?: T | (() => T); ssr?: boolean },
): () => [T, UpdateState<T>, LocalStorageProperties]
export default function createLocalStorageHook<T>(
    key: string,
    options?: { defaultValue?: T | (() => T); ssr?: boolean },
): () => [T | undefined, UpdateState<T | undefined>, LocalStorageProperties] {
    const isCallable = (value: unknown): value is () => T => typeof value === 'function'
    const defaultValue = isCallable(options?.defaultValue)
        ? options?.defaultValue()
        : options?.defaultValue
    return function useLocalStorage(): [
        T | undefined,
        UpdateState<T | undefined>,
        LocalStorageProperties,
    ] {
        const [value, setValue, properties] = useLocalStorageState(key, defaultValue)

        // todo: explain why
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const hydratedValue = options?.ssr === true ? useSsrMismatch(defaultValue, value) : value

        // todo: think about this
        // const isPersistent = useSsrMismatch(true, properties.isPersistent)

        return useMemo(
            () => [hydratedValue, setValue, properties],
            [hydratedValue, setValue, properties],
        )
    }
}
