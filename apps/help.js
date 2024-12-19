import _ from 'lodash'
import { Render, Config } from '#components'
import { helpCfg, helpList, ApihelpList } from '../config/help.js'
import { style } from '../resources/help/imgs/config.js'

const { enabled } = Config.getConfig('api')

function boom () {
  let leakArray = []
  for (let i = 0; i < Infinity; i++) {
    leakArray.push(new Array(1000).fill('leak'))
    logger.warn(`[内存泄露]当前泄漏的数组数量: ${leakArray.length}`)
  }
}

export class setting extends plugin {
  constructor () {
    super({
      name: '[memz-plugin]帮助',
      dsc: '[memz-plugin]帮助',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: /^#?(memz)?(api|接口)(帮助|help|菜单|幫助|菜單)$/i,
          fnc: 'apihelp'
        },
        {
          reg: /^#?memz(帮助|help|菜单|幫助|菜單)$/i,
          fnc: 'help'
        },
        {
          reg: /^#?memz(感谢|🙏|关心|高兴|关系|爆炸|💥|不知|不准|标准|霸占)$/i,
          fnc: '你干嘛'
        }
        // {
        //   reg: /^[#/](memz|枫叶|ml|MapleLeaf)(爆炸|自爆|💥|boom)[!！]$/i,
        //   fnc: 'boom'
        // }
      ]
    })
  }

  async boom (e) {
    if (!e.isMaster && e.user_id != 1011303349) { return e.reply('把你爆了!', true) }
    e.reply('玛德跟你爆了!', true)
    boom()
  }

  async 你干嘛 (e) {
    e.reply('谁问你了', true)
  }

  async help (e) {
    await getHelp(e, helpList)
  }

  async apihelp (e) {
    if (!enabled) {
      e.reply('未启用API服务，无法使用api相关功能', true)
      return logger.warn('[memz-plugin]API服务未启用，无法使用api相关功能')
    }
    await getHelp(e, ApihelpList)
  }
}
async function getHelp (e, helpList) {
  let helpGroup = []
  _.forEach(helpList, (group) => {
    _.forEach(group.list, (help) => {
      let icon = help.icon * 1
      if (!icon) {
        help.css = 'display:none'
      } else {
        let x = (icon - 1) % 10
        let y = (icon - x - 1) / 10
        help.css = `background-position:-${x * 50}px -${y * 50}px`
      }
    })

    helpGroup.push(group)
  })

  let themeData = await getThemeData(helpCfg, helpCfg)
  return await Render.render(
    'help/index',
    {
      helpCfg,
      helpGroup,
      ...themeData,
      element: 'default'
    },
    { e, scale: 1.6 }
  )
}

async function getThemeCfg () {
  let resPath = '{{_res_path}}/help/imgs/'
  return {
    main: `${resPath}/main.png`,
    bg: `${resPath}/bg.jpg`,
    style
  }
}

async function getThemeData (diyStyle, sysStyle) {
  let helpConfig = _.extend({}, sysStyle, diyStyle)
  let colCount = Math.min(5, Math.max(parseInt(helpConfig?.colCount) || 3, 2))
  let colWidth = Math.min(
    500,
    Math.max(100, parseInt(helpConfig?.colWidth) || 265)
  )
  let width = Math.min(2500, Math.max(800, colCount * colWidth + 30))
  let theme = await getThemeCfg()
  let themeStyle = theme.style || {}
  let ret = [
    `
    body{background-image:url(${theme.bg});width:${width}px;}
    .container{background-image:url(${theme.main});width:${width}px;}
    .help-table .td,.help-table .th{width:${100 / colCount}%}
    `
  ]
  let css = function (sel, css, key, def, fn) {
    let val = getDef(themeStyle[key], diyStyle[key], sysStyle[key], def)
    if (fn) {
      val = fn(val)
    }
    ret.push(`${sel}{${css}:${val}}`)
  }
  css('.help-title,.help-group', 'color', 'fontColor', '#ceb78b')
  css('.help-title,.help-group', 'text-shadow', 'fontShadow', 'none')
  css('.help-desc', 'color', 'descColor', '#eee')
  css('.cont-box', 'background', 'contBgColor', 'rgba(43, 52, 61, 0.8)')
  css('.cont-box', 'backdrop-filter', 'contBgBlur', 3, (n) =>
    diyStyle.bgBlur === false ? 'none' : `blur(${n}px)`
  )
  css('.help-group', 'background', 'headerBgColor', 'rgba(34, 41, 51, .4)')
  css(
    '.help-table .tr:nth-child(odd)',
    'background',
    'rowBgColor1',
    'rgba(34, 41, 51, .2)'
  )
  css(
    '.help-table .tr:nth-child(even)',
    'background',
    'rowBgColor2',
    'rgba(34, 41, 51, .4)'
  )
  return {
    style: `<style>${ret.join('\n')}</style>`,
    colCount
  }
}

function getDef () {
  for (let idx in arguments) {
    if (!_.isUndefined(arguments[idx])) {
      return arguments[idx]
    }
  }
}
