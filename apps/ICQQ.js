import { PluginData, BotName } from '#components'
import path from 'path'
import fs from 'fs'
const appidData = JSON.parse(fs.readFileSync(path.join(PluginData, 'music', 'appid.json'), 'utf-8'))

export class ICQQ extends plugin {
  constructor () {
    super({
      name: 'ICQQ',
      dsc: 'ICQQ',
      event: 'message',
      priority: -9,
      rule: [
        {
          reg: /^#音卡测试(.*)$/i,
          fnc: '音卡测试',
          permission: 'master'
        },
        {
          reg: /^#?查Q龄(.*)$/i,
          fnc: 'fetchQQAge'
        },
        {
          // eslint-disable-next-line
          reg: '^#?全体假禁(\d+)?$',
          fnc: 'jiajin',
          permission: 'master'
        }
      ]
    })
  }

  async jiajin (e) {
    const time = e.msg.match(/(\d+)/) ? e.msg.match(/(\d+)/) : 1
    e.group._setting({ 17: time })
  }

  async fetchQQAge (e) {
    if (!memz.icqq.fetchQQAgeAll && !e.isMaster) return logger.warn('[memz-plugin] 未开启Q龄查询功能')
    const qqNumber = e.at || (e.msg.match(/^#?查q龄(\d+)$/i) ? RegExp.$1 : e.user_id)
    const { ICQQBotQQ } = memz.icqq
    if (!ICQQBotQQ) return e.reply('[memz-plugin] 未设置ICQQ Bot', true)
    const body = {
      1: Number(qqNumber),
      2: 0,
      3: [{ 1: 20026 }]
    }
    try {
      const qqResponse = await Bot[ICQQBotQQ].sendOidbSvcTrpcTcp('OidbSvcTrpcTcp.0xfe1_2', body, { message_type: 32 })

      const registrationTimestamp = qqResponse?.[1]?.[2]?.[1]?.[2]
      if (registrationTimestamp) {
        const registrationDate = new Date(registrationTimestamp * 1000)
        const formattedDate = registrationDate.toISOString().replace('T', ' ').slice(0, 19)
        e.reply(`QQ ${qqNumber} 注册日期\n${formattedDate}`, true)
      } else {
        e.reply('未能获取到注册时间戳或数据格式不正确')
      }
    } catch (error) {
      logger.error('获取QQ注册时间时发生错误', error)
      e.reply('获取QQ注册时间时发生错误，请稍后再试')
    }
  }

  async 音卡测试 (e) {
    const {
      ICQQBotQQ,
      MusicSignPlatform,
      MusicSignTitle,
      MusicSignContent,
      MusicSignUrl,
      MusicSignImageUrl
    } = memz.icqq
    if (!ICQQBotQQ) return e.reply('[memz-plugin] 未设置ICQQ Bot', true)
    const match = e.msg.match(/^#音卡测试(.*)$/i)

    if (match[0] === '帮助') { return e.reply('参数#音卡测试Appid,标题,内容,跳转链接,图片链接,群号', true) }

    const customParams = match[1].split(',').map(param => param.trim())

    const [type, title, content, singer, image, groupId] = [
      customParams[0] || MusicSignPlatform || '163',
      customParams[1] || MusicSignTitle || 'MapleLeaf',
      customParams[2] || MusicSignContent || '玩原神玩的',
      customParams[3] || MusicSignUrl || 'https://MapleLeaf.icu',
      customParams[4] || MusicSignImageUrl || 'http://q.qlogo.cn/headimg_dl?dst_uin=1011303349&spec=640&img_type=jpg',
      customParams[5] || e.group_id
    ]

    try {
      await executeShareCard(ICQQBotQQ, type, title, content, singer, image, groupId)
    } catch (err) {
      logger.error(`音卡测试执行失败: ${err.message}`)
      e.reply('音卡测试执行失败', err.message, true)
    }
  }
}

async function executeShareCard (ICQQBotQQ, type, title, content, singer, image, groupId) {
  const appInfo = appidData[type]

  if (!appInfo) {
    logger.error(`Error: type '${type}' not found in appidData.`)
    return { message: `未找到类型 '${type}' 的音卡数据。`, error: true }
  }

  const { appid, package_name: packageName, sign } = appInfo

  logger.info(`分享卡数据: ${JSON.stringify({
    type, title, content, singer, image, groupId, appid, packageName, sign
  })}`)

  const 分享卡 = {
    1: 2935,
    2: 9,
    4: {
      1: appid,
      2: 1,
      5: {
        1: 1,
        2: '0.0.0',
        3: packageName,
        4: sign
      },
      7: {
        15: 7451537341556772000
      },
      10: 1,
      11: Number(groupId),
      12: {
        10: title,
        11: content,
        13: singer,
        14: image
      }
    },
    6: 'android 9.1.25'
  }

  try {
    const 结果 = BotName === 'Trss-Yunzai'
      ? await Bot[ICQQBotQQ].sdk.sendUni('OidbSvc.0xb77_9', Bot[ICQQBotQQ].icqq.core.pb.encode(分享卡))
      // eslint-disable-next-line
      : await Bot[ICQQBotQQ].sendUni('OidbSvc.0xb77_9', core.pb.encode(分享卡))
    const result = BotName === 'Trss-Yunzai'
      ? Bot[ICQQBotQQ].icqq.core.pb.decode(结果)
      // eslint-disable-next-line
      : core.pb.decode(结果)

    if (result[3] !== 0) {
      Bot[ICQQBotQQ].pickGroup(groupId).sendMsg(`音卡分享失败：${result[3]}`, true)
      logger.error(`音卡分享失败：${result[3]}`)
      return { message: `音卡分享失败: ${result[3]}`, error: true }
    }
  } catch (error) {
    Bot[ICQQBotQQ].pickGroup(groupId).sendMsg(`音卡分享过程中出错: ${error.message}`)
    logger.error(`音卡分享异常：${error.stack}`)
    return { message: `音卡分享过程出错: ${error.message}`, error: true }
  }
}
