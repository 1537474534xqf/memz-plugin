import log4js from 'log4js'
import fs from 'node:fs'
import path from 'path'
import { Config, PluginTemp } from '#components'
const { loglevel } = Config.getConfig('api')
const logsDir = path.join(PluginTemp, 'logs')
/**
 * 设置日志样式并直接导出已配置的logger
 */

// 确保logs目录存在
if (!fs.existsSync(logsDir)) { fs.mkdirSync(logsDir, { recursive: true }) }

// 自定义日志级别
log4js.levels.addLevels({
  fatal: { value: 500, colour: 'red' }, // fatal级别
  off: { value: 1000, colour: 'grey' } // off级别
})

// 配置log4js
log4js.configure({
  appenders: {
    console: {
      type: 'console',
      layout: {
        type: 'pattern',
        pattern: '%[[%d{hh:mm:ss.SSS}][%4.4p]%]%m'
      }
    },
    command: {
      type: 'dateFile', // 可以是console,dateFile,file,Logstash等
      filename: `${logsDir}/command`, // 将会按照filename和pattern拼接文件名
      pattern: 'yyyy-MM-dd.log',
      numBackups: 15,
      alwaysIncludePattern: true,
      layout: {
        type: 'pattern',
        pattern: '[%d{hh:mm:ss.SSS}][%4.4p]%m'
      }
    },
    error: {
      type: 'file',
      filename: `${logsDir}/error.log`,
      alwaysIncludePattern: true,
      layout: {
        type: 'pattern',
        pattern: '[%d{hh:mm:ss.SSS}][%4.4p]%m'
      }
    }
  },
  categories: {
    default: { appenders: ['console'], level: loglevel },
    command: { appenders: ['console', 'command'], level: 'warn' },
    error: { appenders: ['console', 'command', 'error'], level: 'error' }
  }
})

const logger = log4js.getLogger()
export default logger
