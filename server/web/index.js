import { generateApiDocs } from '../model/apiDocs.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import Mustache from 'mustache'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 加载模板文件
const loadTemplates = async () => {
  const [layout, styles, card, category] = await Promise.all([
    fs.readFile(path.join(__dirname, 'index.html'), 'utf8'),
    fs.readFile(path.join(__dirname, 'index.css'), 'utf8'),
    fs.readFile(path.join(__dirname, 'templates/card.html'), 'utf8'),
    fs.readFile(path.join(__dirname, 'templates/category.html'), 'utf8')
  ])
  return { layout, styles, card, category }
}

// 递归生成HTML
const generateApiHtml = async (apis, level = 0, templates) => {
  let html = ''
  for (const [key, value] of Object.entries(apis)) {
    if (value.path) {
      // 渲染API卡片
      const cardData = {
        title: value.title,
        method: value.method.toLowerCase(),
        path: value.path,
        description: value.description,
        hasParams: value.params?.length > 0,
        params: value.params?.map(param => ({
          ...param,
          required: !!param.required
        }))
      }
      html += Mustache.render(templates.card, cardData)
    } else {
      // 渲染分类标题
      const categoryContent = await generateApiHtml(value, level + 1, templates)
      const categoryData = {
        level: level + 2,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        content: categoryContent
      }
      html += Mustache.render(templates.category, categoryData)
    }
  }
  return html
}

// 前端页面处理函数
export const web = async (req, res) => {
  try {
    // 并行加载API文档和模板
    const [apiDocs, templates] = await Promise.all([
      generateApiDocs(),
      loadTemplates()
    ])

    // 生成页面内容
    const content = await generateApiHtml(apiDocs, 0, templates)

    // 渲染最终页面
    const html = Mustache.render(templates.layout, {
      styles: templates.styles,
      content
    })

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(html)
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('生成API文档页面失败: ' + error.message)
  }
}
