import fs from 'node:fs/promises'
import path from 'node:path'
import chalk from 'chalk'
import { fileURLToPath, pathToFileURL } from 'url'
import startServer from './server/index.js'
import Config from './components/Config.js'

const { enabled } = Config.getConfig('api')

if (enabled) {
  logger.info(chalk.cyan('[memz-plugin] MEMZ-API服务已启用，正在启动服务...'))
  startServer()
} else {
  logger.warn(chalk.cyan('[memz-plugin] MEMZ-API服务未启用'))
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
const apps = {}

logger.info(chalk.cyan('MEMZ插件载入中...'))
logger.debug(`[memz-plugin] 开始扫描目录：${appsDir}`)

try {
  const files = await fs.readdir(appsDir)
  logger.debug(`[memz-plugin] 找到文件 ${files.length} 个，开始过滤 JavaScript 文件...`)

  const jsFiles = files.filter((file) => file.endsWith('.js'))
  logger.debug(`[memz-plugin] JavaScript 文件数：${jsFiles.length}`)

  const filePaths = jsFiles.map((file) => ({
    name: path.basename(file, '.js'),
    filePath: pathToFileURL(path.join(appsDir, file)).href
  }))

  logger.debug(`[memz-plugin] 构建模块路径完成，共计 ${filePaths.length} 个模块。`)

  const loadModules = filePaths.map(async ({ name, filePath }) => {
    try {
      const moduleExports = await import(filePath)
      const defaultExport = moduleExports?.default || moduleExports[Object.keys(moduleExports)[0]]

      if (!defaultExport) {
        logger.debug(`[memz-plugin] 模块 ${name} 没有默认导出或有效的导出内容`)
        return
      }

      let newName = name
      let counter = 1

      while (apps[newName]) {
        logger.debug(`[memz-plugin] 重命名模块 ${name} 为 ${newName}...`)
        newName = `${name}_${counter}`
        counter++
      }

      apps[newName] = defaultExport
      logger.debug(chalk.green(`[memz-plugin] 成功载入模块：${newName}`))
      successCount++
    } catch (error) {
      logger.error(chalk.red(`[memz-plugin] 加载模块失败：${name}`))
      logger.debug(`[memz-plugin] 模块路径：${filePath}`)
      logger.error(error)
      failureCount++
    }
  })

  logger.debug('[memz-plugin] 开始并发加载所有模块...')
  await Promise.allSettled(loadModules)
  logger.debug('[memz-plugin] 所有模块加载任务已完成。')
} catch (error) {
  logger.error(`[memz-plugin] 扫描或加载文件时出错：${chalk.red(error.message)}`)
  logger.debug(error)
}

const endTime = Date.now()
const elapsedTime = endTime - startTime

logger.info(coloredDashes)
logger.info(chalk.green('MEMZ插件载入完成'))
logger.info(`成功加载：${chalk.green(successCount)} 个`)
logger.info(`加载失败：${chalk.red(failureCount)} 个`)
logger.info(`总耗时：${chalk.yellow(elapsedTime)} 毫秒`)
logger.info(coloredDashes)

export { apps }
