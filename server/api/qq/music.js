import { executeShareCard } from '../../model/Music.js'
import { copyright } from '#components'

export default async (req, res) => {
  try {
    const { type, title, content, singer, image } = req.body

    if (!type || !title || !content || !singer || !image) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
      return res.end(JSON.stringify({
        code: 400,
        message: '缺少必要的请求参数,请在请求体中提供 type, title, content, singer, image',
        copyright
      }))
    }

    const shareCardResult = await executeShareCard(type, title, content, singer, image)

    if (!shareCardResult) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
      return res.end(JSON.stringify({
        code: 500,
        message: '卡片分享失败',
        copyright
      }))
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    return res.end(JSON.stringify({
      code: 0,
      message: '卡片分享成功',
      data: JSON.parse(shareCardResult),
      copyright
    }))
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    return res.end(JSON.stringify({
      code: 500,
      message: '请求失败',
      error: error.message,
      copyright
    }))
  }
}
