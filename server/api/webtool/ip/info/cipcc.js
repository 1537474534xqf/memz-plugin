import fetch from 'node-fetch'
import * as cheerio from 'cheerio'
import { BaseApiHandler } from '../../../../lib/baseHandler.js'
import logger from '../../../../lib/logger.js'

export const title = 'IP查询-CIPCC'
export const key = { ip: ['需要查询的IP'] }
export const description = '查询IP地址的信息'

export default async (req, res) => {
  const handler = new BaseApiHandler(req, res, { title })
  try {
    if (!handler.validateMethod('GET')) return
    const missing = handler.validateParams({ ip: true })
    if (missing.length) {
      return handler.sendParamError(`缺少参数: ${missing.join(', ')}`)
    }
    const ip = handler.url.searchParams.get('ip')
    logger.debug(`[IP查询-CIPCC]开始查询: ${ip}`)
    const response = await fetch(`http://www.cip.cc/${ip}`)
    const html = await response.text()
    const $ = cheerio.load(html)
    const ipInfo = extractIpInfo($)

    if (!ipInfo) {
      return handler.handleError(new Error('查询失败'), '无法获取ICP信息')
    }
    logger.debug(`[IP查询-CIPCC]查询成功: ${ip}`)
    handler.sendSuccess(ipInfo)
  } catch (error) {
    handler.handleError(error)
  }
}

function extractIpInfo ($) {
  const ipData = $('pre').text()
  // eslint-disable-next-line no-useless-escape
  const ipMatch = ipData.match(/IP\s*:\s*([\d\.]+)/)
  const addressMatch = ipData.match(/地址\s*:\s*(.*)/)
  const data1Match = ipData.match(/数据二\s*:\s*(.*)/)
  const data2Match = ipData.match(/数据三\s*:\s*(.*)/)

  if (ipMatch && addressMatch && data1Match && data2Match) {
    return {
      ip: ipMatch[1].trim(),
      address: addressMatch[1].trim(),
      data1: data1Match[1].trim(),
      data2: data2Match[1].trim()
    }
  }

  return null
}
