"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterResources = void 0;
function filterResources(resources, resourceType) {
    const filteredResources = Object.entries(resources).reduce((accumulator, entry) => {
        const [resKey, resValue] = entry;
        const isCorrectType = resValue.Type === resourceType;
        if (isCorrectType) {
            accumulator.push({ resourceName: resKey, resourceDefinition: resValue });
        }
        return accumulator;
    }, []);
    return filteredResources;
}
exports.filterResources = filterResources;
//# sourceMappingURL=filter-resources.js.map