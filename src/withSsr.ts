import unwrapValue from './unwrapValue'
import useLocalStorageState from './useLocalStorageState'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export default function withSsr<T extends typeof useLocalStorageState>(useLocalStorageHook: T): T {
    const useLocalStorageStateWithSsr = (...args: Parameters<T>): ReturnType<T> => {
        const defaultValue = args[1]
        const isFirstRender = useRef(true)
        const [_, forceUpdate] = useState(false)
        const isServer = typeof window === 'undefined'
        const useIsomorphicEffect = isServer ? useEffect : useLayoutEffect

        // asdf
        // eslint-disable-next-line prefer-spread
        const localStorageState = useLocalStorageHook.apply(undefined, args)

        useIsomorphicEffect(() => {
            if (unwrapValue(defaultValue) !== localStorageState[0]) {
                forceUpdate(true)
            }

            isFirstRender.current = false
        }, [])

        if (isFirstRender.current) {
            return [
                unwrapValue(defaultValue),
                localStorageState[1],
                localStorageState[2],
            ] as ReturnType<T>
        }

        return localStorageState as ReturnType<T>
    }

    return useLocalStorageStateWithSsr as unknown as T
}
