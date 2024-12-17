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
      console.error(`Error processing AT data for user ${atQQ}:`, err)
    }
  }
})

export class whoAtme extends plugin {
  constructor () {
    super({
      name: '谁艾特我',
      dsc: '记录和查询群成员的AT信息',
      event: 'message',
      priority: -114514,
      rule: [
        {
          reg: '^#?(谁(艾特|@|at)(我|他|她|它)|哪个逼(艾特|@|at)我)$',
          fnc: 'whoAtme'
        },
        {
          reg: '^#?(/clear_at|清除(艾特|at)数据)$',
          fnc: 'clearAt'
        },
        {
          reg: '^#?(/clear_all|清除全部(艾特|at)数据)$',
          fnc: 'clearAll',
          permission: 'master'
        }
      ]
    })
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

    const forwardMsg = await e.group.makeForwardMsg(msgList)

    if (typeof forwardMsg.data === 'object') {
      const detail = forwardMsg.data?.meta?.detail
      if (detail) detail.news = [{ text: '点击显示内容' }]
    } else {
      forwardMsg.data = forwardMsg.data
        .replace(/\n/g, '')
        .replace(/<title color="#777777" size="26">(.+?)<\/title>/g, '<title color="#777777" size="26">点击显示内容</title>')
    }

    return e.reply(forwardMsg)
  }

  async clearAt (e) {
    if (!e.isGroup) return e.reply('只支持群聊使用')

    const key = `Yz:whoAtme:${e.group_id}_${e.user_id}`
    if (!(await redis.exists(key))) return e.reply('目前数据库没有你的AT数据，无法清除', true)

    await redis.del(key)
    return e.reply('已成功清除', true)
  }

  async clearAll (e) {
    const keys = await redis.keys(`Yz:whoAtme:${e.group_id}_*`)
    for (const key of keys) await redis.del(key)

    e.reply('已成功清除本群的全部艾特数据')
  }
}
