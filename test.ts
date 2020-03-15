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

    it('updating writes into localStorage', () => {
        const { result } = renderHook(() => useLocalStorageState('todos', ['first', 'second']))

        act(() => {
            const setTodos = result.current[1]

            setTodos(['third', 'forth'])
        })

        expect(localStorage.getItem('todos')).toEqual(JSON.stringify(['third', 'forth']))
    })

    it('storage event updates state', () => {
        const { result: resultA } = renderHook(() =>
            useLocalStorageState('todos', ['first', 'second']),
        )
        const { result: resultB } = renderHook(() =>
            useLocalStorageState('todos', ['first', 'second']),
        )

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
})

describe('createLocalStorageStateHook()', () => {
    it('initial state is written into the state', () => {
        const useTodos = createLocalStorageStateHook('todos', ['first', 'second'])
        const { result } = renderHook(() => useTodos())

        const [todos] = result.current
        expect(todos).toEqual(['first', 'second'])
    })

    it(`initial state isn't written into localStorage`, () => {
        const useTodos = createLocalStorageStateHook('todos', ['first', 'second'])
        renderHook(() => useTodos())

        expect(localStorage.getItem('todos')).toEqual(null)
    })

    it('updates state', () => {
        const useTodos = createLocalStorageStateHook('todos', ['first', 'second'])
        const { result } = renderHook(() => useTodos())

        act(() => {
            const setTodos = result.current[1]

            setTodos(['third', 'forth'])
        })

        const [todos] = result.current
        expect(todos).toEqual(['third', 'forth'])
    })

    it('updating writes into localStorage', () => {
        const useTodos = createLocalStorageStateHook('todos', ['first', 'second'])
        const { result } = renderHook(() => useTodos())

        act(() => {
            const setTodos = result.current[1]

            setTodos(['third', 'forth'])
        })

        expect(localStorage.getItem('todos')).toEqual(JSON.stringify(['third', 'forth']))
    })

    it('storage event updates state', () => {
        const useTodos = createLocalStorageStateHook('todos', ['first', 'second'])
        const { result: resultA } = renderHook(() => useTodos())
        const { result: resultB } = renderHook(() => useTodos())

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
