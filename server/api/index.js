import { copyright } from '#components'
import { generateApiDocs } from '../model/apiDocs.js'

export const title = 'API文档'
export const method = 'GET'
export const description = '获取所有API接口的文档信息'

export default async (req, res) => {
  if (req.method === 'GET') {
    try {
      const apiDocs = await generateApiDocs()

      const apiDocumentation = {
        code: 0,
        message: '获取成功',
        name: 'MEMZ-API',
        version: '1.0.12',
        description: '这是一个基于 MEMZ-API 搭建的服务',
        time: new Date().toISOString(),
        data: apiDocs,
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
