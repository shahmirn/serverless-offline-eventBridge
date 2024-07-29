"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lambdaTargetHandler = void 0;
function lambdaTargetHandler({ targetFunction, awsConfig, }) {
    const functionName = targetFunction.name;
    const arn = `arn:aws:sns:${awsConfig.region}:${awsConfig.accountId}:${functionName}`;
    return { arn };
}
exports.lambdaTargetHandler = lambdaTargetHandler;
//# sourceMappingURL=lambda-target-handler.js.map