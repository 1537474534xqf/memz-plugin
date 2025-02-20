import { Version, PluginName, PluginPath, BotName } from '../components/index.js'

function scale (pct = 1, customScale = 1) {
  const baseScale = Math.min(2, Math.max(0.5, memz.memz.renderScale / 100))
  pct = pct * baseScale * customScale
  return `style=transform:scale(${pct})`
}

const Render = {
  async render (path, params, cfg = { retType: 'default', saveId: '' }) {
    const { e } = cfg
    return e.runtime.render(PluginName, path, params, {
      retType: cfg.retType,
      renderCfg: cfg.renderCfg || {},
      beforeRender ({ data }) {
        const resPath = data.pluResPath
        const layoutPath = `${PluginPath}/resources/common/layout/`
        const saveId =
          (cfg.saveId || e?.user_id || data.saveId) +
          '_' +
          Math.random().toString().slice(-6)

        const customScale = cfg.renderCfg?.scale || 1

        return {
          ...data,
          saveId,
          _res_path: resPath,
          defaultLayout: layoutPath + 'default.html',
          elemLayout: layoutPath + 'elem.html',
          sys: {
            scale: scale(1, customScale)
          },
          copyright: `Created By ${BotName}<span class="version">${Version.yunzai}</span> & ${PluginName}<span class="version">${data.pluginVersion || Version.latestVersion}</span>`,
          pageGotoParams: {
            waitUntil: 'networkidle2',
            viewport: cfg.renderCfg?.viewPort || {
              width: 1200,
              height: 'auto'
            }
          }
        }
      }
    })
  }
}

export default Render
