# `use-local-storage-state`

> React hook that persist data in `localStorage`

[![Downloads](https://img.shields.io/npm/dm/use-local-storage-state)](https://www.npmjs.com/package/use-local-storage-state)
[![Gzipped Size](https://img.shields.io/bundlephobia/minzip/use-local-storage-state)](https://bundlephobia.com/result?p=use-local-storage-state)
[![Test Coverage](https://img.shields.io/codeclimate/coverage/astoilkov/use-local-storage-state)](https://codeclimate.com/github/astoilkov/use-local-storage-state/test_coverage)
[![Build Status](https://img.shields.io/github/actions/workflow/status/astoilkov/use-local-storage-state/main.yml?branch=main)](https://github.com/astoilkov/use-local-storage-state/actions/workflows/main.yml)

## Install

React 18 and above:
```bash
npm install use-local-storage-state
```

⚠️ React 17 and below. For docs, go to the [react-17 branch](https://github.com/astoilkov/use-local-storage-state/tree/react-17).
```bash
npm install use-local-storage-state@17
```

## Why

- Actively maintained for the past 3 years — see [contributors](https://github.com/astoilkov/use-local-storage-state/graphs/contributors) page.
- Production ready.
- React 18 concurrent rendering support.
- SSR support.
- Handles the `Window` [`storage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event) event and updates changes across browser tabs, windows, and iframe's. Disable with `storageSync: false`.
- In-memory fallback when `localStorage` throws an error and can't store the data. Provides a `isPersistent` API to let you notify the user their data isn't currently being stored.
- Aiming for high-quality with [my open-source principles](https://astoilkov.com/my-open-source-principles).

## Usage

```typescript
import useLocalStorageState from 'use-local-storage-state'

export default function Todos() {
    const [todos, setTodos] = useLocalStorageState('todos', {
        defaultValue: ['buy avocado', 'do 50 push-ups']
    })
}
```

<details>
<summary>Todo list example + CodeSandbox link</summary>
<p></p>

You can experiment with the example [here](https://codesandbox.io/s/todos-example-use-local-storage-state-tzbfhl?file=/src/App.tsx).

```tsx
import React, { useState } from 'react'
import useLocalStorageState from 'use-local-storage-state'

export default function Todos() {
    const [todos, setTodos] = useLocalStorageState('todos', {
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
<summary id="is-persistent">Notify the user when <code>localStorage</code> isn't saving the data using the <code>isPersistent</code> property</summary>
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

<details>
<summary>Why my component renders twice?</summary>
<p></p>

If you are hydrating your component (for example, if you are using Next.js), your component might re-render twice. This is behavior specific to React and not to this library. It's caused by the `useSyncExternalStore()` hook. There is no workaround. This has been discussed in the issues: https://github.com/astoilkov/use-local-storage-state/issues/56.

If you want to know if you are currently rendering the server value you can use this helper function:
```ts
function useIsServerRender() {
  return useSyncExternalStore(() => {
    return () => {}
  }, () => false, () => true)
}
```

</details>

## API

#### `useLocalStorageState(key: string, options?: LocalStorageOptions)`

Returns `[value, setValue, { removeItem, isPersistent }]` when called. The first two values are the same as `useState()`. The third value contains two extra properties:
- `removeItem()` — calls `localStorage.removeItem(key)` and resets the hook to it's default state
- `isPersistent` — `boolean` property that returns `false` if `localStorage` is throwing an error and the data is stored only in-memory

#### `key`

Type: `string`

The key used when calling `localStorage.setItem(key)` and `localStorage.getItem(key)`.

⚠️ Be careful with name conflicts as it is possible to access a property which is already in `localStorage` that was created from another place in the codebase or in an old version of the application.

#### `options.defaultValue`

Type: `any`

Default: `undefined`

The default value. You can think of it as the same as `useState(defaultValue)`.

#### `options.storageSync`

Type: `boolean`

Default: `true`

Setting to `false` doesn't subscribe to the [Window storage event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event). If you set to `false`, updates won't be synchronized across tabs, windows and iframes.

#### `options.serializer`

Type: `{ stringify, parse }`

Default: `JSON`

JSON does not serialize `Date`, `Regex`, or `BigInt` data.  You can pass in [superjson](https://github.com/blitz-js/superjson) or other `JSON`-compatible serialization library for more advanced serialization.

## Related

- [`use-session-storage-state`](https://github.com/astoilkov/use-session-storage-state) — A clone of this library but for `sessionStorage`.
