import Bootstrap from './src/utils/bootstrap'

process.on('unhandledRejection', function (error, promise) {
  console.error('Unhandled rejection (promise: ', promise, ', reason: ', error, ').')
})

process.on('uncaughtException', function (error) {
  console.error('Caught exception: ' + error)
})

export default function (panaceaConfigPath = '') {
  return new Bootstrap(panaceaConfigPath).all()
}
