import { useState, useLayoutEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react'

export default function useLocalStorageState<T>(
    key: string,
    defaultValue?: T,
): [T, Dispatch<SetStateAction<T>>] {
    const globalKey = useMemo(() => `use-local-storage-state.${key}`, [key])
    const [value, setValue] = useState<T>(() => {
        const storageValue = localStorage.getItem(globalKey)
        return storageValue === null ? defaultValue : JSON.parse(storageValue)
    })
    const updateValue = useCallback(
        (newValue: T | ((value: T) => T)) => {
            setValue(value => {
                const isCallable = (value: any): value is (value: T) => T =>
                    typeof value === 'function'
                const result = isCallable(newValue) ? newValue(value) : newValue
                localStorage.setItem(globalKey, JSON.stringify(result))
                return result
            })
        },
        [globalKey],
    )

    /**
     * Checks for changes across tabs and iframe's.
     */
    useLayoutEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.storageArea === localStorage && e.key === globalKey) {
                setValue(e.newValue === null ? defaultValue : JSON.parse(e.newValue))
            }
        }

        window.addEventListener('storage', onStorage)

        return () => window.removeEventListener('storage', onStorage)
    })

    return [value, updateValue]
}
