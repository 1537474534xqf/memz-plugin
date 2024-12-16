import cfg from '../../../lib/config/config.js'
import { Config } from '../components/index.js'
const { AutoLike, AutoLikeList } = Config.getConfig('memz')
let Users = [2173302144, 1011303349, 197728340]

export class DZ extends plugin {
  constructor () {
    super({
      name: '自动点赞',
      dsc: '自动点赞',
      priority: -100000,
      event: 'message',
      rule: [
        {
          reg: '^#?(memz)?一键点赞',
          fnc: 'DZ'
        }
      ]
    })
    this.task = [
      {
        cron: '0 0 0 * * ?',
        name: '赞',
        fnc: () => this.DZ()
      }
    ]
  }

  async DZ () {
    if (!AutoLike) { return logger.info('[memz-plugin]]未开启自动点赞功能') }
    let qq = new Set()
    logger.info('[memz-plugin]开始处理Bot.uin...')

    if (Array.isArray(Bot.uin)) {
      qq.add(...Bot.uin)
      logger.info(`[memz-plugin]添加了${Bot.uin.length}个Bot.uin到qq集合`)
    } else {
      qq.add(Bot.uin)
      logger.info('[memz-plugin]添加了1个Bot.uin到qq集合')
    }

    if (Array.isArray(cfg.masterQQ)) {
      for (let master of cfg.masterQQ) {
        if (master.toString().length <= 11) {
          qq.add(master)
          logger.info(`[memz-plugin]添加主人QQ ${master} 到点赞列表`)
        } else {
          logger.info(`[memz-plugin]跳过长度大于11的主人QQ ${master}`)
        }
      }
    } else if (cfg.masterQQ.toString().length <= 11) {
      qq.add(cfg.masterQQ)
      logger.info(`[memz-plugin]添加主人QQ ${cfg.masterQQ}到点赞列表`)
    } else {
      logger.info(`[memz-plugin]跳过长度大于11的主人QQ ${cfg.masterQQ}`)
    }

    if (Array.isArray(AutoLikeList)) {
      for (let likeQQ of AutoLikeList) {
        qq.add(likeQQ)
        logger.info(`[memz-plugin]添加${likeQQ}到点赞列表`)
      }
    }

    qq = Array.from(qq)
    logger.info(`[memz-plugin]共有${qq.length}个QQ需要点赞`)

    for (let uin of qq) {
      logger.info(`[memz-plugin]开始处理QQ：${uin}`)
      for (let i of Users) {
        try {
          if (await Bot[uin].fl.has(i)) {
            Bot[uin].pickFriend(i).thumbUp(20)
            logger.info(`[memz-plugin]为${uin}的好友${i}点赞`)
          } else {
            Bot[uin].pickUser(i).thumbUp(20)
            logger.info(`[memz-plugin]为${uin}的非好友${i}点赞`)
          }
        } catch (error) {
          logger.error(`[memz-plugin]为${uin}的${i}点赞时发生错误：${error}`)
        }
      }
    }
  }
}
