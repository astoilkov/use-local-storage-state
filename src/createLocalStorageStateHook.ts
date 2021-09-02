import { useCallback, useEffect, useMemo } from 'react'
import useLocalStorageStateBase, {
    UpdateState,
    SetStateParameter,
    LocalStorageProperties,
} from './useLocalStorageStateBase'

export default function createLocalStorageStateHook<T = undefined>(
    key: string,
): () => [T | undefined, UpdateState<T | undefined>, LocalStorageProperties]
export default function createLocalStorageStateHook<T>(
    key: string,
    defaultValue: T | (() => T),
): () => [T, UpdateState<T>, LocalStorageProperties]
export default function createLocalStorageStateHook<T>(
    key: string,
    defaultValue?: T | (() => T),
): () => [T | undefined, UpdateState<T | undefined>, LocalStorageProperties] {
    const setValueFunctions: UpdateState<T | undefined>[] = []
    const removeItemFunctions: (() => void)[] = []
    return function useLocalStorageStateHook(): [
        T | undefined,
        UpdateState<T | undefined>,
        LocalStorageProperties,
    ] {
        const [value, setValue, { isPersistent, removeItem }] = useLocalStorageStateBase<
            T | undefined
        >(key, defaultValue)
        const setValueAll = useCallback((newValue: SetStateParameter<T>) => {
            for (const setValueFunction of setValueFunctions) {
                setValueFunction(newValue)
            }
        }, [])

        useEffect(() => {
            setValueFunctions.push(setValue)
            removeItemFunctions.push(removeItem)
            return (): void => {
                setValueFunctions.splice(setValueFunctions.indexOf(setValue), 1)
                removeItemFunctions.splice(removeItemFunctions.indexOf(removeItem), 1)
            }
        }, [setValue, removeItem])

        return useMemo(
            () => [
                value,
                setValueAll,
                {
                    isPersistent,
                    removeItem(): void {
                        for (const removeItemFunction of removeItemFunctions) {
                            removeItemFunction()
                        }
                    },
                },
            ],
            [value, setValueAll, isPersistent],
        )
    }
}
