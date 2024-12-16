import { Config } from '../components/index.js'

const { GroupSchedulerCron } = Config.getConfig('memz')

export class GroupScheduler extends plugin {
  constructor () {
    super({
      name: '定时群发',
      dsc: '定时群发任务',
      priority: -100000,
      event: 'message'
    //   rule: [
    //     {
    //       reg: '^#?(memz)?定时群发测试$',
    //       fnc: 'executeGroupScheduler'
    //     }
    //   ]
    })

    this.task = [
      {
        cron: GroupSchedulerCron,
        name: '定时群发任务',
        fnc: () => this.executeGroupScheduler()
      }
    ]
  }

  async executeGroupScheduler () {
    const {
      GroupScheduler,
      GroupSchedulerWhiteBotList,
      GroupSchedulerBlackBotList,
      GroupSchedulerMsg,
      GroupSchedulerGroup
    } = Config.getConfig('memz')

    if (!GroupScheduler) {
      return logger.warn('[memz-plugin] 定时群发功能未开启')
    }

    if (!GroupSchedulerMsg || !GroupSchedulerGroup || !Array.isArray(GroupSchedulerGroup) || GroupSchedulerGroup.length === 0) {
      return logger.warn('[memz-plugin] 定时群发配置不完整')
    }

    const botIds = Bot.uin

    for (let botId of botIds) {
      // 黑名单
      if (GroupSchedulerBlackBotList.includes(botId)) {
        logger.info(`[memz-plugin] Bot (${botId}) 在群发黑名单中，跳过任务`)
        continue
      }
      // 白名单
      if (GroupSchedulerWhiteBotList.length > 0 && !GroupSchedulerWhiteBotList.includes(botId)) {
        logger.info(`[memz-plugin] Bot (${botId}) 不在群发白名单中，跳过任务`)
        continue
      }

      logger.info(`[memz-plugin] Bot (${botId}) 开始执行群发任务`)

      for (const groupId of GroupSchedulerGroup) {
        logger.info(`[memz-plugin] Bot (${botId}) 处理群组 ${groupId}`)

        try {
          await Bot[botId].pickGroup(groupId).sendMsg(GroupSchedulerMsg)

          logger.info(
            `[memz-plugin] Bot ${botId} 消息已发送到群组 ${groupId}: ${GroupSchedulerMsg}`
          )

          await Bot.sleep(2000) // 防止发送过快
        } catch (err) {
          logger.error(
            `[memz-plugin] Bot (${botId}) 向群组 ${groupId} 发送消息时出错：`,
            err
          )
        }
      }

      logger.info(`[memz-plugin] Bot (${botId}) 群发任务执行完毕`)
    }
  }
}
