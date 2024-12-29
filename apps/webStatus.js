import { Config } from '#components'
import axios from 'axios'
import https from 'https'

const { list } = Config.getConfig('webStatus')

export class webStatus extends plugin {
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
    const forwardMessages = []

    await Promise.all(list.map(async (group) => {
      try {
        const groupName = group.name
        const groupStatusMessages = await Promise.all(group.content.map(async (service) => {
          try {
            const { name, url, status, timeout, ignoreSSL, retry } = service

            if (!name || !url || !status || !timeout || !retry) {
              throw new Error(`服务 ${name || '未知'} 缺少必需的字段。`)
            }

            const response = await this.checkServiceStatus(url, status, timeout, ignoreSSL, retry)

            if (response) {
              return `服务: ${name} 状态: ✅ (${response.status})`
            } else {
              return `服务: ${name} 状态: ❌`
            }
          } catch (error) {
            return `服务: ${service.name || '未知'} 状态: ❌ (${error.message})`
          }
        }))

        forwardMessages.push({
          user_id: e.user_id,
          nickname: e.sender.nickname || '为什么不玩原神',
          message: `---${groupName}---`
        })

        if (groupStatusMessages.length > 0) {
          forwardMessages.push({
            user_id: e.user_id,
            nickname: e.sender.nickname || '为什么不玩原神',
            message: groupStatusMessages.join('\n')
          })
        }
      } catch (error) {
        forwardMessages.push({
          user_id: e.user_id,
          nickname: e.sender.nickname || '为什么不玩原神',
          message: `分组: ${group.name || '未知'} 状态: ❌ (${error.message})`
        })
      }
    }))

    if (forwardMessages.length > 0) {
      await e.reply(await Bot.makeForwardMsg(forwardMessages))
    }
  }

  async checkServiceStatus (url, validStatuses, timeout, ignoreSSL, retry) {
    let attempts = 0
    let response = null

    const validStatusArray = Array.isArray(validStatuses)
      ? validStatuses
      : validStatuses.toString().split(':').map(Number)

    while (attempts < retry) {
      attempts++
      try {
        const result = await axios.get(url, {
          timeout: timeout * 1000,
          httpsAgent: new https.Agent({ rejectUnauthorized: !ignoreSSL })
        })

        if (validStatusArray.includes(result.status)) {
          response = result
          break
        } else {
          response = null
        }
      } catch (error) {
        if (attempts === retry) {
          throw new Error(`请求失败: ${error.message}`)
        }
      }
    }
    return response
  }
}
