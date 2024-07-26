"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEventBridgeRules = void 0;
const utils_1 = require("../utils");
const serverless_1 = require("../../../utils/serverless");
async function createEventBridgeRules({ resources, eventBridgeClient, logDebug, }) {
    const allBuses = await (0, utils_1.listAllBuses)({
        client: eventBridgeClient,
    });
    const allCreatedRulesForBuses = await Promise.all(allBuses.map(async (bus) => {
        const eventBridgeMaxRules = 300;
        const eventRulesResources = (0, serverless_1.filterResources)(resources, serverless_1.ServerlessResourceTypes.EVENTS_RULE);
        const existingRules = await (0, utils_1.listBusRules)({
            client: eventBridgeClient,
            eventBusName: bus.Name,
        });
        const notExistingRules = eventRulesResources.reduce((accumulator, ruleResource) => {
            const ruleProperties = ruleResource.resourceDefinition
                .Properties;
            const doesNotExist = !existingRules.some((existingRule) => existingRule.Name === ruleProperties.Name);
            const isBusMatch = (!ruleProperties.EventBusName && bus.Name === 'default') ||
                (ruleProperties.EventBusName &&
                    (ruleProperties.EventBusName === bus.Name ||
                        ruleProperties.EventBusName === bus.Arn));
            if (doesNotExist && isBusMatch) {
                accumulator.add(ruleProperties);
            }
            return accumulator;
        }, new Set());
        logDebug(`Not existing rules: ${JSON.stringify([...notExistingRules])}`);
        if (notExistingRules.size > 0 &&
            existingRules.length >= eventBridgeMaxRules) {
            throw new Error(`Max rules for bus: ${bus.Name} reached. Can not create new rules. Max rules: ${eventBridgeMaxRules}`);
        }
        const allCreatedRules = await Promise.all([...notExistingRules].map(async (notExistingRule) => {
            return (0, utils_1.createEventBusRule)({
                client: eventBridgeClient,
                ruleProperties: notExistingRule,
            });
        }));
        return { busName: bus.Name, allCreatedRules };
    }));
    return allCreatedRulesForBuses;
}
exports.createEventBridgeRules = createEventBridgeRules;
//# sourceMappingURL=create-eventbridge-rules.js.map