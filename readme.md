# `use-local-storage-state`

> React hook that persist data in `localStorage`

[![Downloads](https://img.shields.io/npm/dm/use-local-storage-state)](https://www.npmjs.com/package/use-local-storage-state)
[![Gzipped Size](https://badgen.net/bundlephobia/minzip/use-local-storage-state)](https://bundlephobia.com/result?p=use-local-storage-state)
[![Test Coverage](https://img.shields.io/codeclimate/coverage/astoilkov/use-local-storage-state)](https://codeclimate.com/github/astoilkov/use-local-storage-state/test_coverage)
[![Build Status](https://www.travis-ci.com/astoilkov/use-local-storage-state.svg?branch=master)](https://travis-ci.org/astoilkov/use-local-storage-state)

## Install

```shell
npm install use-local-storage-state
```

## Why

- Actively maintained for the past 2 years — see [contributions](https://github.com/astoilkov/use-local-storage-state/graphs/contributors) page.
- SSR support with handling of [hydration mismatches](https://github.com/astoilkov/use-local-storage-state/issues/23).
- Handles the `Window` [`storage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event) event and updates changes across browser tabs, windows, and iframe's.
- In-memory fallback when `localStorage` throws an error and can't store the data. Provides a `isPersistent` API to let you notify the user their data isn't currently being stored.
- Aiming for high-quality with [my open-source principles](https://astoilkov.com/my-open-source-principles).

## Usage

```typescript
import useLocalStorageState from 'use-local-storage-state'

export default function Todos() {
    const [todos, setTodos] = useLocalStorageState('todos', {
        ssr: true,
        defaultValue: ['buy avocado', 'do 50 push-ups']
    })
}
```

<details>
<summary>Todo list example + CodeSandbox link</summary>
<p></p>

You can experiment with the example [here](https://codesandbox.io/s/todos-example-use-local-storage-state-pewbql?file=/src/App.tsx).

```tsx
import React, { useState } from 'react'
import useLocalStorageState from 'use-local-storage-state'

export default function Todos() {
    const [todos, setTodos] = useLocalStorageState('todos', {
        ssr: true,
        defaultValue: ['buy avocado']
    })
    const [query, setQuery] = useState('')

    function onClick() {
        setQuery('')
        setTodos([...todos, query])
    }

    return (
        <>
            <input value={query} onChange={e => setQuery(e.target.value)} />
            <button onClick={onClick}>Create</button>
            {todos.map(todo => (
                <div>{todo}</div>
            ))}
        </>
    )
}

```

</details>

<details>
<summary>SSR support</summary>
<p></p>

SSR supports includes handling of hydration mismatches. This prevents the following error:  `Warning: Expected server HTML to contain a matching ...`. This is the only library I'm aware of that handles this case. For more, see [discussion here](https://github.com/astoilkov/use-local-storage-state/issues/23).

```tsx
import useLocalStorageState from 'use-local-storage-state'

export default function Todos() {
    const [todos, setTodos] = useLocalStorageState('todos', {
        ssr: true,
        defaultValue: ['buy avocado', 'do 50 push-ups']
    })
}
```

</details>

<details>
<summary id="is-persistent">Notify the user when <code>localStorage</code> isn't saving the data using the <code>`isPersistent`</code> property</summary>
<p></p>

There are a few cases when `localStorage` [isn't available](https://github.com/astoilkov/use-local-storage-state/blob/7db8872397eae8b9d2421f068283286847f326ac/index.ts#L3-L11). The `isPersistent` property tells you if the data is persisted in `localStorage` or in-memory. Useful when you want to notify the user that their data won't be persisted.

```tsx
import React, { useState } from 'react'
import useLocalStorageState from 'use-local-storage-state'

export default function Todos() {
    const [todos, setTodos, { isPersistent }] = useLocalStorageState('todos', {
        defaultValue: ['buy avocado']
    })

    return (
        <>
            {todos.map(todo => (<div>{todo}</div>))}
            {!isPersistent && <span>Changes aren't currently persisted.</span>}
        </>
    )
}

```

</details>

<details>
<summary id="remove-item">Removing the data from <code>localStorage</code> and resetting to the default</summary>
<p></p>

The `removeItem()` method will reset the value to its default and will remove the key from the `localStorage`. It returns to the same state as when the hook was initially created.

```tsx
import useLocalStorageState from 'use-local-storage-state'

export default function Todos() {
    const [todos, setTodos, { removeItem }] = useLocalStorageState('todos', {
        defaultValue: ['buy avocado']
    })

    function onClick() {
        removeItem()
    }
}
```

</details>

## API

### `useLocalStorageState(key, options?)`

Returns `[value, setValue, { removeItem, isPersistent }]` when called. The first two values are the same as `useState()`. The third value contains two extra properties:
- `removeItem()` — calls `localStorage.removeItem(key)` and resets the hook to it's default state
- `isPersistent` — `boolean` property that returns `false` if `localStorage` is throwing an error and the data is stored only in-memory

### `key`

Type: `string`

The key used when calling `localStorage.setItem(key)` and `localStorage.getItem(key)`.

⚠️ Be careful with name conflicts as it is possible to access a property which is already in `localStorage` that was created from another place in the codebase or in an old version of the application.

### `options.defaultValue`

Type: `any`

Default: `undefined`

The default value. You can think of it as the same as `useState(defaultValue)`.

### `options.ssr`

Type: `boolean`

Default: `false`

Enables SSR support and handles hydration mismatches. Not enabling this can cause the following error: `Warning: Expected server HTML to contain a matching ...`. This is the only library I'm aware of that handles this case. For more, see [discussion here](https://github.com/astoilkov/use-local-storage-state/issues/23).

## Alternatives

These are the best alternatives to my repo I have found so far:
- [donavon/use-persisted-state](https://github.com/donavon/use-persisted-state)
- [imbhargav5/rooks](https://github.com/imbhargav5/rooks/blob/master/packages/localstorage-state/README.md)
- [dance2die/react-use-localstorage](https://github.com/dance2die/react-use-localstorage)
