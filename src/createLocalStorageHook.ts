import { useMemo } from 'react'
import useSsrMismatch from './useSsrMismatch'
import useLocalStorageState from './useLocalStorageState'

export type UpdateState<T> = (newValue: T | ((value: T) => T)) => void
export type LocalStorageProperties = {
    isPersistent: boolean
    removeItem: () => void
}

export default function createLocalStorageHook(
    key: string,
): () => [unknown, UpdateState<unknown>, LocalStorageProperties]
export default function createLocalStorageHook<T>(
    key: string,
): () => [T | undefined, UpdateState<T | undefined>, LocalStorageProperties]
export default function createLocalStorageHook<T>(
    key: string,
    options?: { defaultValue?: T; ssr?: boolean },
): () => [T, UpdateState<T>, LocalStorageProperties]
export default function createLocalStorageHook<T>(
    key: string,
    options?: { defaultValue?: T; ssr?: boolean },
): () => [T | undefined, UpdateState<T | undefined>, LocalStorageProperties] {
    const defaultValue = options?.defaultValue
    const ssr = options?.ssr

    if (typeof window === 'undefined') {
        return () => [
            defaultValue,
            (): void => {},
            { isPersistent: true, removeItem: (): void => {} },
        ]
    }

    return function useLocalStorage() {
        const [clientValue, setValue, { isPersistent: clientIsPersistent, removeItem }] =
            useLocalStorageState(key, defaultValue)

        // disabling the eslint warning because the condition will never change its value — `ssr`
        // comes from the parent scope
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const value = ssr === true ? useSsrMismatch(defaultValue, clientValue) : clientValue

        const isPersistent =
            // disabling the eslint warning because the condition will never change its value — `ssr`
            // comes from the parent scope
            // eslint-disable-next-line react-hooks/rules-of-hooks
            ssr === true ? useSsrMismatch(true, clientIsPersistent) : clientIsPersistent

        return useMemo(
            () => [value, setValue, { isPersistent, removeItem }],
            [value, setValue, isPersistent, removeItem],
        )
    }
}
