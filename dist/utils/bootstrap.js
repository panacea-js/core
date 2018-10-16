"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs-extra");
const Bootstrap = function (panaceaConfigFile = '') {
    if (!panaceaConfigFile) {
        panaceaConfigFile = path.resolve(process.cwd(), 'panacea.js');
    }
    panaceaConfigFile = path.resolve(panaceaConfigFile);
    if (fs.existsSync(`${panaceaConfigFile}.ts`)) {
        panaceaConfigFile = `${panaceaConfigFile}.ts`;
    }
    if (!fs.existsSync(panaceaConfigFile)) {
        throw Error(`Could not load panacea.js config file at ${panaceaConfigFile}`);
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
    return Promise.resolve(i18n.t('core.bootstrap.completed', { completedTime }));
};
Bootstrap.prototype.runStages = function (stages) {
    if (!Array.isArray(stages)) {
        throw new Error(`Stages parameter is invalid - should be an array of integers`);
    }
    stages.forEach(stage => {
        const stageFunction = `stage${stage}`;
        if (typeof this[stageFunction] !== 'function') {
            throw new Error(`Stage ${stage} specified is invalid`);
        }
        this[stageFunction]();
    });
};
Bootstrap.prototype.registryPathDiscoveryProcessor = function (registryType, subPath) {
    const { _, path, fs, registry, entityTypes, resolvePluginPath } = Panacea.container;
    registry[registryType] = this.params[registryType] || {};
    const unprioritizedRegistrants = [];
    const corePath = resolvePluginPath('@panaceajs/core/dist/core/') || './dist/core/';
    unprioritizedRegistrants.push({
        locationKey: 'core',
        path: path.resolve(corePath, subPath),
        priority: this.defaultCorePriority
    });
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
Bootstrap.prototype.stage1 = function () {
    this.container = require('./DIContainer').registerServices(this.params);
};
Bootstrap.prototype.stage2 = function () {
    Panacea.value('registry', {});
};
Bootstrap.prototype.stage3 = function () {
    const { registry, log } = Panacea.container;
    if (!this.params.hasOwnProperty('plugins')) {
        registry.plugins = {};
        return;
    }
    const { chalk, resolvePluginPath, i18n } = Panacea.container;
    registry.plugins = {};
    this.params.plugins.map((plugin) => {
        if (typeof plugin === 'string') {
            plugin = {
                path: plugin,
                priority: this.defaultPluginPriority
            };
        }
        plugin.priority = plugin.priority || this.defaultPluginPriority;
        if (!resolvePluginPath(plugin.path)) {
            const error = [chalk.bgRed(' 😕  ')];
            error.push(i18n.t('core.bootstrap.pluginPathNotFound.line1', { pluginPath: chalk.underline(plugin.path) }));
            error.push(i18n.t('core.bootstrap.pluginPathNotFound.line2', { pluginPath: plugin.path }));
            error.push(i18n.t('core.bootstrap.pluginPathNotFound.line3'));
            log.error(error.join('\n'));
            return;
        }
        log.info(chalk.green('✔ ' + i18n.t('core.bootstrap.pluginLoaded', { pluginPath: plugin.path })));
        registry.plugins[plugin.path] = plugin;
    });
};
Bootstrap.prototype.stage4 = function () {
    const { hooks } = Panacea.container;
    const directories = this.registryPathDiscoveryProcessor('hooks', 'hooks');
    hooks.loadFromDirectories(directories.map(x => x.path));
};
Bootstrap.prototype.stage5 = function () {
    this.registryPathDiscoveryProcessor('entityTypes', 'config/entityTypes/schemas');
};
Bootstrap.prototype.stage6 = function () {
    this.registryPathDiscoveryProcessor('settings', 'config/settings/schemas');
};
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
        let corsOptions = {
            origin: function (origin, callback) {
                if (options.main.disableCors || whitelist[0] === '*' || whitelist.indexOf(origin) !== -1) {
                    callback(null, true);
                }
                else {
                    callback(new Error(i18n.t('core.bootstrap.notAllowedCORS')));
                }
            },
            credentials: true
        };
        app.use(`/${options.main.endpoint}`, cors(corsOptions), bodyParser.json(), graphqlExpressDynamicMiddleware.handler());
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
            log.info(i18n.t('core.bootstrap.reloadGraphql', { timeToReplace, reason }));
        });
        if (options.graphiql.enable) {
            app.use(`/${options.graphiql.endpoint}`, graphiqlExpress({
                endpointURL: `/${options.main.endpoint}`
            }));
        }
        if (options.voyager.enable) {
            app.use(`/${options.voyager.endpoint}`, voyagerMiddleware({
                endpointUrl: `/${options.main.endpoint}`
            }));
        }
        Panacea.value('app', app);
    })
        .catch((error) => {
        console.error(error);
        log.error(i18n.t('core.bootstrap.typeDefsError', { error: error.message }));
    });
};
exports.default = Bootstrap;
//# sourceMappingURL=bootstrap.js.map