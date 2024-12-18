import iconv from 'iconv-lite'
import * as cheerio from 'cheerio'

// ICP备案查询
export async function fetchIcpInfo (domain) {
  // 去掉一些奇奇怪怪的东西
  domain = domain.replace(/^https?:\/\//, '')
  domain = domain.replace(/^www\./, '')
  domain = domain.split('/')[0].split('?')[0].split('#')[0]

  const url = `https://whois.west.cn/icp/${domain.split('/').pop()}`

  logger.debug(`[memz-plugin] 备案查询域名: ${domain}`)

  try {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()

    const html = iconv.decode(Buffer.from(arrayBuffer), 'gbk')

    const $ = cheerio.load(html)
    const icpInfo = {}

    $('tbody tr').each((index, element) => {
      const left = $(element).find('.table-left').text().trim()
      const right = $(element).find('.table-right .domaininfo').text().trim()

      if (left && right) {
        icpInfo[left] = right
      }
    })

    return icpInfo
  } catch (error) {
    logger.error('[memz-plugin] Error fetching ICP info:', error)
    throw error
  }
}

// whois
const whoisFieldsMap = {
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
export async function translateWhoisData (data) {
  return Object.entries(data).reduce((acc, [key, value]) => {
    const translatedKey = whoisFieldsMap[key] || key
    acc[translatedKey] =
      typeof value === 'object' && !Array.isArray(value)
        ? translateWhoisData(value)
        : value
    return acc
  }, {})
}
