import { Config, copyright } from '#components'
import { categorizeApiRoutes } from '../model/index.js'

export default async (req, res) => {
  let { apiList } = Config.getConfig('api')
  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })

    const categorizedApiDocumentation = categorizeApiRoutes(apiList)

    const apiDocumentation = {
      name: 'MEMZ-API',
      version: '1.0.3',
      description: '这是一个基于 MEMZ-API 搭建的服务',
      endpoints: await categorizedApiDocumentation,
      copyright
    }

    res.end(JSON.stringify(apiDocumentation, null, 2))
  }
}
