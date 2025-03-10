// import { Config } from '#components'
// import { normalizeCronExpression } from '#model'
// const { GroupScheduler, GroupSchedulerCron } = Config.getConfig('memz')

// export class executeGroupScheduler extends plugin {
//   constructor () {
//     super({
//       name: '定时群发',
//       dsc: '定时群发任务',
//       priority: -100000,
//       event: 'message'
//       // rule: [
//       //   {
//       //     reg: '^#?(memz)?定时群发测试$',
//       //     fnc: 'executeGroupScheduler'
//       //   }
//       // ]
//     })
//     if (GroupScheduler) {
//       this.task = []
//       this.task.push([
//         {
//           cron: normalizeCronExpression(GroupSchedulerCron),
//           name: '定时群发任务',
//           fnc: () => this.executeGroupScheduler()
//         }
//       ])
//     }
//   }

//   async executeGroupScheduler () {
//     if (!GroupScheduler) { return logger.warn('[memz-plugin] 定时群发已关闭') }
//     const {
//       GroupSchedulerWhiteBotList,
//       GroupSchedulerBlackBotList,
//       GroupSchedulerMsg,
//       GroupSchedulerGroup
//     } = Config.getConfig('memz')

//     if (!GroupSchedulerMsg || !GroupSchedulerGroup || !Array.isArray(GroupSchedulerGroup) || GroupSchedulerGroup.length === 0) {
//       return logger.warn('[memz-plugin] 定时群发配置不完整')
//     }

//     const botIds = Bot.uin
//     // 分割消息
//     const messages = GroupSchedulerMsg.split('|')

//     for (let botId of botIds) {
//       // 黑名单
//       if (GroupSchedulerBlackBotList.includes(botId)) {
//         logger.info(`[memz-plugin] Bot (${botId}) 在群发黑名单中，跳过任务`)
//         continue
//       }
//       // 白名单
//       if (GroupSchedulerWhiteBotList.length > 0 && !GroupSchedulerWhiteBotList.includes(botId)) {
//         logger.info(`[memz-plugin] Bot (${botId}) 不在群发白名单中，跳过任务`)
//         continue
//       }

//       logger.info(`[memz-plugin] Bot (${botId}) 开始执行群发任务`)

//       for (const groupId of GroupSchedulerGroup) {
//         logger.info(`[memz-plugin] Bot (${botId}) 处理群组 ${groupId}`)

//         if (groupId.length > 11) {
//           logger.info('[memz-plugin] 定时群发跳过 QQBot 群号:', groupId)
//           continue
//         }

//         for (const message of messages) {
//           try {
//             await Bot[botId].pickGroup(groupId).sendMsg(message.trim())

//             logger.info(
//               `[memz-plugin] Bot ${botId} 消息已发送到群组 ${groupId}: ${message.trim()}`
//             )

//             await Bot.sleep(2000)
//           } catch (err) {
//             logger.error(
//               `[memz-plugin] Bot (${botId}) 向群组 ${groupId} 发送消息时出错：`,
//               err
//             )
//           }
//         }
//       }

//       logger.info(`[memz-plugin] Bot (${botId}) 群发任务执行完毕`)
//     }
//   }
// }
