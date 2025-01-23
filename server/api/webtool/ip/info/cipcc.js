import { URL } from 'url'
import fetch from 'node-fetch'
import * as cheerio from 'cheerio'
import { copyright } from '#components'

const title = 'IP查询'

export default async (req, res) => {
  const time = new Date().toISOString()
  try {
    const protocol = req.headers['x-forwarded-proto'] || (req.connection.encrypted ? 'https' : 'http')
    const parsedUrl = new URL(req.url, `${protocol}://${req.headers.host}`)
    const ip = parsedUrl.searchParams.get('ip')

    if (!ip) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
      return res.end(JSON.stringify({
        code: 400,
        message: '缺少必要的IP参数, 请在查询参数中添加ip参数',
        title,
        time,
        copyright
      }))
    }

    const response = await fetch(`http://www.cip.cc/${ip}`)
    const html = await response.text()

    const $ = cheerio.load(html)

    const ipInfo = extractIpInfo($)

    if (!ipInfo) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
      return res.end(JSON.stringify({
        code: 404,
        message: '未找到该IP的相关信息',
        title,
        time,
        copyright
      }))
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 0,
      message: '查询成功',
      title,
      time,
      data: ipInfo,
      copyright
    }))
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({
      code: 500,
      message: '查询失败',
      title,
      time,
      error: error.message,
      copyright
    }))
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
