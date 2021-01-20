import storage from './storage'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type SetStateParameter<T> = T | undefined | ((value: T | undefined) => T | undefined)
export type UpdateState<T> = {
    reset: () => void
    (newValue: T | ((value: T) => T)): void
}

export default function useLocalStorageStateBase<T = undefined>(
    key: string,
): [T | undefined, UpdateState<T | undefined>, boolean]
export default function useLocalStorageStateBase<T>(
    key: string,
    defaultValue: T | (() => T),
): [T, UpdateState<T>, boolean]
export default function useLocalStorageStateBase<T = undefined>(
    key: string,
    defaultValue?: T | (() => T),
): [T | undefined, UpdateState<T | undefined>, boolean] {
    // we don't support updating the `defaultValue` the same way `useState()` doesn't support it
    const [defaultValueState] = useState(() => {
        const isCallable = (value: unknown): value is () => T => typeof value === 'function'
        return isCallable(defaultValue) ? defaultValue() : defaultValue
    })
    const getDefaultState = useCallback(() => {
        return {
            value: storage.get(key, defaultValueState),
            isPersistent: ((): boolean => {
                /**
                 * We want to return `true` on the server. If you render a message based on `isPersistent` and the
                 * server returns `false` then the message will flicker until hydration is done:
                 * `{!isPersistent && <span>You changes aren't being persisted.</span>}`
                 */
                if (typeof window === 'undefined') {
                    return true
                }
                try {
                    localStorage.setItem('--use-local-storage-state--', 'dummy')
                    localStorage.removeItem('--use-local-storage-state--')
                    return true
                } catch {
                    return false
                }
            })(),
        }
    }, [defaultValueState, key])
    const [state, setState] = useState(getDefaultState)
    const updateValue = useMemo(() => {
        const fn = (newValue: SetStateParameter<T>): void => {
            const isCallable = (value: unknown): value is (value: T | undefined) => T | undefined =>
                typeof value === 'function'

            if (isCallable(newValue)) {
                setState((state) => ({
                    value: newValue(state.value),
                    isPersistent: storage.set(key, newValue(state.value)),
                }))
            } else {
                setState({
                    value: newValue,
                    isPersistent: storage.set(key, newValue),
                })
            }
        }
        fn.reset = (): void => {
            storage.remove(key)
            setState((state) => ({
                value: defaultValueState,
                isPersistent: state.isPersistent,
            }))
        }

        return fn
    }, [key, defaultValueState])

    /**
     * Syncs changes across tabs and iframe's.
     */
    useEffect(() => {
        const onStorage = (e: StorageEvent): void => {
            if (e.storageArea === localStorage && e.key === key) {
                setState({
                    value: storage.get(key, defaultValueState),
                    isPersistent: true,
                })
            }
        }

        window.addEventListener('storage', onStorage)

        return (): void => window.removeEventListener('storage', onStorage)
    }, [key, defaultValueState])

    /**
     * Update the state when the `key` property changes.
     */
    const isFirstRender = useRef(true)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }
        setState(getDefaultState())
    }, [getDefaultState])

    return [state.value, updateValue, state.isPersistent]
}
