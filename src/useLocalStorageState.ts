import { useEffect } from 'react'
import useLocalStorageStateBase, { UpdateState } from './useLocalStorageStateBase'

/**
 * Used to track usages of `useLocalStorageState()` with identical `key` values. If we encounter
 * duplicates we throw an error to the user telling them to use `createLocalStorageStateHook`
 * instead.
 */
const initializedStorageKeys = new Set<string>()

export default function useLocalStorageState<T = undefined>(
    key: string,
): [T | undefined, UpdateState<T | undefined>, boolean]
export default function useLocalStorageState<T>(
    key: string,
    defaultValue: T | (() => T),
): [T, UpdateState<T>, boolean]
export default function useLocalStorageState<T = undefined>(
    key: string,
    defaultValue?: T | (() => T),
): [T | undefined, UpdateState<T | undefined>, boolean] {
    const value = useLocalStorageStateBase(key, defaultValue)

    /**
     * Detects incorrect usage of the library and throws an error with a suggestion how to fix it.
     */
    useEffect(() => {
        if (initializedStorageKeys.has(key)) {
            throw new Error(
                `useLocalStorageState() doesn't support multiple instances with the same key.` +
                    `Use createLocalStorageStateHook('${key}'). Example: https://bit.ly/39PfEcV`,
            )
        } else {
            initializedStorageKeys.add(key)
        }

        return (): void => void initializedStorageKeys.delete(key)
    }, [key])

    return value
}
