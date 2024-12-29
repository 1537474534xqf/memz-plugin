import { Config, PluginData } from '#components'
import path from 'path'

const appidData = await import(path.join(PluginData, 'music', 'appid.json'))

export class 音卡 extends plugin {
  constructor () {
    super({
      name: '音卡',
      dsc: '音卡',
      event: 'message',
      priority: -9,
      rule: [
        {
          reg: /^#?音卡测试\s*(\S+)\s*(.*)$/i,
          fnc: '音卡测试',
          permission: 'master'
        }
      ]
    })
  }

  async 音卡测试 (e) {
    const { ICQQBotQQ } = Config.getConfig('music')
    const match = e.msg.match(/^#?音卡测试\s*(\S+)\s*(.*)$/i)

    if (!match) {
      e.reply('请提供有效的类型', true)
      return
    }

    const type = match[1]
    const customParams = match[2].split(',')

    const [title = 'MapleLeaf', content = '玩原神玩的', singer = 'MapleLeaf', image = 'http://q.qlogo.cn/headimg_dl?dst_uin=1011303349&spec=640&img_type=jpg', groupId = e.group_id] = customParams

    await executeShareCard(
      ICQQBotQQ,
      type,
      title,
      content,
      singer,
      image,
      groupId
    )
  }
}

async function executeShareCard (ICQQBotQQ, type, title, content, singer, image, groupId) {
  let appInfo = appidData[type]

  if (!appInfo) {
    logger.error(`Error: type '${type}' not found in appidData.`)
    return { message: `未找到类型 '${type}' 的音卡数据。`, error: true }
  }

  const { appid, package_name: packageName, sign } = appInfo

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
      11: groupId,
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
    let 结果 = await Bot[ICQQBotQQ].sdk.sendUni('OidbSvc.0xb77_9', Bot[ICQQBotQQ].icqq.core.pb.encode(分享卡pb))
    let result = Bot[ICQQBotQQ].icqq.core.pb.decode(结果)

    if (result[3] !== 0) {
      Bot[ICQQBotQQ].pickGroup(groupId).sendMsg(`歌曲分享失败：${result[3]}`, true)
      logger.error(`音卡失败：${result[3]}`)
      return { message: `音卡分享失败: ${result[3]}`, error: true }
    } else {
      logger.info(`音卡分享成功，seq=${result[1]}`)
      return { message: '音卡分享成功！', error: false }
    }
  } catch (error) {
    Bot[ICQQBotQQ].pickGroup(groupId).sendMsg(`音卡分享过程中出错: ${error.message}`)
    logger.error(`音卡分享异常：${error.stack}`)
    return { message: `音卡分享过程出错: ${error.message}`, error: true }
  }
}
