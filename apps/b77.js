import { Config, PluginData, BotName } from '#components'
import path from 'path'
import fs from 'fs'

const appidData = JSON.parse(fs.readFileSync(path.join(PluginData, 'music', 'appid.json'), 'utf-8'))

export class b779 extends plugin {
  constructor () {
    super({
      name: 'b77_9',
      dsc: 'b77_9',
      event: 'message',
      priority: -9,
      rule: [
        {
          reg: /^#音卡测试(.*)$/i,
          fnc: '音卡测试',
          permission: 'master'
        }
      ]
    })
  }

  async 音卡测试 (e) {
    const { ICQQBotQQ } = Config.getConfig('music')

    const match = e.msg.match(/^#音卡测试(.*)$/i)

    if (!match) {
      return e.reply('请提供有效的类型和其他参数', true)
    }

    const customParams = match[1].split(',').map(param => param.trim())

    let [type = '163', title = 'MapleLeaf', content = '玩原神玩的', singer = 'https://MapleLeaf.icu', image = 'http://q.qlogo.cn/headimg_dl?dst_uin=1011303349&spec=640&img_type=jpg', groupId = e.group_id] = customParams

    if (title === '') title = 'MapleLeaf'
    if (content === '') content = '玩原神玩的'
    if (singer === '') singer = 'https://MapleLeaf.icu'
    if (image === '') image = 'http://q.qlogo.cn/headimg_dl?dst_uin=1011303349&spec=640&img_type=jpg'
    if (groupId === '') groupId = e.group_id

    logger.info(`最终参数:type = ${type}, title = ${title}, content = ${content}, singer = ${singer}, image = ${image}, groupId = ${groupId}`)

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

  logger.info(`分享卡数据: ${JSON.stringify({
    type, title, content, singer, image, groupId, appid, packageName, sign
  })}`)

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

  try {
    let 结果 = BotName === 'Trss-Yunzai'
      ? await Bot[ICQQBotQQ].sdk.sendUni('OidbSvc.0xb77_9', Bot[ICQQBotQQ].icqq.core.pb.encode(分享卡pb))
      // eslint-disable-next-line
      : await Bot[ICQQBotQQ].sendUni('OidbSvc.0xb77_9', core.pb.encode(分享卡pb))
    let result = BotName === 'Trss-Yunzai'
      ? Bot[ICQQBotQQ].icqq.core.pb.decode(结果)
      // eslint-disable-next-line
      : core.pb.decode(结果)

    logger.info(`音卡分享结果: ${JSON.stringify(result)}`)

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
