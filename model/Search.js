import fs from 'fs'
import xlsx from 'xlsx'
import path from 'node:path'

/**
 * 加载所有 Excel 文件中的数据
 * @returns {Array} 数据数组
 */
export function loadDataFromExcelFiles (folderPath) {
  return fs.readdirSync(folderPath)
  // 只加载 .xlsx 文件
    .filter(file => file.endsWith('.xlsx'))
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
  // 忽略大小写
  const normalizedKeyword = keyword.toLowerCase()
  // 判断关键词是否为英文
  const isEnglish = /^[a-zA-Z]+$/.test(normalizedKeyword)
  // 如果关键词<3个字符，或者是英文，则不进行模糊搜索
  if (keyword.length < 3 || isEnglish) {
    const result = data.filter(row =>
      row.关键词 && row.关键词.toLowerCase().includes(normalizedKeyword)
    )
    return result
  }
  // 如果是中文且长度>=3个字符，进行模糊搜索
  const regexPattern = normalizedKeyword.split('').join('.*')
  const regex = new RegExp(regexPattern, 'i')
  // 正则匹配
  const result = data.filter(row =>
    row.关键词 && regex.test(row.关键词.toLowerCase())
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
