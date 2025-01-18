import { performCiliSearch } from '../../../model/Search.js'

import { copyright } from '#components'
export default async (req, res) => {
  const time = new Date().toISOString()
  try {
    const protocol = req.headers['x-forwarded-proto'] || (req.connection.encrypted ? 'https' : 'http')
    const parsedUrl = new URL(req.url, `${protocol}://${req.headers.host}`)

    const key = parsedUrl.searchParams.get('key')

    if (!key) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
      return res.end(JSON.stringify({
        code: 400,
        message: '缺少必要的查询参数, 请在查询参数中添加key参数',
        title: '磁力搜索',
        time,
        copyright
      }))
    }

    const searchResults = await performCiliSearch(key)

    if (!searchResults || searchResults.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
      return res.end(JSON.stringify({
        code: 404,
        message: '未找到相关的搜索结果',
        title: '磁力搜索',
        time,
        copyright
      }))
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 0,
      message: '查询成功',
      title: '磁力搜索',
      time,
      data: searchResults,
      copyright
    }))
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 500,
      message: '查询失败',
      title: '磁力搜索',
      time,
      error: error.message,
      copyright
    }))
  }
}
