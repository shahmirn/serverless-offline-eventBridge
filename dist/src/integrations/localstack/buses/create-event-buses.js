"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEventBuses = void 0;
const utils_1 = require("../utils");
const serverless_1 = require("../../../utils/serverless");
function normalizeEventBusName(eventBus) {
    // if busName is actually the arn, normalize it to just the name
    if (eventBus.toLowerCase().startsWith('arn:')) {
        return eventBus.split('/')[1];
    }
    return eventBus;
}
async function createEventBuses({ subscribers, resources, eventBridgeClient, logDebug, }) {
    const eventBusesResources = (0, serverless_1.filterResources)(resources, serverless_1.ServerlessResourceTypes.EVENT_BUS);
    const allExistingBuses = await (0, utils_1.listAllBuses)({
        client: eventBridgeClient,
    });
    const allDefinedBuses = [
        ...subscribers.map((subFunc) => normalizeEventBusName(subFunc.event.eventBus)),
        ...eventBusesResources.map((busResource) => normalizeEventBusName(busResource.resourceDefinition.Properties['Name'])),
    ];
    const notExistingBuses = allDefinedBuses.reduce((accumulator, currBus) => {
        const doesNotExist = !allExistingBuses.some((existingBus) => {
            return allDefinedBuses.some((definedBus) => existingBus.Name === definedBus);
        });
        if (doesNotExist) {
            accumulator.add(currBus);
        }
        return accumulator;
    }, new Set());
    logDebug(`Not existing buses: ${JSON.stringify([...notExistingBuses])}`);
    const createdBuses = await Promise.all([...notExistingBuses].map(async (notExistingBus) => {
        const createdBus = await (0, utils_1.createEventBus)({
            client: eventBridgeClient,
            name: notExistingBus,
        });
        return { createdBusName: notExistingBus, arn: createdBus };
    }));
    return createdBuses;
}
exports.createEventBuses = createEventBuses;
//# sourceMappingURL=create-event-buses.js.map