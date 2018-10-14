import panaceaDefaultConfig from './default'
import * as path from 'path'

export default function () {
  const config = panaceaDefaultConfig()

  config.plugins = [
    path.resolve(__dirname, '..', 'plugins/empty-plugin')
  ]

  return config
}
