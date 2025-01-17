import fs from 'fs'
import whois from 'whois-json'
import axios from 'axios'
import * as cheerio from 'cheerio'
import dns from 'dns'
import net from 'net'

import { generateScreenshot, fetchIcpInfo, translateWhoisData, fetchSeoFromHtml, checkHttpStatus, fetchSslInfo } from '#model'
import { Config, PluginPath } from '#components'
import puppeteer from '../../../lib/puppeteer/puppeteer.js'

async function encodeToUnicode (msg) {
  return msg
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0).toString(16).padStart(4, '0')
      return `\\u${code}`
    })
    .join('')
}

async function decodeFromUnicode (unicodeStr) {
  return unicodeStr.replace(/\\u[\dA-Fa-f]{4}/g, (match) =>
    String.fromCharCode(parseInt(match.replace('\\u', ''), 16))
  )
}

async function encodeToAscii (msg) {
  return msg
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0)
      return `\\x${code.toString(16).padStart(2, '0')}`
    })
    .join('')
}

async function decodeFromAscii (asciiStr) {
  return asciiStr.replace(/\\x[\dA-Fa-f]{2}/g, (match) =>
    String.fromCharCode(parseInt(match.replace('\\x', ''), 16))
  )
}

async function convertBase (number, fromBase, toBase) {
  if (fromBase < 2 || fromBase > 36 || toBase < 2 || toBase > 36) {
    throw new Error('Base must be in the range 2-36')
  }
  const base10Number = parseInt(number, fromBase)
  if (isNaN(base10Number)) {
    throw new Error(`Invalid number "${number}" for base ${fromBase}`)
  }
  await new Promise((resolve) => setTimeout(resolve, 100))
  return base10Number.toString(toBase).toUpperCase()
}
/**
 * 获取域名是否注册
 * @param {string} domain - 域名
 * @returns {Promise<boolean>} 返回布尔值,true表示未注册，false表示已注册
 */
export async function isDomainAvailable (domain) {
  const url = `https://checkapi.aliyun.com/check/v2/domaincheck?domainName=${encodeURIComponent(domain)}&productID=16093&checkRegistry=true`

  try {
    const response = await axios.get(url)
    const data = response.data

    if (!data || !data.data) {
      logger.error(`[memz-plugin] 域名 ${domain} 的数据无效`)
      return false
    }

    const avail = data.data.avail

    logger.debug(`[memz-plugin] 域名 ${domain} 注册状态: ${avail}`)

    if (avail) {
      logger.info(`[memz-plugin] 域名 ${domain} 未注册`)
      return true // 未注册
    } else {
      logger.info(`[memz-plugin] 域名 ${domain} 已注册`)
      return false // 已注册
    }
  } catch (error) {
    logger.error(`[memz-plugin] 获取域名 ${domain} 是否注册失败: ${error.message}`)
    return false // 请求失败
  }
}
/**
 * 获取域名注册商的价格信息
 * @param {string} domain - 域名后缀
 * @param {string} order - 排序类型：new（注册价格排序）、renew（续费价格排序）、transfer（转入价格排序）
 * @param {number} count - 返回的结果数量，最大为 5
 * @returns {Promise<string>} 返回文本格式
 */
