import { useEffect } from 'react'
import useLocalStorageStateBase, {
    LocalStorageProperties,
    UpdateState,
} from './useLocalStorageStateBase'

/**
 * Used to track usages of `useLocalStorageState()` with identical `key` values. If we encounter
 * duplicates we throw an error to the user telling them to use `createLocalStorageStateHook`
 * instead.
 */
const initializedStorageKeys = new Set<string>()

export default function useLocalStorageState<T = undefined>(
    key: string,
): [T | undefined, UpdateState<T | undefined>, LocalStorageProperties]
export default function useLocalStorageState<T>(
    key: string,
    defaultValue: T | (() => T),
): [T, UpdateState<T>, LocalStorageProperties]
export default function useLocalStorageState<T = undefined>(
    key: string,
    defaultValue?: T | (() => T),
): [T | undefined, UpdateState<T | undefined>, LocalStorageProperties] {
    const value = useLocalStorageStateBase(key, defaultValue)

    /**
     * Detects incorrect usage of the library and throws an error with a suggestion how to fix it.
     */
    useEffect(() => {
        if (initializedStorageKeys.has(key)) {
            throw new Error(
                `When using the same key in multiple places use createLocalStorageStateHook('${key}'): ` +
                    `https://github.com/astoilkov/use-local-storage-state#create-local-storage-state-hook`,
            )
        } else {
            initializedStorageKeys.add(key)
        }

        return (): void => void initializedStorageKeys.delete(key)
    }, [key])

    return value
}
