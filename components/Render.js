import { Version, Config, PluginName, PluginPath, BotName } from '../components/index.js'

function scale (pct = 1) {
  let scale = Math.min(2, Math.max(0.5, Config.renderScale / 100))
  pct = pct * scale
  return `style=transform:scale(${pct})`
}
const Render = {
  async render (path, params, cfg = { retType: 'default', saveId: '' }) {
    let { e } = cfg
    return e.runtime.render(PluginName, path, params, {
      retType: cfg.retType,
      beforeRender ({ data }) {
        let resPath = data.pluResPath
        const layoutPath = `${PluginPath}/resources/common/layout/`
        const saveId =
          (cfg.saveId || e?.user_id || data.saveId) +
          '_' +
          Math.random().toString().slice(-6)
        return {
          ...data,
          saveId,
          _res_path: resPath,
          defaultLayout: layoutPath + 'default.html',
          elemLayout: layoutPath + 'elem.html',
          sys: {
            scale: scale(cfg.scale || 1)
          },
          copyright: `Created By ${BotName}<span class="version">${Version.yunzai}</span> & ${PluginName}<span class="version">${data.pluginVersion || Version.version}</span>`,
          pageGotoParams: {
            waitUntil: 'networkidle2'
          }
        }
      }
    })
  }
}

export default Render
