"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBusRules = void 0;
const client_eventbridge_1 = require("@aws-sdk/client-eventbridge");
async function listBusRules({ client, eventBusName, }) {
    const command = new client_eventbridge_1.ListRulesCommand({ EventBusName: eventBusName });
    const allTargets = await client.send(command);
    return allTargets.Rules || [];
}
exports.listBusRules = listBusRules;
//# sourceMappingURL=list-bus-rules.js.map