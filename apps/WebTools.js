import Render from '../components/Render.js'
import whois from 'whois-json'
import axios from 'axios'
import * as cheerio from 'cheerio'
import dns from 'dns'
import net from 'net'
import punycode from 'punycode/punycode.js'
import { fetchWestIcpInfo, translateWhoisData, fetchSeoFromHtml, checkHttpStatus, fetchSslInfo } from '#model'

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
          reg: '^#punycode(编码|解码)\\s*(.*)$',
          fnc: 'handlePunycodeOperation'
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

  async handlePunycodeOperation (e) {
    if (!memz.memz.PunycodeOperationAll && !e.isMaster) {
      return logger.warn('[memz-plugin] Punycode操作当前为仅主人可用')
    }

    const match = e.msg.match(/^#punycode(编码|解码)\s*(.*)$/i)
    if (!match) {
      return e.reply('请输入正确的命令，例如：#punycode编码 文本 或 #punycode解码 Punycode 字符串', true)
    }

    const [, operation, content] = match
    if (!content) {
      return e.reply(`请提供需要${operation}的文本。`, true)
    }

    try {
      let result

      if (operation === '编码') {
        // 中文域名的处理
        // eslint-disable-next-line no-control-regex
        if (/[^\x00-\x7F]+/.test(content) && !/xn--/i.test(content)) {
          result = punycode.toASCII(content)
        } else {
          result = punycode.toASCII(content)
        }
        return e.reply(`编码结果：${result}`, true)
      } else if (operation === '解码') {
        if (/^xn--[a-z0-9-]+$/i.test(content)) {
          result = punycode.toUnicode(content)
          return e.reply(`解码结果：${result}`, true)
        } else {
          return e.reply('提供的字符串不是有效的 Punycode 字符串。', true)
        }
      }
    } catch (error) {
      return e.reply('无效的 Punycode 字符串或编码操作出错。请确保输入的是有效的内容。', error.message, true)
    }
  }

  async removeSpaces (e) {
    if (!memz.memz.removeSpacesAll && !e.isMaster) {
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
    if (!memz.memz.SslInfoAll && !e.isMaster) {
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
    if (memz.memz.DomainMinPricingAll && !e.isMaster) {
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
    if (!memz.memz.httpStatusAll && !e.isMaster) {
      return logger.warn('[memz-plugin] HTTP 状态检查功能当前为仅主人可用')
    }

    const urlMatch = e.msg.match(/^#?http状态查询\s*(.+)/i)
    if (!urlMatch) {
      return await e.reply('请输入有效的网址', true)
    }

    const url = urlMatch[1].trim()
    const status = await checkHttpStatus(url)
    e.reply(status, true)
  }

  async fetchSeoInfoHandler (e) {
    if (!memz.memz.SeoAll && !e.isMaster) {
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
      const result = `----SEO信息----\n页面标题: ${seoInfo.title}\n描述: ${seoInfo.description}\n关键词: ${seoInfo.keywords}`
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
    if (!memz.memz.UrlAll && !e.isMaster) { return logger.warn('[memz-plugin]URL状态当前为仅主人可用') }
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
    if (!memz.memz.UnicodeAll && !e.isMaster) { return logger.warn('[memz-plugin]Unicode功能当前为仅主人可用') }
    await this.unicodehandleReply(e, {
      reg: /^(#?)(unicode|ascii)(编码|解码)\s*(.+)/,
      fn: this.unicodehandleReply
    })
  }

  async Whois (e) {
    if (!memz.memz.WhoisAll && !e.isMaster) {
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

      const renderData = {
        domain,
        whoisData: Object.entries(translatedData).map(([key, value]) => ({
          key,
          value
        }))
      }

      const image = await Render.render('html/whois/whois.html', renderData, {
        e,
        retType: 'base64'
      })

      await e.reply((image), true)
    } catch (error) {
      logger.error(`[memz-plugin] Whois查询失败: ${error.message}`)
      await e.reply(`错误: ${error.message}`, true)
    }
  }

  async domainIcp (e) {
    if (!memz.memz.icpBeianAll && !e.isMaster) {
      return logger.warn('[memz-plugin] 备案查询状态当前为仅主人可用')
    }

    const domainMatch = e.msg.match(/#?域名备案查询\s*(.+)/)

    if (!domainMatch) {
      return await e.reply('未识别到有效的域名，请确保输入格式正确。', true)
    }

    const domain = domainMatch[1].trim()
    logger.info(`[memz-plugin] 备案查询域名API: ${memz.memz.icpBeian}`)
    switch (memz.memz.icpBeian) {
      case 1:
        await this.westIcpInfo(e, domain)
        break
      case 2:
        await this.baiduIcpInfo(e, domain)
        break
      case 3:
        await this.icpShowIcpInfo(e, domain)
        break
      default:
        await this.westIcpInfo(e, domain)
        break
    }
  }

  async westIcpInfo (e, domain) {
    try {
      const icpInfo = await fetchWestIcpInfo(domain)

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

  // 暂定，百度这破接口太不稳定了
  async baiduIcpInfo (e, domain) {

  }

  async icpShowIcpInfo (e, domain) {
    try {
      const response = await axios.get(`https://icp.show/query/web?search=${domain}`)
      const data = response.data
      let icpInfo = {}
      if (data.code === 200 && data.data && data.data.list.length > 0) {
        const item = data.data.list[0]
        icpInfo = {
          域名: item.domain,
          主体名称: item.unitName,
          备案号: item.mainLicence,
          服务备案号: item.serviceLicence,
          备案性质: item.natureName,
          限制访问: item.limitAccess,
          更新时间: item.updateRecordTime
        }
      }
      if (Object.keys(icpInfo).length === 0) {
        return await e.reply('未能获取到备案数据', true)
      }
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
    if (!memz.memz.webpage && !e.isMaster) { return logger.warn('[memz-plugin] 网页截图状态当前为仅主人可用') }

    let url = e.msg.match(/^#?网页截图\s*(\S+.*)/)?.[1].trim()
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) { url = 'https://' + url }
    if (!url) { return await e.reply('请输入有效的网址', true) }

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
    if (!memz.memz.BaseConversionAll && !e.isMaster) { return logger.warn('[memz-plugin]进制转换状态当前为仅主人可用') }
    const args = e.msg
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
    if (!memz.memz.HexOperationAll && !e.isMaster) {
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
    if (!memz.memz.getFaviconAll && !e.isMaster) {
      return logger.warn('[memz-plugin] 获取网站图标当前为仅主人可用')
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

  // IP 信息
  async ipinfo (e) {
    const apiMapping = {
      1: 'ipinfoIo',
      2: 'bilibiliIpinfo',
      3: 'ipSb',
      4: 'ipApi',
      5: 'ip2locationIo',
      6: 'ipApiIs',
      7: 'inipIn',
      8: 'mir6',
      9: 'cipcc'
    }

    const selectedApi = apiMapping[memz.memz.IpinfoApi] || 'bilibiliIpinfo' // 默认就使用哔哩哔哩接口好了
    logger.info(`使用${selectedApi}接口查询ip信息`)

    const match = e.msg.match(/^#(ipinfo|ip信息)\s*(\S+)$/i)
    if (!match) {
      logger.warn('未匹配到正确的 IP 信息命令')
      return await e.reply('请输入正确的 IP 信息命令，例如：#ipinfo IP/域名', true)
    }

    const [, , siteName] = match
    let ipAddress = siteName
    if (!net.isIPv4(siteName) && !net.isIPv6(siteName)) {
      ipAddress = await this.resolveDomainToIp(siteName)
      if (!ipAddress) {
        await e.reply('无法解析域名的 IP 地址！', true)
        return false
      }
    }

    logger.info(`目标 IP 地址: ${ipAddress}`)

    const ipInfo = await this.fetchIpInfo(e, ipAddress, selectedApi)

    if (ipInfo) {
      const formattedInfo = this.formatIpInfo(ipInfo, ipAddress, selectedApi)
      await e.reply(formattedInfo, true)
    }
  }

  // 发送请求
  async fetchIpInfo (e, ipAddress, api) {
    let url
    switch (api) {
      case 'ipinfoIo':
        url = `https://ipinfo.io/${ipAddress}?token=${memz.memz.IpinfoToken}`
        break
      case 'bilibiliIpinfo':
        url = `https://api.live.bilibili.com/ip_service/v1/ip_service/get_ip_addr?ip=${ipAddress}`
        break
      case 'ipApi':
        url = `http://ip-api.com/json/${ipAddress}?lang=zh-CN`
        break
      case 'ipSb':
        url = `https://api.ip.sb/geoip/${ipAddress}`
        break
      case 'ip2locationIo':
        url = `https://api.ip2location.io/?ip=${ipAddress}`
        break
      case 'ipApiIs':
        url = `https://api.ipapi.is/?ip=${ipAddress}`
        break
      case 'inipIn':
        url = `http://inip.in/search_ip?ip=${ipAddress}`
        break
      case 'mir6':
        url = `https://api.mir6.com/api/ip?ip=${ipAddress}&type=json`
        break
      case 'cipcc':
        url = `https://api.plugin.memzjs.us.kg/webtool/ip/info/cipcc?ip=${ipAddress}`
        break
      default:
        return null
    }

    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error('API请求失败')
      return await response.json()
    } catch (error) {
      logger.error(`获取 IP 信息出错: ${error.message}`)
      await e.reply(`获取 IP 信息出错：${error.message}`, true)
      return false
    }
  }

  // 格式化 IP API 返回信息
  formatIpInfo (ipInfo, ipAddress, api) {
    const formatters = {
      ipinfoIo: this.formatIpinfoIo,
      bilibiliIpinfo: this.formatBilibiliIpinfo,
      ipApi: this.formatIpApi,
      ipSb: this.formatIpSb,
      ip2locationIo: this.formatIp2locationIo,
      ipApiIs: this.formatipApiIs,
      inipIn: this.formatInipIn,
      mir6: this.formatMir6,
      cipcc: this.formatCipcc
    }

    const formatter = formatters[api]

    if (formatter) {
      return formatter.call(this, ipInfo, ipAddress)
    } else {
      return '无法识别的 API 格式'
    }
  }

  // cip.cc 数据格式化
  formatCipcc (ipInfo, ipAddress) {
    ipInfo = ipInfo.data
    const info = [
      `IP 信息 - ${ipAddress}`,
      ipInfo.address ? `地址: ${ipInfo.address}` : null,
      ipInfo.data1 ? `数据二：${ipInfo.data1}` : null,
      ipInfo.data2 ? `数据三：${ipInfo.data2}` : null
    ]
    return info.filter(Boolean).join('\n')
  }

  // inipIn 数据格式化
  formatInipIn (ipInfo, ipAddress) {
    ipInfo = ipInfo.data
    const info = [
      `IP 信息 - ${ipAddress}`,
      ipInfo.country_code ? `国家代码：${ipInfo.country_code}` : null,
      ipInfo.country_cn ? `国家名称：${ipInfo.country_cn}` : null,
      ipInfo.country ? `国家名称：${ipInfo.country}` : null,
      ipInfo.region_code ? `地区代码：${ipInfo.region_code}` : null,
      ipInfo.region_cn ? `地区名称：${ipInfo.region_cn}` : null,
      ipInfo.region ? `地区名称：${ipInfo.region}` : null,
      ipInfo.city ? `城市名称：${ipInfo.city}` : null,
      ipInfo.city_cn ? `城市名称：${ipInfo.city_cn}` : null,
      ipInfo.postal ? `邮政编码：${ipInfo.postal}` : null,
      ipInfo.timezone ? `时区：${ipInfo.timezone}` : null,
      ipInfo.latitude || ipInfo.longitude
        ? `经纬度：${ipInfo.latitude}, ${ipInfo.longitude}`
        : null,
      ipInfo.network ? `网络：${ipInfo.network}` : null,
      ipInfo.organization ? `组织：${ipInfo.organization}` : null,
      ipInfo.asn ? `ASN：${ipInfo.asn}` : null,
      ipInfo.ip_type ? `IP 类型：${ipInfo.ip_type}` : null,
      ipInfo.metro_code ? `地铁代码：${ipInfo.metro_code}` : null
    ]
    return info.filter(Boolean).join('\n')
  }

  // ipApiIs 数据格式化
  formatipApiIs (ipInfo, ipAddress) {
    const info = [
      `---IP ${ipAddress} 信息---`,
      `RIR：${ipInfo.rir}`,
      `Bogon IP：${ipInfo.is_bogon ? '是' : '否'}`,
      `移动设备：${ipInfo.is_mobile ? '是' : '否'}`,
      `爬虫：${ipInfo.is_crawler ? '是' : '否'}`,
      `数据中心：${ipInfo.is_datacenter ? '是' : '否'}`,
      `Tor节点：${ipInfo.is_tor ? '是' : '否'}`,
      `代理：${ipInfo.is_proxy ? '是' : '否'}`,
      `VPN：${ipInfo.is_vpn ? '是' : '否'}`,
      `滥用者：${ipInfo.is_abuser ? '是' : '否'}`,
      ipInfo.company ? '---公司信息---' : null,
      ipInfo.company && ipInfo.company.name ? `公司名称：${ipInfo.company.name}` : null,
      ipInfo.company && ipInfo.company.abuser_score ? `滥用者分数：${ipInfo.company.abuser_score}` : null,
      ipInfo.company && ipInfo.company.domain ? `公司域名：${ipInfo.company.domain}` : null,
      ipInfo.company && ipInfo.company.type ? `公司类型：${ipInfo.company.type}` : null,
      ipInfo.company && ipInfo.company.network ? `公司网络：${ipInfo.company.network}` : null,
      // ipInfo.company && ipInfo.company.whois ? `WHOIS查询链接：${ipInfo.company.whois}` : null,
      ipInfo.abuse ? '---滥用信息---' : null,
      ipInfo.abuse && ipInfo.abuse.name ? `联系人：${ipInfo.abuse.name}` : null,
      ipInfo.abuse && ipInfo.abuse.address ? `联系地址：${ipInfo.abuse.address}` : null,
      ipInfo.abuse && ipInfo.abuse.email ? `联系邮箱：${ipInfo.abuse.email}` : null,
      ipInfo.abuse && ipInfo.abuse.phone ? `联系电话：${ipInfo.abuse.phone}` : null,
      ipInfo.asn ? '---ASN信息---' : null,
      ipInfo.asn && ipInfo.asn.asn ? `ASN：${ipInfo.asn.asn}` : null,
      ipInfo.asn && ipInfo.asn.abuser_score ? `滥用者分数：${ipInfo.asn.abuser_score}` : null,
      ipInfo.asn && ipInfo.asn.route ? `路由：${ipInfo.asn.route}` : null,
      ipInfo.asn && ipInfo.asn.descr ? `描述：${ipInfo.asn.descr}` : null,
      ipInfo.asn && ipInfo.asn.country ? `国家：${ipInfo.asn.country}` : null,
      ipInfo.asn && ipInfo.asn.active ? `是否活跃：${ipInfo.asn.active ? '是' : '否'}` : null,
      ipInfo.asn && ipInfo.asn.org ? `组织：${ipInfo.asn.org}` : null,
      ipInfo.asn && ipInfo.asn.domain ? `域名：${ipInfo.asn.domain}` : null,
      ipInfo.asn && ipInfo.asn.abuse ? `滥用邮箱：${ipInfo.asn.abuse}` : null,
      ipInfo.asn && ipInfo.asn.type ? `类型：${ipInfo.asn.type}` : null,
      ipInfo.asn && ipInfo.asn.updated ? `更新时间：${ipInfo.asn.updated}` : null,
      ipInfo.asn && ipInfo.asn.rir ? `RIR：${ipInfo.asn.rir}` : null,
      // ipInfo.asn && ipInfo.asn.whois ? `WHOIS查询链接：${ipInfo.asn.whois}` : null,
      ipInfo.location ? '---地理位置信息---' : null,
      ipInfo.location && ipInfo.location.is_eu_member ? `是否为欧盟成员国：${ipInfo.location.is_eu_member ? '是' : '否'}` : null,
      ipInfo.location && ipInfo.location.calling_code ? `国际电话区号：${ipInfo.location.calling_code}` : null,
      ipInfo.location && ipInfo.location.currency_code ? `货币代码：${ipInfo.location.currency_code}` : null,
      ipInfo.location && ipInfo.location.continent ? `所属大洲：${ipInfo.location.continent}` : null,
      ipInfo.location && ipInfo.location.country ? `国家：${ipInfo.location.country}` : null,
      ipInfo.location && ipInfo.location.country_code ? `国家代码：${ipInfo.location.country_code}` : null,
      ipInfo.location && ipInfo.location.state ? `地区：${ipInfo.location.state}` : null,
      ipInfo.location && ipInfo.location.city ? `城市：${ipInfo.location.city}` : null,
      ipInfo.location && ipInfo.location.latitude ? `纬度：${ipInfo.location.latitude}` : null,
      ipInfo.location && ipInfo.location.longitude ? `经度：${ipInfo.location.longitude}` : null,
      ipInfo.location && ipInfo.location.zip ? `邮政编码：${ipInfo.location.zip}` : null,
      ipInfo.location && ipInfo.location.timezone ? `时区：${ipInfo.location.timezone}` : null,
      ipInfo.location && ipInfo.location.local_time ? `本地时间：${ipInfo.location.local_time}` : null,
      ipInfo.location && ipInfo.location.local_time_unix ? `本地时间（Unix时间戳）：${ipInfo.location.local_time_unix}` : null,
      ipInfo.location && ipInfo.location.is_dst ? `夏令时：${ipInfo.location.is_dst ? '是' : '否'}` : null
      // 查询耗时：${ipInfo.elapsed_ms}毫秒`
    ]
    return info.filter(Boolean).join('\n')
  }

  // Ip2locationIo 数据格式化
  formatIp2locationIo (ipInfo, ipAddress) {
    const info = [
      `IP 信息 - ${ipAddress}`,
      ipInfo.country_code ? `国家代码：${ipInfo.country_code}` : null,
      ipInfo.country_name ? `国家名称：${ipInfo.country_name}` : null,
      ipInfo.region_name ? `地区名称：${ipInfo.region_name}` : null,
      ipInfo.city_name ? `城市名称：${ipInfo.city_name}` : null,
      ipInfo.zip_code ? `邮政编码：${ipInfo.zip_code}` : null,
      ipInfo.time_zone ? `时区：${ipInfo.time_zone}` : null,
      ipInfo.asn ? `ASN：${ipInfo.asn}` : null,
      ipInfo.is_proxy ? `代理：${ipInfo.is_proxy ? '是' : '否'}` : null,
      (ipInfo.latitude || ipInfo.longitude)
        ? `经纬度：${ipInfo.latitude}, ${ipInfo.longitude}`
        : null
    ]
    return info.filter(Boolean).join('\n')
  }

  // ipinfo.io 数据格式化
  formatIpinfoIo (ipInfo, ipAddress) {
    const info = [
      `IP 信息 - ${ipAddress}`,
      ipInfo.ip ? `IP 地址：${ipInfo.ip}` : null,
      ipInfo.country ? `国家/地区：${ipInfo.country}` : null,
      ipInfo.region ? `区域：${ipInfo.region}` : null,
      ipInfo.city ? `城市：${ipInfo.city}` : null,
      ipInfo.postal ? `邮政编码：${ipInfo.postal}` : null,
      ipInfo.loc ? `经纬度：${ipInfo.loc}` : null,
      ipInfo.timezone ? `时区：${ipInfo.timezone}` : null,
      ipInfo.org ? `运营商：${ipInfo.org}` : null,
      ipInfo.asn ? `ASN：${ipInfo.asn}` : null,
      ipInfo.asn_organization ? `ASN 组织：${ipInfo.asn_organization}` : null,
      ipInfo.continent_code ? `IP 所在大洲：${ipInfo.continent_code}` : null
    ]
    return info.filter(Boolean).join('\n')
  }

  // bilibili接口 信息格式化
  formatBilibiliIpinfo (ipInfo, ipAddress) {
    const info = [
      `IP 信息 - ${ipAddress}`,
      ipInfo.data?.addr ? `IP 地址：${ipInfo.data.addr}` : null,
      ipInfo.data?.country ? `国家/地区：${ipInfo.data.country}` : null,
      ipInfo.data?.province ? `省/州：${ipInfo.data.province}` : null,
      ipInfo.data?.isp ? `运营商：${ipInfo.data.isp}` : null,
      (ipInfo.data?.latitude || ipInfo.data?.longitude)
        ? `经纬度：${ipInfo.data.latitude}, ${ipInfo.data.longitude}`
        : null
    ]
    return info.filter(Boolean).join('\n')
  }

  // ip-api 数据格式化
  formatIpApi (ipInfo, ipAddress) {
    const info = [
      `IP 信息 - ${ipAddress}`,
      ipInfo.country ? `国家：${ipInfo.country}` : null,
      ipInfo.regionName ? `地区：${ipInfo.regionName}` : null,
      ipInfo.city ? `城市：${ipInfo.city}` : null,
      ipInfo.zip ? `邮政编码：${ipInfo.zip}` : null,
      (ipInfo.lat || ipInfo.lon) ? `经纬度：${ipInfo.lat}, ${ipInfo.lon}` : null,
      ipInfo.timezone ? `时区：${ipInfo.timezone}` : null,
      ipInfo.isp ? `运营商：${ipInfo.isp}` : null,
      ipInfo.org ? `组织：${ipInfo.org}` : null,
      ipInfo.as ? `ASN：${ipInfo.as}` : null
    ]
    return info.filter(Boolean).join('\n')
  }

  // ip.sb 数据格式化
  formatIpSb (ipInfo, ipAddress) {
    const info = [
      `IP 信息 - ${ipAddress}`,
      ipInfo.ip ? `IP 地址：${ipInfo.ip}` : null,
      ipInfo.country ? `国家：${ipInfo.country}` : null,
      ipInfo.region ? `地区：${ipInfo.region}` : null,
      ipInfo.city ? `城市：${ipInfo.city}` : null,
      ipInfo.isp ? `运营商：${ipInfo.isp}` : null,
      (ipInfo.latitude || ipInfo.longitude)
        ? `经纬度：${ipInfo.latitude}, ${ipInfo.longitude}`
        : null,
      ipInfo.timezone ? `时区：${ipInfo.timezone}` : null,
      ipInfo.asn ? `ASN：${ipInfo.asn}` : null,
      ipInfo.asn_organization ? `ASN 组织：${ipInfo.asn_organization}` : null,
      ipInfo.continent_code ? `IP 所在大洲：${ipInfo.continent_code}` : null
    ]
    return info.filter(Boolean).join('\n')
  }

  // Mir6 数据格式化
  formatMir6 (ipInfo, ipAddress) {
    const data = ipInfo.data
    const info = [
      `IP 信息 - ${ipAddress}`,
      data.country ? `国家：${data.country}` : null,
      data.countryCode ? `国家代码：${data.countryCode}` : null,
      data.province ? `省份：${data.province}` : null,
      data.city ? `城市：${data.city}` : null,
      data.districts ? `区县：${data.districts}` : null,
      data.idc ? `IDC：${data.idc}` : null,
      data.isp ? `运营商：${data.isp}` : null,
      data.net ? `网络类型：${data.net}` : null,
      data.zipcode ? `邮政编码：${data.zipcode}` : null,
      data.areacode ? `区号：${data.areacode}` : null,
      data.protocol ? `协议：${data.protocol}` : null,
      data.location ? `位置：${data.location}` : null,
      // data.myip ? `我的IP：${data.myip}` : null,
      data.time ? `时间：${data.time}` : null
    ]
    return info.filter(Boolean).join('\n')
  }

  // 解析域名IP
  async resolveDomainToIp (domain) {
    return new Promise((resolve, reject) => {
      dns.lookup(domain, (err, address) => {
        if (err) reject(err)
        else resolve(address)
      })
    }).catch((err) => {
      logger.error(`域名解析出错: ${err.message}`)
      return null
    })
  }
}
