const { vue, vueI18n: VueI18n, options, registry, hooks, glob, path, _, fs } = Panacea.container

vue.use(VueI18n)

const messages = _([
  // Locale source directories order: core, plugins, app.
  // Note that Panacea CMS path is not included here as it's not a dependency of Panacea core.
  path.resolve(__dirname, '../../locales/*.json'),
  ...Object.keys(registry.plugins).map(dir => `${dir}/locales/*.json`),
  path.resolve(process.cwd(), 'locales/*.json')
])
  .flatMap(dir => glob.sync(dir))
  .reduce((acc, file) => {
    const locale = path.basename(file).replace('.json', '')
    acc[locale] = _.merge(acc[locale] || {}, fs.readJsonSync(file))
    return acc
  }, {})

const i18n = new VueI18n({
  locale: options.locales.default,
  messages
})

hooks.on('core.locale.change', function (locale) {
  i18n.locale = locale
})

export { i18n }
