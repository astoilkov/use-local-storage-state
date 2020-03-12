# `use-local-storage-state`

> Like `useState()` but for local storage

## Install

```shell
$ npm install use-local-storage-state
```

## Why?

Why this module should even exists. There are more than a few libraries to achieve almost the same thing. I created in frustration in the big number of non-optimal current solutions. Here are the things that this module does right. All things mentioned are things that some other library doesn't do. Put all together there isn't a library that solves all cases:

- Written in TypeScript. `useLocalStorageState()` returns absolutely the same type as React `useState()`.
- Uses `JSON.parse()` and `JSON.stringify()` to support non string values.
- Subscribes to the Window [`storage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event) event which tracks changes across browser tabs and iframe's.
- Used in a production application which is based on [Caret - Markdown Editor for Mac / Windows](https://caret.io/) and is in private beta.

## Usage

```typescript
const [todos, setTodos] = useLocalStorageState('todos', [
    'buy milk',
    'do 50 push-ups'
])
```

```typescript
import useLocalStorageState from 'use-local-storage-state'

function Todos() {
    const [query, setQuery] = useState('')
    const [todos, setTodos] = useLocalStorageState('todos', [])
    
    function onClick() {
        setTodos([...todos, query])
    }
    
    return (
        <>
            <input value={query} onChange={e => setQuery(e.value}} />
            {todos.map(todo => <div>{todo}</div>)}
        </>
    )
}
```