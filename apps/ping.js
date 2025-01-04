import puppeteer from 'puppeteer'
import { Config } from '#components'
// 避免每次都重新启动puppeteer
let globalBrowserInstance
// 浏览器实例
async function getBrowserInstance (launchOptions) {
  if (globalBrowserInstance && globalBrowserInstance.isConnected()) {
    return globalBrowserInstance
  } else {
    globalBrowserInstance = await puppeteer.launch(launchOptions)
    return globalBrowserInstance
  }
}

export class PingScreenshot extends plugin {
  constructor () {
    super({
      name: '[memz-plugin]Ping',
      dsc: 'MEMZ-Plugin-Ping',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: '^#(http|ping|tcping)\\s*(\\S+)$',
          fnc: 'ping'
        }
      ]
    })
  }

  async ping (e) {
    const { PingAll, PingApi } = Config.getConfig('memz')
    if (!PingAll && !e.isMaster) {
      return logger.warn('[memz-plugin]Ping功能当前为仅主人可用')
    }
    if (PingApi === 1) {
      logger.debug('使用Zhalema进行Ping')
      await this.Zhalema(e)
    } else if (PingApi === 2) {
      logger.debug('使用itdog进行Ping')
      await this.itdog(e)
    } else {
      logger.warn('PingApi配置错误, 默认使用Zhalema进行Ping')
      await this.Zhalema(e)
    }
  }

  async Zhalema (e) {
    const { PingProxy, PingProxyAddress } = Config.getConfig('memz')

    const match = e.msg.match(/^#(http|ping|tcping)\s*(\S+)$/i)
    if (!match) {
      logger.warn('未匹配到正确的Ping命令')
      return await e.reply('请输入正确的Ping命令', true)
    }

    e.reply('正在获取Ping数据...请稍等......', true, { recallMsg: 5 })

    const [, type, siteName] = match
    logger.debug(`解析的命令类型: ${type}, 目标: ${siteName}`)

    const url = `https://zhale.me/${type}/?{"Target":"${siteName}","Options":{"ISPs":["移动","电信","联通","海外"],"Method":"GET","ParseMode":"default","SkipSSLVerify":false,"FollowRedirect":true},"IsContinue":false}`
    logger.debug(`[MEMZ-Plugin] 构造的目标 URL: ${url}`)

    const launchOptions = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }

    if (PingProxy && PingProxyAddress) {
      launchOptions.args.push(`--proxy-server=${PingProxyAddress}`)
      logger.debug(`[MEMZ-Plugin] 使用代理: ${PingProxyAddress}`)
    }

    logger.debug('启动 Puppeteer 浏览器...')
    const browser = await getBrowserInstance(launchOptions)
    const page = await browser.newPage()
    logger.debug('已创建新页面')

    try {
      logger.debug(`导航到目标页面: ${url}`)
      await page.goto(url, { waitUntil: 'networkidle2' })

      logger.debug('开始等待加载进度条...')
      let progress = 0
      const progressSelector = '.process-bar'

      while (progress < 100) {
        try {
          logger.debug('等待进度条元素...')
          await page.waitForSelector(progressSelector, { timeout: 5000 })

          progress = await page.evaluate((selector) => {
            const progressElement = document.querySelector(selector)
            if (progressElement) {
              const width = progressElement.style.width
              if (width) {
                const match = width.match(/(\d+)%/)
                if (match) {
                  return parseInt(match[1], 10)
                }
              }
            }
            return 0
          }, progressSelector)

          logger.debug(`当前进度: ${progress}%`)
          if (progress >= 100) {
            logger.debug('加载完成，进度达到100%')
            break
          }
        } catch (err) {
          logger.warn('进度条元素未找到或提取失败，继续重试...')
        }

        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      logger.debug('设置页面视口大小...')
      await page.setViewport({ width: 1420, height: 1000 })

      logger.debug('开始截图...')
      const clipOptions = {
        x: 95,
        y: 420,
        width: 1245,
        height: 1000
      }

      logger.debug(
        `截图区域 - x: ${clipOptions.x}, y: ${clipOptions.y}, width: ${clipOptions.width}, height: ${clipOptions.height}`
      )

      const screenshot = await page.screenshot({ encoding: 'base64', clip: clipOptions })
      logger.debug('截图成功，发送截图')

      await e.reply(segment.image(`base64://${screenshot}`), true)
    } catch (error) {
      logger.error(`Error in Zhalema: ${error.stack}`)
      await e.reply(`无法获取网页截图: ${error.message}`, true)
    } finally {
      logger.debug('关闭浏览器')
      await browser.close()
      logger.debug('退出 Zhalema 函数')
    }
  }

  async itdog (e) {
    const { PingProxy, PingProxyAddress } = Config.getConfig('memz')

    logger.debug('开始处理 Itdog 命令')
    const match = e.msg.match(/^#(http|ping|tcping)\s*(\S+)$/i)
    if (!match) {
      logger.warn('未匹配到正确的 Ping 命令')
      return await e.reply('请输入正确的 Ping 命令，例如：#ping example.com', true)
    }

    e.reply('正在获取 Ping 数据...请稍等......', true, { recallMsg: 10 })

    const [, type, siteName] = match
    logger.debug(`解析的命令类型: ${type}, 目标: ${siteName}`)

    if (type === 'http') {
      logger.warn('Itdog 暂不支持 http 类型的命令')
      return await e.reply(`Itdog 暂时不支持 ${type} 命令`, true)
    }

    const url = `https://www.itdog.cn/${type}/${siteName}`
    logger.info(`目标 URL: ${url}`)

    const launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--window-size=1920,1080'
      ]
    }

    if (PingProxy && PingProxyAddress) {
      launchOptions.args.push(`--proxy-server=${PingProxyAddress}`)
      logger.info(`[MEMZ-Plugin] 使用代理: ${PingProxyAddress}`)
    }

    logger.debug('启动 Puppeteer 浏览器')

    const browser = await getBrowserInstance(launchOptions)

    let page
    try {
      page = await browser.newPage()

      // 设置浏览器伪装
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
      )
      await page.setViewport({ width: 1920, height: 1080 })

      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false })
      })

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
      logger.debug(`页面加载成功: ${url}`)

      await page.waitForFunction(() => {
        const buttons = Array.from(document.querySelectorAll('button'))
        return buttons.some((btn) => btn.textContent.includes('单次测试'))
      }, { timeout: 10000 })
      logger.debug('“单次测试”按钮检测成功')

      const navigationPromise = page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => null)

      // 点击“单次测试”按钮
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'))
        const btn = buttons.find((button) => button.textContent.includes('单次测试'))
        if (btn) btn.click()
      })
      logger.debug('已点击“单次测试”按钮')

      await navigationPromise
      logger.debug('页面导航完成，等待进度条加载')

      const progressSelector = '#complete_progress > div'
      let progress = 0

      while (progress < 100) {
        try {
          await page.waitForSelector(progressSelector, { timeout: 5000 })
          progress = await page.evaluate((selector) => {
            const progressElement = document.querySelector(selector)
            if (progressElement) {
              const text = progressElement.textContent
              const num = parseInt(text.replace('%', ''), 10)
              return isNaN(num) ? 0 : num
            }
            return 0
          }, progressSelector)
          logger.debug(`当前进度: ${progress}%`)
        } catch {
          logger.warn('进度条元素未找到，继续等待')
        }

        if (progress >= 100) {
          logger.debug('进度条加载完成')
          break
        }

        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      const clipOptions = {
        x: 340,
        y: 799,
        width: 1245,
        height: 1000
      }
      logger.debug(
            `设置截图区域 - x: ${clipOptions.x}, y: ${clipOptions.y}, width: ${clipOptions.width}, height: ${clipOptions.height}`
      )

      const screenshot = await page.screenshot({ encoding: 'base64', clip: clipOptions })
      logger.info('截图成功，准备发送图片')

      await e.reply(segment.image(`base64://${screenshot}`), true)
    } catch (error) {
      logger.error(`Itdog 命令执行出错: ${error.stack}`)
      await e.reply(`无法获取网页截图: ${error.message}`, true)
    } finally {
      if (browser) {
        await browser.close()
        logger.info('浏览器已关闭')
      }
    }
  }
}
