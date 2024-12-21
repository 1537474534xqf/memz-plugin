import fs from 'fs'
import { PluginPath } from './Path.js'

let packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))

const REGEXPS = {
  // eslint-disable-next-line no-useless-escape
  version: /^#\s*([0-9a-zA-Z\.~\s-]+)\s*$/
}
const getLatestVersion = (root) => {
  const logPath = `${root}/CHANGELOG.md`
  let currentVersion = null

  try {
    if (fs.existsSync(logPath)) {
      let logs = fs.readFileSync(logPath, 'utf8') || ''
      logs = logs.split('\n')

      for (let line of logs) {
        const versionRet = REGEXPS.version.exec(line)
        if (versionRet && versionRet[1]) {
          currentVersion = versionRet[1].trim()
          break
        }
      }
    }
  } catch (e) {
    logger.error('Error reading log file:', e)
  }

  return currentVersion
}

const latestVersion = getLatestVersion(`${PluginPath}/`)

const yunzaiVersion = packageJson.version
const isMiao = Boolean(packageJson.dependencies.sequelize)
const isTrss = Array.isArray(Bot.uin)

let Version = {
  isMiao,
  isTrss,
  get latestVersion () {
    return latestVersion
  },
  get yunzai () {
    return yunzaiVersion
  }
}

export default Version
