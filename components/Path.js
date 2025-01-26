import path from 'path'

const isFramework = typeof Bot !== 'undefined'
const Path = isFramework ? process.cwd() : path.dirname(process.cwd())
const PluginName = 'memz-plugin'
const PluginPath = isFramework
  ? path.resolve(Path, 'plugins', PluginName)
  : path.resolve(Path, PluginName)
const PluginTemp = path.join(PluginPath, 'temp')
const PluginData = path.join(PluginPath, 'data')

export {
  isFramework,
  Path,
  PluginPath,
  PluginTemp,
  PluginData,
  PluginName
}
