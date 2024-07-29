"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEventBus = void 0;
const client_eventbridge_1 = require("@aws-sdk/client-eventbridge");
async function createEventBus({ client, name }) {
    const command = new client_eventbridge_1.CreateEventBusCommand({
        Name: name,
    });
    const createdBus = await client.send(command);
    return createdBus.EventBusArn;
}
exports.createEventBus = createEventBus;
//# sourceMappingURL=create-event-bus.js.map