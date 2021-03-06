const { vue, vueI18n: VueI18n, options, registry, glob, path, _, fs } = Panacea.container

vue.use(VueI18n)

const messages = _([
  // Locale source directories order: core, plugins, app.
  // Note that Panacea CMS path is not included here as it's not a dependency of Panacea core.
  path.resolve(__dirname, '../../locales/*.json'),
  ...Object.keys(registry.plugins || {}).map(dir => `${dir}/locales/*.json`),
  path.resolve(process.cwd(), 'locales/*.json')
])
  .flatMap(dir => glob.sync(dir))
  .reduce((acc, file) => {
    const locale = path.basename(file).replace('.json', '')
    acc[locale] = _.merge(acc[locale] || {}, fs.readJsonSync(file))
    return acc
  }, ({} as any))

const i18n = new VueI18n({
  locale: options.locales.default,
  fallbackLocale: options.locales.default,
  messages
})

export { i18n }
