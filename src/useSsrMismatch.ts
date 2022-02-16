import { useLayoutEffect, useRef, useState } from 'react'

export default function useSsrMismatch<T>(defaultValue: T, value: T): T {
    const isFirstRender = useRef(true)
    const [_, forceUpdate] = useState(false)

    useLayoutEffect(() => {
        isFirstRender.current = false

        if (defaultValue !== value) {
            forceUpdate(true)
        }

        // disabling dependencies because we want the effect to run only once — after hydration has
        // finished
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    if (isFirstRender.current) {
        return defaultValue
    }

    return value
}
