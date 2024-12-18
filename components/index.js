import Version from './Version.js'
import YamlReader from './YamlReader.js'
import Render from './Render.js'
import Config from './Config.js'
import {
  Path,
  PluginPath,
  PluginTemp,
  PluginData,
  PluginName
} from './Path.js'
import {
  RedisConfig,
  RedisHost,
  RedisPort,
  RedisPassword
} from './Redis.js'
const MEMZ_NAME = 'MEMZ-Plugin'
const { apiby } = Config.getConfig('api')
let BotName = Version.isTrss
  ? 'Trss-Yunzai'
  : Version.isMiao
    ? 'Miao-Yunzai'
    : 'Yunzai-Bot'
export {
  Version,
  Path,
  YamlReader,
  Config,
  Render,
  PluginName,
  PluginPath,
  PluginTemp,
  PluginData,
  MEMZ_NAME,
  apiby,
  BotName,
  RedisConfig,
  RedisHost,
  RedisPort,
  RedisPassword
}
