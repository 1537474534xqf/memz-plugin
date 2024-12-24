import puppeteer from '../../../lib/puppeteer/puppeteer.js'

/**
 * 生成网页截图的异步函数
 * @param {string} html - 要截图的网页的HTML内容
 * @returns {Promise<string>} - 返回截图的Base64编码字符串
 */
export async function generateScreenshot (html) {
  try {
    if (!puppeteer.browser) {
      await puppeteer.browserInit()
    }

    const page = await puppeteer.browser.newPage()

    await page.setContent(html, { waitUntil: 'domcontentloaded' })

    const pageHeight = await page.evaluate(() => {
      return document.documentElement.scrollHeight
    })

    await page.setViewport({
      width: 1024,
      height: pageHeight
    })

    const buffer = await page.screenshot({
      encoding: 'base64'
    })

    await page.close()

    return buffer
  } catch (error) {
    logger.error(`[memz-plugin] Puppeteer 图片生成失败：${error.message}`)
  }
}