export async function fetchDomainPricing (domain, order = 'new', count = 5) {
  const apiUrl = 'https://www.nazhumi.com/api/v1'

  try {
    const response = await axios.get(apiUrl, {
      params: {
        domain,
        order,
        count
      }
    })

    if (response.data.code !== 100) {
      throw new Error(`API 返回异常：${response.data.message}`)
    }

    const data = response.data.data
    let textOutput = `域名后缀: ${data.domain}\n`

    data.price.forEach((item, index) => {
      textOutput += `------注册商 #${index + 1}------\n`
      textOutput += `注册商名称: ${item.registrarname}\n`
      textOutput += `注册价格: ${item.new} ${item.currencyname}\n`
      textOutput += `续费价格: ${item.renew} ${item.currencyname}\n`
      textOutput += `转入价格: ${item.transfer} ${item.currencyname}\n`

      if (item.promocode.new || item.promocode.renew || item.promocode.transfer) {
        textOutput += '优惠码:\n'
        if (item.promocode.new) {
          textOutput += '注册: 有\n'
        } else {
          textOutput += '注册: 无\n'
        }
        if (item.promocode.renew) {
          textOutput += '续费: 有\n'
        } else {
          textOutput += '续费: 无\n'
        }
        if (item.promocode.transfer) {
          textOutput += '转入: 有\n'
        } else {
          textOutput += '转入: 无\n'
        }
      }
      textOutput += `数据更新时间: ${item.updatedtime}\n`
    })

    textOutput += '\n价格仅为常规情况，以实际购买为准'
    return textOutput
  } catch (error) {
    logger.error('获取域名注册商价格信息失败:', error.message)
    throw new Error('请求失败', error)
  }
}
export class WebTools extends plugin {
  constructor () {
    super({
      name: 'WebTools',
      dsc: 'WebTools',
      event: 'message',
      priority: -1,
      rule: [
        {
          reg: '^#?seo\\s*(.+)',
          fnc: 'fetchSeoInfoHandler'
        },
        {
          reg: /^(#?)(url)(编码|解码)\s*(.+)/,
          fnc: 'handleUrlEncodingDecoding'
        },
        {
          reg: /^(#?)(unicode|ascii)(编码|解码)\s*(.+)/,
          fnc: 'handleEncodingDecoding'
        },
        {
          reg: '^#?whois\\s*(.+)',
          fnc: 'Whois'
        },
        {
          reg: '^#?域名备案查询\\s*(.+)',
          fnc: 'domainIcp'
        },
        {
          reg: '^#?网页截图\\s*(\\S+.*)',
          fnc: 'webpage'
        },
        {
          reg: '^#?进制转换\\s*(.+)',
          fnc: 'BaseConversion'
        },
        {
          reg: '^#hex(编码|解码)\\s*(.*)$',
          fnc: 'handleHexOperation'
        },
        {
          reg: '^#去空格\\s*(.*)$',
          fnc: 'removeSpaces'
        },
        {
          reg: /^#?域名查询\s*(\S+)$/i,
          fnc: 'DomainMinPricing'
        },
        {
          reg: /^#?http状态查询\s*(.+)/i,
          fnc: 'httpStatusCheck'
        },
        {
          reg: /^#?ssl证书查询\s*(.+)/i,
          fnc: 'SslInfo'
        },
        {
          reg: '^#?(获取)?网站图标\\s*(\\S+.*)',
          fnc: 'getFavicon'
        },
        {
          reg: '^#(ipinfo|ip信息)\\s*(\\S+)$',
          fnc: 'ipinfo'
        }
      ]
    })
  }

  async removeSpaces (e) {
    const { removeSpacesAll } = Config.getConfig('memz')

    if (!removeSpacesAll && !e.isMaster) {
      return logger.warn('[memz-plugin] 去空格功能当前为仅主人可用')
    }
    const msg = e.msg.replace(/^#去空格\s*/, '')
    if (!msg) {
      return e.reply('请提供需要去空格的文本。', true)
    }
    const noSpacesText = msg.replace(/\s+/g, '')
    return e.reply(noSpacesText, true)
  }

  async SslInfo (e) {
    const { SslInfoAll } = Config.getConfig('memz')

    if (!SslInfoAll && !e.isMaster) {
      return logger.warn('[memz-plugin] SSL证书查询当前为仅主人可用')
    }

    let url = e.msg.match(/^#?ssl证书查询\s*(.+)/i)

    if (!url) {
      return await e.reply('未识别到有效的URL，请确保输入格式正确。', true)
    }

    url = url[1].trim()

    try {
      const sslInfo = await fetchSslInfo(url)

      const sslInfoFormatted = `证书主域名: ${sslInfo.certificateIssuedTo}
签发人: ${sslInfo.issuer}
是否有效: ${sslInfo.isValid ? '有效' : '无效'}
是否过期: ${sslInfo.isExpired ? '是' : '否'}
生效开始时间: ${sslInfo.validFrom}
生效结束时间: ${sslInfo.validTo}
签名算法: ${sslInfo.signatureAlgorithm}
其他域名: ${sslInfo.otherDomains.join(', ') || '无'}
指纹信息: ${sslInfo.fingerprint}
指纹信息(SHA256): ${sslInfo.fingerprintSHA256}`

      await e.reply(sslInfoFormatted, true)
    } catch (error) {
      logger.error(`[memz-plugin] SSL证书查询失败: ${error.message}`)
      await e.reply(`获取失败: ${error.message}`, true)
    }
  }

  async DomainMinPricing (e) {
    const { DomainMinPricingAll } = Config.getConfig('memz')
    if (!DomainMinPricingAll && !e.isMaster) {
      return logger.warn('[memz-plugin]Seo状态当前为仅主人可用')
    }
    let domain = e.msg.match(/^#?域名查询\s*(.+)/)
    if (!domain) {
      return await e.reply('未识别到有效的域名，请确保输入格式正确。', true)
    }
    domain = domain[1].trim()

    try {
      // 判断域名or域名后缀
      const domainParts = domain.split('.')
      const isFullDomain = domainParts.length > 1

      // 完整域名
      if (isFullDomain) {
        const domainAvail = await isDomainAvailable(domain)
        if (!domainAvail) {
          await e.reply('域名已被注册或不可用!', true)
          // Whois,顺手的事
          e.msg = `#whois ${domain}`
          return this.Whois(e)
        }
      }
      // 获取域名后缀
      const domainSuffix = domainParts[domainParts.length - 1]
      const seoInfoJson = await fetchDomainPricing(domainSuffix)

      await e.reply(seoInfoJson, true)
    } catch (error) {
      logger.error(`[memz-plugin] 域名查询失败: ${error.message}`)
      await e.reply(`获取失败: ${error.message}`, true)
    }
  }

  async httpStatusCheck (e) {
    const { httpStatusAll } = Config.getConfig('memz')

    if (!httpStatusAll && !e.isMaster) {
      return logger.warn('[memz-plugin] HTTP 状态检查功能当前为仅主人可用')
    }

    let urlMatch = e.msg.match(/^#?http状态查询\s*(.+)/i)
    if (!urlMatch) {
      return await e.reply('请输入有效的网址', true)
    }

    let url = urlMatch[1].trim()
    let status = await checkHttpStatus(url)
    e.reply(status, true)
  }

  async fetchSeoInfoHandler (e) {
    const { SeoAll } = Config.getConfig('memz')
    if (!SeoAll && !e.isMaster) {
      return logger.warn('[memz-plugin]Seo状态当前为仅主人可用')
    }

    let url = e.msg.match(/^#?seo\s*(.+)/)
    if (!url) {
      return await e.reply('未识别到有效的URL，请确保输入格式正确。', true)
    }
    url = url[1].trim()

    try {
      const seoInfoJson = await fetchSeoFromHtml(url)

      const seoInfo = JSON.parse(seoInfoJson)

      if (seoInfo.error) {
        return await e.reply(`SEO抓取失败: ${seoInfo.message}`, true)
      }
      const result = `---SEO信息---\n页面标题: ${seoInfo.title}\n描述: ${seoInfo.description}\n关键词: ${seoInfo.keywords}`
      await e.reply(result, true)
    } catch (error) {
      await e.reply(`抓取失败: ${error.message}`, true)
    }
  }

  async handleReply (e, handler) {
    const msg = e.msg.match(handler.reg)
    const operation = msg[2]
    const action = msg[3]
    const input = msg[4].trim()

    let result
    try {
      if (operation === 'url') {
        result = action === '编码' ? encodeURIComponent(input) : decodeURIComponent(input)
      }

      await e.reply(`结果: ${result}`, true)
    } catch (error) {
      await e.reply(`Error: ${error.message}`)
    }
  }

  async handleUrlEncodingDecoding (e) {
    const { UrlAll } = Config.getConfig('memz')
    if (!UrlAll && !e.isMaster) { return logger.warn('[memz-plugin]URL状态当前为仅主人可用') }
    await this.handleReply(e, {
      reg: /^(#?)(url)(编码|解码)\s*(.+)/,
      fn: this.handleReply
    })
  }

  async unicodehandleReply (e, handler) {
    const msg = e.msg.match(handler.reg)
    const operation = msg[2]
    const action = msg[3]
    const input = msg[4].trim()

    let result
    try {
      if (operation === 'unicode') {
        result =
          action === '编码' ? encodeToUnicode(input) : decodeFromUnicode(input)
      } else if (operation === 'ascii') {
        result =
          action === '编码' ? encodeToAscii(input) : decodeFromAscii(input)
      }

      await e.reply(`结果:${result}`, true)
    } catch (error) {
      await e.reply(`Error: ${error.message}`)
    }
  }

  async handleEncodingDecoding (e) {
    const { UnicodeAll } = Config.getConfig('memz')
    if (!UnicodeAll && !e.isMaster) { return logger.warn('[memz-plugin]Unicode功能当前为仅主人可用') }
    await this.unicodehandleReply(e, {
      reg: /^(#?)(unicode|ascii)(编码|解码)\s*(.+)/,
      fn: this.unicodehandleReply
    })
  }

  async Whois (e) {
    const { WhoisAll } = Config.getConfig('memz')
    if (!WhoisAll && !e.isMaster) {
      return logger.warn('[memz-plugin] Whois状态当前为仅主人可用')
    }

    const domainMatch = e.msg.match(/#?whois\s*(.+)/)
    if (!domainMatch) {
      return await e.reply('未识别到有效的域名，请确保输入格式正确。', true)
    }

    let domain = domainMatch[1].trim()

    domain = domain.replace(/^https?:\/\//, '').split('/')[0].split('?')[0].split('#')[0]
    domain = domain.replace(/^www\./, '')

    try {
      logger.debug(`[memz-plugin] WHOIS 请求域名: ${domain}`)

      // 获取Whois数据
      const whoisData = await whois(domain)

      if (Object.keys(whoisData).length === 0) {
        return await e.reply('未能获取到 Whois 数据，请检查域名是否有效或是否开启Whois保护。', true)
      }
      logger.debug(`[memz-plugin] WHOIS 数据: ${JSON.stringify(whoisData)}`)

      const translatedData = await translateWhoisData(whoisData)
      logger.debug(`[memz-plugin] WHOIS 数据翻译后: ${JSON.stringify(translatedData)}`)

      const whoisDataHtml = Object.entries(translatedData)
        .map(([key, value]) => `${key}: ${value}`)
        .join('<br>')

      const htmlTemplate = fs.readFileSync(`${PluginPath}/resources/html/whois/whois.html`, 'utf8')
      const html = htmlTemplate.replace('{{whoisdata}}', whoisDataHtml)

      const screenshotBuffer = await generateScreenshot(html)
      await e.reply(segment.image(`base64://${screenshotBuffer}`), true)
    } catch (error) {
      logger.error(`[memz-plugin] Whois查询失败: ${error.message}`)
      await e.reply(`错误: ${error.message}`, true)
    }
  }

  async domainIcp (e) {
    const { icpBeianAll } = Config.getConfig('memz')

    if (!icpBeianAll && !e.isMaster) {
      return logger.warn('[memz-plugin] 备案查询状态当前为仅主人可用')
    }

    const domainMatch = e.msg.match(/#?域名备案查询\s*(.+)/)

    if (!domainMatch) {
      return await e.reply('未识别到有效的域名，请确保输入格式正确。', true)
    }

    let domain = domainMatch[1].trim()

    try {
      logger.debug(`[memz-plugin] 备案查询域名: ${domain}`)

      const icpInfo = await fetchIcpInfo(domain)

      if (Object.keys(icpInfo).length === 0) {
        return await e.reply('未能获取到备案数据', true)
      }

      logger.debug(`[memz-plugin] 备案查询数据: ${JSON.stringify(icpInfo)}`)

      const text = Object.entries(icpInfo)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n')

      await e.reply(text, true)
    } catch (error) {
      logger.error(`[memz-plugin] 备案查询失败: ${error.message}`)
      await e.reply(`错误: ${error.message}`, true)
    }
  }

  async webpage (e) {
    const { webpage } = Config.getConfig('memz')
    if (!webpage && !e.isMaster) {
      return logger.warn('[memz-plugin] 网页截图状态当前为仅主人可用')
    }

    let url = e.msg.match(/^#?网页截图\s*(\S+.*)/)?.[1].trim()

    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    if (!url) {
      return await e.reply('请输入有效的网址', true)
    }

    try {
      if (!puppeteer.browser) {
        await puppeteer.browserInit()
      }
      const page = await puppeteer.browser.newPage()

      await page.setViewport({ width: 1920, height: 1080 })

      await page.goto(url, { waitUntil: 'load' })

      const screenshotBase64 = await page.screenshot({
        fullPage: true,
        type: 'jpeg',
        quality: 100,
        encoding: 'base64'
      })

      await page.close()
      await e.reply(segment.image(`base64://${screenshotBase64}`), true)
    } catch (error) {
      await e.reply(`[memz-plugin] 网页截图失败: ${error.message}`, true)
    }
  }

  async BaseConversion (e) {
    const { BaseConversionAll } = Config.getConfig('memz')
    if (!BaseConversionAll && !e.isMaster) { return logger.warn('[memz-plugin]进制转换状态当前为仅主人可用') }
    let args = e.msg
      .match(/#?进制转换\s*(.+)/)[1]
      .trim()
      .split(/\s+/)

    if (args.length !== 3) {
      await e.reply('需要输入 <原始数> <起始进制> <目标进制>')
      return
    }

    const [number, fromBase, toBase] = args

    try {
      const convertedNumber = await convertBase(
        number,
        parseInt(fromBase, 10),
        parseInt(toBase, 10)
      )
      await e.reply(
        `原始数 ${number} 起始进制 ${fromBase} 目标进制 ${toBase} 是 ${convertedNumber}`
      )
    } catch (error) {
      await e.reply(`Error: ${error.message}`)
    }
  }

  async handleHexOperation (e) {
    const { HexOperationAll } = Config.getConfig('memz')

    if (!HexOperationAll && !e.isMaster) {
      return logger.warn('[memz-plugin] 进制转换状态当前为仅主人可用')
    }
    const match = e.msg.match(/^#hex(编码|解码)\s*(.*)$/i)
    if (!match) {
      return e.reply('请输入正确的命令，例如：#hex编码 文本 或 #hex解码 HEX 字符串', true)
    }
    const [, operation, content] = match
    if (!content) {
      return e.reply(`请提供需要${operation}的文本。`, true)
    }
    try {
      let result
      if (operation === '编码') {
        result = Buffer.from(content, 'utf-8').toString('hex')
        return e.reply(result, true)
      } else if (operation === '解码') {
        result = Buffer.from(content, 'hex').toString('utf-8')
        return e.reply(result, true)
      }
    } catch (error) {
      return e.reply('无效的 HEX 字符串或编码操作出错。请确保输入的是有效的内容。', error, true)
    }
  }

  // 获取网站图标
  async getFavicon (e) {
    const { getFaviconAll } = Config.getConfig('memz')

    if (!getFaviconAll && !e.isMaster) {
      return logger.warn('[memz-plugin] 进制转换状态当前为仅主人可用')
    }

    let url = e.msg.match(/^#?(获取)?网站图标\s*(\S+.*)/)?.[2]?.trim()

    if (!url) {
      return e.reply('请提供有效的网址', true)
    }

    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url
    }

    try {
      const response = await axios.get(url)

      const $ = cheerio.load(response.data)

      let iconUrl =
        $('link[rel="icon"]').attr('href') ||
        $('link[rel="shortcut icon"]').attr('href') ||
        $('meta[property="og:image"]').attr('content')

      if (!iconUrl) {
        return e.reply('没有找到该网站图标', true)
      }

      if (iconUrl.startsWith('/')) {
        const baseUrl = new URL(url)
        iconUrl = baseUrl.origin + iconUrl
      }

      if (!/^https?:\/\//i.test(iconUrl)) {
        return e.reply('图标地址无效', true)
      }

      e.reply(['获取到的网站图标', segment.image(iconUrl)], true)
    } catch (error) {
      logger.error('获取网站图标失败:', error)
      e.reply('[ERROR]获取网站图标失败，请检查网址是否正确', true)
    }
  }

  // IP信息
  async ipinfo (e) {
    const { IpinfoAll, IpinfoApi } = Config.getConfig('memz')
    if (!IpinfoAll && !e.isMaster) {
      return logger.warn('[memz-plugin] IPInfo 功能当前为仅主人可用')
    }
    if (IpinfoApi === 1) {
      logger.info('使用Ipinfo.io接口查询ip信息')
      await this.ipinfoIo(e)
    } else if (IpinfoApi === 2) {
      logger.info('使用bilibili接口查询ip信息')
      await this.bilibiliIpinfo(e)
    } else if (IpinfoApi === 3) {
      logger.info('使用ip.sb接口查询ip信息')
      await this.ipsb(e)
    } else {
      logger.warn('IPInfo 配置错误, 默认使用bilibili接口查询ip信息')
      await this.bilibiliIpinfo(e)
    }
  }

  async ipsb (e) {
    const match = e.msg.match(/^#(ipinfo|ip信息)\s*(\S+)$/i)
    if (!match) {
      logger.warn('未匹配到正确的 IP 信息命令')
      return await e.reply('请输入正确的 IP 信息命令，例如：#ipinfo IP/域名', true)
    }

    const [, , siteName] = match

    logger.debug(`解析的目标: ${siteName}`)

    let ipAddress = siteName
    if (!net.isIPv4(siteName) && !net.isIPv6(siteName)) {
      ipAddress = await this.resolveDomainToIp(siteName)
      if (!ipAddress) {
        await e.reply('无法解析域名的 IP 地址！', e.isGroup)
        return false
      }
    }
    logger.info(`目标 IP 地址: ${ipAddress}`)
    const url = `https://api.ip.sb/geoip/${ipAddress}`
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const ipInfo = await response.json()
      if (ipInfo.error) {
        throw new Error(ipInfo.error)
      }

      const res = [
          `IP 信息 - ${ipAddress}`,
          `IP 地址：${ipInfo.ip || 'N/A'}`,
          `城市：${ipInfo.city || 'N/A'}`,
          `地区：${ipInfo.region || 'N/A'}`,
          `国家：${ipInfo.country || 'N/A'}`,
          `运营商：${ipInfo.isp || 'N/A'}`,
          `组织：${ipInfo.organization || 'N/A'}`,
          `经纬度：${ipInfo.latitude || 'N/A'}, ${ipInfo.longitude || 'N/A'}`,
          `时区：${ipInfo.timezone || 'N/A'}`,
          `ASN：${ipInfo.asn || 'N/A'}`,
          `ASN 组织：${ipInfo.asn_organization || 'N/A'}`,
          `IP 所在大洲：${ipInfo.continent_code || 'N/A'}`
      ].join('\n')
      e.reply(res, true)
    } catch (error) {
      logger.error(`获取 IP 信息出错: ${error.message}`)
      await e.reply(`获取 IP 信息出错：${error.message}`, true)
      return false
    }
  }

  async bilibiliIpinfo (e) {
    const match = e.msg.match(/^#(ipinfo|ip信息)\s*(\S+)$/i)
    if (!match) {
      logger.warn('未匹配到正确的 IP 信息命令')
      return await e.reply('请输入正确的 IP 信息命令，例如：#ipinfo IP/域名', true)
    }

    const [, , siteName] = match

    logger.debug(`解析的目标: ${siteName}`)

    let ipAddress = siteName
    try {
      if (!net.isIPv4(siteName) && !net.isIPv6(siteName)) {
        ipAddress = await this.resolveDomainToIp(siteName)
        if (!ipAddress) {
          await e.reply('无法解析域名的 IP 地址！', e.isGroup)
          return false
        }
      }

      logger.info(`目标 IP 地址: ${ipAddress}`)

      const response = await fetch(`https://api.live.bilibili.com/ip_service/v1/ip_service/get_ip_addr?ip=${ipAddress}`)
      const ipInfo = await response.json()

      if (ipInfo.code !== 0) {
        await e.reply('获取 IP 信息出错：' + (ipInfo.message || ipInfo.msg), true)
        return false
      }

      const res = [
        `IP 信息 - ${siteName}`,
        `IP 地址：${ipInfo.data.addr || 'N/A'}`,
        `国家/地区：${ipInfo.data.country || 'N/A'}`,
        `省/州：${ipInfo.data.province || 'N/A'}`,
        `运营商：${ipInfo.data.isp || 'N/A'}`,
        `经纬度：${ipInfo.data.latitude || 'N/A'}, ${ipInfo.data.longitude || 'N/A'}`
      ].join('\n')

      await e.reply(res)
      return true
    } catch (error) {
      logger.error(`获取 IP 信息出错: ${error.message}`)
      await e.reply(`获取 IP 信息出错：${error.message}`, true)
      return false
    }
  }

  async ipinfoIo (e) {
    const { IpinfoToken } = Config.getConfig('memz')

    const match = e.msg.match(/^#(ipinfo|ip信息)\s*(\S+)$/i)
    if (!match) {
      logger.warn('未匹配到正确的 IP 信息命令')
      return await e.reply('请输入正确的 IP 信息命令，例如：#ipinfo IP/域名', true)
    }

    const [, , siteName] = match

    logger.debug(`解析的目标: ${siteName}`)

    if (!IpinfoToken) {
      await e.reply('请前往 https://ipinfo.io 注册账号并获取 Token 后在配置文件中配置', true)
      return false
    }

    let ipAddress = siteName
    try {
      if (!net.isIPv4(siteName) && !net.isIPv6(siteName)) {
        ipAddress = await this.resolveDomainToIp(siteName)
        if (!ipAddress) {
          await e.reply('无法解析域名的 IP 地址！', e.isGroup)
          return false
        }
      }

      logger.info(`目标 IP 地址: ${ipAddress}`)

      const response = await fetch(`https://ipinfo.io/${ipAddress}?token=${IpinfoToken}`)
      const ipInfo = await response.json()

      if (ipInfo.bogon) {
        await e.reply('目标地址为 Bogon IP（私有 IP，不可路由）。')
        return false
      }

      const res = [
        `IP 信息 - ${siteName}`,
            `IP 地址：${ipInfo.ip || 'N/A'}`,
            `国家/地区：${ipInfo.country || 'N/A'}`,
            `区域：${ipInfo.region || 'N/A'}`,
            `城市：${ipInfo.city || 'N/A'}`,
            `邮政编码：${ipInfo.postal || 'N/A'}`,
            `时区：${ipInfo.timezone || 'N/A'}`,
            `经纬度：${ipInfo.loc || 'N/A'}`,
            `运营商：${ipInfo.org || 'N/A'}`
      ].join('\n')

      await e.reply(res)
      return true
    } catch (error) {
      logger.error(`获取 IP 信息出错: ${error.message}`)
      await e.reply(`获取 IP 信息出错：${error.message}`)
      return false
    }
  }

  // 解析域名IP
  async resolveDomainToIp (domain) {
    return new Promise((resolve, reject) => {
      dns.lookup(domain, (err, address) => {
        if (err) {
          reject(err)
        } else {
          resolve(address)
        }
      })
    }).catch((err) => {
      logger.error(`域名解析出错: ${err.message}`)
      return null
    })
  }
}
