import path from 'path'
import { PluginPath } from '../../components/Path.js'
import { MEMZ_NAME } from '#components'
const ServerPath = path.join(PluginPath, 'server')
const ServerData = path.join(PluginPath, 'server', 'data')

export {
  ServerPath,
  ServerData,
  MEMZ_NAME
}
