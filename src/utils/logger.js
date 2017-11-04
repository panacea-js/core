import winston from 'winston'
import fs from 'fs-extra'
import { getSandboxDir } from "../test/test-common";

const getOptions = function() {

  const env = process.env

  const isTesting = env.NODE_ENV === 'test'

  const sandboxDir = getSandboxDir()

  return {
    isTesting,
    directory: isTesting ? `${sandboxDir}/logs` : /* istanbul ignore next */ env.APP_LOG,
  }

}

const getTransports = function(logDirectory, isTesting) {

  const env = process.env

  let transports = []

  transports.push(new winston.transports.File({
    filename: `${logDirectory}/error.log`,
    maxsize: env.APP_LOG_MAX_SIZE,
    level: 'error'
  }))

  transports.push(new winston.transports.File({
    filename: `${logDirectory}/combined.log`,
    maxsize: env.APP_LOG_MAX_SIZE,
  }))

  /* istanbul ignore next */
  if (!isTesting) {
    transports.push(new winston.transports.Console())
  }

  return transports
}

const Logger = function() {

  const { directory, isTesting } = getOptions()

  fs.ensureDirSync(directory)

  const transports = getTransports(directory, isTesting)

  /* istanbul ignore next */
  return winston.createLogger({
    level: 'info',
    format: winston.format.printf(info => info.message),
    transports
  })

}

export { Logger }