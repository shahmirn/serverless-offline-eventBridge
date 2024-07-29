"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeEmpty = void 0;
/** https://reacthustle.com/blog/javascript-remove-null-or-undefined-from-an-object */
function removeEmpty(data) {
    // transform properties into key-values pairs and filter all the empty-values
    const entries = Object.entries(data).filter(([, value]) => value != null);
    // map through all the remaining properties and check if the value is an object.
    // if value is object, use recursion to remove empty properties
    const clean = entries.map(([key, v]) => {
        const value = typeof v === 'object' ? removeEmpty(v) : v;
        return [key, value];
    });
    // transform the key-value pairs back to an object.
    return Object.fromEntries(clean);
}
exports.removeEmpty = removeEmpty;
//# sourceMappingURL=remove-empty.js.map