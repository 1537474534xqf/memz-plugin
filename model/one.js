import fs from 'fs'

/**
 * 获取随机一言
 * @param {string} type - 响应的类型，可以是 'text' 或 'json'
 * @param {string} filePath - 一言文件的路径
 * @returns {string | object} 返回随机的一言
 */
export function getRandomYiyan (type, filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error('一言文件不存在')
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const yiyanLines = fileContent.split('\n').filter(line => line.trim() !== '')

    if (yiyanLines.length === 0) {
      return null
    }

    const randomIndex = Math.floor(Math.random() * yiyanLines.length)
    const randomYiyan = yiyanLines[randomIndex].trim()

    if (type === 'text') {
      return randomYiyan
    } else {
      return {
        data: randomYiyan
      }
    }
  } catch (error) {
    return null
  }
}
