import { update as Update } from '../../other/update.js'
import { PluginName, Config } from '../components/index.js'
const { autoupdate, updatecron } = Config.getConfig('update')
export class Updates extends plugin {
  constructor () {
    super({
      name: '更新MEMZ插件',
      dsc: '更新MEMZ插件',
      event: 'message',
      priority: -10,
      rule: [
        {
          reg: /^#*(memz)(插件)?(强制)?更新$/i,
          fnc: 'update'
        },
        {
          reg: /^#*(memz)(插件)?更新(日志|记录)$/i,
          fnc: 'update_log'
        }
      ]
    })
  }

  init () {
    this.e = {
      isMaster: true,
      logFnc: '[memz-plugin]自动更新]',
      msg: `#更新${PluginName}`,
      reply: msg => Bot.sendMasterMsg(msg)
    }
    if (!autoupdate) return logger.warn('[memz-plugin]自动更新已关闭')

    this.task = []

    this.task.push({
      name: '[memz-plugin]自动更新]',
      cron: updatecron,
      fnc: () => this.update(this.e)
    })
  }

  async update (e) {
    if (!(e.isMaster || e.user_id == 1011303349)) return logger.warn('[memz-plugin]自动更新仅限主人使用')
    e.isMaster = true
    if (e.at && !e.atme) return
    e.msg = `#${e.msg.includes('强制') ? '强制' : ''}更新${PluginName}`
    const up = new Update(e)
    up.e = e
    return up.update()
  }

  async update_log () {
    let UpdatePlugin = new Update()
    UpdatePlugin.e = this.e
    UpdatePlugin.reply = this.reply

    if (UpdatePlugin.getPlugin(PluginName)) {
      this.e.reply(await UpdatePlugin.getLog(PluginName))
    }
    return true
  }
}
