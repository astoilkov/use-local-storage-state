# `use-local-storage-state`

> Like `useState()` but for local storage

![](https://img.shields.io/bundlephobia/min/use-local-storage-state)
![](https://img.shields.io/david/astoilkov/use-local-storage-state)
![](https://img.shields.io/npm/l/use-local-storage-state)

## Install

```shell
$ npm install use-local-storage-state
```

## Why?

Why this module even exists? There are more than a few libraries to achieve almost the same thing. I created this module in frustration with the big number of non-optimal solutions. Below are the things that this module does right. All bullets are things that some other library isn't doing. Put all together there isn't a single library that solves all these problems:

- Written in TypeScript. `useLocalStorageState()` returns absolutely the same type as React `useState()`.
- Uses `JSON.parse()` and `JSON.stringify()` to support non string values.
- Subscribes to the Window [`storage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event) event which tracks changes across browser tabs and iframe's.
- Used in a production application which is based on [Caret - Markdown Editor for Mac / Windows](https://caret.io/) and is in private beta.
- Supports creating a global hook that can be used in multiple places. See the last example in the **Usage** section.

## Usage

```typescript
import useLocalStorageState from 'use-local-storage-state'

const [todos, setTodos] = useLocalStorageState('todos', [
    'buy milk',
    'do 50 push-ups'
])
```

Complete todo list example:
```typescript
import React, { useState } from 'react'
import useLocalStorageState from 'use-local-storage-state'

export default function Todos() {
    const [query, setQuery] = useState('')
    const [todos, setTodos] = useLocalStorageState('todos', ['buy milk'])

    function onClick() {
        setTodos([...todos, query])
    }

    return (
        <>
            <input value={query} onChange={e => setQuery(e.target.value)} />
            <button onClick={onClick}>Create</button>
            {todos.map(todo => (<div>{todo}</div>))}
        </>
    )
}

```

Using the same data from the storage in multiple places:
```typescript
import { createLocalStorageStateHook } from 'use-local-storage-state'

// store.ts
export const useTodos = createLocalStorageStateHook('todos', [
    'buy milk',
    'do 50 push-ups'
])

// Todos.ts
function Todos() {
    const [todos, setTodos] = useTodos()
}

// Popup.ts
function Popup() {
    const [todos, setTodos] = useTodos()
}
```