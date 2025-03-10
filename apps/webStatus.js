import axios from 'axios'
import https from 'https'

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
    const { list } = memz.webStatus || {}
    if (!list || list.length === 0) return

    const forwardMessages = []

    for (const group of list) {
      const groupName = group.name || '未知分组'
      const userInfo = this.getUserInfo(e)

      forwardMessages.push({
        ...userInfo,
        message: `-----${groupName}-----`
      })

      const serviceChecks = group.content.map((service) =>
        this.checkServiceStatusAndReport(service, userInfo)
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
    const { name, url, status = 200, timeout = 5, ignoreSSL = false, retry = 3 } = service

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
          const errorMessage = this.getErrorMessage(error, url)

          throw new Error(errorMessage)
        }
      }
    }

    return response
  }

  getErrorMessage (error, url) {
    if (error.code === 'ECONNABORTED') {
      return '请求超时'
    } else if (error.code === 'ENOTFOUND') {
      return `网络不可达: 无法连接到 URL: ${url}`
    } else if (error.response) {
      return `服务器响应错误: 状态码 ${error.response.status}`
    } else {
      return `请求失败: ${error.message}`
    }
  }
}
