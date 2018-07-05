import panaceaDefaultConfig from './default'
import path from 'path'

export default function () {
  const config = panaceaDefaultConfig()

  config.plugins = [
    path.resolve(__dirname, '..', 'plugins/invalid-plugin')
  ]

  return config
}
