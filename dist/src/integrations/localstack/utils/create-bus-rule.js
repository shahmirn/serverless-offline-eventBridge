"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEventBusRule = void 0;
const client_eventbridge_1 = require("@aws-sdk/client-eventbridge");
async function createEventBusRule({ client, ruleProperties, }) {
    const command = new client_eventbridge_1.PutRuleCommand({
        Name: ruleProperties.Name,
        Description: ruleProperties.Description,
        EventBusName: ruleProperties.EventBusName,
        EventPattern: JSON.stringify(ruleProperties.EventPattern),
        ScheduleExpression: ruleProperties.ScheduleExpression,
    });
    const createdBus = await client.send(command);
    return createdBus.RuleArn;
}
exports.createEventBusRule = createEventBusRule;
//# sourceMappingURL=create-bus-rule.js.map