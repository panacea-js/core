import Bootstrap from './src/utils/bootstrap'

export default function (panaceaConfigPath = '') {
  return new Bootstrap(panaceaConfigPath).all()
}
