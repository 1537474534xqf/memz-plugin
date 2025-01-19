import { copyright } from '#components'
import logger from '../../lib/logger.js'
import { fetchQQRegistrationDate } from '../../model/QQ/QQAge.js'
export default async (req, res) => {
  try {
    const time = new Date().toISOString()
    const title = 'QQ注册时间查询'
    const protocol = req.headers['x-forwarded-proto'] || (req.connection.encrypted ? 'https' : 'http')
    const parsedUrl = new URL(req.url, `${protocol}://${req.headers.host}`)

    const qqNumber = parsedUrl.searchParams.get('qq')

    if (!qqNumber) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({
        code: 400,
        message: '缺少 qq 参数,请提供要查询的 QQ 号码, qq=?',
        copyright
      }))
      return
    }

    const registrationInfo = await fetchQQRegistrationDate(qqNumber)
    logger.debug(`[MEMZ-API] 查询QQ注册时间：QQ号 ${qqNumber}, 注册时间: ${JSON.stringify(registrationInfo)}`)

    if (!registrationInfo) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({
        code: 500,
        message: '无法获取QQ注册时间',
        copyright
      }))
      return
    }

    const result = {
      code: 0,
      message: '获取成功',
      title,
      time,
      data: registrationInfo,
      copyright
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(result))
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 500,
      message: '请求失败',
      error: error.message,
      copyright
    }))
  }
}
