import fs from 'node:fs/promises'
import path from 'node:path'
import puppeteer from '../../../lib/puppeteer/puppeteer.js'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({ html: true })
const htmlDir = `${process.cwd()}/plugins/TRSS-Plugin/Resources/Markdown/`
const tplFile = `${htmlDir}Markdown.html`

/**
 * 获取Markdown文件生成的图片
 * @param {string} filePath 文件路径，可以是本地路径或URL
 * @returns {Promise<string>} 返回图片
 */
export async function getMarkdownToImage (filePath) {
  // 处理URL下载文件
  if (/^https?:\/\//.test(filePath)) {
    const localFilePath = `${process.cwd()}/data/cache.md`
    const ret = await Bot.download(filePath, localFilePath)
    if (!ret) {
      throw new Error('文件下载错误')
    }
    filePath = localFilePath
  } else {
    // 检查本地文件是否存在
    try {
      const resolvedPath = path.resolve(process.cwd(), filePath)
      logger.debug('resolvedPath:', resolvedPath)
      await fs.access(resolvedPath)
    } catch (err) {
      throw new Error('文件不存在')
    }
  }

  // 读取Markdown文件内容
  let markdownContent
  try {
    markdownContent = await fs.readFile(filePath, 'utf-8')
  } catch (err) {
    throw new Error('文件读取错误')
  }

  // 将Markdown转换为HTML代码
  const htmlContent = md.render(markdownContent)
  logger.debug('htmlContent:', htmlContent)

  try {
    const img = await puppeteer.screenshot('Markdown', {
      tplFile,
      htmlDir,
      Markdown: htmlContent,
      pageGotoParams: {
        waitUntil: 'networkidle2'
      }
    })

    return img
  } catch (err) {
    throw new Error(`文件处理错误: ${err.message}`)
  }
}
