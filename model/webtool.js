import iconv from 'iconv-lite'
import * as cheerio from 'cheerio'
import axios from 'axios'
import https from 'https'
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

// whois 翻译
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
  email: '电子邮件',
  adminContact: '管理员联系信息',
  techContact: '技术联系信息',
  updated: '更新',
  created: '创建',
  lastModified: '最后修改',
  address: '地址',
  countryCode: '国家代码',
  cityCode: '城市代码',
  zip: '邮政编码',
  registrationStatus: '注册状态',
  registrarName: '注册商名称',
  registrarOrganization: '注册商组织',
  domainOwner: '域名所有者',
  registrarAddress: '注册商地址',
  registrarPhone: '注册商电话',
  registrarFax: '注册商传真',
  registrarEmail: '注册商电子邮件',
  registrarWebsite: '注册商网站',
  domainAge: '域名年龄',
  renewalDate: '续费日期',
  lastUpdate: '最后更新时间',
  registrarCountry: '注册商国家',
  updatedBy: '更新者',
  registrationDate: '注册日期',
  serverStatus: '服务器状态',
  dnsServer: 'DNS 服务器',
  nameServerCount: 'DNS 服务器数量',
  domainType: '域名类型',
  registrarId: '注册商 ID',
  registrarStatus: '注册商状态',
  domainExpiration: '域名过期',
  dnsRecords: 'DNS 记录',
  whoisResponse: 'WHOIS 响应',
  domainAvailability: '域名可用性',
  registrarContact: '注册商联系信息',
  registrantType: '注册人类型',
  contactInfo: '联系信息',
  domainTransfer: '域名转移',
  transferStatus: '转移状态',
  transferCode: '转移代码',
  transferExpiration: '转移过期时间',
  transferDate: '转移日期',
  domainOwnerContact: '域名所有者联系信息',
  domainRegistrarContact: '域名注册商联系信息',
  adminEmail: '管理员电子邮件',
  techEmail: '技术联系人电子邮件',
  domainNameServers: '域名服务器',
  registryData: '注册数据',
  registrarEmailAddress: '注册商电子邮件地址',
  creationStatus: '创建状态',
  creationMethod: '创建方式',
  domainTransferStatus: '域名转移状态',
  nameServerType: 'DNS 服务器类型',
  serverIPAddress: '服务器 IP 地址',
  serverCountry: '服务器国家',
  domainID: '域名 ID',
  registrarID: '注册商 ID',
  domainRegistrarName: '域名注册商名称',
  registrantCountry: '注册人国家',
  registrantAddress: '注册人地址',
  domainProvider: '域名提供商',
  transferProvider: '转移提供商',
  domainStatusCode: '域名状态码',
  domainStatusMessage: '域名状态信息',
  dnsStatus: 'DNS 状态',
  dnsRecordType: 'DNS 记录类型',
  dnsRecordValue: 'DNS 记录值',
  registryStatus: '注册状态',
  registryCountry: '注册国家',
  registryExpiration: '注册过期日期',
  registryOwner: '注册所有者',
  registryCreationDate: '注册创建日期',
  registryUpdatedDate: '注册更新日期',
  registrarTransferCode: '注册商转移代码',
  whoisVersion: 'WHOIS 版本',
  whoisProtocol: 'WHOIS 协议',
  dnsTTL: 'DNS 存活时间',
  dnsHost: 'DNS 主机',
  registryServer: '注册服务器',
  registryName: '注册名称',
  domainContactEmail: '域名联系人电子邮件',
  domainContactPhone: '域名联系人电话',
  domainContactFax: '域名联系人传真',
  domainContactName: '域名联系人姓名',
  domainContactOrganization: '域名联系人组织',
  domainContactStreet: '域名联系人街道',
  domainContactCity: '域名联系人城市',
  domainContactState: '域名联系人省/州',
  domainContactPostalCode: '域名联系人邮政编码',
  domainContactCountry: '域名联系人国家',
  domainContactCountryCode: '域名联系人国家代码',
  domainContactEmailVerified: '域名联系人邮箱验证',
  domainContactPhoneVerified: '域名联系人电话验证',
  domainTransferLock: '域名转移锁定',
  domainAutoRenew: '域名自动续费',
  domainRenewStatus: '域名续费状态',
  domainServerStatus: '域名服务器状态',
  domainCreationStatus: '域名创建状态',
  domainCreationMethod: '域名创建方式',
  domainCategory: '域名类别',
  domainAdminEmail: '域名管理员电子邮件',
  domainAdminPhone: '域名管理员电话',
  domainTechEmail: '域名技术联系人电子邮件',
  domainTechPhone: '域名技术联系人电话',
  domainDNSSECStatus: '域名 DNSSEC 状态',
  domainDNSSECKeyAlgorithm: '域名 DNSSEC 密钥算法',
  domainDNSSECSignature: '域名 DNSSEC 签名',
  domainDNSSECKeyLength: '域名 DNSSEC 密钥长度',
  domainDNSSECPublicKey: '域名 DNSSEC 公钥',
  domainNameServerUpdateTime: '域名服务器更新时间',
  domainStatusHistory: '域名状态历史',
  domainRegistrantHistory: '域名注册人历史',
  domainRegistrarHistory: '域名注册商历史',
  domainIPHistory: '域名 IP 地址历史',
  domainNameserverHistory: '域名服务器历史',
  domainTransferHistory: '域名转移历史',
  domainRegistrarTransferHistory: '域名注册商转移历史',
  domainRegistrationLock: '域名注册锁定',
  domainAuthCode: '域名授权码',
  domainNameserverCount: '域名服务器数量',
  domainNameServersTTL: '域名服务器 TTL',
  domainValidationStatus: '域名验证状态',
  domainRegExp: '域名正则表达式',
  domainNameLength: '域名长度',
  domainValidityPeriod: '域名有效期',
  domainLastModifiedDate: '域名最后修改日期',
  domainServerAddress: '域名服务器地址',
  domainWhoisServer: '域名 WHOIS 服务器',
  domainRegistrarStatus: '域名注册商状态',
  regContactEmail: '注册联系邮箱',
  regContactPhone: '注册联系电话',
  regContactFax: '注册联系传真',
  regContactName: '注册联系人姓名',
  regContactOrganization: '注册联系人组织',
  regContactStreet: '注册联系人街道',
  regContactCity: '注册联系人城市',
  regContactState: '注册联系人省/州',
  regContactPostalCode: '注册联系人邮政编码',
  regContactCountry: '注册联系人国家',
  regContactCountryCode: '注册联系人国家代码',
  regContactEmailVerified: '注册联系人邮箱验证',
  regContactPhoneVerified: '注册联系人电话验证',
  adminContactEmail: '管理员联系邮箱',
  adminContactPhone: '管理员联系电话',
  adminContactFax: '管理员联系传真',
  adminContactName: '管理员联系人姓名',
  adminContactOrganization: '管理员联系人组织',
  adminContactStreet: '管理员联系人街道',
  adminContactCity: '管理员联系人城市',
  adminContactState: '管理员联系人省/州',
  adminContactPostalCode: '管理员联系人邮政编码',
  adminContactCountry: '管理员联系人国家',
  adminContactCountryCode: '管理员联系人国家代码',
  adminContactEmailVerified: '管理员联系人邮箱验证',
  adminContactPhoneVerified: '管理员联系人电话验证',
  techContactEmail: '技术联系人邮箱',
  techContactPhone: '技术联系人电话',
  techContactFax: '技术联系人传真',
  techContactName: '技术联系人姓名',
  techContactOrganization: '技术联系人组织',
  techContactStreet: '技术联系人街道',
  techContactCity: '技术联系人城市',
  techContactState: '技术联系人省/州',
  techContactPostalCode: '技术联系人邮政编码',
  techContactCountry: '技术联系人国家',
  techContactCountryCode: '技术联系人国家代码',
  techContactEmailVerified: '技术联系人邮箱验证',
  techContactPhoneVerified: '技术联系人电话验证'
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

