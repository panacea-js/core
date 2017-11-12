import winston from 'winston'
import fs from 'fs-extra'

const getTransports = function (options) {

  let transports = []

  transports.push(new winston.transports.File({
    filename: `${options.directory}/error.log`,
    maxsize: options.maxSize,
    level: 'error'
  }))

  transports.push(new winston.transports.File({
    filename: `${options.directory}/combined.log`,
    maxsize: options.maxSize
  }))

  return transports
}

const Logger = function (options) {

  fs.ensureDirSync(options.directory)

  const transports = getTransports(options)

  /* istanbul ignore next */
  return winston.createLogger({
    level: 'info',
    format: winston.format.printf(info => info.message),
    transports
  })
}

export { Logger }
