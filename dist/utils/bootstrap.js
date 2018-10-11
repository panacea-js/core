"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs-extra");
const Bootstrap = function (panaceaConfigFile = '') {
    if (!panaceaConfigFile) {
        panaceaConfigFile = path.resolve(process.cwd(), 'panacea.js');
    }
    panaceaConfigFile = path.resolve(panaceaConfigFile);
    if (!fs.existsSync(panaceaConfigFile)) {
        throw Error(`Could not load panacea.js config file at ${panaceaConfigFile}`); // Cannot translate as Panacea container isn't available for i18n.
    }
    this.params = require(panaceaConfigFile).default();
    this.defaultCorePriority = 0;
    this.defaultPluginPriority = 5;
    this.defaultAppPriority = 10;
};
Bootstrap.prototype.all = function () {
    const startTime = Date.now();
    for (const method in this) {
        if (method.indexOf('stage') === 0) {
            const stage = method;
            this[stage]();
        }
    }
    const completedTime = Date.now() - startTime;
    const { i18n } = Panacea.container;
    return Promise.resolve(i18n.t('core.bootstrap.completed', { completedTime })); // Completed full bootstrap (in {completedTime}ms)
};
Bootstrap.prototype.runStages = function (stages) {
    if (!Array.isArray(stages)) {
        throw new Error(`Stages parameter is invalid - should be an array of integers`); // Cannot translate as Panacea container isn't available for i18n.
    }
    stages.forEach(stage => {
        const stageFunction = `stage${stage}`;
        if (typeof this[stageFunction] !== 'function') {
            throw new Error(`Stage ${stage} specified is invalid`); // Cannot translate as Panacea container isn't available for i18n.
        }
        this[stageFunction]();
    });
};
Bootstrap.prototype.registryPathDiscoveryProcessor = function (registryType, subPath) {
    const { _, path, fs, registry, entityTypes, resolvePluginPath } = Panacea.container;
    registry[registryType] = this.params[registryType] || {};
    const unprioritizedRegistrants = [];
    // Treat core as a plugin to itself so it can register its own hook
    // implementations when bootstrapping externally - i.e. as a dependency of
    // another project. If core is bootstrapping itself (e.g. when running tests)
    // core effectively works in place of the application registrant below.
    const corePath = resolvePluginPath('@panaceajs/core') || './dist/core/';
    // Core Registrants.
    unprioritizedRegistrants.push({
        locationKey: 'core',
        path: path.resolve(corePath, subPath),
        priority: this.defaultCorePriority
    });
    // Plugin Registrants.
    Object.keys(registry.plugins).forEach((pluginKey) => {
        const pluginSubPath = path.resolve(resolvePluginPath(pluginKey), subPath);
        if (fs.existsSync(pluginSubPath)) {
            unprioritizedRegistrants.push({
                locationKey: pluginKey,
                path: pluginSubPath,
                priority: this.defaultPluginPriority
            });
        }
    });
    // Application Registrant.
    // Only include if core is not bootstrapping itself. See above.
    if (corePath !== './dist/core/') {
        const applicationSubPath = path.resolve(process.cwd(), subPath);
        if (fs.existsSync(applicationSubPath)) {
            unprioritizedRegistrants.push({
                locationKey: entityTypes.defaults.locationKey,
                path: applicationSubPath,
                priority: this.defaultAppPriority
            });
        }
    }
    const prioritizedRegistrants = unprioritizedRegistrants.sort((a, b) => Number(a.priority) - Number(b.priority));
    const directories = prioritizedRegistrants.filter(x => fs.existsSync(x.path));
    directories.forEach(x => (registry[registryType][x.path] = x));
    return directories;
};
/**
* Register services.
*/
Bootstrap.prototype.stage1 = function () {
    this.container = require('./DIContainer').registerServices(this.params);
};
/**
* Initialize the registry onto the Panacea.container.
*
* Adds the application level hooks.
*/
Bootstrap.prototype.stage2 = function () {
    Panacea.value('registry', {});
};
/**
* Add plugins to the registry.
*/
Bootstrap.prototype.stage3 = function () {
    const { registry, log } = Panacea.container;
    if (!this.params.hasOwnProperty('plugins')) {
        registry.plugins = {};
        return;
    }
    const { chalk, resolvePluginPath, i18n } = Panacea.container;
    registry.plugins = {};
    this.params.plugins.map((plugin) => {
        // Allows plugins to be declared in panacea.js as single string without a priority.
        // Mutate plugin into plugin object structure.
        if (typeof plugin === 'string') {
            plugin = {
                path: plugin,
                priority: this.defaultPluginPriority
            };
        }
        plugin.priority = plugin.priority || this.defaultPluginPriority;
        // Only add plugin to the registry if its path can be resolved.
        if (!resolvePluginPath(plugin.path)) {
            const error = [chalk.bgRed(' 😕  ')];
            error.push(i18n.t('core.bootstrap.pluginPathNotFound.line1', { pluginPath: chalk.underline(plugin.path) })); // Plugin {pluginPath} was not found as defined in panacea.js.
            error.push(i18n.t('core.bootstrap.pluginPathNotFound.line2', { pluginPath: plugin.path })); // If this is a external (contributed) plugin: Check that you have run `npm install {pluginPath}`
            error.push(i18n.t('core.bootstrap.pluginPathNotFound.line3')); // If this plugin is part of your application: Check that it can be resolved in the <app_root>/plugins/ directory
            log.error(error.join('\n'));
            return;
        }
        log.info(chalk.green('✔ ' + i18n.t('core.bootstrap.pluginLoaded', { pluginPath: plugin.path }))); // {pluginPath} plugin loaded
        registry.plugins[plugin.path] = plugin;
    });
};
/**
* Load application and plugins hooks.
*/
Bootstrap.prototype.stage4 = function () {
    const { hooks } = Panacea.container;
    const directories = this.registryPathDiscoveryProcessor('hooks', 'hooks');
    hooks.loadFromDirectories(directories.map(x => x.path));
};
/**
* Discover and register application and plugins entity types.
*/
Bootstrap.prototype.stage5 = function () {
    this.registryPathDiscoveryProcessor('entityTypes', 'config/entityTypes/schemas');
};
/**
* Discover and register application and plugins settings.
*/
Bootstrap.prototype.stage6 = function () {
    this.registryPathDiscoveryProcessor('settings', 'config/settings/schemas');
};
/**
* Prepares GraphQL schema and prepares express app ready to be served.
*/
Bootstrap.prototype.stage7 = function () {
    const { makeExecutableSchema, dbModels, graphiqlExpress, graphqlExpress, bodyParser, express, cors, voyagerMiddleware, graphQLTypeDefinitions, graphQLResolvers, dynamicMiddleware, hooks, log, options, i18n } = Panacea.container;
    graphQLTypeDefinitions()
        .then((typeDefs) => {
        const resolvers = graphQLResolvers();
        const schema = makeExecutableSchema({
            typeDefs,
            resolvers
        });
        const app = express();
        const graphqlExpressDynamicMiddleware = dynamicMiddleware.create(graphqlExpress((req) => {
            return {
                schema,
                context: {
                    req,
                    dbModels: dbModels()
                }
            };
        }));
        let whitelist = [];
        hooks.invoke('core.cors.whitelist', { whitelist, options });
        var corsOptions = {
            origin: function (origin, callback) {
                if (options.main.disableCors || whitelist[0] === '*' || whitelist.indexOf(origin) !== -1) {
                    callback(null, true);
                }
                else {
                    callback(new Error(i18n.t('core.bootstrap.notAllowedCORS'))); // Not allowed by CORS
                }
            },
            // Pass HTTP headers to graphql endpoint.
            credentials: true
        };
        // Main GraphQL endpoint.
        app.use(`/${options.main.endpoint}`, cors(corsOptions), bodyParser.json(), graphqlExpressDynamicMiddleware.handler());
        // Allow middleware to be dynamically replaced via core.reload hook without needing to restart the server.
        hooks.on('core.reload', ({ reason }) => {
            const startTime = Date.now();
            const { entityTypes } = Panacea.container;
            entityTypes.clearCache();
            graphQLTypeDefinitions().then((typeDefs) => {
                const resolvers = graphQLResolvers();
                const schema = makeExecutableSchema({
                    typeDefs,
                    resolvers
                });
                graphqlExpressDynamicMiddleware.replace(graphqlExpress((req) => {
                    return {
                        schema,
                        context: {
                            req,
                            dbModels: dbModels()
                        }
                    };
                }));
            }).catch((error) => console.error(error));
            const timeToReplace = Date.now() - startTime;
            log.info(i18n.t('core.bootstrap.reloadGraphql', { timeToReplace, reason })); // Reloaded graphql middleware (in {timeToReplace}ms) because {reason}
        });
        // GraphiQL endpoint.
        if (options.graphiql.enable) {
            app.use(`/${options.graphiql.endpoint}`, graphiqlExpress({
                endpointURL: `/${options.main.endpoint}`
            }));
        }
        // Voyager endpoint.
        if (options.voyager.enable) {
            app.use(`/${options.voyager.endpoint}`, voyagerMiddleware({
                endpointUrl: `/${options.main.endpoint}`
            }));
        }
        // Assign the express app onto the Panacea container so the bootstrap caller can serve it.
        Panacea.value('app', app);
    })
        .catch((error) => {
        log.error(i18n.t('core.bootstrap.typeDefsError', { error: error.message })); // Server not started. Type definitions error: {error}
    });
};
exports.default = Bootstrap;
//# sourceMappingURL=bootstrap.js.map