// SEO 查询
export async function fetchSeoFromHtml (url) {
  try {
    if (!url.startsWith('http')) {
      url = `https://${url}`
    }

    const validUrl = new URL(url)
    logger.debug(`[memz-plugin] SEO 查询 URL: ${validUrl.href}`)

    // 忽略 SSL 验证
    const agent = new https.Agent({
      rejectUnauthorized: false
    })

    const response = await axios.get(validUrl.href, {
      httpsAgent: agent,
      timeout: 10000
    })

    if (response.status !== 200) {
      throw new Error(`无法访问 URL: ${url} (Status: ${response.status})`)
    }
    const html = response.data
    const titleMatch = html.match(/<title>(.*?)<\/title>/i)
    const descriptionMatch = html.match(
      /<meta\s+name=["']description["']\s+content=["'](.*?)["']/i
    )
    const keywordsMatch = html.match(
      /<meta\s+name=["']keywords["']\s+content=["'](.*?)["']/i
    )

    return JSON.stringify({
      title: titleMatch ? titleMatch[1] : '未找到标题',
      description: descriptionMatch ? descriptionMatch[1] : '未找到描述',
      keywords: keywordsMatch ? keywordsMatch[1] : '未找到关键词'
    })
  } catch (error) {
    return JSON.stringify({
      error: true,
      message: `发生错误: ${error.message}`
    })
  }
}
