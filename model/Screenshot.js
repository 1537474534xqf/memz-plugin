import puppeteer from '../../../lib/puppeteer/puppeteer.js'

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
