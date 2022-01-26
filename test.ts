import { createElement, useMemo } from 'react'
import { renderToString } from 'react-dom/server'
import useLocalStorageState from './src/useLocalStorageState'
import { renderHook, act } from '@testing-library/react-hooks'
import createLocalStorageHook from './src/createLocalStorageHook'
import storage from './src/storage'

beforeEach(() => {
    localStorage.clear()
    storage.data.clear()
})

describe('useLocalStorageState()', () => {
    it('initial state is written into the state', () => {
        const { result } = renderHook(() => useLocalStorageState('todos', ['first', 'second']))

        const [todos] = result.current
        expect(todos).toEqual(['first', 'second'])
    })

    it(`initial state isn't written into localStorage`, () => {
        renderHook(() => useLocalStorageState('todos', ['first', 'second']))

        expect(localStorage.getItem('todos')).toEqual(JSON.stringify(['first', 'second']))
    })

    it('updates state', () => {
        const { result } = renderHook(() => useLocalStorageState('todos', ['first', 'second']))

        act(() => {
            const setTodos = result.current[1]

            setTodos(['third', 'forth'])
        })

        const [todos] = result.current
        expect(todos).toEqual(['third', 'forth'])
        expect(localStorage.getItem('todos')).toEqual(JSON.stringify(['third', 'forth']))
    })

    it('updates state with callback function', () => {
        const { result } = renderHook(() => useLocalStorageState('todos', ['first', 'second']))

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

    it('accepts a callback as a default value', () => {
        const { result } = renderHook(() =>
            useLocalStorageState('todos', () => ['first', 'second']),
        )

        const [todos] = result.current
        expect(todos).toEqual(['first', 'second'])
    })

    it('does not fail when having an invalid data in localStorage', () => {
        localStorage.setItem('todos', 'some random string')

        const { result } = renderHook(() => useLocalStorageState('todos', ['first', 'second']))

        const [todos] = result.current
        expect(todos).toEqual(['first', 'second'])
    })

    it('updating writes into localStorage', () => {
        const { result } = renderHook(() => useLocalStorageState('todos', ['first', 'second']))

        act(() => {
            const setTodos = result.current[1]

            setTodos(['third', 'forth'])
        })

        expect(localStorage.getItem('todos')).toEqual(JSON.stringify(['third', 'forth']))
    })

    it('storage event updates state', () => {
        const { result } = renderHook(() => useLocalStorageState('todos', ['first', 'second']))

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

        const [todosA] = result.current
        expect(todosA).toEqual(['third', 'forth'])
    })

    it('storage event updates state to default value', () => {
        const { result } = renderHook(() => useLocalStorageState('todos', ['first', 'second']))

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
        const { result } = renderHook(() => useLocalStorageState('todos', ['first', 'second']))

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

            // trying with a non relevant key
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

        const { result } = renderHook(() => useLocalStorageState('todos', ['first', 'second']))

        const [todos] = result.current
        expect(todos).toEqual(['third', 'forth'])
    })

    it('does not throw an error on two instances with different keys', () => {
        expect(() => {
            renderHook(() => {
                useLocalStorageState('todosA', ['first', 'second'])
                useLocalStorageState('todosB', ['second', 'third'])
            })
        }).not.toThrow()
    })

    it('handles errors thrown by localStorage', () => {
        const setItem = Storage.prototype.setItem
        Storage.prototype.setItem = () => {
            throw new Error()
        }

        const { result } = renderHook(() => useLocalStorageState('set-item-will-throw', ''))
        act(() => {
            const setValue = result.current[1]
            setValue('will-throw')
        })
        expect(result.current[0]).toBe('will-throw')

        Storage.prototype.setItem = setItem
    })

    it('can retrieve data from in memory storage', () => {
        const setItem = Storage.prototype.setItem
        Storage.prototype.setItem = () => {
            throw new Error()
        }

        const useTodos = createLocalStorageHook('todos', ['first'])
        const { result: resultA } = renderHook(() => useTodos())
        act(() => {
            const setValue = resultA.current[1]
            setValue(['first', 'second'])
        })
        const { result: resultB } = renderHook(() => useTodos())
        const [value] = resultB.current
        expect(value).toEqual(['first', 'second'])

        Storage.prototype.setItem = setItem
    })

    it('isPersistent returns true by default', () => {
        const { result } = renderHook(() => useLocalStorageState('todos', ['first', 'second']))
        const [, , { isPersistent }] = result.current
        expect(isPersistent).toBe(true)
    })

    it('isPersistent returns false when localStorage.setItem() throws an error', () => {
        const setItem = Storage.prototype.setItem
        Storage.prototype.setItem = () => {
            throw new Error()
        }

        const { result } = renderHook(() => useLocalStorageState('todos', ['first', 'second']))
        const [, , { isPersistent }] = result.current
        expect(isPersistent).toBe(false)

        Storage.prototype.setItem = setItem
    })

    it('isPersistent becomes false when localStorage.setItem() throws an error on consecutive updates', () => {
        const { result } = renderHook(() => useLocalStorageState('todos', ['first', 'second']))

        const setItem = Storage.prototype.setItem
        Storage.prototype.setItem = () => {
            throw new Error()
        }

        act(() => {
            const setTodos = result.current[1]
            setTodos(['second', 'third'])
        })
        const [todos, , { isPersistent }] = result.current
        expect(todos).toEqual(['second', 'third'])
        expect(isPersistent).toBe(false)

        Storage.prototype.setItem = setItem
    })

    it('isPersistent returns true on the server', () => {
        const windowSpy = jest.spyOn(global, 'window' as any, 'get')
        windowSpy.mockImplementation(() => {
            return undefined
        })

        function Component() {
            const [, , { isPersistent }] = useLocalStorageState('todos', ['first', 'second'])
            expect(isPersistent).toBe(true)
            return null
        }
        renderToString(createElement(Component))

        windowSpy.mockRestore()
    })

    it('isPersistent returns true after "storage" event', () => {
        const { result } = renderHook(() => useLocalStorageState('todos', ['first', 'second']))

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
            useLocalStorageState<string[] | undefined>('todos', ['first', 'second']),
        )
        act(() => {
            const [, setValue] = resultA.current
            setValue(undefined)
        })
        unmount()

        const { result: resultB } = renderHook(() =>
            useLocalStorageState<string[] | undefined>('todos', ['first', 'second']),
        )
        const [value] = resultB.current
        expect(value).toBe(undefined)
    })

    it('can set value to `null`', () => {
        const { result: resultA, unmount } = renderHook(() =>
            useLocalStorageState<string[] | null>('todos', ['first', 'second']),
        )
        act(() => {
            const [, setValue] = resultA.current
            setValue(null)
        })
        unmount()

        const { result: resultB } = renderHook(() =>
            useLocalStorageState<string[] | null>('todos', ['first', 'second']),
        )
        const [value] = resultB.current
        expect(value).toBe(null)
    })

    it('can reset value to default', () => {
        const { result: resultA, unmount: unmountA } = renderHook(() =>
            useLocalStorageState<string[]>('todos', ['first', 'second']),
        )
        act(() => {
            const [, setValue] = resultA.current
            setValue(['third', 'forth'])
        })
        unmountA()

        const { result: resultB, unmount: unmountB } = renderHook(() =>
            useLocalStorageState<string[]>('todos', ['first', 'second']),
        )
        act(() => {
            const [, , { removeItem }] = resultB.current
            removeItem()
        })
        unmountB()

        const { result: resultC } = renderHook(() =>
            useLocalStorageState<string[]>('todos', ['first', 'second']),
        )
        const [value] = resultC.current
        expect(value).toEqual(['first', 'second'])
    })

    it('can reset value to default (default with callback function)', () => {
        const { result: resultA, unmount: unmountA } = renderHook(() =>
            useLocalStorageState<string[]>('todos', () => ['first', 'second']),
        )
        act(() => {
            const [, setValue] = resultA.current
            setValue(['third', 'forth'])
        })
        unmountA()

        const { result: resultB, unmount: unmountB } = renderHook(() =>
            useLocalStorageState<string[]>('todos', () => ['first', 'second']),
        )
        act(() => {
            const [, , { removeItem }] = resultB.current
            removeItem()
        })
        unmountB()

        const { result: resultC } = renderHook(() =>
            useLocalStorageState<string[]>('todos', ['first', 'second']),
        )
        const [value] = resultC.current
        expect(value).toEqual(['first', 'second'])
    })

    it('returns the same update function when the value is saved', () => {
        const functionMock = jest.fn()
        const { rerender } = renderHook(() => {
            const [, setTodos] = useLocalStorageState('todos', ['first', 'second'])
            useMemo(functionMock, [setTodos])
        })

        rerender()

        expect(functionMock.mock.calls.length).toEqual(1)
    })

    it('changing the "key" property updates the value from local storage', () => {
        localStorage.setItem('valueA', JSON.stringify('A'))
        localStorage.setItem('valueB', JSON.stringify('B'))

        const { result, rerender } = renderHook(
            (props) => useLocalStorageState(props.key, undefined),
            {
                initialProps: {
                    key: 'valueA',
                },
            },
        )

        rerender({ key: 'valueB' })

        const [value] = result.current
        expect(value).toEqual('B')
    })

    // https://github.com/astoilkov/use-local-storage-state/issues/30
    it(`when defaultValue isn't provided — don't write to localStorage on initial render`, () => {
        renderHook(() => useLocalStorageState('todos'))

        expect(localStorage.getItem('todos')).toEqual(null)
    })

    // https://github.com/astoilkov/use-local-storage-state/issues/33
    it(`localStorage value shouldn't be overwritten`, () => {
        localStorage.setItem('color', 'red')

        renderHook(() => useLocalStorageState('color', 'blue'))

        expect(localStorage.getItem('color')).toEqual('red')
    })
})

describe('createLocalStorageStateHook()', () => {
    it('storage event updates state', () => {
        const useTodos = createLocalStorageHook('todos', ['first', 'second'])
        const { result: resultA } = renderHook(() => useTodos())
        const { result: resultB } = renderHook(() => useTodos())

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
        const useTodos = createLocalStorageHook('todos', ['first', 'second'])
        const { result: resultA } = renderHook(() => useTodos())
        const { result: resultB } = renderHook(() => useTodos())

        act(() => {
            const setTodos = resultA.current[1]

            setTodos(['third', 'forth'])
        })

        const [todos] = resultB.current
        expect(todos).toEqual(['third', 'forth'])
    })

    it('can reset value to default', () => {
        const useTodos = createLocalStorageHook('todos', ['first', 'second'])
        const { result: resultA } = renderHook(() => useTodos())
        const { result: resultB } = renderHook(() => useTodos())

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
        const useTodos = createLocalStorageHook('todos')
        renderHook(() => useTodos())

        expect(localStorage.getItem('todos')).toEqual(null)
    })
})

// describe('useSsrLocalStorageState()', () => {
//     it('basic setup with default value', () => {
//         const { result } = renderHook(() => useSsrLocalStorageState('todos', [1, 2, 3]))
//
//         const [todos] = result.current
//         expect(todos).toEqual([1, 2, 3])
//     })
//
//     it('if there are already items in localStorage', () => {
//         localStorage.setItem('todos', JSON.stringify([4, 5, 6]))
//
//         const { result } = renderHook(() => useSsrLocalStorageState('todos', [1, 2, 3]))
//
//         const [todos] = result.current
//         expect(todos).toEqual([4, 5, 6])
//     })
//
//     it('turns server rendering when `window` object is `undefined`', () => {
//         const windowSpy = jest.spyOn(global, 'window' as any, 'get')
//         windowSpy.mockImplementation(() => {
//             return undefined
//         })
//
//         function Component() {
//             const [todos] = useSsrLocalStorageState('todos', [1, 2, 3])
//             expect(todos).toEqual([1, 2, 3])
//             return null
//         }
//         renderToString(createElement(Component))
//
//         windowSpy.mockRestore()
//     })
// })
//
// describe('createSsrLocalStorageStateHook()', () => {
//     it('basic setup with default value', () => {
//         const useTodos = createSsrLocalStorageStateHook('todos', [1, 2, 3])
//         const { result } = renderHook(() => useTodos())
//
//         const [todos] = result.current
//         expect(todos).toEqual([1, 2, 3])
//     })
// })
