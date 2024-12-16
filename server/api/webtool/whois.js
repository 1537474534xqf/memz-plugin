import whois from 'whois-json'
import { URL } from 'url'
import { MEMZ_NAME } from '../../components/index.js'
const time = new Date().toISOString()
const fieldMapping = {
  domainName: '域名',
  roid: '注册号',
  domainStatus: '域名状态',
  registrant: '注册人信息',
  registrantContactEmail: '注册人邮箱',
  sponsoringRegistrar: '注册商',
  nameServer: 'DNS 服务器',
  registrationTime: '注册时间',
  expirationTime: '过期时间',
  dnssec: 'DNSSEC',
  domain: '域名',
  registrar: '注册商',
  whois_server: 'WHOIS 服务器',
  referral_url: '推荐 URL',
  updated_date: '更新日期',
  creation_date: '创建日期',
  expiration_date: '过期日期',
  status: '状态',
  nameservers: 'DNS 服务器',
  admin: '管理员信息',
  tech: '技术联系人信息',
  name: '姓名',
  organization: '组织',
  street: '街道',
  city: '城市',
  state: '省/州',
  postal_code: '邮政编码',
  country: '国家',
  phone: '电话',
  fax: '传真',
  email: '电子邮件'
}

const mapFieldsToChinese = (data) => {
  const result = {}
  for (const key in data) {
    result[fieldMapping[key] || key] = data[key]
  }
  return result
}

export default async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || (req.connection.encrypted ? 'https' : 'http')
    const parsedUrl = new URL(req.url, `${protocol}://${req.headers.host}`)

    const domain = parsedUrl.searchParams.get('domain')

    if (!domain) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({
        code: 400,
        message: '缺少必要的域名参数, 请在查询参数中添加domain参数',
        title: 'Whois查询',
        time,
        source: MEMZ_NAME
      }))
      return
    }

    const whoisData = await whois(domain)
    const chineseData = mapFieldsToChinese(whoisData)

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 0,
      message: '查询成功',
      title: 'Whois查询',
      time,
      data: chineseData,
      source: MEMZ_NAME
    }))
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 500,
      message: '查询失败',
      title: 'Whois查询',
      time,
      error: error.message,
      source: MEMZ_NAME
    }))
  }
}
