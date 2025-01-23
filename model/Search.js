import fs from 'fs'
import xlsx from 'xlsx'
import path from 'node:path'
import Fuse from 'fuse.js'
import { Config } from '#components'
/**
 * 加载所有 Excel 文件中的数据
 * @param {string} folderPath - 存放 Excel 文件的文件夹路径
 * @returns {Promise<Array>} - 数据数组 (Promise 形式)
 */
export async function loadDataFromExcelFiles (folderPath) {
  try {
    const files = await fs.promises.readdir(folderPath)

    const excelFiles = files.filter(file => file.endsWith('.xlsx'))

    const allData = await Promise.all(excelFiles.map(async (file) => {
      const filePath = path.join(folderPath, file)

      const workbook = xlsx.readFile(filePath)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]

      // 获取第一行作为列头
      const data = xlsx.utils.sheet_to_json(sheet, {
        defval: '',
        range: 0
      })

      if (data.length === 0) return []

      const columnNames = Object.keys(data[0])

      const cleanedData = data.map(row => {
        return Object.fromEntries(
          Object.entries(row).filter(([key, value]) => key !== '__EMPTY' && value !== '')
        )
      })

      const numRows = cleanedData.length
      const numColumns = columnNames.length
      const dataSize = numRows * numColumns * 2

      logger.info('[memz-plugin] [搜资源] 加载 Excel 文件成功:', filePath)
      logger.info('[memz-plugin] [搜资源] Excel 数据列名:', columnNames)
      logger.info('[memz-plugin] [搜资源] Excel 数据列数:', numColumns)
      logger.info('[memz-plugin] [搜资源] Excel 数据行数:', numRows)
      logger.info('[memz-plugin] [搜资源] Excel 数据总大小:', dataSize)

      return cleanedData
    }))

    // 扁平化所有数据并返回
    return allData.flat()
  } catch (error) {
    logger.error('加载 Excel 文件出错:', error)
    throw new Error('加载 Excel 文件失败')
  }
}

/**
 * 根据关键词搜索资源
 * @param {string} keyword 关键词
 * @param {Array} data 数据
 * @returns {Object} 返回包含匹配资源的JSON对象
 */
export async function searchResources (keyword, data) {
  const normalizedKeyword = keyword.toLowerCase()

  // 如果关键词长度大于等于3，使用 Fuse 进行模糊匹配
  if (keyword.length >= 3) {
    // 配置 Fuse.js
    const { threshold } = Config.getConfig('memz')
    const fuseOptions = {
      keys: ['关键词'],
      threshold, // 设置阈值，模糊匹配的宽松度
      ignoreLocation: true, // 忽略匹配位置
      includeScore: true // 包含匹配的评分，评分越低表示匹配越好
    }

    const fuse = new Fuse(data, fuseOptions)
    const result = fuse.search(normalizedKeyword)
    return result.map(item => item.item) // 只返回匹配的项
  }

  // 对于小于3个字符的关键词，使用原生的 includes 进行匹配
  return data.filter(row =>
    row.关键词 && row.关键词.toLowerCase().includes(normalizedKeyword)
  )
}

/**
 * 执行磁力搜索
 * @param {string} searchQuery 搜索关键词
 * @returns {Promise<Array>} 返回搜索结果数组
 */
export async function performCiliSearch (searchQuery) {
  const url = `https://cili.site/search?q=${encodeURIComponent(searchQuery)}`
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('请求失败，状态码：' + response.status)
    }
    const data = await response.text()
    const results = []
    const regex = /<tr>[\s\S]*?<td>[\s\S]*?<a href="([^"]+)">[\s\S]*?<p class="sample">([^<]+)<\/p>[\s\S]*?<\/a>[\s\S]*?<\/td>[\s\S]*?<td class="td-size">([^<]+)<\/td>/g
    let match
    while ((match = regex.exec(data)) !== null) {
      const link = `https://cili.site${match[1]}`
      const title = match[2].trim()
      const size = match[3].trim()
      results.push({ title, size, link })
    }

    return results
  } catch (error) {
    throw new Error('获取数据时出错: ' + error.message)
  }
}
