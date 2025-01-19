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
const moduleCache = {} // 缓存模块

let successCount = 0
let failureCount = 0

logger.info(chalk.cyan('MEMZ插件载入中...'))

// 扫描目录，异步递归
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
  // 扫描并获取所有模块路径
  const filePaths = await scanDirectory(appsDir)
  logger.debug(`[memz-plugin] 构建模块路径完成，共计 ${filePaths.length} 个模块。`)

  // 并发加载所有模块，使用 Promise.allSettled 确保所有模块都被处理
  logger.debug('[memz-plugin] 开始并发加载所有模块...')

  const loadModules = filePaths.map(({ name, filePath }) => {
    const loadStartTime = Date.now()

    return (async () => {
      try {
        // 检查模块是否已经缓存
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
        moduleCache[filePath] = defaultExport // 缓存模块

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

  // 使用 Promise.allSettled 来确保所有模块都能加载完，不管是否成功
  await Promise.allSettled(loadModules)
} catch (error) {
  logger.error(`[memz-plugin] 扫描或加载文件时出错：${chalk.red(error.message)}`)
  logger.debug(error)
}

// 设置文件变化监听器
const watcher = chokidar.watch(appsDir, {
  persistent: true,
  // eslint-disable-next-line no-useless-escape
  ignored: /(^|[\/\\])\../, // 忽略隐藏文件
  ignoreInitial: true // 不触发初始事件
})

// 监听 `.js` 文件的变化
watcher.on('change', async (filePath) => {
  if (filePath.endsWith('.js')) {
    logger.info(chalk.yellow(`[memz-plugin] 文件发生变化：${filePath}`))

    // 热更新：删除缓存并重新加载修改的模块
    const moduleName = path.basename(filePath, '.js')
    const fileUrl = pathToFileURL(filePath).href

    try {
      // 清除缓存，确保重新加载模块
      delete moduleCache[fileUrl]

      // 动态重新加载该模块
      const moduleExports = await import(fileUrl)
      const defaultExport = moduleExports?.default || moduleExports[Object.keys(moduleExports)[0]]

      if (!defaultExport) {
        logger.debug(`[memz-plugin] 模块 ${moduleName} 没有有效的导出内容`)
        return
      }

      // 更新缓存中的模块
      apps[moduleName] = defaultExport

      logger.info(chalk.green(`[memz-plugin] 热更新模块：${moduleName}`))
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
