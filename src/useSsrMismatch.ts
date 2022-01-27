import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export default function useSsrMismatch<T>(defaultValue: T, value: T): T {
    const isFirstRender = useRef(true)
    const [_, forceUpdate] = useState(false)
    // - use `useEffect()` on the server and `useLayoutEffect()` in the browser
    // - using `useLayoutEffect()` on the server shows a warning
    const useIsomorphicEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

    useIsomorphicEffect(() => {
        if (defaultValue !== value) {
            forceUpdate(true)
        }

        isFirstRender.current = false
    }, [])

    if (isFirstRender.current) {
        return defaultValue
    }

    return value
}
