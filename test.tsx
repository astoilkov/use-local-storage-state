import util from 'util'
import storage from './src/storage'
import useLocalStorageState from '.'
import { render } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react-hooks'
import React, { useEffect, useLayoutEffect, useMemo } from 'react'
import { renderHook as renderHookOnServer } from '@testing-library/react-hooks/server'

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

afterEach(() => {
    localStorage.clear()
    storage.data.clear()
    jest.clearAllMocks()
})

describe('createLocalStorageStateHook()', () => {
    it('initial state is written into the state', () => {
        const { result } = renderHook(() =>
            useLocalStorageState('todos', { defaultValue: ['first', 'second'] }),
        )

        const [todos] = result.current
        expect(todos).toEqual(['first', 'second'])
    })

    it(`initial state isn't written into localStorage`, () => {
        renderHook(() => useLocalStorageState('todos', { defaultValue: ['first', 'second'] }))

        expect(localStorage.getItem('todos')).toEqual(JSON.stringify(['first', 'second']))
    })

    it('updates state', () => {
        const { result } = renderHook(() =>
            useLocalStorageState('todos', { defaultValue: ['first', 'second'] }),
        )

        act(() => {
            const setTodos = result.current[1]

            setTodos(['third', 'forth'])
        })

        const [todos] = result.current
        expect(todos).toEqual(['third', 'forth'])
        expect(localStorage.getItem('todos')).toEqual(JSON.stringify(['third', 'forth']))
    })

    it('updates state with callback function', () => {
        const { result } = renderHook(() =>
            useLocalStorageState('todos', { defaultValue: ['first', 'second'] }),
        )

        act(() => {
            const setTodos = result.current[1]

            setTodos((value) => [...value, 'third', 'forth'])
        })

        const [todos] = result.current
        expect(todos).toEqual(['first', 'second', 'third', 'forth'])
        expect(localStorage.getItem('todos')).toEqual(
            JSON.stringify(['first', 'second', 'third', 'forth']),
        )
    })

    it('does not fail when having an invalid data in localStorage', () => {
        localStorage.setItem('todos', 'some random string')

        const { result } = renderHook(() =>
            useLocalStorageState('todos', { defaultValue: ['first', 'second'] }),
        )

        const [todos] = result.current
        expect(todos).toEqual(['first', 'second'])
    })

    it('updating writes into localStorage', () => {
        const { result } = renderHook(() =>
            useLocalStorageState('todos', { defaultValue: ['first', 'second'] }),
        )

        act(() => {
            const setTodos = result.current[1]

            setTodos(['third', 'forth'])
        })

        expect(localStorage.getItem('todos')).toEqual(JSON.stringify(['third', 'forth']))
    })

    it('storage event updates state to default value', () => {
        const { result } = renderHook(() =>
            useLocalStorageState('todos', { defaultValue: ['first', 'second'] }),
        )

        act(() => {
            const setTodos = result.current[1]
            setTodos(['third', 'forth'])

            localStorage.removeItem('todos')
            window.dispatchEvent(
                new StorageEvent('storage', {
                    storageArea: localStorage,
                    key: 'todos',
                    oldValue: JSON.stringify(['first', 'second']),
                    newValue: null,
                }),
            )
        })

        const [todosB] = result.current
        expect(todosB).toEqual(['first', 'second'])
    })

    it(`unrelated storage update doesn't do anything`, () => {
        const { result } = renderHook(() =>
            useLocalStorageState('todos', { defaultValue: ['first', 'second'] }),
        )

        act(() => {
            // trying with sessionStorage
            sessionStorage.setItem('todos', JSON.stringify(['third', 'forth']))
            window.dispatchEvent(
                new StorageEvent('storage', {
                    storageArea: sessionStorage,
                    key: 'todos',
                    oldValue: JSON.stringify(['first', 'second']),
                    newValue: JSON.stringify(['third', 'forth']),
                }),
            )

            // trying with a non-relevant key
            localStorage.setItem('not-todos', JSON.stringify(['third', 'forth']))
            window.dispatchEvent(
                new StorageEvent('storage', {
                    storageArea: localStorage,
                    key: 'not-todos',
                    oldValue: JSON.stringify(['first', 'second']),
                    newValue: JSON.stringify(['third', 'forth']),
                }),
            )
        })

        const [todosA] = result.current
        expect(todosA).toEqual(['first', 'second'])
    })

    it('initially gets value from local storage if there is a value', () => {
        localStorage.setItem('todos', JSON.stringify(['third', 'forth']))

        const { result } = renderHook(() =>
            useLocalStorageState('todos', { defaultValue: ['first', 'second'] }),
        )

        const [todos] = result.current
        expect(todos).toEqual(['third', 'forth'])
    })

    it('handles errors thrown by localStorage', () => {
        const mock = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error()
        })

        const { result } = renderHook(() =>
            useLocalStorageState('set-item-will-throw', { defaultValue: '' }),
        )

        act(() => {
            const setValue = result.current[1]
            setValue('will-throw')
        })

        mock.mockRestore()

        expect(result.current[0]).toBe('will-throw')
    })

    it('can retrieve data from in memory storage', () => {
        const mock = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error()
        })

        const { result: resultA } = renderHook(() =>
            useLocalStorageState('todos', { defaultValue: ['first'] }),
        )

        act(() => {
            const setValue = resultA.current[1]
            setValue(['first', 'second'])
        })

        const { result: resultB } = renderHook(() =>
            useLocalStorageState('todos', { defaultValue: ['first'] }),
        )

        mock.mockRestore()

        const [value] = resultB.current
        expect(value).toEqual(['first', 'second'])
    })

    it('isPersistent returns true by default', () => {
        const { result } = renderHook(() =>
            useLocalStorageState('todos', { defaultValue: ['first', 'second'] }),
        )
        const [, , { isPersistent }] = result.current
        expect(isPersistent).toBe(true)
    })

    it('isPersistent returns false when localStorage.setItem() throws an error', () => {
        const mock = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error()
        })

        const { result } = renderHook(() =>
            useLocalStorageState('todos', { defaultValue: ['first', 'second'] }),
        )

        mock.mockRestore()

        const [, , { isPersistent }] = result.current
        expect(isPersistent).toBe(false)
    })

    it('isPersistent becomes false when localStorage.setItem() throws an error on consecutive updates', () => {
        const { result } = renderHook(() =>
            useLocalStorageState('todos', { defaultValue: ['first', 'second'] }),
        )

        const mock = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error()
        })

        act(() => {
            const setTodos = result.current[1]
            setTodos(['second', 'third'])
        })

        mock.mockRestore()

        const [todos, , { isPersistent }] = result.current
        expect(todos).toEqual(['second', 'third'])
        expect(isPersistent).toBe(false)
    })

    it('isPersistent returns true after "storage" event', () => {
        const { result } = renderHook(() =>
            useLocalStorageState('todos', { defaultValue: ['first', 'second'] }),
        )

        // #WET 2020-03-19T8:55:25+02:00
        act(() => {
            localStorage.setItem('todos', JSON.stringify(['third', 'forth']))
            window.dispatchEvent(
                new StorageEvent('storage', {
                    storageArea: localStorage,
                    key: 'todos',
                    oldValue: JSON.stringify(['first', 'second']),
                    newValue: JSON.stringify(['third', 'forth']),
                }),
            )
        })

        const [, , { isPersistent }] = result.current
        expect(isPersistent).toBe(true)
    })

    it('can set value to `undefined`', () => {
        const { result: resultA, unmount } = renderHook(() =>
            useLocalStorageState<string[] | undefined>('todos', {
                defaultValue: ['first', 'second'],
            }),
        )
        act(() => {
            const [, setValue] = resultA.current
            setValue(undefined)
        })
        unmount()

        const { result: resultB } = renderHook(() =>
            useLocalStorageState<string[] | undefined>('todos', {
                defaultValue: ['first', 'second'],
            }),
        )
        const [value] = resultB.current
        expect(value).toBe(undefined)
    })

    it('can set value to `null`', () => {
        const { result: resultA, unmount } = renderHook(() =>
            useLocalStorageState<string[] | null>('todos', {
                defaultValue: ['first', 'second'],
            }),
        )
        act(() => {
            const [, setValue] = resultA.current
            setValue(null)
        })
        unmount()

        const { result: resultB } = renderHook(() =>
            useLocalStorageState<string[] | null>('todos', {
                defaultValue: ['first', 'second'],
            }),
        )
        const [value] = resultB.current
        expect(value).toBe(null)
    })

    it('can reset value to default', () => {
        const { result: resultA, unmount: unmountA } = renderHook(() =>
            useLocalStorageState('todos', { defaultValue: ['first', 'second'] }),
        )
        act(() => {
            const [, setValue] = resultA.current
            setValue(['third', 'forth'])
        })
        unmountA()

        const { result: resultB, unmount: unmountB } = renderHook(() =>
            useLocalStorageState('todos', { defaultValue: ['first', 'second'] }),
        )
        act(() => {
            const [, , { removeItem }] = resultB.current
            removeItem()
        })
        unmountB()

        const { result: resultC } = renderHook(() =>
            useLocalStorageState('todos', { defaultValue: ['first', 'second'] }),
        )
        const [value] = resultC.current
        expect(value).toEqual(['first', 'second'])
    })

    it('returns the same update function when the value is saved', () => {
        const functionMock = jest.fn()
        const { rerender } = renderHook(() => {
            const [, setTodos] = useLocalStorageState('todos', {
                defaultValue: ['first', 'second'],
            })
            useMemo(functionMock, [setTodos])
        })

        rerender()

        expect(functionMock.mock.calls.length).toEqual(1)
    })

    // it('changing the "key" property updates the value from local storage', () => {
    //     localStorage.setItem('valueA', JSON.stringify('A'))
    //     localStorage.setItem('valueB', JSON.stringify('B'))
    //
    //     const { result, rerender } = renderHook(
    //         (props) => useLocalStorageState(props.key, undefined),
    //         {
    //             initialProps: {
    //                 key: 'valueA',
    //             },
    //         },
    //     )
    //
    //     rerender({ key: 'valueB' })
    //
    //     const [value] = result.current
    //     expect(value).toEqual('B')
    // })

    // https://github.com/astoilkov/use-local-storage-state/issues/30
    it(`when defaultValue isn't provided — don't write to localStorage on initial render`, () => {
        renderHook(() => useLocalStorageState('todos'))

        expect(localStorage.getItem('todos')).toEqual(null)
    })

    // https://github.com/astoilkov/use-local-storage-state/issues/33
    it(`localStorage value shouldn't be overwritten`, () => {
        localStorage.setItem('color', 'red')

        renderHook(() => useLocalStorageState('todos', { defaultValue: 'blue' }))

        expect(localStorage.getItem('color')).toEqual('red')
    })

    it('storage event updates state', () => {
        const { result: resultA } = renderHook(() =>
            useLocalStorageState('todos', { defaultValue: ['first', 'second'] }),
        )
        const { result: resultB } = renderHook(() =>
            useLocalStorageState('todos', { defaultValue: ['first', 'second'] }),
        )

        // #WET 2020-03-19T8:55:25+02:00
        act(() => {
            localStorage.setItem('todos', JSON.stringify(['third', 'forth']))
            window.dispatchEvent(
                new StorageEvent('storage', {
                    storageArea: localStorage,
                    key: 'todos',
                    oldValue: JSON.stringify(['first', 'second']),
                    newValue: JSON.stringify(['third', 'forth']),
                }),
            )
        })

        const [todosA] = resultA.current
        expect(todosA).toEqual(['third', 'forth'])

        const [todosB] = resultB.current
        expect(todosB).toEqual(['third', 'forth'])
    })

    it('calling update from one hook updates the other', () => {
        const { result: resultA } = renderHook(() =>
            useLocalStorageState('todos', { defaultValue: ['first', 'second'] }),
        )
        const { result: resultB } = renderHook(() =>
            useLocalStorageState('todos', { defaultValue: ['first', 'second'] }),
        )

        act(() => {
            const setTodos = resultA.current[1]

            setTodos(['third', 'forth'])
        })

        const [todos] = resultB.current
        expect(todos).toEqual(['third', 'forth'])
    })

    it('can reset value to default', () => {
        const { result: resultA } = renderHook(() =>
            useLocalStorageState('todos', { defaultValue: ['first', 'second'] }),
        )
        const { result: resultB } = renderHook(() =>
            useLocalStorageState('todos', { defaultValue: ['first', 'second'] }),
        )

        act(() => {
            const setTodosA = resultA.current[1]
            const removeTodosB = resultB.current[2].removeItem

            setTodosA(['third', 'forth'])

            removeTodosB()
        })

        const [todos] = resultB.current
        expect(todos).toEqual(['first', 'second'])
    })

    // https://github.com/astoilkov/use-local-storage-state/issues/30
    it("when defaultValue isn't provided — don't write to localStorage on initial render", () => {
        renderHook(() => useLocalStorageState('todos'))

        expect(localStorage.getItem('todos')).toEqual(null)
    })

    it('basic setup with default value', () => {
        const { result } = renderHook(() =>
            useLocalStorageState('todos', {
                ssr: true,
                defaultValue: ['first', 'second'],
            }),
        )

        const [todos] = result.current
        expect(todos).toEqual(['first', 'second'])
    })

    it('if there are already items in localStorage', () => {
        localStorage.setItem('todos', JSON.stringify([4, 5, 6]))

        const { result } = renderHook(() =>
            useLocalStorageState('todos', {
                ssr: true,
                defaultValue: ['first', 'second'],
            }),
        )

        const [todos] = result.current
        expect(todos).toEqual([4, 5, 6])
    })

    it('supports changing the key', () => {
        let key = 'todos1'

        const { rerender } = renderHook(() =>
            useLocalStorageState(key, { defaultValue: ['first', 'second'] }),
        )

        key = 'todos2'

        rerender()

        expect(JSON.parse(localStorage.getItem('todos1')!)).toEqual(['first', 'second'])
        expect(JSON.parse(localStorage.getItem('todos2')!)).toEqual(['first', 'second'])
    })

    // https://github.com/astoilkov/use-local-storage-state/issues/39
    // https://github.com/astoilkov/use-local-storage-state/issues/43
    // https://github.com/astoilkov/use-local-storage-state/pull/40
    it(`when ssr: true — don't call useEffect() and useLayoutEffect() on first render`, () => {
        let calls = 0

        function Component() {
            useLocalStorageState('color', {
                ssr: true,
                defaultValue: 'red',
            })

            useEffect(() => {
                calls += 1
            })

            return null
        }

        render(<Component />)

        expect(calls).toBe(1)
    })

    // https://github.com/astoilkov/use-local-storage-state/issues/44
    it(`setState() shouldn't change between renders`, () => {
        function Component() {
            const [value, setValue] = useLocalStorageState('number', {
                defaultValue: 1,
            })

            useEffect(() => {
                setValue((value) => value + 1)
            }, [setValue])

            return <div>{value}</div>
        }

        const { queryByText } = render(<Component />)

        expect(queryByText(/^2$/u)).toBeTruthy()
    })

    // https://github.com/astoilkov/use-local-storage-state/issues/43
    it(`setState() during render`, () => {
        function Component() {
            const [value, setValue] = useLocalStorageState('number', {
                defaultValue: 0,
            })

            if (value === 0) {
                setValue(1)
            }

            return <div>{value}</div>
        }

        const { queryByText } = render(<Component />)

        expect(queryByText(/^1$/u)).toBeTruthy()
    })

    it(`calling setValue() during render when there are two instances of useLocalStorageState() with the same key should throw an error`, () => {
        function App() {
            return (
                <>
                    <Component update={false} />
                    <Component update={true} />
                </>
            )
        }

        function Component({ update }: { update: boolean }) {
            const [value, setValue] = useLocalStorageState('number', {
                defaultValue: 0,
            })

            if (update && value === 0) {
                setValue(1)
            }

            return <div>{value}</div>
        }

        expect(() => render(<App />)).toThrow()
    })

    it(`calling setValue() from useLayoutEffect() should update all useLocalStorageState() instances`, () => {
        function App() {
            return (
                <>
                    <Component update={false} />
                    <Component update={true} />
                </>
            )
        }

        function Component({ update }: { update: boolean }) {
            const [value, setValue] = useLocalStorageState('number', {
                defaultValue: 0,
            })

            useLayoutEffect(() => {
                if (update) {
                    setValue(1)
                }
            }, [])

            return <div>{value}</div>
        }

        const { queryAllByText } = render(<App />)

        expect(queryAllByText(/^1$/u)).toHaveLength(2)
    })

    describe('SSR support', () => {
        beforeEach(() => {
            const windowSpy = jest.spyOn(global, 'window' as any, 'get')
            windowSpy.mockImplementation(() => {
                return undefined
            })
        })

        it('returns default value on the server', () => {
            localStorage.setItem('todos', JSON.stringify(['third', 'forth']))

            const { result } = renderHookOnServer(() =>
                useLocalStorageState('todos', {
                    defaultValue: ['first', 'second'],
                }),
            )

            expect(result.current[0]).toEqual(['first', 'second'])
        })

        it('returns default value on the server', () => {
            const { result } = renderHookOnServer(() => useLocalStorageState('todos'))

            expect(result.current[0]).toEqual(undefined)
        })

        it('isPersistent returns true on the server', () => {
            const { result } = renderHookOnServer(() =>
                useLocalStorageState('number', {
                    defaultValue: 0,
                }),
            )

            expect(result.current[2].isPersistent).toBe(true)
        })

        it(`setValue() on server doesn't throw`, () => {
            const { result } = renderHookOnServer(() =>
                useLocalStorageState('number', {
                    defaultValue: 0,
                }),
            )

            const setValue = result.current[1]
            expect(setValue).not.toThrow()
        })

        it(`removeItem() on server doesn't throw`, () => {
            const { result } = renderHookOnServer(() =>
                useLocalStorageState('number', {
                    defaultValue: 0,
                }),
            )

            const removeItem = result.current[2].removeItem
            expect(removeItem).not.toThrow()
        })
    })
})
