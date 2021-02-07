# `use-local-storage-state`

> React hook that persist data in local storage

[![Build Status](https://travis-ci.org/astoilkov/use-local-storage-state.svg?branch=master)](https://travis-ci.org/astoilkov/use-local-storage-state)
[![Test Coverage](https://api.codeclimate.com/v1/badges/38dfdf48f7f326ccfa8e/test_coverage)](https://codeclimate.com/github/astoilkov/use-local-storage-state/test_coverage)
![Dependencies](https://david-dm.org/astoilkov/use-local-storage-state.svg)

## Install

```shell
npm install use-local-storage-state
```

## Why

Few other libraries also try to abstract the usage of localStorage into a hook. Here are the reasons why you would consider this one:

- Uses `JSON.parse()` and `JSON.stringify()` to support non string values
- Supports SSR
- 100% test coverage. No `istanbul ignore`
- Handles edge cases – [example](#is-persistent-example)
- Subscribes to the Window [`storage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event) event which tracks changes across browser tabs and iframe's
- Small. Controlled by `size-limit`.
    - `import { useLocalStorageState } from 'use-local-storage-state'` 1.55 kB
    - `import { createLocalStorageState } from 'use-local-storage-state'` 1.5 kB
- High quality with [my open-source principles](https://github.com/astoilkov/me/blob/master/essays/My%20open-source%20principles.md)

## Usage

```typescript
import useLocalStorageState from 'use-local-storage-state'

const [todos, setTodos] = useLocalStorageState('todos', [
    'buy milk',
    'do 50 push-ups'
])
```

### Todo list example

```tsx
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

<div id="is-persistent-example"></div>

### Reseting to defaults

The `setTodos.reset()` method will reset the value to its default and will remove the key from the `localStorage`. It returns to the same state as when the hook was initially created.

```tsx
import useLocalStorageState from 'use-local-storage-state'

const [todos, setTodos] = useLocalStorageState('todos', [
    'buy milk',
    'do 50 push-ups'
])

setTodos.reset()
```

### Handling edge cases with `isPersistent`

There are a few cases when `localStorage` [isn't available](https://github.com/astoilkov/use-local-storage-state/blob/7db8872397eae8b9d2421f068283286847f326ac/index.ts#L3-L11). The `isPersistent` property tells you if the data is persisted in local storage or in-memory. Useful when you want to notify the user that their data won't be persisted.

```tsx
import React, { useState } from 'react'
import useLocalStorageState from 'use-local-storage-state'

export default function Todos() {
    const [todos, setTodos, isPersistent] = useLocalStorageState('todos', ['buy milk'])

    return (
        <>
            {todos.map(todo => (<div>{todo}</div>))}
            {!isPersistent && <span>Changes aren't currently persisted.</span>}
        </>
    )
}

```

## API

### useLocalStorageState(key, defaultValue?)

Returns `[value, setValue, isPersistent]`. The first two are the same as `useState()`. The third(`isPersistent`) determines if the data is persisted in `localStorage` or in-memory – [example](#is-persistent-example). 

#### key

Type: `string`

The key used when calling `localStorage.setItem(key)`and `localStorage.getItem(key)`.

⚠️ Be careful with name conflicts as it is possible to access a property which is already in `localStorage` that was created from another place in the codebase or in an old version of the application.

#### defaultValue

Type: `any`
Default: `undefined`

The initial value of the data. The same as `useState(defaultValue)` property.

<div id="create-local-storage-state-hook"></div>

### createLocalStorageStateHook(key, defaultValue?)

If you want to have the same data in multiple components in your code use `createLocalStorageStateHook()` instead of `useLocalStorageState()`. This avoids:
- maintenance issues with duplicate code that should always be in sync
- conflicts with different default values
- `key` parameter misspellings

```typescript
import { createLocalStorageStateHook } from 'use-local-storage-state'

// Todos.tsx
const useTodos = createLocalStorageStateHook('todos', [
    'buy milk',
    'do 50 push-ups'
])
function Todos() {
    const [todos, setTodos] = useTodos()
}

// Popup.tsx
import useTodos from './useTodos'
function Popup() {
    const [todos, setTodos] = useTodos()
}
```

#### key

Type: `string`

The key used when calling `localStorage.setItem(key)`and `localStorage.getItem(key)`.

⚠️ Be careful with name conflicts as it is possible to access a property which is already in `localStorage` that was created from another place in the codebase or in an old version of the application.

#### defaultValue

Type: `any`
Default: `undefined`

The initial value of the data. The same as `useState(defaultValue)` property.

## Alternatives

These are the best alternatives to my repo I have found so far:
- [donavon/use-persisted-state](https://github.com/donavon/use-persisted-state)
- [imbhargav5/rooks](https://github.com/imbhargav5/rooks/blob/master/packages/localstorage-state/README.md)
- [dance2die/react-use-localstorage](https://github.com/dance2die/react-use-localstorage)