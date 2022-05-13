import nullValue from './nullValue'

/**
 * A wrapper for `JSON.parse()` which supports the return value of `JSON.stringify(undefined)`
 * which returns the string `"undefined"` and this method returns the value `undefined`.
 */
export default function parseJSON<T>(value: string | null): T | undefined {
    return value === 'undefined'
        ? undefined
        : value === 'null'
        ? nullValue
        : value === null
        ? null
        : JSON.parse(value)
}
