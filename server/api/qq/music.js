import { executeShareCard } from '../../model/QQ/b77.js'
import { copyright } from '#components'

export default async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' })
    return res.end(JSON.stringify({
      code: 405,
      message: '仅支持 POST 请求',
      copyright
    }))
  }

  try {
    let body = ''

    req.on('data', chunk => {
      body += chunk
    })

    req.on('end', async () => {
      try {
        const { type, title, content, singer, image } = JSON.parse(body)

        if (!type || !title || !content || !singer || !image) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
          return res.end(JSON.stringify({
            code: 400,
            message: '缺少必要的请求参数，请在请求体中提供 type, title, content, singer, image',
            copyright
          }))
        }

        const shareCardResult = await executeShareCard(type, title, content, singer, image)

        if (!shareCardResult) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
          return res.end(JSON.stringify({
            code: 500,
            message: '失败，无法获取数据',
            copyright
          }))
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
        return res.end(JSON.stringify({
          code: 0,
          message: '成功',
          data: JSON.parse(shareCardResult),
          copyright
        }))
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
        return res.end(JSON.stringify({
          code: 500,
          message: '请求失败，无法解析请求体',
          error: error.message,
          copyright
        }))
      }
    })

    req.on('error', (error) => {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
      return res.end(JSON.stringify({
        code: 500,
        message: '请求失败，读取请求体时发生错误',
        error: error.message,
        copyright
      }))
    })
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    return res.end(JSON.stringify({
      code: 500,
      message: '服务器错误',
      error: error.message,
      copyright
    }))
  }
}
