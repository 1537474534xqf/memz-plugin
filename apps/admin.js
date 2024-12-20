import { Config, Render, Version } from '#components'
import lodash from 'lodash'

const cfgSchemaMap = Config.getCfgSchemaMap()
const keysPattern = lodash.map(cfgSchemaMap, 'key').join('|')
const sysCfgReg = new RegExp(`^#memz设置\\s*(全部开启|全部关闭|(${keysPattern}))?\\s*(.*)$`, 'i')

export class Setting extends plugin {
  constructor () {
    super({
      name: '[memz-plugin] 设置',
      dsc: '[memz-plugin] 设置',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: sysCfgReg,
          fnc: 'handleSetting',
          permission: 'master'
        }
      ]
    })
  }

  async handleSetting (e) {
    const { msg } = e
    const regResult = sysCfgReg.exec(msg)

    if (!regResult) return true

    const [action, key, value] = regResult
    if (action) {
      await this.handleAction(action)
    } else if (key) {
      await this.handleKeySetting(key, value)
    }

    const schema = Config.getCfgSchema()
    const cfg = Config.getCfg()

    return Render.render('admin/index', { schema, cfg, isMiao: Version.isMiao }, { e, scale: 1.4 })
  }

  async handleAction (action) {
    const newValue = action === '全部开启'
    for (const schemaKey in cfgSchemaMap) {
      const cfgSchema = cfgSchemaMap[schemaKey]
      const val = this.getNewValue(cfgSchema, newValue)
      Config.modify(cfgSchema.fileName, cfgSchema.cfgKey, val)
    }
  }

  async handleKeySetting (key, value) {
    const cfgSchema = cfgSchemaMap[key]
    const val = this.getNewValue(cfgSchema, value)
    Config.modify(cfgSchema.fileName, cfgSchema.cfgKey, val)
  }

  getNewValue (cfgSchema, valueOrFlag) {
    if (typeof valueOrFlag === 'boolean') {
      return cfgSchema.type === 'num' ? (valueOrFlag ? 1 : 0) : valueOrFlag
    }

    return cfgSchema.input
      ? cfgSchema.input(valueOrFlag)
      : cfgSchema.type === 'num'
        ? Number(valueOrFlag) || cfgSchema.def
        : !/关闭/i.test(valueOrFlag)
  }
}
