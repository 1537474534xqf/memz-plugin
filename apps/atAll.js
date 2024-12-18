import { Config } from '#components'
export class 一键召唤 extends plugin {
  constructor () {
    super({
      name: '召唤',
      dsc: '召唤',
      event: 'message.group',
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
    if (!e.isMaster) return false
    let { atalltext } = Config.getConfig('memz') || '🈷️吗'
    const members = await this.e.group.getMemberMap()
    const qqNumbers = [...members.keys()]

    const atSegments = qqNumbers.map(qq => segment.at(qq)).concat(segment.text(atalltext))

    const chunkSize = 40
    for (let i = 0; i < atSegments.length; i += chunkSize) {
      const chunk = atSegments.slice(i, i + chunkSize)
      await e.reply(chunk)
    }
  }
}
