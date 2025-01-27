import lodash from 'lodash'
import memz from './memz.js'
import api from './api.js'
import icqq from './icqq.js'
import group from './group.js'
import Search from './Search.js'
import webTools from './webTools.js'
import mail from './mail.js'
import { Config } from '#components'

export const schemas = [
  memz,
  api,
  icqq,
  group,
  Search,
  webTools,
  mail
].flat()

export function getConfigData () {
  return {
    config: Config.getDefOrConfig('config'),
    memz: Config.getDefOrConfig('memz'),
    update: Config.getDefOrConfig('update'),
    api: Config.getDefOrConfig('api'),
    icqq: Config.getDefOrConfig('icqq'),
    webStatus: Config.getDefOrConfig('webStatus'),
    mail: Config.getDefOrConfig('mail')
  }
}

export async function setConfigData (data, { Result }) {
  const configFiles = new Map([
    ['config', Config.getDefOrConfig('config')],
    ['memz', Config.getDefOrConfig('memz')],
    ['update', Config.getDefOrConfig('update')],
    ['api', Config.getDefOrConfig('api')],
    ['icqq', Config.getDefOrConfig('icqq')],
    ['webStatus', Config.getDefOrConfig('webStatus')],
    ['mail', Config.getDefOrConfig('mail')]
  ])

  for (const [key, value] of Object.entries(data)) {
    const split = key.split('.')
    const rootKey = split[0]
    const configFile = configFiles.get(rootKey)

    if (!configFile) continue

    let currentConfig = configFile
    for (let i = 1; i < split.length - 1; i++) {
      if (currentConfig[split[i]] === undefined) {
        currentConfig[split[i]] = {}
      }
      currentConfig = currentConfig[split[i]]
    }

    const lastKey = split[split.length - 1]
    if (!lodash.isEqual(currentConfig[lastKey], value)) {
      currentConfig[lastKey] = value
      Config.modify(rootKey, split.slice(1).join('.'), value)
    }
  }

  return Result.ok({}, '𝑪𝒊𝒂𝒍𝒍𝒐～(∠・ω< )⌒★')
}
