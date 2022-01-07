import withSsr from './withSsr'
import createLocalStorageStateHook from './createLocalStorageStateHook'

export default function createSsrLocalStorageStateHook(
    ...args: Parameters<typeof createLocalStorageStateHook>
): ReturnType<typeof createLocalStorageStateHook> {
    return withSsr(createLocalStorageStateHook(...args))
}
