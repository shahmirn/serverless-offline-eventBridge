"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.snsTargetHandler = void 0;
function snsTargetHandler({ targetResource, awsConfig, }) {
    const snsTopicName = targetResource.Properties['TopicName'];
    const arn = `arn:aws:sns:${awsConfig.region}:${awsConfig.accountId}:${snsTopicName}`;
    return { arn };
}
exports.snsTargetHandler = snsTargetHandler;
//# sourceMappingURL=sns-target-handler.js.map