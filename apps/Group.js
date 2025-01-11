import moment from 'moment'
import { Config } from '#components'
const { whoAtmeTime } = Config.getConfig('memz')

Bot.on('message.group', async (e) => {
  const imgUrls = []
  const faceIds = []
  let atQQs = []

  for (const msg of e.message) {
    if (msg.type === 'at') atQQs.push(msg.qq)
    if (msg.type === 'image') imgUrls.push(msg.url)
    if (msg.type === 'face') faceIds.push(msg.id)
  }

  if (!atQQs.length) return

  const endTime = moment().add(whoAtmeTime, 'hours').format('YYYY-MM-DD HH:mm:ss')
  const ttlInSeconds = (new Date(endTime).getTime() - Date.now()) / 1000

  if (e.atall) {
    const groupMembers = Array.from((await e.group.getMemberMap()).keys())
    atQQs = groupMembers
  }

  const rawMessage = e.raw_message.replace(/\[(.*?)\]/g, '').trim()

  for (const atQQ of atQQs) {
    try {
      const existingData = JSON.parse(await redis.get(`Yz:whoAtme:${e.group_id}_${atQQ}`)) || []
      const replyMessage = e.source ? (await e.group.getChatHistory(e.source.seq, 1)).pop() : null

      const newEntry = {
        User: e.user_id,
        message: rawMessage,
        image: imgUrls,
        name: e.nickname,
        faceId: faceIds,
        time: e.time,
        endTime,
        messageId: replyMessage ? replyMessage.message_id : ''
      }

      existingData.push(newEntry)

      const newTTL = existingData[0]?.endTime
        ? (new Date(existingData[0].endTime).getTime() - Date.now()) / 1000
        : ttlInSeconds

      await redis.set(`Yz:whoAtme:${e.group_id}_${atQQ}`, JSON.stringify(existingData), {
        EX: parseInt(newTTL, 10)
      })
    } catch (err) {
      logger.error(`Error when saving whoAtme data for group ${e.group_id} and user ${atQQ}:`, err)
    }
  }
})

