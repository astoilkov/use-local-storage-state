import unwrapValue from './unwrapValue'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export default function useSsrMismatch<T>(defaultValue: T | (() => T), value: T): T {
    const isFirstRender = useRef(true)
    const [_, forceUpdate] = useState(false)
    const isServer = typeof window === 'undefined'
    const useIsomorphicEffect = isServer ? useEffect : useLayoutEffect

    useIsomorphicEffect(() => {
        if (unwrapValue(defaultValue) !== value) {
            forceUpdate(true)
        }

        isFirstRender.current = false
    }, [])

    if (isFirstRender.current) {
        return unwrapValue(defaultValue)
    }

    return value
}
