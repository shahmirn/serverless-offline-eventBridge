"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEventBridgeResources = void 0;
const client_eventbridge_1 = require("@aws-sdk/client-eventbridge");
const create_eventbridge_rules_1 = require("./rules/create-eventbridge-rules");
const create_event_buses_1 = require("./buses/create-event-buses");
const create_eventbridge_rules_targets_1 = require("./targets/create-eventbridge-rules-targets");
const sets_to_array_1 = require("../../utils/sets-to-array");
async function createEventBridgeResources({ resources, config, subscribers, logDebug, logNotice, }) {
    const eventBridgeClient = new client_eventbridge_1.EventBridgeClient({
        endpoint: config === null || config === void 0 ? void 0 : config.localStackConfig.localStackEndpoint,
        region: config === null || config === void 0 ? void 0 : config.awsConfig.region,
    });
    await (0, create_event_buses_1.createEventBuses)({
        eventBridgeClient,
        subscribers,
        resources,
        logDebug,
    });
    await (0, create_eventbridge_rules_1.createEventBridgeRules)({
        resources,
        eventBridgeClient,
        logDebug,
    });
    const createdTargetsForAllBuses = await (0, create_eventbridge_rules_targets_1.createEventBridgeRulesTargets)({
        resources,
        config,
        eventBridgeClient,
        logDebug,
    });
    logDebug(`All created targets: ${JSON.stringify((0, sets_to_array_1.setsToArrays)(createdTargetsForAllBuses))}`);
    logNotice('Resources created in localstack');
}
exports.createEventBridgeResources = createEventBridgeResources;
//# sourceMappingURL=create-eventbridge-resources.js.map