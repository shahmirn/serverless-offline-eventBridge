"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAllBuses = void 0;
const client_eventbridge_1 = require("@aws-sdk/client-eventbridge");
async function listAllBuses({ client }) {
    const command = new client_eventbridge_1.ListEventBusesCommand({});
    const allBridges = await client.send(command);
    return allBridges.EventBuses || [];
}
exports.listAllBuses = listAllBuses;
//# sourceMappingURL=list-all-buses.js.map