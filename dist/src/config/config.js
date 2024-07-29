"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setConfig = void 0;
/* eslint-disable spaced-comment */
const deepmerge_1 = require("deepmerge");
const remove_empty_1 = require("../utils/remove-empty");
/** Default config value and later const to import in project. Mutable! */
const defaultConfig = {
    awsConfig: {
        region: 'us-east-1',
        /**Default localstack accountId */
        accountId: '000000000000',
    },
    localStackConfig: {
        localStackEnabled: false,
        localStackEndpoint: 'http://localhost:4566',
    },
    eventBridgeMockServerConfig: {
        shouldMockEventBridgeServer: true,
        mockServerPort: 4010,
        mockMqttClientHostname: '127.0.0.1',
        mockMqttClientPubSubPort: 4011,
        payloadSizeLimit: '10mb',
        importedEventBuses: {},
    },
    pluginConfigOptions: {
        debug: false,
    },
};
/** Will ignore undefined and keep default at deep level */
const setConfig = (configPart) => {
    const mergedConfig = (0, deepmerge_1.all)([
        defaultConfig,
        (0, remove_empty_1.removeEmpty)(configPart),
    ]);
    return mergedConfig;
};
exports.setConfig = setConfig;
//# sourceMappingURL=config.js.map