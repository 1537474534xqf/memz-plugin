import { Config } from '#components'
export class 一键召唤 extends plugin {
  constructor () {
    super({
      name: '召唤',
      dsc: '召唤',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: /^[#/](一键)?召唤(全体|所有|全部|all|所有)(成员)?$/i,
          fnc: '召唤'
        }
      ]
    })
  }

  async 召唤 (e) {
    if (!e.isMaster) return logger.warn('[memz-plugin] 艾特全体只有主人才能使用')
    if (!e.isGroup) return e.reply('只支持群聊使用', true)

    let { atalltext, atChunkSize } = Config.getConfig('memz') || '🈷️吗'
    const members = await this.e.group.getMemberMap()
    const qqNumbers = [...members.keys()]

    const atSegments = qqNumbers.map(qq => segment.at(qq)).concat(segment.text(atalltext))

    for (let i = 0; i < atSegments.length; i += atChunkSize) {
      const chunk = atSegments.slice(i, i + atChunkSize)
      await e.reply(chunk)
      await Bot.sleep(500)
    }
  }
}
