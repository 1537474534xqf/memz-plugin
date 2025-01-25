import { copyright } from '#components'
import { generateApiDocs } from '../model/apiDocs.js'

export const title = 'API文档'

export default async (req, res) => {
  if (req.method === 'GET') {
    try {
      const apiDocs = await generateApiDocs()

      const apiDocumentation = {
        name: 'MEMZ-API',
        version: '1.0.12',
        description: '这是一个基于 MEMZ-API 搭建的服务',
        apis: apiDocs,
        copyright
      }

      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      })
      res.end(JSON.stringify(apiDocumentation, null, 2))
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({
        code: 500,
        message: '生成API文档失败',
        error: error.message,
        copyright
      }))
    }
  } else {
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 405,
      message: '仅支持GET请求',
      copyright
    }))
  }
}
