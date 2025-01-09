import puppeteer from '../../../lib/puppeteer/puppeteer.js'

/**
 * 生成网页截图的异步函数
 * @param {string} html - 要截图的网页的HTML内容
 * @returns {Promise<string>} - 返回截图的Base64编码字符串
 */
export async function generateScreenshot (html) {
  let page = null

  try {
    if (!puppeteer.browser) {
      await puppeteer.browserInit()
    }

    page = await puppeteer.browser.newPage()

    await page.setContent(html, { waitUntil: 'load' })

    const pageHeight = await page.evaluate(() => {
      return document.documentElement.scrollHeight
    })

    await page.setViewport({
      width: 1024,
      height: pageHeight
    })

    const screenshotBase64 = await page.screenshot({
      encoding: 'base64'
    })

    return screenshotBase64
  } catch (error) {
    logger.error(`[memz-plugin] Puppeteer 图片生成失败：${error.message}`)
    throw error
  } finally {
    if (page) {
      await page.close()
    }
  }
}
