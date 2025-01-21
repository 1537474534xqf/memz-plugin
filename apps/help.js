import _ from 'lodash'
import { Render } from '#components'
import { helpCfg, helpsList, webToolHelpList, groupHelpList, qqHelpList, searchHelpList, systemHelpList } from '../config/help.js'
import { style } from '../resources/help/imgs/config.js'

const helpList = [...helpsList, ...webToolHelpList, ...groupHelpList, ...qqHelpList, ...searchHelpList, ...systemHelpList]

export class Setting extends plugin {
  constructor () {
    super({
      name: '[memz-plugin]帮助',
      dsc: '[memz-plugin]帮助',
      event: 'message',
      priority: 1,
      rule: [
        { reg: /^#?(memz)(帮助|help|菜单|幫助|菜單)(列表|list)?$/i, fnc: 'help' },
        { reg: /^#?(memz)(全部|all)(帮助|help|菜单|幫助|菜單)(列表|list)?$/i, fnc: 'allHelp' },
        { reg: /^#?(memz)(web|网络)?(工具|tool)(s)?(帮助|help|菜单|幫助|菜單)(列表|list)?$/i, fnc: 'webHelp' },
        { reg: /^#?(memz)(群|群聊|Group)(帮助|help|菜单|幫助|菜單)(列表|list)?$/i, fnc: 'groupHelp' },
        { reg: /^#?(memz)(ic)?(qq)(帮助|help|菜单|幫助|菜單)(列表|list)?$/i, fnc: 'qqHelp' },
        { reg: /^#?(memz)(搜索|搜索功能)(帮助|help|菜单|幫助|菜單)(列表|list)?$/i, fnc: 'searchHelp' },
        { reg: /^#?(memz)(系统|system|管理|admin)(帮助|功能|功能|help)(列表|list)?$/i, fnc: 'systemHelp' }
      ]
    })
  }

  async handleHelp (e, helpList) {
    const helpGroup = helpList.map(group => {
      group.list.forEach(help => {
        const icon = help.icon * 1
        help.css = icon ? `background-position:-${((icon - 1) % 10) * 50}px -${Math.floor((icon - 1) / 10) * 50}px` : 'display:none'
      })
      return group
    })

    const themeData = await getThemeData(helpCfg, helpCfg)
    await Render.render(
      'help/index',
      { helpCfg, helpGroup, ...themeData, element: 'default' },
      { e, scale: 1.6 }
    )
  }

  async help (e) { this.handleHelp(e, helpsList) }
  async allHelp (e) { this.handleHelp(e, helpList) }
  async webHelp (e) { this.handleHelp(e, webToolHelpList) }
  async groupHelp (e) { this.handleHelp(e, groupHelpList) }
  async qqHelp (e) { this.handleHelp(e, qqHelpList) }
  async searchHelp (e) { this.handleHelp(e, searchHelpList) }
  async systemHelp (e) { this.handleHelp(e, systemHelpList) }
}

async function getThemeCfg () {
  const resPath = '{{_res_path}}/help/imgs/'
  return {
    main: `${resPath}/main.png`,
    bg: `${resPath}/bg.jpg`,
    style
  }
}

async function getThemeData (diyStyle, sysStyle) {
  const helpConfig = { ...sysStyle, ...diyStyle }
  const colCount = Math.min(5, Math.max(parseInt(helpConfig.colCount) || 3, 2))
  const colWidth = Math.min(500, Math.max(100, parseInt(helpConfig.colWidth) || 265))
  const width = Math.min(2500, Math.max(800, colCount * colWidth + 30))
  const theme = await getThemeCfg()
  const themeStyle = theme.style || {}

  const css = (sel, cssProp, key, def, fn) => {
    let val = getDef(themeStyle[key], diyStyle[key], sysStyle[key], def)
    if (fn) val = fn(val)
    return `${sel} { ${cssProp}: ${val}; }`
  }

  const ret = [
    `body { background-image: url(${theme.bg}); width: ${width}px; }`,
    `.container { background-image: url(${theme.main}); width: ${width}px; }`,
    `.help-table .td, .help-table .th { width: ${100 / colCount}%; }`,
    css('.help-title, .help-group', 'color', 'fontColor', '#ceb78b'),
    css('.help-title, .help-group', 'text-shadow', 'fontShadow', 'none'),
    css('.help-desc', 'color', 'descColor', '#eee'),
    css('.cont-box', 'background', 'contBgColor', 'rgba(43, 52, 61, 0.8)'),
    css('.cont-box', 'backdrop-filter', 'contBgBlur', 3, n => diyStyle.bgBlur === false ? 'none' : `blur(${n}px)`),
    css('.help-group', 'background', 'headerBgColor', 'rgba(34, 41, 51, .4)'),
    css('.help-table .tr:nth-child(odd)', 'background', 'rowBgColor1', 'rgba(34, 41, 51, .2)'),
    css('.help-table .tr:nth-child(even)', 'background', 'rowBgColor2', 'rgba(34, 41, 51, .4)')
  ]

  return {
    style: `<style>${ret.join('\n')}</style>`,
    colCount
  }
}

function getDef (...args) {
  return args.find(arg => !_.isUndefined(arg))
}
