"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBusRulesTargets = void 0;
const utils_1 = require("../utils");
const create_targets_1 = require("./create-targets");
async function createBusRulesTargets({ resources, config, eventBridgeClient, bus, logDebug, }) {
    const allBusRules = await (0, utils_1.listBusRules)({
        eventBusName: bus.Name,
        client: eventBridgeClient,
    });
    const createdTargetsForRules = await Promise.all(allBusRules.map(async (rule) => (0, create_targets_1.createTargets)({
        resources,
        config,
        eventBridgeClient,
        bus,
        rule,
        logDebug,
    })));
    return { busName: bus.Name, createdTargetsForRules };
}
exports.createBusRulesTargets = createBusRulesTargets;
//# sourceMappingURL=create-targets-bus-rules.js.map