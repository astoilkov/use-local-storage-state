/**
 * @jest-environment node
 */

import util from 'util'
import ReactDOM from 'react-dom/server'
import React, { MutableRefObject } from 'react'
import useLocalStorageState from '../src/useLocalStorageState'

function renderHookOnServer<T>(useHook: () => T): { result: MutableRefObject<T> } {
    const result: MutableRefObject<T> = {
        current: undefined!,
    }

    function Component() {
        result.current = useHook()
        return null
    }

    ReactDOM.renderToString(<Component />)

    return { result }
}

beforeEach(() => {
    // Throw an error when `console.error()` is called. This is especially useful in a React tests
    // because React uses it to show warnings and discourage you from shooting yourself in the foot.
    // Here are a few example warnings React throws:
    // - "Warning: useLayoutEffect does nothing on the server, because its effect cannot be encoded
    //   into the server renderer's output format. This will lead to a mismatch between the initial,
    //   non-hydrated UI and the intended UI. To avoid this, useLayoutEffect should only be used in
    //   components that render exclusively on the client. See
    //   https://reactjs.org/link/uselayouteffect-ssr for common fixes."
    // - "Warning: Can't perform a React state update on an unmounted component. This is a no-op,
    //   but it indicates a memory leak in your application. To fix, cancel all subscriptions and
    //   asynchronous tasks in a useEffect cleanup function."
    // - "Warning: Cannot update a component (`Component`) while rendering a different component
    //   (`Component`). To locate the bad setState() call inside `Component`, follow the stack trace
    //   as described in https://reactjs.org/link/setstate-in-render"
    jest.spyOn(console, 'error').mockImplementation((format: string, ...args: any[]) => {
        throw new Error(util.format(format, ...args))
    })
})

describe('useLocalStorageState()', () => {
    describe('SSR support', () => {
        test('returns default value on the server', () => {
            const { result } = renderHookOnServer(() =>
                useLocalStorageState('todos', {
                    defaultValue: ['first', 'second'],
                }),
            )

            expect(result.current[0]).toEqual(['first', 'second'])
        })

        test('returns default value on the server', () => {
            const { result } = renderHookOnServer(() => useLocalStorageState('todos'))

            expect(result.current[0]).toEqual(undefined)
        })

        test(`setValue() on server doesn't throw`, () => {
            const { result } = renderHookOnServer(() =>
                useLocalStorageState('number', {
                    defaultValue: 0,
                }),
            )

            const setValue = result.current[1]
            expect(setValue).not.toThrow()
        })

        test(`removeItem() on server doesn't throw`, () => {
            const { result } = renderHookOnServer(() =>
                useLocalStorageState('number', {
                    defaultValue: 0,
                }),
            )

            const removeItem = result.current[2].removeItem
            expect(removeItem).not.toThrow()
        })

        test('isPersistent returns true on the server', () => {
            const { result } = renderHookOnServer(() =>
                useLocalStorageState('number', {
                    defaultValue: 0,
                }),
            )

            expect(result.current[2].isPersistent).toBe(true)
        })
    })
})
