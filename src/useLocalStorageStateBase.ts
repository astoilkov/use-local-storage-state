import storage from './storage'
import { useEffect, useMemo, useRef, useState } from 'react'

export type UpdateState<T> = (newValue: T | ((value: T) => T)) => void
export type SetStateParameter<T> = T | undefined | ((value: T | undefined) => T | undefined)
export type LocalStorageProperties = {
    isPersistent: boolean
    removeItem: () => void
}

export default function useLocalStorageStateBase<T = undefined>(
    key: string,
): [T | undefined, UpdateState<T | undefined>, LocalStorageProperties]
export default function useLocalStorageStateBase<T>(
    key: string,
    defaultValue: T | (() => T),
): [T, UpdateState<T>, LocalStorageProperties]
export default function useLocalStorageStateBase<T = undefined>(
    key: string,
    defaultValue?: T | (() => T),
): [T | undefined, UpdateState<T | undefined>, LocalStorageProperties] {
    const unwrappedDefaultValue = useMemo(() => {
        const isCallable = (value: unknown): value is () => T => typeof value === 'function'
        return isCallable(defaultValue) ? defaultValue() : defaultValue

        // disabling "exhaustive-deps" because we don't want to change the default state when the
        // `defaultValue` is changed
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])
    const defaultState = useMemo(() => {
        return {
            value: storage.get(key, unwrappedDefaultValue),
            isPersistent: ((): boolean => {
                /**
                 * We want to return `true` on the server. If you render a message based on
                 * `isPersistent` and the server returns `false` then the message will flicker until
                 * hydration is done:
                 * `{!isPersistent && <span>You changes aren't being persisted.</span>}`
                 */
                if (typeof window === 'undefined') {
                    return true
                }
                try {
                    // - ulss = use-local-storage-state
                    // - using shorthand to make library smaller in size
                    localStorage.setItem('__ulss', '#')
                    localStorage.removeItem('__ulss')
                    return true
                } catch {
                    return false
                }
            })(),
        }
    }, [key, unwrappedDefaultValue])
    const [{ value, isPersistent }, setState] = useState(defaultState)
    const updateValue = useMemo(() => {
        return (newValue: SetStateParameter<T>): void => {
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
    }, [key])

    // syncs change across tabs and iframe's
    useEffect(() => {
        const onStorage = (e: StorageEvent): void => {
            if (e.storageArea === localStorage && e.key === key) {
                setState({
                    value: storage.get(key, unwrappedDefaultValue),
                    isPersistent: true,
                })
            }
        }

        window.addEventListener('storage', onStorage)

        return (): void => window.removeEventListener('storage', onStorage)
    }, [key, unwrappedDefaultValue])

    const isFirstRender = useRef(true)
    useEffect(() => {
        // initial issue: https://github.com/astoilkov/use-local-storage-state/issues/26
        // issues that were caused by incorrect initial and secondary implementations:
        // - https://github.com/astoilkov/use-local-storage-state/issues/30
        // - https://github.com/astoilkov/use-local-storage-state/issues/33
        if (defaultState.value !== undefined && localStorage.getItem(key) === null) {
            storage.set(key, defaultState.value)
        }

        // call `setState(defaultState)` below only when the `key` property changes — not on first
        // render because this will cause a second unnecessary render
        if (isFirstRender.current) {
            isFirstRender.current = false
        } else {
            setState(defaultState)
        }
    }, [key, defaultState])

    return useMemo(
        () => [
            value,
            updateValue,
            {
                isPersistent,
                removeItem(): void {
                    storage.remove(key)
                    setState((state) => ({
                        value: unwrappedDefaultValue,
                        isPersistent: state.isPersistent,
                    }))
                },
            },
        ],
        [value, updateValue, isPersistent, key, unwrappedDefaultValue],
    )
}
