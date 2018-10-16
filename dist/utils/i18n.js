"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { vue, vueI18n: VueI18n, options, registry, glob, path, _, fs } = Panacea.container;
vue.use(VueI18n);
const messages = _([
    path.resolve(__dirname, '../../locales/*.json'),
    ...Object.keys(registry.plugins || {}).map(dir => `${dir}/locales/*.json`),
    path.resolve(process.cwd(), 'locales/*.json')
])
    .flatMap(dir => glob.sync(dir))
    .reduce((acc, file) => {
    const locale = path.basename(file).replace('.json', '');
    acc[locale] = _.merge(acc[locale] || {}, fs.readJsonSync(file));
    return acc;
}, {});
const i18n = new VueI18n({
    locale: options.locales.default,
    fallbackLocale: options.locales.default,
    messages
});
exports.i18n = i18n;
//# sourceMappingURL=i18n.js.map