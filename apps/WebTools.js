import fs from 'fs'
import whois from 'whois-json'
import { generateScreenshot } from '../model/generateScreenshot.js'
import { Config, PluginPath } from '../components/index.js'
import puppeteer from '../../../lib/puppeteer/puppeteer.js'
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
export async function fetchSeoFromHtml (url) {
  const response = await fetch(url)
  const html = await response.text()

  // 使用正则表达式提取 title、description、keywords
  const titleMatch = html.match(/<title>(.*?)<\/title>/i)
  const descriptionMatch = html.match(
    /<meta\s+name=["']description["']\s+content=["'](.*?)["']/i
  )
  const keywordsMatch = html.match(
    /<meta\s+name=["']keywords["']\s+content=["'](.*?)["']/i
  )

  return {
    title: titleMatch ? titleMatch[1] : '未找到标题',
    description: descriptionMatch ? descriptionMatch[1] : '未找到描述',
    keywords: keywordsMatch ? keywordsMatch[1] : '未找到关键词'
  }
}

export function encodeToUrl (msg) {
  return encodeURIComponent(msg)
}

export function decodeFromUrl (urlStr) {
  return decodeURIComponent(urlStr)
}
export function encodeToUnicode (msg) {
  return msg
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0).toString(16).padStart(4, '0')
      return `\\u${code}`
    })
    .join('')
}

export function decodeFromUnicode (unicodeStr) {
  return unicodeStr.replace(/\\u[\dA-Fa-f]{4}/g, (match) =>
    String.fromCharCode(parseInt(match.replace('\\u', ''), 16))
  )
}

export function encodeToAscii (msg) {
  return msg
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0)
      return `\\x${code.toString(16).padStart(2, '0')}`
    })
    .join('')
}

export function decodeFromAscii (asciiStr) {
  return asciiStr.replace(/\\x[\dA-Fa-f]{2}/g, (match) =>
    String.fromCharCode(parseInt(match.replace('\\x', ''), 16))
  )
}
async function getDetailedWhoisData (domain) {
  try {
    return await whois(domain, { timeout: 10000 })
  } catch (error) {
    throw new Error(`获取 WHOIS 数据时出错: ${error.message}`)
  }
}
function translateWhoisData (data) {
  return Object.entries(data).reduce((acc, [key, value]) => {
    const translatedKey = whoisFieldsMap[key] || key
    acc[translatedKey] =
      typeof value === 'object' && !Array.isArray(value)
        ? translateWhoisData(value)
        : value
    return acc
  }, {})
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
export class WebTools extends plugin {
  constructor () {
    super({
      name: 'WebTools',
      dsc: 'WebTools',
      event: 'message',
      priority: 6,
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
          fnc: 'whois'
        },
        {
          reg: '^#?网页截图\\s*(\\S+.*)',
          fnc: 'webpage'
        },
        {
          reg: '^#?进制转换\\s*(.+)',
          fnc: 'BaseConversion'
        }
      ]
    })
  }

  async fetchSeoInfoHandler (e) {
    const { SeoAll } = Config.getConfig('memz')
    if (!SeoAll && !e.isMaster) { return logger.warn('[memz-plugin]Seo状态当前为仅主人可用') }
    let url = e.msg.match(/^#?seo\s*(.+)/)[1].trim()
    if (!url.startsWith('http')) {
      url = `https://${url}`
    }

    try {
      const seoInfo = await fetchSeoFromHtml(url)
      const result = `SEO信息:\n页面标题: ${seoInfo.title}\n描述: ${seoInfo.description}\n关键词: ${seoInfo.keywords}`
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
        result = action === '编码' ? encodeToUrl(input) : decodeFromUrl(input)
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

  async whois (e) {
    const { WhoisAll } = Config.getConfig('memz')
    if (!WhoisAll && !e.isMaster) { return logger.warn('[memz-plugin]Whois状态当前为仅主人可用') }
    const domain = e.msg.match(/#?whois\s*(.+)/)[1].trim()
    try {
      const data = await getDetailedWhoisData(domain)
      const translatedData = translateWhoisData(data)

      const whoisDataHtml = Object.entries(translatedData)
        .map(([key, value]) => `${key}: ${value}`)
        .join('<br>')

      const htmlTemplate = fs.readFileSync(`${PluginPath}/resources/html/whois/whois.html`, 'utf8')
      const html = htmlTemplate.replace('{{whoisdata}}', whoisDataHtml)

      const screenshotBuffer = await generateScreenshot(html)

      await e.reply(segment.image(`base64://${screenshotBuffer}`), true)
    } catch (error) {
      await this.reply(`错误: ${error.message}`, true)
    }
  }

  async webpage (e) {
    const { webpage } = Config.getConfig('memz')
    if (!webpage && !e.isMaster) {
      return logger.warn('[memz-plugin] 网页截图状态当前为仅主人可用')
    }

    const url = this.extractUrlFromMessage(e.msg)
    if (!url) {
      return await e.reply('请输入有效的网址', true)
    }

    try {
      const screenshotBase64 = await this.captureScreenshot(url)
      await e.reply(segment.image(`base64://${screenshotBase64}`), true)
    } catch (error) {
      await e.reply(`网页截图失败: ${error.message}`, true)
    }
  }

  extractUrlFromMessage (message) {
    let url = message.match(/^#?网页截图\s*(\S+.*)/)?.[1].trim()
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url
    }
    return url
  }

  async captureScreenshot (url) {
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
    return screenshotBase64
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
}
