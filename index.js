import fs from 'node:fs/promises'
import path from 'node:path'
import chalk from 'chalk'
import { fileURLToPath, pathToFileURL } from 'url'
import startServer from './server/index.js'
import Config from './components/Config.js'
const { enabled } = Config.getConfig('api')
if (enabled) {
  startServer()
} else {
  logger.info(chalk.cyan('[memz-plugin]MEMZ-API服务未启用'))
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const appsDir = path.join(__dirname, 'apps')

const colors = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']

const coloredDashes = Array.from({ length: 23 }, () => {
  const randomColor = colors[Math.floor(Math.random() * colors.length)]
  return chalk[randomColor]('*')
}).join('')

let successCount = 0
let failureCount = 0

const startTime = Date.now()
let apps = {}

logger.info(`${chalk.cyan('MEMZ插件载入中......')}`)

try {
  const files = (await fs.readdir(appsDir)).filter((file) =>
    file.endsWith('.js')
  )

  const filePaths = files.map((file) => ({
    name: path.basename(file, '.js'),
    filePath: pathToFileURL(path.join(appsDir, file)).href
  }))
  const loadModules = filePaths.map(async ({ name, filePath }) => {
    try {
      const moduleExports = await import(filePath)
      const defaultExport =
        moduleExports?.default || moduleExports[Object.keys(moduleExports)[0]]
      apps[name] = defaultExport
      logger.debug(`MEMZ插件成功载入：${chalk.green(name)}`)
      successCount++
    } catch (error) {
      logger.error(`MEMZ插件载入错误：${chalk.red(name)}`)
      logger.error(error)
      failureCount++
    }
  })

  await Promise.allSettled(loadModules)
} catch (error) {
  logger.error(`读取文件时出错：${chalk.red(error.message)}`)
}

const endTime = Date.now()
const elapsedTime = endTime - startTime

logger.info(coloredDashes)
logger.info(`${chalk.green('MEMZ插件载入完成')}`)
logger.info(`成功加载：${chalk.green(successCount)} 个`)
logger.info(`加载失败：${chalk.red(failureCount)} 个`)
logger.info(`总耗时：${chalk.yellow(elapsedTime)} 毫秒`)
logger.info(coloredDashes)

export { apps }
