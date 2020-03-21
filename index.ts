import { useState, useLayoutEffect, useCallback, Dispatch, SetStateAction } from 'react'

export default function useLocalStorageState<T>(
    key: string,
    defaultValue?: T,
): [T, Dispatch<SetStateAction<T>>] {
    const [value, setValue] = useState<T>(() => {
        const storageValue = localStorage.getItem(key)
        return storageValue === null ? defaultValue : JSON.parse(storageValue)
    })
    const updateValue = useCallback(
        (newValue: T | ((value: T) => T)) => {
            setValue(value => {
                const isCallable = (value: any): value is (value: T) => T =>
                    typeof value === 'function'
                const result = isCallable(newValue) ? newValue(value) : newValue
                localStorage.setItem(key, JSON.stringify(result))
                return result
            })
        },
        [key],
    )

    /**
     * Checks for changes across tabs and iframe's.
     */
    useLayoutEffect(() => {
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
    name: string,
    defaultValue?: T,
): () => [T, Dispatch<SetStateAction<T>>] {
    const updates: ((newValue: T | ((value: T) => T)) => void)[] = []
    return function useLocalStorageStateHook(): [T, Dispatch<SetStateAction<T>>] {
        const [value, setValue] = useLocalStorageState<T>(name, defaultValue)
        const updateValue = useCallback((newValue: T | ((value: T) => T)) => {
            for (const update of updates) {
                update(newValue)
            }
        }, [])

        useLayoutEffect(() => {
            updates.push(setValue)
            return () => void updates.splice(updates.indexOf(setValue), 1)
        }, [setValue])

        return [value, updateValue]
    }
}
