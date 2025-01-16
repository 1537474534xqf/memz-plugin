import moment from 'moment'
import path from 'path'
import fs from 'fs/promises'
import { Config, PluginData } from '#components'
const { whoAtmeTime } = Config.getConfig('memz')
const MemberListPath = path.join(PluginData, 'MemberList')

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
  constructor() {
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
          reg: /^[#/](一键)?(召唤|艾特|@|at)(全体|所有|全部|all)(成员)?(.*)/i,
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
        },
        {
          reg: '^[#/]一键私发\\s*(.*)$',
          fnc: 'privateForward',
          permission: 'master'
        },
        {
          reg: '[#/]保存(全部)?群员名单\\s*(\\d+)?$',
          fnc: 'getMemberList',
          permission: 'master'
        },
        {
          reg: '^#一键(加害|封杀|禁言)(\\d+)?( )?(\\d+)?$',
          fnc: 'MassMuteAll',
          permission: 'master'
        },
        {
          reg: '^#召唤(\\d+)?次?(撤回)?',
          fnc: 'atatat',
          permission: 'master'
        },
        {
          reg: '^[#/]查找\s*(\d*)$',
          fnc: 'search',
          permission: 'master'
        }
      ]
    })
  }

  async search(e) {
    const match = e.msg.match(/^[#/]查找\s*(\d*)$/i);
    const qqNumbers = e.message.filter(msg => msg.type === 'at').map(msg => msg.qq) || (match ? [match[1]] : []);

    const memberIndex = new Map();
    const groupPromises = [];

    for (const [gid, info] of Bot.gl) {
      if (e.group_id === gid) continue;

      groupPromises.push(
        (async () => {
          try {
            const memberMap = await Bot.pickGroup(gid).getMemberMap();
            memberMap.forEach(item => {
              if (!memberIndex.has(item.user_id)) {
                memberIndex.set(item.user_id, []);
              }
              memberIndex.get(item.user_id).push({
                gid,
                group_name: info.group_name,
                role: item.role,
                title: item.title,
              });
            });
          } catch (err) {
            e.reply(`Error when searching in group ${gid}:`, err);
          }
        })()
      );
    }

    await Promise.all(groupPromises);

    const msg = [];
    const nickname = e.sender.nickname || '为什么不玩原神';

    for (const userId of qqNumbers) {
      if (memberIndex.has(userId)) {
        msg.push({ user_id: e.user_id, nickname, message: `用户${userId}` });

        const groups = memberIndex.get(userId);
        groups.forEach(group => {
          msg.push({
            user_id: e.user_id,
            nickname,
            message: `群${group.gid}(${group.group_name})找到用户${userId}\n身份: ${
              group.role === "admin" ? "群管理" :
              group.role === "owner" ? "群主" :
              "群员"
            }${group.title ? `\n头衔: ${group.title}` : ""}`
          });
        });
      }
    }

    if (msg.length === 0) {
      msg.push({
        user_id: e.user_id,
        nickname,
        message: `在${groupPromises.length}个群中没有找到这些人`
      });
    }

    await e.reply(Bot.makeForwardMsg(msg));
  }

  async atatat(e) {
    if (!e.isGroup) return e.reply('召唤只支持群聊使用', true)

    const qqNumbers = e.message.filter(msg => msg.type === 'at').map(msg => msg.qq)
    if (qqNumbers.length === 0) return e.reply('请艾特你要召唤的人', true)

    const recallMsg = e.msg.includes('撤回')

    const atSegments = qqNumbers.map(qq => {
      return segment.ICQQ ? [segment.ICQQ(), segment.at(qq)] : [segment.at(qq)]
    }).flat()

    const match = e.msg.match(/^#召唤(\d+)?次?(撤回)?$/)
    let summonCount = match ? parseInt(match[1], 10) || 20 : 20

    for (let i = 0; i < summonCount; i++) {
      const res = await e.reply(atSegments)
      const msgId = res.message_id
      if (recallMsg) {
        await e.group.recallMsg(msgId)
      }
      Bot.sleep(2000)
    }
  }

  async MassMuteAll(e) {
    const match = e.msg.match(/^#一键(加害|封杀|禁言)(\d+)?( )?(\d+)?$/)
    if (!match) {
      return e.reply('命令格式不正确，请检查并重新发送')
    }

    await e.reply('开始禁言操作...', true)

    const targetId = e.at || match[2]
    const muteTime = e.at ? (match[2] ? parseInt(match[2], 10) : 600) : (match[4] ? parseInt(match[4], 10) : 600)

    const groupList = Array.from(await Bot[e.self_id].gl.values())
    let successCount = 0
    let failedCount = 0
    const messages = []

    for (const group of groupList) {
      const groupId = group.group_id
      try {
        const isAdmin = group.admin_flag
        const success = await Bot[e.self_id].pickGroup(groupId).muteMember(targetId, muteTime)
        if (isAdmin && success) {
          successCount++
          messages.push(`在群 ${groupId} 成功禁言 ${targetId} ${muteTime}秒`)
        } else {
          failedCount++
        }
      } catch (error) {
        failedCount++
        messages.push(`在群 ${groupId} 执行禁言操作时发生错误: ${error.message}`)
      }
    }

    messages.push(`操作完成: 成功禁言 ${successCount} 个群，失败 ${failedCount} 个群`)

    const forwardMessage = e.runtime.common.makeForwardMsg(e, messages, '操作结果')
    await e.reply(forwardMessage)
  }

  async getMemberList(e) {
    try {
      const match = e.msg.match(/^[#/]保存(全部)?群员名单\s*(\d*)$/i)
      let groupIds = []
      let responseMessages = []

      if (match && match[2]) {
        groupIds = [match[2]]
      } else if (e.msg.trim() === '#保存全部群员名单') {
        groupIds = Array.from(Bot[e.self_id].gl.keys())
      } else {
        groupIds = [e.group_id]
      }

      for (let groupId of groupIds) {
        try {
          const group = Bot.pickGroup(groupId)
          if (!group) {
            responseMessages.push(`未找到群组 ${groupId}，请确认群号是否正确。`)
            continue
          }

          const memberMap = await group.getMemberMap()
          const memberList = Array.from(memberMap.values()).map(item => ({
            QQ号: item.user_id,
            UID: item.uid,
            昵称: item.nickname,
            性别: item.sex,
            年龄: item.age
          }))

          await fs.mkdir(MemberListPath, { recursive: true })

          const filePath = path.join(MemberListPath, `${groupId}.json`)
          const fileExists = await fs.access(filePath).then(() => true).catch(() => false)

          await fs.writeFile(filePath, JSON.stringify(memberList, null, 2))

          responseMessages.push(fileExists
            ? `群号${groupId}的群员名单已更新`
            : `群号${groupId}的群员名单保存成功`)
          Bot.sleep(500)
        } catch (error) {
          responseMessages.push(`保存群号${groupId}的群员名单时发生错误：${error.message}`)
        }
      }

      await e.reply(responseMessages.join('\n'), true)
      return true
    } catch (error) {
      logger.error('保存群员名单时发生错误：', error)
      return e.reply(`保存群员名单失败：${error.message}`, true)
    }
  }

  async privateForward(e) {
    const msg = e.msg.match(/^[#/]一键私发\\s*(.*)$/i)
    const startTime = Date.now()
    let successCount = 0
    let failCount = 0
    const failedUsers = []
    for (let user of Bot[e.self_id].fl.keys()) {
      try {
        await Bot[e.self_id].pickUser(user).sendMsg(msg)
        successCount++
      } catch (error) {
        failCount++
        failedUsers.push(user)
      } finally {
        // 避免频繁发送导致风控
        await e.runtime.common.sleep(2500)
      }
    }

    const endTime = Date.now() // 结束时间
    const totalUsers = successCount + failCount // 总用户数
    const totalTime = endTime - startTime // 总耗时
    const failedUsersStr = failedUsers.join(', ')

    let msgText = `总用户数: ${totalUsers}\n`
    if (successCount !== totalUsers) {
      msgText += `成功用户数: ${successCount}\n失败用户数: ${failCount}\n失败用户: ${failedUsersStr}\n`
    }
    msgText += `耗时: ${totalTime} ms`
    e.reply(msgText, true)
  }

  async groupForward(e) {
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

  async groupSign(e) {
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

  async whoAtme(e) {
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

  async clearAt(e) {
    if (!e.isGroup) return e.reply('只支持群聊使用')

    const key = `Yz:whoAtme:${e.group_id}_${e.user_id}`
    if (!(await redis.exists(key))) return e.reply('目前数据库没有你的AT数据，无法清除', true)

    await redis.del(key)

    e.reply('已成功清除', true)
  }

  async clearAll(e) {
    const keys = await redis.keys(`Yz:whoAtme:${e.group_id}_*`)
    for (const key of keys) await redis.del(key)

    e.reply('已成功清除本群的全部艾特数据')
  }

  async atAll(e) {
    if (!e.isMaster) return logger.warn('[memz-plugin] 艾特全体只有主人才能使用')
    if (!e.isGroup) return e.reply('艾特全体只支持群聊使用', true)

    const recallMsg = e.msg.includes('撤回')
    e.recall()
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

    const messageChunks = []
    for (let i = 0; i < atSegments.length; i += atChunkSize * 2) {
      const chunk = atSegments.slice(i, i + atChunkSize * 2)
      messageChunks.push(chunk)
    }

    for (const chunk of messageChunks) {
      const res = await e.reply(chunk)
      const msgId = res.message_id
      if (recallMsg) {
        await e.group.recallMsg(msgId)
      }
      Bot.sleep(500)
    }
  }
}
export class 主人解禁 extends plugin {
  constructor() {
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

  async 主人被禁言解禁(e) {
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
