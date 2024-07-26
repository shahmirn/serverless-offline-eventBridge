"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRuleTargets = void 0;
const client_eventbridge_1 = require("@aws-sdk/client-eventbridge");
async function listRuleTargets({ client, ruleName, eventBusName, }) {
    const command = new client_eventbridge_1.ListTargetsByRuleCommand({
        Rule: ruleName,
        EventBusName: eventBusName,
    });
    const allTargets = await client.send(command);
    return allTargets.Targets || [];
}
exports.listRuleTargets = listRuleTargets;
//# sourceMappingURL=list-rule-targets.js.map