import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react'

const data: Record<string, unknown> = {}
const storage = {
    get<T>(key: string, defaultValue: T): T {
        try {
            return data[key] ?? JSON.parse(localStorage.getItem(key) ?? '')
        } catch {
            return defaultValue
        }
    },
    set<T>(key: string, value: T): boolean {
        try {
            localStorage.setItem(key, JSON.stringify(value))

            data[key] = undefined

            return true
        } catch {
            data[key] = value
            return false
        }
    },
}
const initializedStorageKeys = new Set<string>()

export default function useLocalStorageState<T = undefined>(
    key: string,
): [T | undefined, Dispatch<SetStateAction<T | undefined>>]
export default function useLocalStorageState<T>(
    key: string,
    defaultValue: T,
): [T, Dispatch<SetStateAction<T>>]
export default function useLocalStorageState<T = undefined>(
    key: string,
    defaultValue?: T,
): [T | undefined, Dispatch<SetStateAction<T | undefined>>] {
    const [value, setValue] = useState<T | undefined>(() => storage.get(key, defaultValue))
    const updateValue = useCallback(
        (newValue: T | undefined | ((value: T | undefined) => T | undefined)) => {
            setValue((value) => {
                const isCallable = (
                    value: unknown,
                ): value is (value: T | undefined) => T | undefined => typeof value === 'function'
                const result = isCallable(newValue) ? newValue(value) : newValue
                storage.set(key, result)
                return result
            })
        },
        [key],
    )

    useEffect(() => {
        if (initializedStorageKeys.has(key)) {
            throw new Error(
                `Multiple instances of useLocalStorageState() initialized with the same key. ` +
                    `Use createLocalStorageStateHook() instead. ` +
                    `Look at the example here: ` +
                    `https://github.com/astoilkov/use-local-storage-state#create-local-storage-state-hook-example`,
            )
        } else {
            initializedStorageKeys.add(key)
        }

        return () => void initializedStorageKeys.delete(key)
    }, [])

    /**
     * Checks for changes across tabs and iframe's.
     */
    useEffect(() => {
        const onStorage = (e: StorageEvent): void => {
            if (e.storageArea === localStorage && e.key === key) {
                setValue(e.newValue === null ? defaultValue : JSON.parse(e.newValue))
            }
        }

        window.addEventListener('storage', onStorage)

        return (): void => window.removeEventListener('storage', onStorage)
    })

    return [value, updateValue]
}

export function createLocalStorageStateHook<T = undefined>(
    key: string,
): () => [T | undefined, Dispatch<SetStateAction<T | undefined>>]
export function createLocalStorageStateHook<T>(
    key: string,
    defaultValue: T,
): () => [T, Dispatch<SetStateAction<T>>]
export function createLocalStorageStateHook<T>(
    key: string,
    defaultValue?: T,
): () => [T | undefined, Dispatch<SetStateAction<T | undefined>>] {
    const updates: ((
        newValue: T | undefined | ((value: T | undefined) => T | undefined),
    ) => void)[] = []
    return function useLocalStorageStateHook(): [
        T | undefined,
        Dispatch<SetStateAction<T | undefined>>,
    ] {
        const [value, setValue] = useLocalStorageState<T | undefined>(key, defaultValue)
        const updateValue = useCallback(
            (newValue: T | undefined | ((value: T | undefined) => T | undefined)) => {
                for (const update of updates) {
                    update(newValue)
                }
            },
            [],
        )

        useEffect(() => {
            initializedStorageKeys.delete(key)
        }, [])

        useEffect(() => {
            updates.push(setValue)
            return () => void updates.splice(updates.indexOf(setValue), 1)
        }, [setValue])

        return [value, updateValue]
    }
}
