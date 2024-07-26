"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEventBridgeRulesTargets = void 0;
const utils_1 = require("../utils");
const create_targets_bus_rules_1 = require("./create-targets-bus-rules");
async function createEventBridgeRulesTargets({ resources, config, eventBridgeClient, logDebug, }) {
    const allBuses = await (0, utils_1.listAllBuses)({
        client: eventBridgeClient,
    });
    const createdTargetsForAllBuses = await Promise.all(allBuses.map(async (bus) => (0, create_targets_bus_rules_1.createBusRulesTargets)({
        resources,
        config,
        eventBridgeClient,
        bus,
        logDebug,
    })));
    return { createdTargetsForAllBuses };
}
exports.createEventBridgeRulesTargets = createEventBridgeRulesTargets;
//# sourceMappingURL=create-eventbridge-rules-targets.js.map