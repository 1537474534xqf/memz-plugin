import cfg from '../../../lib/config/config.js'
import { Config } from '../components/index.js'
// 默认点赞名单
let Users = [2173302144, 1011303349, 197728340, 3610159055]

export class DZ extends plugin {
  constructor () {
    super({
      name: '自动点赞',
      dsc: '自动点赞',
      priority: -100000,
      event: 'message'
      // rule: [
      //   {
      //     reg: '^#?(memz)?一键点赞',
      //     fnc: 'DZ'
      //   }
      // ]
    })
    this.task = [
      {
        cron: '0 0 0 * * ?',
        name: '赞',
        fnc: () => this.DZ()
      }
    ]
  }

  // 过滤掉 stdin
  filterStdin (list) {
    const filteredList = list.filter(item => {
      const itemStr = item.toString().trim()
      if (itemStr === 'stdin') {
        return false
      }
      return true
    })
    return filteredList
  }

  async DZ () {
    const { AutoLike, AutoLikeList } = Config.getConfig('memz')

    if (!AutoLike) {
      return logger.info('[memz-plugin] 未开启自动点赞功能')
    }

    let qq = new Set()

    // 添加主人QQ到点赞列表
    if (Array.isArray(cfg.masterQQ)) {
      const filteredMasterQQ = this.filterStdin(cfg.masterQQ)
      filteredMasterQQ.forEach(master => {
        if (master.toString().length <= 11) {
          qq.add(master)
          logger.debug(`[memz-plugin] 添加主人QQ ${master} 到点赞列表`)
        } else {
          logger.debug(`[memz-plugin] 跳过长度大于 11 的主人QQ ${master}`)
        }
      })
    } else if (cfg.masterQQ.toString().length <= 11) {
      qq.add(cfg.masterQQ)
      logger.debug(`[memz-plugin] 添加主人QQ ${cfg.masterQQ} 到点赞列表`)
    } else {
      logger.debug(`[memz-plugin] 跳过长度大于 11 的主人QQ ${cfg.masterQQ}`)
    }

    // 添加点赞列表到点赞列表
    if (Array.isArray(AutoLikeList)) {
      const filteredAutoLikeList = this.filterStdin(AutoLikeList)
      filteredAutoLikeList.forEach(likeQQ => {
        if (likeQQ.toString().length <= 11) {
          qq.add(likeQQ)
          logger.debug(`[memz-plugin] 添加 ${likeQQ} 到点赞列表`)
        } else {
          logger.debug(`[memz-plugin] 跳过长度大于 11 的 QQ ${likeQQ}`)
        }
      })
    }

    Users = this.filterStdin(Users)

    qq = Array.from(qq)

    let bot = this.filterStdin(Bot.uin)

    logger.info(`[memz-plugin] 共有 ${qq.length} 个 QQ 需要点赞`)

    // 执行点赞
    for (let uin of bot) {
      logger.info(`[memz-plugin] 开始处理 QQ：${uin}`)
      for (let i of Users) {
        if ((this.e?.adapter_name || this.e.bot?.version?.id) == 'QQBot') {
          logger.info('[memz-plugin] 自动点赞跳过 QQBot')
          continue
        }
        try {
          // 好友
          if (await Bot[uin].fl.has(i)) {
            Bot[uin].pickFriend(i).thumbUp(20)
            logger.info(`[memz-plugin] 为 ${uin} 的好友 ${i} 点赞 20 下`)
            await this.sleep(2000)
          } else {
          // 非好友
            Bot[uin].pickUser(i).thumbUp(20)
            logger.info(`[memz-plugin] 为 ${uin} 的非好友 ${i} 点赞 20 下`)
            await this.sleep(2000)
          }
        } catch (error) {
          logger.error(`[memz-plugin] 为 ${uin} 的 ${i} 点赞时发生错误：${error}`)
        }
      }
    }
  }
}
