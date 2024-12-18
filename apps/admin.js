import { Config, Render, Version } from '#components'
import lodash from 'lodash'

const keysPattern = lodash.map(Config.getCfgSchemaMap(), 'key').join('|')
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
    const cfgSchemaMap = Config.getCfgSchemaMap()

    if (action === '全部开启' || action === '全部关闭') {
      const newValue = action === '全部开启'
      for (const schemaKey in cfgSchemaMap) {
        const cfgSchema = cfgSchemaMap[schemaKey]
        const val = cfgSchema.type === 'num' ? (newValue ? 1 : 0) : newValue
        Config.modify(cfgSchema.fileName, cfgSchema.cfgKey, val)
      }
    } else if (key) {
      const cfgSchema = cfgSchemaMap[key]
      const val = cfgSchema.input
        ? cfgSchema.input(value)
        : cfgSchema.type === 'num'
          ? Number(value) || cfgSchema.def
          : !/关闭/i.test(value)

      Config.modify(cfgSchema.fileName, cfgSchema.cfgKey, val)
    }

    const schema = Config.getCfgSchema()
    const cfg = Config.getCfg()

    return Render.render('admin/index', { schema, cfg, isMiao: Version.isMiao }, { e, scale: 1.4 })
  }
}
