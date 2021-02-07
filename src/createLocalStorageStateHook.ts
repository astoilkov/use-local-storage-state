import { useEffect, useMemo } from 'react'
import useLocalStorageStateBase, {
    UpdateState,
    SetStateParameter,
} from './useLocalStorageStateBase'

export default function createLocalStorageStateHook<T = undefined>(
    key: string,
): () => [T | undefined, UpdateState<T | undefined>, boolean]
export default function createLocalStorageStateHook<T>(
    key: string,
    defaultValue: T | (() => T),
): () => [T, UpdateState<T>, boolean]
export default function createLocalStorageStateHook<T>(
    key: string,
    defaultValue?: T | (() => T),
): () => [T | undefined, UpdateState<T | undefined>, boolean] {
    const setValueFunctions: UpdateState<T | undefined>[] = []
    return function useLocalStorageStateHook(): [
        T | undefined,
        UpdateState<T | undefined>,
        boolean,
    ] {
        const [value, setValue, isPersistent] = useLocalStorageStateBase<T | undefined>(
            key,
            defaultValue,
        )
        const setValueAll = useMemo(() => {
            const fn = (newValue: SetStateParameter<T>): void => {
                for (const setValueFunction of setValueFunctions) {
                    setValueFunction(newValue)
                }
            }
            fn.reset = (): void => {
                for (const setValueFunction of setValueFunctions) {
                    setValueFunction.reset()
                }
            }
            return fn
        }, [])

        useEffect(() => {
            setValueFunctions.push(setValue)
            return (): void => void setValueFunctions.splice(setValueFunctions.indexOf(setValue), 1)
        }, [setValue])

        return [value, setValueAll, isPersistent]
    }
}