export class GroupPlugin extends plugin {
  constructor () {
    super({
      name: '群聊功能',
      dsc: '群聊功能',
      event: 'message',
      priority: -114514,
      rule: [
        {
          reg: '^[#/]?((谁|哪个叼毛|哪个傻逼|哪个sb)(艾特|@|at)(我|他|她|它)|哪个逼(艾特|@|at)我)$',
          fnc: 'whoAtme'
        },
        {
          reg: '^[#/]?(/clear_at|清除(艾特|at)数据)$',
          fnc: 'clearAt'
        },
        {
          reg: '^[#/]?(/clear_all|清除全部(艾特|at)数据)$',
          fnc: 'clearAll',
          permission: 'master'
        },
        {
          reg: /^[#/](一键)?(召唤|艾特|@|at)(全体|所有|全部|all)(成员)?$/i,
          fnc: 'atAll'
        },
        {
          reg: '^[#/](群聊?)?一键(群聊?)?打卡$',
          fnc: 'groupSign',
          permission: 'master'
        },
        {
          reg: '^[#/]一键群发\\s*(.*)$',
          fnc: 'groupForward',
          permission: 'master'
        }
      ]
    })
  }

  async groupForward (e) {
    const msg = e.msg.match(/^[#/]一键群发\\s*(.*)$/i)

    const startTime = Date.now()
    let successCount = 0
    let failCount = 0
    const failedGroups = []

    for (let group of Bot[e.self_id].gl.keys()) {
      try {
        await Bot[e.self_id].pickGroup(group).sendMsg(msg)
        successCount++
      } catch (error) {
        failCount++
        failedGroups.push(group)
      } finally {
        // 避免频繁发送导致风控
        await e.runtime.common.sleep(2500)
      }
    }

    const endTime = Date.now() // 结束时间
    const totalGroups = successCount + failCount // 总群数
    const totalTime = endTime - startTime // 总耗时
    const failedGroupsStr = failedGroups.join(', ')

    let msgText = `总群组数: ${totalGroups}\n`
    if (successCount !== totalGroups) {
      msgText += `成功群组数: ${successCount}\n失败群组数: ${failCount}\n失败群组: ${failedGroupsStr}\n`
    }
    msgText += `耗时: ${totalTime} ms`
    e.reply(msgText, true)
  }

  async groupSign (e) {
    try {
      for (let group of Bot[e.self_id].gl.keys()) {
        Bot.pickGroup(group).sign()
        // Bot.sleep(100)
      }
      await e.reply('打卡完成', true)
    } catch (err) {
      logger.error('[memz-plugin] 群聊打卡失败:', err)
      await e.reply('打卡失败', err, true)
    }
  }

  async whoAtme (e) {
    if (!e.isGroup) return e.reply('只支持群聊使用')

    const atTarget = e.atBot ? Bot.uin : (e.msg.includes('我') ? e.user_id : e.at)
    const data = JSON.parse(await redis.get(`Yz:whoAtme:${e.group_id}_${atTarget}`)) || []

    if (!data.length) return e.reply('目前还没有人艾特', true)

    const msgList = data.map(entry => {
      const message = [
        entry.messageId ? { type: 'reply', id: entry.messageId } : '',
        entry.message,
        ...entry.faceId.map(id => segment.face(id)),
        ...entry.image.map(url => segment.image(url))
      ]
      return { message, user_id: entry.User, nickname: entry.name, time: entry.time }
    })

    const forwardMsg = await Bot.makeForwardMsg(msgList)

    e.reply(forwardMsg)
  }

  async clearAt (e) {
    if (!e.isGroup) return e.reply('只支持群聊使用')

    const key = `Yz:whoAtme:${e.group_id}_${e.user_id}`
    if (!(await redis.exists(key))) return e.reply('目前数据库没有你的AT数据，无法清除', true)

    await redis.del(key)

    e.reply('已成功清除', true)
  }

  async clearAll (e) {
    const keys = await redis.keys(`Yz:whoAtme:${e.group_id}_*`)
    for (const key of keys) await redis.del(key)

    e.reply('已成功清除本群的全部艾特数据')
  }

  async atAll (e) {
    if (!e.isMaster) return logger.warn('[memz-plugin] 艾特全体只有主人才能使用')
    if (!e.isGroup) return e.reply('艾特全体只支持群聊使用', true)

    let { atalltext, atChunkSize } = Config.getConfig('memz')
    const members = await this.e.group.getMemberMap()
    const qqNumbers = [...members.keys()]

    const atSegments = []

    qqNumbers.forEach(qq => {
      if (segment.ICQQ) {
        atSegments.push(segment.ICQQ(), segment.at(qq))
      } else {
        atSegments.push(segment.at(qq))
      }
      if (atalltext) {
        atSegments.push(segment.text(atalltext))
      }
    })

    for (let i = 0; i < atSegments.length; i += atChunkSize * 2) {
      const chunk = atSegments.slice(i, i + atChunkSize * 2)
      await e.reply(chunk)
      await Bot.sleep(500)
    }
  }
}
export class 主人解禁 extends plugin {
  constructor () {
    super({
      name: '主人解禁',
      dsc: '主人解禁',
      event: 'notice.group.ban',
      priority: 1,
      rule: [
        {
          fnc: '主人被禁言解禁'
        }
      ]
    }
    )
  }

  async 主人被禁言解禁 (e) {
    if (!e.isMaster) return false

    const { helpMaster, helpMasterText, nohelpMasterText } = Config.getConfig('memz')

    if (!helpMaster) return logger.warn('[memz-plugin] 主人解禁功能未开启')

    if ((e.group.pickMember(this.e.user_id, true).is_admin && !e.group.is_owner) || (!e.bot.pickGroup(e.group_id).is_admin && !e.group.is_owner)) {
      if (nohelpMasterText) {
        return e.reply(nohelpMasterText)
      } else {
        return false
      }
    }

    if (e.duration === 0) return false

    await e.group.muteMember(e.user_id, 0)
    if (helpMasterText) {
      return e.reply(helpMasterText)
    } else {
      return false
    }
  }
}
