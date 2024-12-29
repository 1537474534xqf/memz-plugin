import { Config } from '#components'
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

  async webStatus (e) {
    const { list } = Config.getConfig('webStatus')
    const forwardMessages = []

    for (const group of list) {
      const groupName = group.name || '未知分组'
      const groupStatusMessages = []

      try {
        const serviceChecks = group.content.map(async (service) => {
          const { name, url, status, timeout, ignoreSSL, retry } = service
          if (!name || !url || !status || !timeout || !retry) {
            return `服务: ${name || '未知'} 缺少必需的字段。`
          }

          try {
            const response = await this.checkServiceStatus(url, status, timeout, ignoreSSL, retry)
            return response
              ? `服务: ${name} 状态: ✅ (${response.status})`
              : `服务: ${name} 状态: ❌`
          } catch (error) {
            return `服务: ${name} 状态: ❌ (${error.message})`
          }
        })

        const results = await Promise.all(serviceChecks)

        groupStatusMessages.push(...results)

        if (groupStatusMessages.length > 0) {
          forwardMessages.push({
            user_id: e.user_id,
            nickname: e.sender.nickname || '为什么不玩原神',
            message: `-----${groupName}-----\n${groupStatusMessages.join('\n')}`
          })
        }
      } catch (error) {
        forwardMessages.push({
          user_id: e.user_id,
          nickname: e.sender.nickname || '为什么不玩原神',
          message: `分组: ${groupName} 状态: ❌ (${error.message})`
        })
      }
    }

    if (forwardMessages.length > 0) {
      await e.reply(await Bot.makeForwardMsg(forwardMessages))
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
          throw new Error(`请求失败: ${error.message} (重试 ${attempts}/${retry})\nURL: ${url}\nTimeout: ${timeout}s\nSSL: ${ignoreSSL}`)
        }
      }
    }
    return response
  }
}
