import { Config } from '#components'
import axios from 'axios'
import https from 'https'
import pLimit from 'p-limit'

export class WebStatus extends plugin {
  constructor () {
    super({
      name: 'webStatus',
      dsc: 'webStatus',
      event: 'message',
      priority: 5,
      rule: [
        {
          reg: /^#?(网站|web)?服务状态$/i,
          fnc: 'webStatus'
        }
      ]
    })
  }

  getUserInfo (e) {
    return {
      user_id: e.user_id,
      nickname: e.sender.nickname || '为什么不玩原神'
    }
  }

  async webStatus (e) {
    const { list } = Config.getConfig('webStatus')
    const forwardMessages = []
    const limit = pLimit(5)

    for (const group of list) {
      const groupName = group.name || '未知分组'
      const userInfo = this.getUserInfo(e)

      forwardMessages.push({
        ...userInfo,
        message: `-----${groupName}-----`
      })

      const serviceChecks = group.content.map((service) =>
        limit(() => this.checkServiceStatusAndReport(service, userInfo))
      )

      try {
        const results = await Promise.all(serviceChecks)

        results.forEach((result) => {
          forwardMessages.push({
            ...userInfo,
            message: result
          })
        })
      } catch (error) {
        forwardMessages.push({
          ...userInfo,
          message: `分组: ${groupName} \n状态: ❌ (${error.message})`
        })
      }
    }

    if (forwardMessages.length > 0) {
      await e.reply(await Bot.makeForwardMsg(forwardMessages))
    }
  }

  async checkServiceStatusAndReport (service, userInfo) {
    let { name, url, status, timeout, ignoreSSL, retry } = service
    if (!timeout) {
      timeout = 5
    }
    if (!retry) {
      retry = 3
    }
    if (!ignoreSSL) {
      ignoreSSL = false
    }
    if (!status) {
      status = 200
    }

    try {
      const response = await this.checkServiceStatus(url, status, timeout, ignoreSSL, retry)
      return response
        ? `服务: ${name} \n状态: ✅ \n状态码: ${response.status}`
        : `服务: ${name} \n状态: ❌`
    } catch (error) {
      return `服务: ${name} \n状态: ❌ \n${error.message}`
    }
  }

  async checkServiceStatus (url, validStatuses, timeout, ignoreSSL, retry) {
    const validStatusArray = Array.isArray(validStatuses)
      ? validStatuses
      : validStatuses.toString().split(':').map(Number)

    const agent = new https.Agent({ rejectUnauthorized: !ignoreSSL })
    let attempts = 0
    let response = null

    while (attempts < retry) {
      attempts++
      try {
        const result = await axios.get(url, {
          timeout: timeout * 1000,
          httpsAgent: agent
        })

        if (validStatusArray.includes(result.status)) {
          response = result
          break
        } else {
          response = null
        }
      } catch (error) {
        if (attempts === retry) {
          let errorMessage = `请求失败: ${error.message}`

          if (error.code === 'ECONNABORTED') {
            errorMessage = '请求超时'
          } else if (error.code === 'ENOTFOUND') {
            errorMessage = `网络不可达: 无法连接到 URL: ${url}`
          } else if (error.response) {
            errorMessage = `服务器响应错误: 状态码 ${error.response.status} `
          } else {
            errorMessage = `请求失败: ${error.message}`
          }

          throw new Error(errorMessage)
        }
      }
    }

    return response
  }
}
