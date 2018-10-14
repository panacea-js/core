import { IPanaceaOptionsComplete } from '../../types/globals'

const { fs, winston, formatters, moment } = Panacea.container

type loggerOptions = IPanaceaOptionsComplete['services']['options']['log']

const getFileTransports = function (options: loggerOptions) {
  const fileFormatter = winston.format.printf((info) => {
    return JSON.stringify({
      t: moment().format(),
      l: info.level,
      m: info.message
    })
  })

  let transports = []

  if (options.logToFiles) {
    transports.push(new winston.transports.File({
      filename: `${options.directory}/error.log`,
      maxsize: formatters.convertFileSizeShortHandToBytes(options.maxSize),
      level: 'error',
      format: fileFormatter
    }))

    transports.push(new winston.transports.File({
      filename: `${options.directory}/combined.log`,
      maxsize: formatters.convertFileSizeShortHandToBytes(options.maxSize),
      format: fileFormatter
    }))
  }

  if (options.showLogsInConsole) {
    transports.push(new winston.transports.Console({
      format: winston.format.simple()
      // colorize: true
    }))
  }

  return transports
}

const Logger = function (options: loggerOptions) {
  fs.ensureDirSync(options.directory)

  const fileTransports = getFileTransports(options)

  return winston.createLogger({
    transports: fileTransports
  })
}

export { Logger }
