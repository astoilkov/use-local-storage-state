import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react'

const hasLocalStorage = typeof localStorage !== 'undefined'

const initializedStorageKeys = new Set<string>()

export default function useLocalStorageState<T>(
    key: string,
    defaultValue?: T,
): [T, Dispatch<SetStateAction<T>>] {
    const [value, setValue] = useState<T>(() => {
        const storageValue = hasLocalStorage ? localStorage.getItem(key) : null
        return storageValue === null ? defaultValue : JSON.parse(storageValue)
    })
    const updateValue = useCallback(
        (newValue: T | ((value: T) => T)) => {
            setValue((value) => {
                const isCallable = (value: any): value is (value: T) => T =>
                    typeof value === 'function'
                const result = isCallable(newValue) ? newValue(value) : newValue
                if (hasLocalStorage) {
                    localStorage.setItem(key, JSON.stringify(result))
                }
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

export function createLocalStorageStateHook<T>(
    key: string,
    defaultValue?: T,
): () => [T, Dispatch<SetStateAction<T>>] {
    const updates: ((newValue: T | ((value: T) => T)) => void)[] = []
    return function useLocalStorageStateHook(): [T, Dispatch<SetStateAction<T>>] {
        const [value, setValue] = useLocalStorageState<T>(key, defaultValue)
        const updateValue = useCallback((newValue: T | ((value: T) => T)) => {
            for (const update of updates) {
                update(newValue)
            }
        }, [])

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
