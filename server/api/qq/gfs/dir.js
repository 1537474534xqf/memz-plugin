import { dir } from '../../../../model/Gfs.js'
export default async (req, res) => {
  try {
    const time = new Date().toISOString()
    const title = '群文件信息'
    const protocol = req.headers['x-forwarded-proto'] || (req.connection.encrypted ? 'https' : 'http')
    const parsedUrl = new URL(req.url, `${protocol}://${req.headers.host}`)

    const groupId = parsedUrl.searchParams.get('group')
    const pid = parsedUrl.searchParams.get('pid')

    if (!groupId) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({
        code: 400,
        message: '缺少参数,请提供要查询的群号, ?group=xxx&pid=xxx'
      }))
      return
    }

    const groupFileDir = await dir(groupId, pid)

    if (!groupFileDir) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({
        code: 500,
        message: '无法获取该群文件信息'
      }))
      return
    }

    const result = {
      code: 0,
      message: '获取成功',
      title,
      groupId,
      time,
      data: groupFileDir
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(result))
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 500,
      message: '请求失败',
      error: error.message
    }))
  }
}
