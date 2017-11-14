const { fs, winston, formatters, moment } = DI.container

const getFileTransports = function (options) {

  const fileFormatter = winston.format.printf(info => {
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
      format: winston.format.simple(),
      colorize: true
    }))
  }

  return transports
}

const Logger = function (options) {

  fs.ensureDirSync(options.directory)

  const fileTransports = getFileTransports(options)

  return winston.createLogger({
    transports: fileTransports
  })

}

export { Logger }
