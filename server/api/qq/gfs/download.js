import { download } from '../../../../model/Gfs.js'

export const title = '群文件下载'
export const key = { group: ['需要查询的群号'], fid: ['需要查询的文件ID'] }

export default async (req, res) => {
  const time = new Date().toISOString()
  try {
    const protocol = req.headers['x-forwarded-proto'] || (req.connection.encrypted ? 'https' : 'http')
    const parsedUrl = new URL(req.url, `${protocol}://${req.headers.host}`)

    const groupId = parsedUrl.searchParams.get('group')
    const fid = parsedUrl.searchParams.get('fid')

    if (!groupId) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({
        code: 400,
        message: '缺少参数,请提供要查询的群号, ?group=xxx&fid=xxx'
      }))
      return
    }

    const groupFileUrl = await download(groupId, fid)

    if (!groupFileUrl) {
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
      data: groupFileUrl
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(result))
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 500,
      message: '请求失败',
      time,
      error: error.message
    }))
  }
}
