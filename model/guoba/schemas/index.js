import lodash from 'lodash'
import memz from './memz.js'
import api from './api.js'
import icqq from './icqq.js'
import group from './group.js'
import Search from './Search.js'
import webTools from './webTools.js'
import { Config } from '#components'

export const schemas = [
  memz,
  api,
  icqq,
  group,
  Search,
  webTools
].flat()

export function getConfigData () {
  return {
    config: Config.getDefOrConfig('config'),
    memz: Config.getDefOrConfig('memz'),
    update: Config.getDefOrConfig('update'),
    api: Config.getDefOrConfig('api'),
    icqq: Config.getDefOrConfig('icqq'),
    webStatus: Config.getDefOrConfig('webStatus')
  }
}

export async function setConfigData (data, { Result }) {
  let config = Config.getCfg()

  for (const key in data) {
    let split = key.split('.')
    let currentConfig = config

    for (let i = 0; i < split.length - 1; i++) {
      if (currentConfig[split[i]] === undefined) {
        currentConfig[split[i]] = {}
      }
      currentConfig = currentConfig[split[i]]
    }

    let lastKey = split[split.length - 1]
    if (!lodash.isEqual(currentConfig[lastKey], data[key])) {
      Config.modify(split[0], lastKey, data[key])
    }
  }
  return Result.ok({}, '𝑪𝒊𝒂𝒍𝒍𝒐～(∠・ω< )⌒★')
}
