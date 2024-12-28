import appidData from '../../data/music/appid.json' with { type: 'json' }
import { Config } from '#components'
/**
 * 执行分享卡片操作
 * @param {string} type - 卡片类型
 * @param {string} title - 卡片标题
 * @param {string} content - 卡片内容
 * @param {string} singer - 歌手名称
 * @param {string} image - 图片链接
 * @returns {Promise<string>} - 返回分享成功的JSON数据
 */
export async function executeShareCard (type, title, content, singer, image) {
  const { MusicSign, groupId, ICQQBotQQ } = Config.getConfig('music')
  if (!MusicSign || !groupId || !ICQQBotQQ) {
    return logger.error('当前未启用音乐签名或未配置群号或机器人QQ号')
  }
  let appInfo = appidData[type]
  if (!appInfo) {
    logger.error(`Error: type '${type}' not found in appidData.`)
    return
  }

  let { appid, package_name: packageName, sign } = appInfo

  let 分享卡pb = {
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

  let 结果

  const sendMethod = Bot[ICQQBotQQ].sdk?.sendUni || this.e.bot.sendUni

  let encodeMethod
  if (core?.pb?.encode) {
    encodeMethod = core.pb.encode
  } else if (Bot.icqq?.core?.pb?.encode) {
    encodeMethod = Bot.icqq.core.pb.encode
  } else {
    return logger.error('未找到有效的编码方法: icqq.core.pb.encode 或 core.pb.encode')
  }

  if (!sendMethod) {
    return logger.error('未找到有效的发送方法: sdk.sendUni 或 sendOidb')
  }

  try {
    结果 = await sendMethod('OidbSvc.0xb77_9', encodeMethod(分享卡pb))

    let decodeMethod
    if (Bot[ICQQBotQQ]?.icqq?.core?.pb?.decode) {
      decodeMethod = Bot[ICQQBotQQ].icqq.core.pb.decode
    } else if (core?.pb?.decode) {
      decodeMethod = core.pb.decode
    } else {
      return logger.error('未找到有效的解码方法: icqq.core.pb.decode 或 core.pb.decode')
    }

    let result = decodeMethod(结果)

    logger.info(`使用ICQQ_Bot: ${ICQQBotQQ} 发送群号: ${groupId} 分享音乐卡片`)
    if (result[3] !== 0) {
      Bot[ICQQBotQQ].pickGroup(groupId).sendMsg(`歌曲分享失败：${result[3]}`, 分享卡pb, true)
      logger.error(`音卡失败：${result[3]}`)
    } else {
      let seq = result[4][8]
      logger.info(`音卡分享成功，seq=${seq}`)

      let msgHistory = await Bot[3310434307].pickGroup(groupId).getChatHistory(seq, 1)

      if (msgHistory && msgHistory.length > 0) {
        let messageData = msgHistory[0].message.find(msg => msg.type === 'json')

        if (messageData && messageData.data) {
          let msgData = JSON.parse(messageData.data)

          let 返回json数据 = JSON.stringify(msgData, null, 2)
          logger.info('音卡分享成功')
          return 返回json数据
        } else {
          logger.error('未找到有效的json数据')
        }
      } else {
        logger.error('未找到历史消息')
      }
    }
  } catch (error) {
    Bot[ICQQBotQQ].pickGroup(groupId).sendMsg(`音卡分享过程中出错: ${error.message}`)
    logger.error(`音卡分享异常：${error.stack}`)
  }
}
