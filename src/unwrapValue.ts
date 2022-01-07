export default function unwrapValue<T>(value: T | (() => T)): T {
    const isCallable = (value: unknown): value is () => T => typeof value === 'function'
    return isCallable(value) ? value() : value
}
