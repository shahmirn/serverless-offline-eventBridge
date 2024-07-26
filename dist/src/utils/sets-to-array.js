"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setsToArrays = void 0;
function setsToArrays(data) {
    const entries = Object.entries(data).filter(([, value]) => value != null);
    const clean = entries.map(([key, v]) => {
        const value = v instanceof Set ? [...v] : v;
        return [key, value];
    });
    return Object.fromEntries(clean);
}
exports.setsToArrays = setsToArrays;
//# sourceMappingURL=sets-to-array.js.map