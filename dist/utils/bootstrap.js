"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs-extra");
const DIContainer_1 = require("./DIContainer");
class Bootstrap {
    constructor(panaceaConfigFile = '') {
        this.defaultCorePriority = 0;
        this.defaultPluginPriority = 5;
        this.defaultAppPriority = 10;
        this.defaultAppLocationKey = 'app';
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
        this.container = DIContainer_1.registerServices(this.params);
        Panacea.value('registry', {});
        Panacea.value('defaultAppLocationKey', this.defaultAppLocationKey);
        this.chain = {
            '10-add-plugins-registry': addPluginsToRegistry,
            '20-register-hooks': registerHooks,
            '30-register-entity-types': registerEntityTypes,
            '40-register-settings': registerSettings,
            '50-prepare-graphql-server': prepareGraphQLServer,
        };
    }
    ensureChainOrder() {
        this.chain = Object.keys(this.chain).sort().reduce((orderedStages, stageKey) => {
            orderedStages[stageKey] = this.chain[stageKey];
            return orderedStages;
        }, {});
    }
    all() {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            this.ensureChainOrder();
            Object.keys(this.chain).forEach(async (stage) => {
                if (typeof this.chain[stage] !== 'function') {
                    return reject(new Error(`Stage ${stage} is not a function`));
                }
                await this.chain[stage].call(this);
            });
            const completedTime = Date.now() - startTime;
            const { i18n } = Panacea.container;
            return resolve(i18n.t('core.bootstrap.completed', { completedTime }));
        });
    }
    runStages(stages) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            if (!Array.isArray(stages)) {
                return reject(new Error(`Stages parameter is invalid - should be an array of stages`));
            }
            this.ensureChainOrder();
            stages.forEach(async (stage) => {
                if (!this.chain[stage] || typeof this.chain[stage] !== 'function') {
                    return reject(new Error(`Stage ${stage} specified is invalid`));
                }
                await this.chain[stage].call(this);
            });
            const completedTime = Date.now() - startTime;
            const { i18n } = Panacea.container;
            return resolve(i18n.t('core.bootstrap.completed', { completedTime }));
        });
    }
    discoverImplementorDirectories(subPath) {
        const { _, path, fs, registry, defaultAppLocationKey, resolvePluginPath } = Panacea.container;
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
                    locationKey: defaultAppLocationKey,
                    path: applicationSubPath,
                    priority: this.defaultAppPriority
                });
            }
        }
        const sortedRegistrantsByPriority = unprioritizedRegistrants.sort((a, b) => Number(a.priority) - Number(b.priority));
        const validDirectories = sortedRegistrantsByPriority.filter(x => fs.existsSync(x.path));
        return validDirectories;
    }
}
exports.default = Bootstrap;
async function addPluginsToRegistry() {
    const { registry, log } = Panacea.container;
    if (!this.params.plugins) {
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
}
async function registerHooks() {
    const { hooks } = Panacea.container;
    const directories = this.discoverImplementorDirectories('hooks');
    hooks.loadFromDirectories(directories.map(x => x.path));
}
async function registerEntityTypes() {
    const { registry } = Panacea.container;
    registry.entityTypes = this.params.entityTypes || {};
    const directories = this.discoverImplementorDirectories('config/entityTypes/schemas');
    directories.forEach(x => (registry.entityTypes[x.path] = x));
}
async function registerSettings() {
    const { registry } = Panacea.container;
    registry.settings = this.params.settings || {};
    const directories = this.discoverImplementorDirectories('config/settings/schemas');
    directories.forEach(x => (registry.settings[x.path] = x));
}
async function prepareGraphQLServer() {
    const { makeExecutableSchema, dbModels, graphiqlExpress, graphqlExpress, bodyParser, express, cors, voyagerMiddleware, graphQLTypeDefinitions, graphQLResolvers, dynamicMiddleware, hooks, log, options, i18n } = Panacea.container;
    graphQLTypeDefinitions().then(typeDefs => {
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
            graphQLTypeDefinitions().then(typeDefs => {
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
}
//# sourceMappingURL=bootstrap.js.map