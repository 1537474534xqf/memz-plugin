import { copyright } from '#components'
export default async (req, res) => {
  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })

    const apiDocumentation = {
      name: 'MEMZ API',
      version: '1.0.0',
      description: '这是一个示例的 MEMZ-API 服务',
      endpoints: [
        {
          path: '/health',
          method: 'GET',
          description: '检查 API 服务是否正常运行'
        },
        {
          path: '/stats',
          method: 'GET',
          description: '获取访问统计数据'
        },
        {
          path: '/bilibili/hot',
          method: 'GET',
          description: '获取BiliBili热榜'
        },
        {
          path: '/steam/hot',
          method: 'GET',
          description: '获取Steam热榜'
        },
        {
          path: '/webtool/whois?domain=域名',
          method: 'GET',
          description: '获取域名的Whois信息'
        },
        {
          path: '/webtool/icp?domain=域名',
          method: 'GET',
          description: '获取域名的ICP备案信息'
        },
        {
          path: '/webtool/seo?url=链接',
          method: 'GET',
          description: '获取链接的SEO信息'
        },
        {
          path: '/search/game?key=游戏关键词',
          method: 'GET',
          description: '搜索单机破解游戏'
        }
      ],
      copyright
    }

    res.end(JSON.stringify(apiDocumentation, null, 2))
  }
}
