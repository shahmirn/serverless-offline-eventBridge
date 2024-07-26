"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRuleTargets = void 0;
const client_eventbridge_1 = require("@aws-sdk/client-eventbridge");
async function createRuleTargets({ client, ruleName, eventBusName, targets, }) {
    const command = new client_eventbridge_1.PutTargetsCommand({
        Rule: ruleName,
        EventBusName: eventBusName,
        Targets: targets,
    });
    const createdTargets = await client.send(command);
    if (createdTargets.FailedEntryCount) {
        throw new Error(`Failed to create targets. Amount ${createdTargets.FailedEntryCount}`);
    }
    return createdTargets;
}
exports.createRuleTargets = createRuleTargets;
//# sourceMappingURL=create-rule-target.js.map