import _ from "lodash";
import { update as Update } from "../../other/update.js";
import { Plugin_Name, Config } from "../components/index.js";
const { autoupdate, updatecron } = Config.getConfig("update");
export class Updates extends plugin {
  constructor() {
    super({
      name: "更新MEMZ插件",
      dsc: "更新MEMZ插件",
      event: "message",
      priority: -10,
      rule: [
        {
          reg: /^#*(memz)(插件)?(强制)?更新$/i,
          fnc: "update",
        },
        {
          reg: /^#*(memz)(插件)?更新(日志|记录)$/i,
          fnc: "update_log",
        }
      ],
    })
  }
  init() {
    this.e = {
      isMaster: true,
      logFnc: "[memz-plugin]自动更新]",
      msg: `#更新${Plugin_Name}`,
      reply: msg => Bot.sendMasterMsg(msg),
    }
    if (!autoupdate) return logger.warn(`[memz-plugin]自动更新已关闭`);

    this.task = []

    this.task.push({
      name: "[memz-plugin]自动更新]",
      cron: updatecron,
      fnc: () => this.update(this.e),
    })
  }

  async update(e) {
    if (!(e.isMaster || e.user_id == 1011303349)) return;
    e.isMaster = true;
    if (e.at && !e.atme) return;
    e.msg = `#${e.msg.includes("强制") ? "强制" : ""}更新${Plugin_Name}`;
    const up = new Update(e);
    up.e = e;
    return up.update();
  }
  async update_log() {
    let Update_Plugin = new Update();
    Update_Plugin.e = this.e;
    Update_Plugin.reply = this.reply;

    if (Update_Plugin.getPlugin(Plugin_Name)) {
      this.e.reply(await Update_Plugin.getLog(Plugin_Name));
    }
    return true;
  }
}
