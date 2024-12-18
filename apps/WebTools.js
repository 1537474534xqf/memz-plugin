import fs from 'fs'
import whois from 'whois-json'
import { generateScreenshot, fetchIcpInfo, translateWhoisData } from '#model'
import { Config, PluginPath } from '#components'
import puppeteer from '../../../lib/puppeteer/puppeteer.js'

async function fetchSeoFromHtml (url) {
  const response = await fetch(url)
  const html = await response.text()

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

async function encodeToUrl (msg) {
  return encodeURIComponent(msg)
}

async function decodeFromUrl (urlStr) {
  return decodeURIComponent(urlStr)
}
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
async function decodeHexToReadableText (hex) {
  const buffer = Buffer.from(hex, 'hex')

  try {
    const utf8Decoded = buffer.toString('utf-8')
    const readableText = filterReadableText(utf8Decoded)
    if (readableText) {
      return readableText
    }
  } catch (error) {
    console.error('UTF-8 解码失败:', error)
  }

  return '没有可读的文本内容'
}

function filterReadableText (str) {
  return str.replace(/[^\s\p{L}\p{N}\p{P}\p{S}]/gu, '')
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
          reg: /^#?hex解码\s*(\S+)$/i,
          fnc: 'HexToUtf'
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

    const url = this.extractUrlFromMessage(e.msg)
    if (!url) {
      return await e.reply('请输入有效的网址', true)
    }

    try {
      const screenshotBase64 = await this.captureScreenshot(url)
      await e.reply(segment.image(`base64://${screenshotBase64}`), true)
    } catch (error) {
      await e.reply(`[memz-plugin] 网页截图失败: ${error.message}`, true)
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

  async HexToUtf (e) {
    const msg = e.msg.match(/^#?hex解码\s*(\S+)$/i)
    if (msg && msg[1]) {
      const decodedString = decodeHexToReadableText(msg[1])
      e.reply(decodedString, true)
    } else {
      e.reply('请提供有效的 HEX 字符串。', true)
    }
  }
}
