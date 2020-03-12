"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
function useLocalStorageState(key, defaultValue) {
    const globalKey = `use-local-storage-state.${key}`;
    const [value, setValue] = react_1.useState(() => {
        const storageValue = localStorage.getItem(globalKey);
        return storageValue === null ? defaultValue : JSON.parse(storageValue);
    });
    const updateValue = (newValue) => {
        setValue(value => {
            const isCallable = (value) => typeof value === 'function';
            const result = isCallable(newValue) ? newValue(value) : newValue;
            localStorage.setItem(globalKey, JSON.stringify(result));
            return result;
        });
    };
    react_1.useLayoutEffect(() => {
        const onStorage = (e) => {
            if (e.storageArea === localStorage && e.key === globalKey) {
                setValue(e.newValue === null ? defaultValue : JSON.parse(e.newValue));
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    });
    return [value, updateValue];
}
exports.default = useLocalStorageState;
