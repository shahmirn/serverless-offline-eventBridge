"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const net_1 = require("net");
const Aedes = require("aedes");
const cors = require("cors");
const mqtt = require("mqtt");
const cron = require("node-cron");
const jsonpath = require("jsonpath");
const config_1 = require("./config/config");
const localstack_1 = require("./integrations/localstack");
const serverless_1 = require("./utils/serverless");
class ServerlessOfflineAwsEventBridgePlugin {
    constructor(serverless, options, logging) {
        this.serverless = serverless;
        this.options = options;
        this.logging = logging;
        this.eventBuses = {};
        this.subscribers = [];
        this.scheduledEvents = [];
        this.logDebug = this.logDebug.bind(this);
        this.logNotice = this.logNotice.bind(this);
        this.hooks = {
            'before:offline:start': () => this.start(),
            'before:offline:start:init': () => this.start(),
            'after:offline:start:end': () => this.stop(),
        };
    }
    async start() {
        var _a, _b, _c;
        this.logDebug('start');
        await this.init();
        if (!((_a = this.config) === null || _a === void 0 ? void 0 : _a.localStackConfig.localStackEnabled) &&
            ((_b = this.config) === null || _b === void 0 ? void 0 : _b.eventBridgeMockServerConfig.shouldMockEventBridgeServer)) {
            if (!this.app) {
                throw new Error('Express app not running');
            }
            // Start Express Server
            this.eventBridgeServer = this.app.listen((_c = this.config) === null || _c === void 0 ? void 0 : _c.eventBridgeMockServerConfig.mockServerPort, () => {
                var _a;
                this.logNotice(`Mock server running at port: ${(_a = this.config) === null || _a === void 0 ? void 0 : _a.eventBridgeMockServerConfig.mockServerPort}`);
            });
        }
    }
    async stop() {
        this.init();
        this.logDebug('stop');
        if (this.eventBridgeServer) {
            this.eventBridgeServer.close();
        }
        if (this.lambda) {
            await this.lambda.cleanup();
        }
    }
    async init() {
        var _a, _b, _c;
        const pluginOptions = this.setupPluginOptions();
        const pluginConfig = this.serverless.service.custom['serverless-offline-aws-eventbridge'] ||
            {};
        this.config = (0, config_1.setConfig)({
            awsConfig: {
                region: this.serverless.service.provider.region,
                accountId: pluginConfig === null || pluginConfig === void 0 ? void 0 : pluginConfig.account,
            },
            localStackConfig: {
                localStackEnabled: !!pluginConfig.localStackConfig,
                localStackEndpoint: (_a = pluginConfig.localStackConfig) === null || _a === void 0 ? void 0 : _a.localStackEndpoint,
            },
            eventBridgeMockServerConfig: {
                shouldMockEventBridgeServer: pluginConfig.mockEventBridgeServer,
                mockServerPort: pluginConfig === null || pluginConfig === void 0 ? void 0 : pluginConfig.port,
                mockMqttClientHostname: pluginConfig.hostname,
                mockMqttClientPubSubPort: pluginConfig.pubSubPort,
                payloadSizeLimit: pluginConfig.payloadSizeLimit,
                importedEventBuses: pluginConfig['imported-event-buses'],
            },
            pluginConfigOptions: pluginConfig,
            pluginOptions,
        });
        const { subscribers, lambdas, scheduledEvents } = this.getEvents();
        this.subscribers = subscribers;
        this.scheduledEvents = scheduledEvents;
        this.eventBuses = this.extractCustomBuses();
        if ((_b = this.config) === null || _b === void 0 ? void 0 : _b.localStackConfig.localStackEnabled) {
            this.logNotice(`Localstack config active`);
            await this.setupLocalStack();
        }
        if (!((_c = this.config) === null || _c === void 0 ? void 0 : _c.localStackConfig.localStackEnabled)) {
            this.setupMqBroker();
            this.setupMqClient();
            this.setupScheduledEvents();
            await this.createLambdas(lambdas);
            this.setupExpressApp();
        }
        this.logNotice('Plugin ready');
    }
    setupMqBroker() {
        var _a, _b;
        // If the stack receives EventBridge events, start the MQ broker as well
        if ((_a = this.config) === null || _a === void 0 ? void 0 : _a.eventBridgeMockServerConfig.shouldMockEventBridgeServer) {
            this.mqServer = (0, net_1.createServer)(Aedes().handle);
            this.mqServer.listen((_b = this.config) === null || _b === void 0 ? void 0 : _b.eventBridgeMockServerConfig.mockMqttClientPubSubPort, () => {
                var _a;
                this.logDebug(`MQTT Broker started and listening on port ${(_a = this.config) === null || _a === void 0 ? void 0 : _a.eventBridgeMockServerConfig.mockMqttClientPubSubPort}`);
            });
        }
    }
    setupMqClient() {
        var _a, _b;
        // Connect to the MQ server for any lambdas listening to EventBridge events
        this.mqClient = mqtt.connect(`mqtt://${(_a = this.config) === null || _a === void 0 ? void 0 : _a.eventBridgeMockServerConfig.mockMqttClientHostname}:${(_b = this.config) === null || _b === void 0 ? void 0 : _b.eventBridgeMockServerConfig.mockMqttClientPubSubPort}`);
        this.mqClient.on('connect', () => {
            if (!this.mqClient) {
                throw new Error('this.mqClient not present');
            }
            this.mqClient.subscribe('eventBridge', (_err, granted) => {
                var _a, _b;
                // if the client is already subscribed, granted will be an empty array.
                // This prevents duplicate message processing when the client reconnects
                if (!granted || granted.length === 0)
                    return;
                this.logDebug(`MQTT broker connected and listening on mqtt://${(_a = this.config) === null || _a === void 0 ? void 0 : _a.eventBridgeMockServerConfig.mockMqttClientHostname}:${(_b = this.config) === null || _b === void 0 ? void 0 : _b.eventBridgeMockServerConfig.mockMqttClientPubSubPort}`);
                if (!this.mqClient) {
                    throw new Error('No this.mqClient');
                }
                this.mqClient.on('message', async (_topic, message) => {
                    const entries = JSON.parse(message.toString());
                    const invokedLambdas = this.invokeSubscribers(entries);
                    if (invokedLambdas.length) {
                        await Promise.all(invokedLambdas);
                    }
                });
            });
        });
    }
    setupPluginOptions() {
        const { service: { custom = {}, provider }, } = this.serverless;
        const offlineOptions = custom['serverless-offline'];
        const offlineEventBridgeOptions = custom['serverless-offline-aws-eventbridge'];
        this.options = {
            ...this.options,
            ...provider,
            ...offlineOptions,
            ...offlineEventBridgeOptions,
        };
        if (typeof this.options.maximumRetryAttempts === 'undefined') {
            this.options.maximumRetryAttempts = 10;
        }
        if (typeof this.options.retryDelayMs === 'undefined') {
            this.options.retryDelayMs = 500;
        }
        if (typeof this.options.throwRetryExhausted === 'undefined') {
            this.options.throwRetryExhausted = true;
        }
        return this.options;
    }
    setupExpressApp() {
        var _a, _b;
        // initialise the express app
        this.app = express();
        this.app.use(cors());
        this.app.use(express.json({
            type: 'application/x-amz-json-1.1',
            limit: (_a = this.config) === null || _a === void 0 ? void 0 : _a.eventBridgeMockServerConfig.payloadSizeLimit,
        }));
        this.app.use(express.urlencoded({
            extended: true,
            limit: (_b = this.config) === null || _b === void 0 ? void 0 : _b.eventBridgeMockServerConfig.payloadSizeLimit,
        }));
        this.app.use((_req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Content-Length, ETag, X-CSRF-Token, Content-Disposition');
            res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, HEAD, OPTIONS');
            next();
        });
        this.app.all('*', async (req, res) => {
            if (this.mqClient) {
                this.mqClient.publish('eventBridge', JSON.stringify(req.body.Entries));
            }
            res.json(this.generateEventBridgeResponse(req.body.Entries));
            res.status(200).send();
        });
    }
    setupScheduledEvents() {
        // loop the scheduled events and create a cron for them
        this.scheduledEvents.forEach((scheduledEvent) => {
            cron.schedule(scheduledEvent.schedule, async () => {
                var _a;
                this.logDebug(`run scheduled function ${scheduledEvent.functionKey}`);
                this.invokeSubscriber(scheduledEvent.functionKey, {
                    Source: `Scheduled function ${scheduledEvent.functionKey}`,
                    Resources: [],
                    Detail: `{ "name": "Scheduled function ${scheduledEvent.functionKey}"}`,
                }, (_a = scheduledEvent.event) === null || _a === void 0 ? void 0 : _a.input);
            });
        });
    }
    async setupLocalStack() {
        const { service: { resources: { Resources } = {} }, } = this.serverless;
        await (0, localstack_1.createEventBridgeResources)({
            resources: Resources,
            config: this.config,
            subscribers: this.subscribers,
            logDebug: this.logDebug,
            logNotice: this.logNotice,
        });
    }
    /**
     * Returns an EventBridge response as defined in the official documentation:
     * https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_PutEvents.html
     */
    // eslint-disable-next-line class-methods-use-this
    generateEventBridgeResponse(entries) {
        return {
            Entries: entries.map(() => {
                return {
                    EventId: `xxxxxxxx-xxxx-xxxx-xxxx-${new Date().getTime()}`,
                };
            }),
            FailedEntryCount: 0,
        };
    }
    extractCustomBuses() {
        const { service: { resources: { Resources } = {} }, } = this.serverless;
        const eventBuses = {};
        // eslint-disable-next-line no-restricted-syntax
        for (const key in Resources) {
            if (Object.prototype.hasOwnProperty.call(Resources, key) &&
                Resources[key].Type === serverless_1.ServerlessResourceTypes.EVENT_BUS) {
                eventBuses[key] = Resources[key].Properties.Name;
            }
        }
        return eventBuses;
    }
    invokeSubscribers(entries) {
        if (!entries)
            return [];
        this.logDebug('checking event subscribers');
        const invoked = [];
        // eslint-disable-next-line no-restricted-syntax
        for (const entry of entries) {
            // eslint-disable-next-line no-restricted-syntax
            for (const { functionKey, event: { input } = { input: undefined }, } of this.subscribers.filter((subscriber) => this.verifyIsSubscribed(subscriber, entry))) {
                invoked.push(this.invokeSubscriber(functionKey, entry, input));
            }
        }
        return invoked;
    }
    async invokeSubscriber(functionKey, entry, input, retry = 0) {
        const { retryDelayMs, maximumRetryAttempts: maxRetries, throwRetryExhausted, } = this.options;
        if (!this.lambda) {
            throw new Error('Lambda not present');
        }
        const lambdaFunction = this.lambda.get(functionKey);
        const event = this.convertEntryAndInputToEvent(entry, input);
        lambdaFunction.setEvent(event);
        try {
            await lambdaFunction.runHandler();
            this.logDebug(`${functionKey} successfully processed event with id ${event.id}`);
        }
        catch (err) {
            if (retry < maxRetries) {
                this.logDebug(`error: ${err.message || err} occurred in ${functionKey} on ${retry}/${maxRetries}, will retry`);
                await new Promise((resolve) => {
                    setTimeout(resolve, retryDelayMs);
                });
                await this.invokeSubscriber(functionKey, entry, input, retry + 1);
                return;
            }
            this.logDebug(`error: ${err.message || err} occurred in ${functionKey} on attempt ${retry}, max attempts reached`);
            if (throwRetryExhausted) {
                throw err;
            }
        }
    }
    async createLambdas(lambdas) {
        // https://github.com/import-js/eslint-plugin-import/issues/2495
        // eslint-disable-next-line import/no-unresolved, prettier/prettier
        const { default: Lambda } = await import("serverless-offline/lambda");
        this.lambda = new Lambda(this.serverless, this.options);
        this.lambda.create(lambdas);
    }
    verifyIsSubscribed(subscriber, entry) {
        const subscribedChecks = [];
        if (subscriber.event.eventBus && entry.EventBusName) {
            subscribedChecks.push(this.compareEventBusName(subscriber.event.eventBus, entry.EventBusName));
        }
        if (subscriber.event.pattern) {
            if (subscriber.event.pattern.source) {
                subscribedChecks.push(this.verifyIfValueMatchesEventBridgePatterns(entry, 'Source', subscriber.event.pattern.source));
            }
            if (entry.DetailType && subscriber.event.pattern['detail-type']) {
                subscribedChecks.push(this.verifyIfValueMatchesEventBridgePatterns(entry, 'DetailType', subscriber.event.pattern['detail-type']));
            }
            if (entry.Detail && subscriber.event.pattern.detail) {
                const detail = JSON.parse(entry.Detail);
                const flattenedPatternDetailObject = this.flattenObject(subscriber.event.pattern.detail);
                if ('$or' in flattenedPatternDetailObject) {
                    // check for existence of any value in the pattern in the provided value
                    subscribedChecks.push(flattenedPatternDetailObject['$or'].some((pattern) => {
                        const flattenedPatternDetailObjectOr = this.flattenObject(pattern);
                        return Object.entries(flattenedPatternDetailObjectOr).every(([key, value]) => this.verifyIfValueMatchesEventBridgePatterns(detail, key, value));
                    }));
                }
                else {
                    // check for existence of every value in the pattern in the provided value
                    // eslint-disable-next-line no-restricted-syntax
                    for (const [key, value] of Object.entries(flattenedPatternDetailObject)) {
                        subscribedChecks.push(this.verifyIfValueMatchesEventBridgePatterns(detail, key, value));
                    }
                }
            }
        }
        const subscribed = subscribedChecks.every((x) => x);
        this.logDebug(`${subscriber.functionKey} ${subscribed ? 'is' : 'is not'} subscribed`);
        return subscribed;
    }
    verifyIfValueMatchesEventBridgePatterns(object, field, patterns) {
        if (!object) {
            return false;
        }
        let matchPatterns = patterns;
        if (!Array.isArray(matchPatterns)) {
            matchPatterns = [matchPatterns];
        }
        // eslint-disable-next-line no-restricted-syntax
        for (const pattern of matchPatterns) {
            if (this.verifyIfValueMatchesEventBridgePattern(object, field, pattern)) {
                return true; // Return true as soon as a pattern matches the content
            }
        }
        return false;
    }
    /**
     * Implementation of content-based filtering specific to Eventbridge event patterns
     * https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns-content-based-filtering.html
     */
    verifyIfValueMatchesEventBridgePattern(object, field, pattern) {
        const splitField = field.split('.');
        const requiredJsonPathString = splitField.reduce((accumulator, currentField) => {
            const objectPath = `${accumulator}.${currentField}`;
            const arrayPath = `${objectPath}[:]`;
            return jsonpath.query(object, arrayPath, 1).length > 0
                ? arrayPath
                : objectPath;
        }, '$');
        // evaluatedValues will ALWAYS be an array, since it's the result of a jsonpath query.
        const evaluatedValues = jsonpath.query(object, requiredJsonPathString);
        this.logDebug(`Evaluating ${requiredJsonPathString}`);
        // Simple scalar comparison
        if (typeof pattern !== 'object') {
            return evaluatedValues.includes(pattern);
        }
        // "exists" filters
        if ('exists' in pattern) {
            return pattern.exists
                ? evaluatedValues.length > 0
                : evaluatedValues.length === 0;
        }
        if ('anything-but' in pattern) {
            const evaluatePattern = Array.isArray(pattern['anything-but'])
                ? pattern['anything-but']
                : [pattern['anything-but']];
            return !evaluatePattern.includes(evaluatedValues);
        }
        const filterType = Object.keys(pattern)[0];
        if (filterType === 'prefix') {
            return evaluatedValues.some((value) => value.startsWith(pattern.prefix));
        }
        if (filterType === 'equals-ignore-case') {
            return evaluatedValues.some((value) => value.toLowerCase() === pattern['equals-ignore-case'].toLowerCase());
        }
        if ('numeric' in pattern) {
            // partition an array to be like [[">", 5], ["=",30]]
            const chunk = (arr = [], num = 2) => {
                if (arr.length === 0)
                    return arr;
                return Array(arr.splice(0, num)).concat(chunk(arr, num));
            };
            // persist pattern for preventing to mutate an array.
            const origin = [...pattern.numeric];
            const operationGroups = chunk(origin, 2);
            return evaluatedValues.some((value) => 
            // Expected all event pattern should be true
            operationGroups.every((arr) => {
                const lvalue = parseFloat(value);
                const rvalue = parseFloat(arr[arr.length - 1]);
                const operator = arr[0];
                return {
                    '>': lvalue > rvalue,
                    '<': lvalue < rvalue,
                    '>=': lvalue >= rvalue,
                    '<=': lvalue <= rvalue,
                    '=': lvalue === rvalue,
                }[operator];
            }));
        }
        // "cidr" filters and the recurring logic are yet supported by this plugin.
        throw new Error(`The ${filterType} eventBridge filter is not supported in serverless-offline-aws-eventBridge yet. ` +
            `Please consider submitting a PR to support it.`);
    }
    compareEventBusName(eventBus, eventBusName) {
        var _a, _b;
        if (typeof eventBus === 'string') {
            return eventBus.includes(eventBusName);
        }
        if (Object.prototype.hasOwnProperty.call(eventBus, 'Ref') ||
            Object.prototype.hasOwnProperty.call(eventBus, 'Fn::Ref') ||
            Object.prototype.hasOwnProperty.call(eventBus, 'Fn::GetAtt')) {
            const resourceName = eventBus.Ref || eventBus['Fn::Ref'] || eventBus['Fn::GetAtt'][0];
            if (this.eventBuses[resourceName]) {
                return (this.eventBuses[resourceName] &&
                    this.eventBuses[resourceName].includes(eventBusName));
            }
        }
        if (Object.prototype.hasOwnProperty.call(eventBus, 'Fn::ImportValue')) {
            const importedResourceName = eventBus['Fn::ImportValue'];
            return (((_a = this.config) === null || _a === void 0 ? void 0 : _a.eventBridgeMockServerConfig.importedEventBuses[importedResourceName]) &&
                ((_b = this.config) === null || _b === void 0 ? void 0 : _b.eventBridgeMockServerConfig.importedEventBuses[importedResourceName].includes(eventBusName)));
        }
        return false;
    }
    getEvents() {
        const { service } = this.serverless;
        const functionKeys = service.getAllFunctions();
        const subscribers = [];
        const scheduledEvents = [];
        const lambdas = [];
        // eslint-disable-next-line no-restricted-syntax
        for (const functionKey of functionKeys) {
            const functionDefinition = service.getFunction(functionKey);
            lambdas.push({ functionKey, functionDefinition });
            if (functionDefinition.events) {
                // eslint-disable-next-line no-restricted-syntax
                for (const event of functionDefinition.events) {
                    if (event.eventBridge) {
                        if (typeof event.eventBridge.enabled === 'undefined' ||
                            event.eventBridge.enabled === true) {
                            if (!event.eventBridge.schedule) {
                                subscribers.push({
                                    event: event.eventBridge,
                                    functionKey,
                                });
                            }
                            else {
                                let convertedSchedule;
                                if (event.eventBridge.schedule.indexOf('rate') > -1) {
                                    const rate = event.eventBridge.schedule
                                        .replace('rate(', '')
                                        .replace(')', '');
                                    const parts = rate.split(' ');
                                    if (parts[1]) {
                                        if (parts[1].startsWith('minute')) {
                                            convertedSchedule = `*/${parts[0]} * * * *`;
                                        }
                                        else if (parts[1].startsWith('hour')) {
                                            convertedSchedule = `0 */${parts[0]} * * *`;
                                        }
                                        else if (parts[1].startsWith('day')) {
                                            convertedSchedule = `0 0 */${parts[0]} * *`;
                                        }
                                        else {
                                            this.logDebug(`Invalid·schedule·rate·syntax·'${rate}',·will·not·schedule`);
                                        }
                                    }
                                }
                                else {
                                    // get the cron job syntax right: cron(0 5 * * ? *)
                                    //
                                    //      min     hours       dayOfMonth  Month       DayOfWeek   Year        (AWS)
                                    // sec  min     hour        dayOfMonth  Month       DayOfWeek               (node-cron)
                                    // seconds is optional so we don't use it with node-cron
                                    convertedSchedule = `${event.eventBridge.schedule.substring(5, event.eventBridge.schedule.length - 3)}`;
                                    // replace ? by * for node-cron
                                    convertedSchedule = convertedSchedule.split('?').join('*');
                                    // replace 0/x by */x for node-cron
                                    convertedSchedule = convertedSchedule.replaceAll(/0\//gi, '*/');
                                }
                                if (convertedSchedule) {
                                    scheduledEvents.push({
                                        schedule: convertedSchedule,
                                        event: event.eventBridge,
                                        functionKey,
                                    });
                                    this.logDebug(`Scheduled '${functionKey}' with syntax ${convertedSchedule}`);
                                }
                                else {
                                    this.logDebug(`Invalid schedule syntax '${event.eventBridge.schedule}', will not schedule`);
                                }
                            }
                        }
                    }
                }
            }
        }
        return {
            subscribers,
            scheduledEvents,
            lambdas,
        };
    }
    convertEntryAndInputToEvent(entry, input) {
        var _a, _b;
        try {
            const event = {
                ...(input || {}),
                version: '0',
                id: `xxxxxxxx-xxxx-xxxx-xxxx-${new Date().getTime()}`,
                source: entry.Source,
                account: (_a = this.config) === null || _a === void 0 ? void 0 : _a.awsConfig.accountId,
                time: new Date().toISOString(),
                region: (_b = this.config) === null || _b === void 0 ? void 0 : _b.awsConfig.region,
                resources: entry.Resources || [],
                detail: JSON.parse(entry.Detail),
            };
            if (entry.DetailType) {
                event['detail-type'] = entry.DetailType;
            }
            return event;
        }
        catch (error) {
            this.logDebug(`error converting entry to event: ${error.message}. returning entry instead`);
            return {
                ...entry,
                id: `xxxxxxxx-xxxx-xxxx-xxxx-${new Date().getTime()}`,
            };
        }
    }
    flattenObject(object, prefix = '') {
        return Object.entries(object).reduce((accumulator, [key, value]) => value &&
            value instanceof Object &&
            !(value instanceof Date) &&
            !Array.isArray(value)
            ? {
                ...accumulator,
                ...this.flattenObject(value, (prefix && `${prefix}.`) + key),
            }
            : { ...accumulator, [(prefix && `${prefix}.`) + key]: value }, {});
    }
    logDebug(message) {
        var _a, _b;
        if ((_b = (_a = this.config) === null || _a === void 0 ? void 0 : _a.pluginConfigOptions) === null || _b === void 0 ? void 0 : _b.debug) {
            this.logging.log.notice(`serverless-offline-aws-eventbridge [DEBUG] :: ${message}`);
        }
    }
    logNotice(message) {
        this.logging.log.notice(`serverless-offline-aws-eventbridge :: ${message}`);
    }
}
module.exports = ServerlessOfflineAwsEventBridgePlugin;
//# sourceMappingURL=index.js.map