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

      // 给每行数据补充 ID
      cleanedData.forEach((row, index) => {
        row.ID = index + 1
      })

      const contentMap = new Map() // 用于检查重复内容
      const exactDuplicateSet = new Set() // 用于检查完全重复的行
      const seenRows = new Set() // 用于记录已处理的行
      const duplicateContents = [] // 存储重复内容信息
      const exactDuplicates = [] // 存储完全重复行信息

      for (let i = 0; i < cleanedData.length; i++) {
        const row = cleanedData[i]
        const content = row.内容

        // 检查内容重复
        if (content) {
          if (contentMap.has(content)) {
            contentMap.get(content).push(row.ID)
          } else {
            contentMap.set(content, [row.ID])
          }
        }

        // 检查是否有完全重复的行
        const rowString = JSON.stringify(row)
        if (seenRows.has(rowString)) {
          exactDuplicateSet.add(row.ID)
        } else {
          seenRows.add(rowString)
        }
      }

      // 查找重复的内容
      contentMap.forEach((ids, content) => {
        if (ids.length > 1) {
          duplicateContents.push(`ID ${ids.join(' 和 ')} 的内容 "${content}" 重复`)
        }
      })

      // 完全重复的行
      if (exactDuplicateSet.size > 0) {
        exactDuplicates.push(`ID ${[...exactDuplicateSet].join(' 和 ')} 的内容完全重复`)
      }

      // 重复信息
      if (duplicateContents.length > 0) {
        logger.warn(`[memz-plugin] [搜资源] 以下内容重复: ${duplicateContents.join('，')}`)
      }

      if (exactDuplicates.length > 0) {
        logger.warn(`${exactDuplicates.join('，')}`)
      }

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
  // 忽略大小写
  const normalizedKeyword = keyword.toLowerCase()
  // 加载配置
  let { threshold } = Config.getConfig('memz')
  // 配置Fuse.js
  const options = {
    keys: ['关键词'],
    threshold, // 设置阈值,模糊匹配的宽松度
    ignoreLocation: true, // 忽略匹配位置
    includeScore: true // 包含匹配的评分，评分越低表示匹配越好
  }

  const fuse = new Fuse(data, options)

  if (keyword.length >= 3) {
    const result = fuse.search(keyword)
    return result.map(item => item.item)
  }

  const result = data.filter(row =>
    row.关键词 && row.关键词.toLowerCase().includes(normalizedKeyword)
  )

  return result
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
