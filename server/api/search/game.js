import { searchResources, loadDataFromExcelFiles } from '#model'
import { MEMZ_NAME, PluginData } from '#components'
import path from 'path'

const folderPath = path.join(PluginData, 'xlsx')
const time = new Date().toISOString()

// 加载数据
async function loadData () {
  try {
    const data = await loadDataFromExcelFiles(folderPath)
    return data
  } catch (error) {
    throw new Error('加载数据失败: ' + error.message)
  }
}

async function searchData (key, data) {
  const resultsJson = searchResources(key, data)
  const results = JSON.parse(resultsJson).matchedResources
  return results
}

export default async (req, res) => {
  try {
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
        source: MEMZ_NAME
      }))
    }

    const data = await loadData()

    const searchResults = await searchData(key, data)

    if (!searchResults || searchResults.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
      return res.end(JSON.stringify({
        code: 404,
        message: '未找到相关的搜索结果',
        title: '游戏搜索',
        time,
        source: MEMZ_NAME
      }))
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 0,
      message: '查询成功',
      title: '游戏搜索',
      time,
      data: searchResults,
      source: MEMZ_NAME
    }))
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 500,
      message: '查询失败',
      title: '游戏搜索',
      time,
      error: error.message,
      source: MEMZ_NAME
    }))
  }
}
