import { URL } from 'url'
import { fetchSeoFromHtml } from '#model'
import { MEMZ_NAME } from '#components'

const time = new Date().toISOString()

export default async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || (req.connection.encrypted ? 'https' : 'http')
    const parsedUrl = new URL(req.url, `${protocol}://${req.headers.host}`)

    const url = parsedUrl.searchParams.get('url')

    if (!url) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
      return res.end(JSON.stringify({
        code: 400,
        message: '缺少必要的URL参数, 请在查询参数中添加url参数',
        title: 'SEO查询',
        time,
        source: MEMZ_NAME
      }))
    }

    const seoInfoJson = await fetchSeoFromHtml(url)

    const seoInfo = JSON.parse(seoInfoJson)

    if (!seoInfo || Object.keys(seoInfo).length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
      return res.end(JSON.stringify({
        code: 404,
        message: '未找到该域名的SEO信息',
        title: 'SEO查询',
        time,
        source: MEMZ_NAME
      }))
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 0,
      message: '查询成功',
      title: 'SEO查询',
      time,
      data: seoInfo,
      source: MEMZ_NAME
    }))
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 500,
      message: '查询失败',
      title: 'SEO查询',
      time,
      error: error.message,
      source: MEMZ_NAME
    }))
  }
}
