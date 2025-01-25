import fs from 'node:fs/promises'
import path from 'node:path'
import chalk from 'chalk'
import { fileURLToPath, pathToFileURL } from 'url'
import { startServer } from './server/index.js'
import Config from './components/Config.js'
import chokidar from 'chokidar'

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

const startTime = Date.now()
const apps = {}
const moduleCache = {}

let successCount = 0
let failureCount = 0

logger.info(chalk.cyan('MEMZ插件载入中...'))

async function scanDirectory (directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const tasks = []

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      tasks.push(...(await scanDirectory(fullPath)))
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      tasks.push({
        name: path.basename(entry.name, '.js'),
        filePath: pathToFileURL(fullPath).href
      })
    }
  }

  return tasks
}

try {
  const filePaths = await scanDirectory(appsDir)
  logger.debug(`[memz-plugin] 构建模块路径完成，共计 ${filePaths.length} 个模块。`)

  logger.debug('[memz-plugin] 开始并发加载所有模块...')

  const loadModules = filePaths.map(({ name, filePath }) => {
    const loadStartTime = Date.now()

    return (async () => {
      try {
        if (moduleCache[filePath]) {
          apps[name] = moduleCache[filePath]
          const loadTime = Date.now() - loadStartTime
          logger.debug(chalk.green(`[memz-plugin] 从缓存加载模块：${name}，耗时 ${loadTime} ms`))
          successCount++
          return
        }

        const moduleExports = await import(filePath)
        const defaultExport = moduleExports?.default || moduleExports[Object.keys(moduleExports)[0]]

        if (!defaultExport) {
          logger.debug(`[memz-plugin] 模块 ${name} 没有有效的导出内容`)
          return
        }

        let newName = name
        let counter = 1

        while (apps[newName]) {
          newName = `${name}_${counter}`
          counter++
        }

        apps[newName] = defaultExport
        moduleCache[filePath] = defaultExport

        const loadTime = Date.now() - loadStartTime
        logger.debug(chalk.green(`[memz-plugin] 成功载入模块：${newName}，耗时 ${loadTime} ms`))
        successCount++
      } catch (error) {
        logger.error(chalk.red(`[memz-plugin] 加载模块失败：${name}`))
        logger.error(error)
        failureCount++
      }
    })()
  })

  await Promise.allSettled(loadModules)
} catch (error) {
  logger.error(`[memz-plugin] 扫描或加载文件时出错：${chalk.red(error.message)}`)
  logger.debug(error)
}

const watcher = chokidar.watch(appsDir, {
  persistent: true,
  // eslint-disable-next-line no-useless-escape
  ignored: /(^|[\/\\])\../, // 忽略隐藏文件
  ignoreInitial: true // 不触发初始事件
})

watcher.on('change', async (filePath) => {
  if (filePath.endsWith('.js')) {
    logger.info(chalk.yellow(`[memz-plugin] 文件发生变化：${filePath}`))

    const moduleName = path.basename(filePath, '.js')
    const fileUrl = pathToFileURL(filePath).hrefi

    try {
      delete moduleCache[fileUrl]

      const moduleExports = await import(fileUrl)
      const defaultExport = moduleExports?.default || moduleExports[Object.keys(moduleExports)[0]]

      if (!defaultExport) {
        logger.debug(`[memz-plugin] 模块 ${moduleName} 没有有效的导出内容`)
        return
      }

      // 更新缓存中的模块
      apps[moduleName] = defaultExport

      // logger.info(chalk.green(`[memz-plugin] 热更新模块：${moduleName}`))
      // 热更新个🥚,我不会
    } catch (error) {
      logger.error(chalk.red(`[memz-plugin] 热更新模块失败：${moduleName}`))
      logger.error(error)
    }
  }
})

const endTime = Date.now()
const elapsedTime = endTime - startTime

logger.info(coloredDashes)
logger.info(chalk.green('MEMZ插件载入完成'))
logger.info(`成功加载：${chalk.green(successCount)} 个`)
logger.info(`加载失败：${chalk.red(failureCount)} 个`)
logger.info(`总耗时：${chalk.yellow(elapsedTime)} 毫秒`)
logger.info(coloredDashes)

export { apps }
