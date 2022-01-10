import { useMemo } from 'react'
import useSsrMismatch from './useSsrMismatch'
import useLocalStorageState from './useLocalStorageState'
import { LocalStorageProperties, UpdateState } from './useLocalStorageStateBase'

export default function useSsrLocalStorageState<T = undefined>(
    key: string,
): [T | undefined, UpdateState<T | undefined>, LocalStorageProperties]
export default function useSsrLocalStorageState<T>(
    key: string,
    defaultValue: T | (() => T),
): [T, UpdateState<T>, LocalStorageProperties]
export default function useSsrLocalStorageState<T = undefined>(
    key: string,
    defaultValue?: T | (() => T),
): [T | undefined, UpdateState<T | undefined>, LocalStorageProperties] {
    const [value, setValue, properties] = useLocalStorageState(key, defaultValue)
    const hydratedValue = useSsrMismatch(defaultValue, value)

    return useMemo(
        () => [hydratedValue, setValue, properties],
        [hydratedValue, setValue, properties],
    )
}
