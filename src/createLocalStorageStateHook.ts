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
    const updates: UpdateState<T | undefined>[] = []
    return function useLocalStorageStateHook(): [
        T | undefined,
        UpdateState<T | undefined>,
        boolean,
    ] {
        const [value, setValue, isPersistent] = useLocalStorageStateBase<T | undefined>(
            key,
            defaultValue,
        )
        const updateValue = useMemo(() => {
            const fn = (newValue: SetStateParameter<T>): void => {
                for (const update of updates) {
                    update(newValue)
                }
            }
            fn.reset = (): void => {
                for (const update of updates) {
                    update.reset()
                }
            }
            return fn
        }, [])

        useEffect(() => {
            updates.push(setValue)
            return (): void => void updates.splice(updates.indexOf(setValue), 1)
        }, [setValue])

        return [value, updateValue, isPersistent]
    }
}
