import { URL } from 'url'
import { fetchIcpInfo } from '#model'
import { MEMZ_NAME } from '#components'

const time = new Date().toISOString()

export default async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || (req.connection.encrypted ? 'https' : 'http')
    const parsedUrl = new URL(req.url, `${protocol}://${req.headers.host}`)

    const domain = parsedUrl.searchParams.get('domain')

    if (!domain) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
      return res.end(JSON.stringify({
        code: 400,
        message: '缺少必要的域名参数, 请在查询参数中添加domain参数',
        title: 'ICP备案查询',
        time,
        source: MEMZ_NAME
      }))
    }

    const icpInfo = await fetchIcpInfo(domain)
    logger.debug(`[memz-plugin] 备案查询数据: ${JSON.stringify(icpInfo)}`)

    if (!icpInfo || Object.keys(icpInfo).length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
      return res.end(JSON.stringify({
        code: 404,
        message: '未找到该域名的ICP备案信息',
        title: 'ICP备案查询',
        time,
        source: MEMZ_NAME
      }))
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 0,
      message: '查询成功',
      title: 'ICP备案查询',
      time,
      data: icpInfo,
      source: MEMZ_NAME
    }))
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 500,
      message: '查询失败',
      title: 'ICP备案查询',
      time,
      error: error.message,
      source: MEMZ_NAME
    }))
  }
}
