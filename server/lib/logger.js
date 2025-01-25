import log4js from 'log4js'
import fs from 'node:fs'
import path from 'path'
import { Config, PluginTemp } from '#components'

const logsDir = path.join(PluginTemp, 'logs')

// 确保logs目录存在
if (!fs.existsSync(logsDir)) { fs.mkdirSync(logsDir, { recursive: true }) }

let logger = null
let pluginLogger = null

const getLogger = () => {
  if (!logger) {
    const { loglevel, port } = Config.getConfig('api')

    // MEMZ专属logger配置
    pluginLogger = log4js.configure({
      appenders: {
        memzConsole: {
          type: 'console',
          layout: {
            type: 'pattern',
            pattern: '%[[%d{hh:mm:ss.SSS}][%4.4p][MEMZ-API]%] %m'
          }
        },
        memzFile: {
          type: 'dateFile',
          filename: `${logsDir}/memz-api`,
          pattern: 'yyyy-MM-dd.log',
          numBackups: 15,
          alwaysIncludePattern: true,
          layout: {
            type: 'pattern',
            pattern: '[%d{hh:mm:ss.SSS}][%4.4p][MEMZ-API] %m'
          }
        },
        memzError: {
          type: 'file',
          filename: `${logsDir}/memz-api-error.log`,
          alwaysIncludePattern: true,
          layout: {
            type: 'pattern',
            pattern: '[%d{hh:mm:ss.SSS}][%4.4p][MEMZ-API] %m'
          }
        }
      },
      categories: {
        default: {
          appenders: ['memzConsole'],
          level: loglevel
        },
        memzApi: {
          appenders: ['memzConsole', 'memzFile'],
          level: loglevel
        },
        memzError: {
          appenders: ['memzConsole', 'memzFile', 'memzError'],
          level: 'error'
        }
      }
    })

    logger = pluginLogger.getLogger('memzApi')
    const portStr = `[${port || '????'}]`

    return {
      info: (msg) => logger.info(`${portStr} ${msg}`),
      warn: (msg) => logger.warn(`${portStr} ${msg}`),
      error: (msg) => {
        const errorLogger = pluginLogger.getLogger('memzError')
        errorLogger.error(`${portStr} ${msg}`)
      },
      debug: (msg) => logger.debug(`${portStr} ${msg}`),
      trace: (msg) => logger.trace(`${portStr} ${msg}`),
      fatal: (msg) => {
        const errorLogger = pluginLogger.getLogger('memzError')
        errorLogger.fatal(`${portStr} ${msg}`)
      }
    }
  }
  return logger
}

export default getLogger()
