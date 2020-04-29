import { renderHook, act } from '@testing-library/react-hooks'
import useLocalStorageState, { createLocalStorageStateHook } from '.'

beforeEach(() => {
    localStorage.clear()
})

describe('useLocalStorageState()', () => {
    it('initial state is written into the state', () => {
        const { result } = renderHook(() => useLocalStorageState('todos', ['first', 'second']))

        const [todos] = result.current
        expect(todos).toEqual(['first', 'second'])
    })

    it(`initial state isn't written into localStorage`, () => {
        renderHook(() => useLocalStorageState('todos', ['first', 'second']))

        expect(localStorage.getItem('todos')).toEqual(null)
    })

    it('updates state', () => {
        const { result } = renderHook(() => useLocalStorageState('todos', ['first', 'second']))

        act(() => {
            const setTodos = result.current[1]

            setTodos(['third', 'forth'])
        })

        const [todos] = result.current
        expect(todos).toEqual(['third', 'forth'])
    })

    it('updates state with callback function', () => {
        const { result } = renderHook(() => useLocalStorageState('todos', ['first', 'second']))

        act(() => {
            const setTodos = result.current[1]

            setTodos((value) => [...value, 'third', 'forth'])
        })

        const [todos] = result.current
        expect(todos).toEqual(['first', 'second', 'third', 'forth'])
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

        /**
         * #WET 2020-03-19T8:55:25+02:00
         */
        act(() => {
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
            window.dispatchEvent(
                new StorageEvent('storage', {
                    storageArea: sessionStorage,
                    key: 'todos',
                    oldValue: JSON.stringify(['first', 'second']),
                    newValue: JSON.stringify(['third', 'forth']),
                }),
            )

            // trying with a non relevant key
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

    it('throws an error on two instances with the same key', () => {
        const consoleError = console.error
        console.error = () => {}

        expect(() => {
            renderHook(() => {
                useLocalStorageState('todos', ['first', 'second'])
                useLocalStorageState('todos', ['second', 'third'])
            })
        }).toThrow()

        console.error = consoleError
    })

    it('does not throw an error on two instances with different keys', () => {
        expect(() => {
            renderHook(() => {
                useLocalStorageState('todosA', ['first', 'second'])
                useLocalStorageState('todosB', ['second', 'third'])
            })
        }).not.toThrow()
    })

    it('does not throw an error when setting value to undefined', () => {
        const useUndefined = createLocalStorageStateHook('undefined')

        const { result: resultA } = renderHook(() => useUndefined())

        act(() => {
            const setValue = resultA.current[1]
            setValue(undefined)
        })

        const { result: resultB } = renderHook(() => useUndefined())

        const [value] = resultB.current
        expect(value).toBe(undefined)
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

        const useTodos = createLocalStorageStateHook('todos', ['first'])
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
})

describe('createLocalStorageStateHook()', () => {
    it('storage event updates state', () => {
        const useTodos = createLocalStorageStateHook('todos', ['first', 'second'])
        const { result: resultA } = renderHook(() => useTodos())
        const { result: resultB } = renderHook(() => useTodos())

        /**
         * #WET 2020-03-19T8:55:25+02:00
         */
        act(() => {
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
        const useTodos = createLocalStorageStateHook('todos', ['first', 'second'])
        const { result: resultA } = renderHook(() => useTodos())
        const { result: resultB } = renderHook(() => useTodos())

        act(() => {
            const setTodos = resultA.current[1]

            setTodos(['third', 'forth'])
        })

        const [todos] = resultB.current
        expect(todos).toEqual(['third', 'forth'])
    })
})
