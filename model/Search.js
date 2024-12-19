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
export function searchResources (keyword, data) {
  // 如果关键词小于3个字符，不进行搜索
  if (keyword.length < 3) {
    return JSON.stringify({ matchedResources: [] })
  }

  // 将搜索词拆分为连续的字符三元组（最小三字）
  const keywordTriples = []
  for (let i = 0; i < keyword.length - 2; i++) {
    // 取相邻的三个字符
    keywordTriples.push(keyword.slice(i, i + 3))
  }

  // 检查每组三个字符是否出现在资源的相关字段中
  const result = data.filter(row => {
    return keywordTriples.some(triple =>
      (row.关键词 && row.关键词.includes(triple)) ||
      (row.内容 && row.内容.includes(triple)) ||
      (row.分类 && row.分类.includes(triple))
    )
  })

  return JSON.stringify({ matchedResources: result })
}
