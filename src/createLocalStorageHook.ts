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
        const [clientValue, setValue, { isPersistent: clientIsPersistent, removeItem }] =
            useLocalStorageState(key, defaultValue)

        const value =
            // disabling the eslint warning because the condition will never change its value —
            // `options?.ssr` comes from the parent scope
            // eslint-disable-next-line react-hooks/rules-of-hooks
            options?.ssr === true ? useSsrMismatch(defaultValue, clientValue) : clientValue

        const isPersistent =
            // disabling the eslint warning because the condition will never change its value —
            // `options?.ssr` comes from the parent scope
            // eslint-disable-next-line react-hooks/rules-of-hooks
            options?.ssr === true ? useSsrMismatch(true, clientIsPersistent) : clientIsPersistent

        return useMemo(
            () => [value, setValue, { isPersistent, removeItem }],
            [value, setValue, isPersistent, removeItem],
        )
    }
}
