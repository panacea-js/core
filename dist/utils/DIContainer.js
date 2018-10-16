"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Bottle = require("bottlejs");
const ServicesBuilder = function () {
    this.services = {};
    this.aliases = {};
};
ServicesBuilder.prototype.add = function (serviceName, location, property, callbackArguments) {
    for (let alias in this.aliases) {
        location = location.replace(alias, this.aliases[alias]);
    }
    this.services[serviceName] = {
        location,
        property,
        callbackArguments
    };
};
ServicesBuilder.prototype.alias = function (alias, location) {
    this.aliases[alias] = location;
};
exports.registerServices = function (params) {
    const defaultsDeep = require('lodash/defaultsDeep');
    const path = require('path');
    const services = new ServicesBuilder();
    const coreServices = path.resolve(__dirname, '../default.services');
    const defaultOptions = require(coreServices).servicesConfig();
    const options = defaultsDeep(params || {}, defaultOptions);
    require(options.services.file).registerServices(services, options);
    const bottle = new Bottle();
    for (let serviceName in services.services) {
        const location = services.services[serviceName].location;
        const property = services.services[serviceName].property;
        const callbackArguments = services.services[serviceName].callbackArguments;
        const provider = function () {
        };
        provider.prototype.$get = function () {
            if (property) {
                if (Array.isArray(callbackArguments)) {
                    return require(location)[property].apply(null, callbackArguments);
                }
                return require(location)[property];
            }
            return require(location);
        };
        bottle.provider(serviceName, provider);
    }
    bottle.value('options', options);
    global[options.services.globalVariable] = bottle;
    return bottle;
};
//# sourceMappingURL=DIContainer.js.map