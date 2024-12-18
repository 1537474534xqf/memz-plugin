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
 * 根据关键词搜索资源
 * @param {string} keyword 关键词
 * @param {Array} data 数据
 * @returns {Object} 返回包含匹配资源的JSON对象
 */
export function searchResources (keyword, data) {
  const result = data.filter(row => row.关键词.includes(keyword))
  return JSON.stringify({ matchedResources: result })
}
