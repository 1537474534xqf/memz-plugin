import log4js from 'log4js'
import fs from 'node:fs'
import path from 'path'
import { Config, PluginTemp } from '#components'

const logsDir = path.join(PluginTemp, 'logs')

// 确保logs目录存在
if (!fs.existsSync(logsDir)) { fs.mkdirSync(logsDir, { recursive: true }) }

let memzLogger
let pluginLogger = null

const getLogger = () => {
  if (!memzLogger) {
    const { loglevel, port } = Config.getConfig('api')
    const portStr = `[${port || '????'}]`

    // 是否在Yunzai环境中运行
    if (typeof logger !== 'undefined' && logger.info && logger.error) {
      // 使用独立的log4js配置，但不影响Yunzai的logger
      pluginLogger = log4js.configure({
        appenders: {
          memzConsole: {
            type: 'console',
            layout: {
              type: 'pattern',
              pattern: '%[[%d{hh:mm:ss.SSS}][%4.4p]%] %m'
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
              pattern: '[%d{hh:mm:ss.SSS}][%4.4p] %m'
            }
          },
          memzError: {
            type: 'file',
            filename: `${logsDir}/memz-api-error.log`,
            alwaysIncludePattern: true,
            layout: {
              type: 'pattern',
              pattern: '[%d{hh:mm:ss.SSS}][%4.4p]%m'
            }
          }
        },
        categories: {
          default: {
            appenders: ['memzConsole', 'memzFile'],
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

      const memzLog = pluginLogger.getLogger('memzApi')
      memzLogger = {
        info: (msg) => memzLog.info(`[MEMZ-API] ${portStr} ${msg}`),
        warn: (msg) => memzLog.warn(`[MEMZ-API] ${portStr} ${msg}`),
        error: (msg) => {
          const errorLogger = pluginLogger.getLogger('memzError')
          errorLogger.error(`[MEMZ-API] ${portStr} ${msg}`)
        },
        debug: (msg) => memzLog.debug(`[MEMZ-API] ${portStr} ${msg}`),
        trace: (msg) => memzLog.trace(`[MEMZ-API] ${portStr} ${msg}`),
        fatal: (msg) => {
          const errorLogger = pluginLogger.getLogger('memzError')
          errorLogger.fatal(`[MEMZ-API] ${portStr} ${msg}`)
        }
      }
    } else {
      // 单跑
      pluginLogger = log4js.configure({
        appenders: {
          memzConsole: {
            type: 'console',
            layout: {
              type: 'pattern',
              pattern: '%[[%d{hh:mm:ss.SSS}][%4.4p]%] %m'
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
              pattern: '[%d{hh:mm:ss.SSS}][%4.4p] %m'
            }
          },
          memzError: {
            type: 'file',
            filename: `${logsDir}/memz-api-error.log`,
            alwaysIncludePattern: true,
            layout: {
              type: 'pattern',
              pattern: '[%d{hh:mm:ss.SSS}][%4.4p]%m'
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

      const logger = pluginLogger.getLogger('memzApi')
      memzLogger = {
        info: (msg) => logger.info(`[MEMZ-API] ${portStr} ${msg}`),
        warn: (msg) => logger.warn(`[MEMZ-API] ${portStr} ${msg}`),
        error: (msg) => {
          const errorLogger = pluginLogger.getLogger('memzError')
          errorLogger.error(`[MEMZ-API] ${portStr} ${msg}`)
        },
        debug: (msg) => logger.debug ? logger.debug(`[MEMZ-API] ${portStr} ${msg}`) : null,
        trace: (msg) => logger.trace ? logger.trace(`[MEMZ-API] ${portStr} ${msg}`) : null,
        fatal: (msg) => logger.fatal ? logger.fatal(`[MEMZ-API] ${portStr} ${msg}`) : logger.error(`[MEMZ-API] ${portStr} ${msg}`)
      }
    }
  }
  logger.debug('[MEMZ-API] 获取日志实例成功')
  return memzLogger
}

export default getLogger()
