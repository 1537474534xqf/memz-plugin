import { URL } from 'url'
import { copyright } from '#components'

const title = '跳转'

export default async (req, res) => {
  const time = new Date().toISOString()

  try {
    const protocol = req.headers['x-forwarded-proto'] || (req.connection.encrypted ? 'https' : 'http')
    const parsedUrl = new URL(req.url, `${protocol}://${req.headers.host}`)
    const targetUrl = parsedUrl.searchParams.get('url')

    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
      return res.end(JSON.stringify({
        code: 400,
        message: '缺少必要的url参数, 请在查询参数中添加url参数',
        title,
        time,
        copyright
      }))
    }

    res.writeHead(302, { Location: targetUrl })
    res.end()
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 500,
      message: '跳转失败',
      title,
      time,
      error: error.message,
      copyright
    }))
  }
}
