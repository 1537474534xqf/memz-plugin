import fs from 'fs'
import xlsx from 'xlsx'
import path from 'node:path'

/**
 * 加载所有 Excel 文件中的数据
 * @returns {Array} 数据数组
 */
export function loadDataFromExcelFiles (folderPath) {
  return fs.readdirSync(folderPath)
    .filter(file => file.endsWith('.xlsx')) // 只加载 .xlsx 文件
    .flatMap(file => {
      const filePath = path.join(folderPath, file)
      const workbook = xlsx.readFile(filePath)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]

      const data = xlsx.utils.sheet_to_json(sheet, {
        header: ['ID', '关键词', '内容', '分类'],
        defval: '',
        range: 1
      })

      // 删除 ID 字段
      return data.map(row => {
        const { ID, ...rest } = row
        return rest
      })
    })
}
/**
 * 根据关键词搜索资源（支持模糊匹配，最小匹配为三个字连续字符）
 * @param {string} keyword 关键词
 * @param {Array} data 数据
 * @returns {Object} 返回包含匹配资源的JSON对象
 */
export async function searchResources (keyword, data) {
  // 如果关键词小于3个字符不进行模糊搜索
  if (keyword.length < 3) {
    const result = data.filter(row =>
      (row.关键词 && row.关键词.includes(keyword))
    )
    return result
  }

  // 如果关键词长度大于等于3个字符，进行模糊搜索
  const keywordTriples = []
  for (let i = 0; i < keyword.length - 2; i++) {
    // 取相邻的三个字符
    keywordTriples.push(keyword.slice(i, i + 3))
  }

  // 使用模糊匹配，检查每组三个字符是否出现在资源的相关字段中
  const result = data.filter(row => {
    return keywordTriples.some(triple =>
      (row.关键词 && row.关键词.includes(triple))
    )
  })

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
