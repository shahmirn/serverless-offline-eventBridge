"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTargets = void 0;
const serverless_1 = require("../../../utils/serverless");
const utils_1 = require("../utils");
const sns_target_handler_1 = require("./target-handlers/sns-target-handler");
async function createTargets({ resources, config, eventBridgeClient, rule, bus, logDebug, }) {
    var _a;
    const eventBridgeMaxTargets = 5;
    const eventRulesResources = (0, serverless_1.filterResources)(resources, serverless_1.ServerlessResourceTypes.EVENTS_RULE);
    const existingTargetsForRule = await (0, utils_1.listRuleTargets)({
        client: eventBridgeClient,
        ruleName: rule.Name,
    });
    const definedRuleTargets = ((_a = eventRulesResources.find((ruleResource) => rule.Name === ruleResource.resourceDefinition.Properties['Name'])) === null || _a === void 0 ? void 0 : _a.resourceDefinition.Properties['Targets']) ||
        [];
    const notExistingTargets = definedRuleTargets.reduce((accumulator, targetResource) => {
        const targetId = targetResource.Id;
        const doesNotExist = !existingTargetsForRule.some((existingTarget) => existingTarget.Id === targetId);
        if (doesNotExist) {
            accumulator.add(targetResource);
        }
        return accumulator;
    }, new Set());
    logDebug(`Not existing targets: ${JSON.stringify([...notExistingTargets])}`);
    if (notExistingTargets.size > 0 &&
        existingTargetsForRule.length >= eventBridgeMaxTargets) {
        throw new Error(`Max targets for rule: ${bus.Name} reached. Can not create new targets. Max targets: ${eventBridgeMaxTargets}`);
    }
    const ruleTargets = [...notExistingTargets].map((resourceTarget) => {
        let Arn;
        const targetResource = resources[resourceTarget.Arn.Ref];
        switch (targetResource.Type) {
            case serverless_1.ServerlessResourceTypes.SNS_TOPIC: {
                Arn = (0, sns_target_handler_1.snsTargetHandler)({
                    targetResource,
                    awsConfig: config === null || config === void 0 ? void 0 : config.awsConfig,
                }).arn;
                break;
            }
            default: {
                throw new Error(`Resource type ${targetResource.Type} not implemented.`);
            }
        }
        const result = { Id: resourceTarget.Id, Arn };
        return result;
    });
    await (0, utils_1.createRuleTargets)({
        client: eventBridgeClient,
        ruleName: rule.Name,
        targets: ruleTargets,
    });
    return { ruleName: rule.Name, createdTargets: ruleTargets };
}
exports.createTargets = createTargets;
//# sourceMappingURL=create-targets.js.map