import fs from 'fs/promises'
import path from 'path'
import { pathToFileURL } from 'url'
import { PluginPath } from '#components'

/**
 * 递归获取目录下所有JS文件
 * @param {string} dir 目录路径
 * @returns {Promise<string[]>} JS文件路径列表
 */
async function getJsFiles (dir) {
  const files = []
  const entries = await fs.readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await getJsFiles(fullPath)))
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath)
    }
  }

  return files
}

// 缓存API文档
let apiDocsCache = null
let lastUpdateTime = 0
const CACHE_TTL = 5000 // 缓存5秒

/**
 * 生成API文档
 */
export async function generateApiDocs () {
  const now = Date.now()

  // 如果缓存存在且未过期,直接返回缓存
  if (apiDocsCache && (now - lastUpdateTime < CACHE_TTL)) {
    return apiDocsCache
  }

  const apiDir = path.join(PluginPath, 'server', 'api')
  const files = await getJsFiles(apiDir)

  const apiDocs = {}

  for (const file of files) {
    try {
      const module = await import(pathToFileURL(file))
      if (module.title) {
        const relativePath = path.relative(apiDir, file)
        const apiPath = '/' + relativePath.replace(/\\/g, '/').replace(/\.js$/, '')
        const pathSegments = apiPath.split('/').filter(Boolean)

        // 构建嵌套的文档结构
        let current = apiDocs
        pathSegments.forEach((segment, index) => {
          if (index === pathSegments.length - 1) {
            // 最后一层是具体的API信息
            current[segment] = {
              path: apiPath,
              title: module.title,
              method: module.method || 'GET',
              description: module.description || module.title,
              params: Object.entries(module.key || {}).map(([name, desc]) => ({
                name,
                description: Array.isArray(desc) ? desc.join(' ') : desc,
                required: true
              })),
              response: {
                success: {
                  code: 0,
                  message: '请求成功',
                  title: module.title,
                  time: '2024-01-01T00:00:00.000Z',
                  data: module.responseExample || '接口返回的数据',
                  copyright: 'Created By MEMZ-Plugin'
                },
                error: {
                  code: 500,
                  message: '请求失败',
                  title: module.title,
                  time: '2024-01-01T00:00:00.000Z',
                  error: '错误信息',
                  copyright: 'Created By MEMZ-Plugin'
                }
              }
            }
          } else {
            // 中间层级作为分类
            current[segment] = current[segment] || {}
            current = current[segment]
          }
        })
      }
    } catch (error) {
      console.error(`Failed to load ${file}:`, error)
    }
  }

  // 更新缓存
  apiDocsCache = apiDocs
  lastUpdateTime = now

  return apiDocs
}

/**
 * 生成Markdown格式的API文档
 */
export async function generateMarkdownDocs () {
  const apiDocs = await generateApiDocs()

  let doc = '# MEMZ-Plugin API 文档\n\n'
  doc += '## API 说明\nMEMZ-Plugin 提供了一系列 HTTP API 接口。所有接口均返回 JSON 格式数据(除特殊说明)。\n\n'

  // 递归生成markdown文档
  function generateMarkdown (apis, level = 2) {
    let markdown = ''
    for (const [key, value] of Object.entries(apis)) {
      if (value.path) {
        // API 接口文档
        markdown += `${'#'.repeat(level)} ${value.title}\n`
        markdown += `- 接口: \`${value.path}\`\n`
        markdown += `- 方法: \`${value.method}\`\n`
        if (value.params && value.params.length > 0) {
          markdown += '- 参数:\n'
          value.params.forEach(param => {
            markdown += `  - \`${param.name}\`: ${param.description}\n`
          })
        }
        markdown += `- 说明: ${value.description}\n\n`
      } else {
        // 分类标题
        markdown += `${'#'.repeat(level)} ${key.charAt(0).toUpperCase() + key.slice(1)} 相关接口\n\n`
        markdown += generateMarkdown(value, level + 1)
      }
    }
    return markdown
  }

  doc += generateMarkdown(apiDocs)

  // 添加通用说明
  doc += '## 通用说明\n\n'
  doc += '1. 所有接口返回数据格式(除特殊说明外):\n'
  doc += '```json\n'
  doc += '{\n    "code": 0,        // 状态码,0表示成功\n    "message": "",    // 状态信息\n    "title": "",      // 接口标题\n    "time": "",       // 响应时间\n    "data": {},       // 数据主体\n    "copyright": ""   // 版权信息\n}\n'
  doc += '```\n\n'
  doc += '2. 常见错误码:\n'
  doc += '- 200: 请求成功\n'
  doc += '- 400: 请求参数错误\n'
  doc += '- 404: 未找到相关数据\n'
  doc += '- 405: 请求方法不允许\n'
  doc += '- 500: 服务器内部错误\n\n'
  doc += '3. 所有接口支持跨域访问(CORS)\n'

  return doc
}

// 在开发模式下清除缓存
export function clearApiDocsCache () {
  apiDocsCache = null
  lastUpdateTime = 0
}
