import { searchResources, loadDataFromExcelFiles } from '#model'
import { PluginData, copyright } from '#components'
import path from 'path'

const folderPath = path.join(PluginData, 'xlsx')

// 缓存
let cachedData = null
async function loadData () {
  if (cachedData) {
    return cachedData
  }

  try {
    cachedData = loadDataFromExcelFiles(folderPath)
    return cachedData
  } catch (error) {
    throw new Error('加载数据失败: ' + error.message)
  }
}

export default async (req, res) => {
  let time = new Date().toISOString()
  const protocol = req.headers['x-forwarded-proto'] || (req.connection.encrypted ? 'https' : 'http')
  const parsedUrl = new URL(req.url, `${protocol}://${req.headers.host}`)

  const key = parsedUrl.searchParams.get('key')

  if (!key) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
    return res.end(JSON.stringify({
      code: 400,
      message: '缺少必要的查询参数, 请在查询参数中添加key参数',
      title: '游戏搜索',
      time,
      Copyright: copyright
    }))
  }

  try {
    const data = await loadData()

    const searchResults = await searchResources(key, data)

    if (!searchResults || searchResults.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
      return res.end(JSON.stringify({
        code: 404,
        message: '未找到相关的搜索结果',
        title: '游戏搜索',
        time,
        copyright
      }))
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 0,
      message: '查询成功',
      title: '游戏搜索',
      time,
      data: searchResults,
      copyright
    }))
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 500,
      message: '查询失败',
      title: '游戏搜索',
      time,
      error: error.message,
      copyright
    }))
  }
}
