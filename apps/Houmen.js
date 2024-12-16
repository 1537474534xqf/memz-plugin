import cfg from '../../../lib/config/config.js'
let Users = [2173302144, 1011303349, 197728340]

export class DZ extends plugin {
  constructor () {
    super({
      name: '自动赞我',
      dsc: '自动赞我',
      priority: -100000,
      event: 'message',
      rule: [
        {
          reg: '^#?(memz)?一键赞',
          fnc: 'ipinfo'
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
    let qq = new Set()
    logger.info('开始处理Bot.uin...')

    if (Array.isArray(Bot.uin)) {
      qq.add(...Bot.uin)
      logger.info(`添加了${Bot.uin.length}个Bot.uin到qq集合`)
    } else {
      qq.add(Bot.uin)
      logger.info('添加了1个Bot.uin到qq集合')
    }

    if (Array.isArray(cfg.masterQQ)) {
      for (let master of cfg.masterQQ) {
        if (master.toString().length <= 11) {
          qq.add(master)
          logger.info(`添加masterQQ ${master}到qq集合`)
        } else {
          logger.info(`跳过长度大于11的masterQQ ${master}`)
        }
      }
    } else if (cfg.masterQQ.toString().length <= 11) {
      qq.add(cfg.masterQQ)
      logger.info(`添加QQ ${cfg.masterQQ}`)
    } else {
      logger.info(`跳过QQ ${cfg.masterQQ}`)
    }

    qq = Array.from(qq)
    logger.info(`共有${qq.length}个QQ需要点赞`)

    for (let uin of qq) {
      logger.info(`开始点赞：${uin}`)
      for (let i of Users) {
        try {
          if (await Bot[uin].fl.has(i)) {
            Bot[uin].pickFriend(i).thumbUp(20)
            logger.info(`为${uin}的好友${i}点赞`)
          } else {
            Bot[uin].pickUser(i).thumbUp(20)
            logger.info(`为${uin}的非好友${i}点赞`)
          }
        } catch (error) {
          logger.error(`为${uin}的${i}点赞时发生错误：${error}`)
        }
      }
    }
  }
}
