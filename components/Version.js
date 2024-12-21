import fs from 'fs'
import { PluginPath } from './Path.js'

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))

const REGEXPS = {
  // eslint-disable-next-line
  version: /^#\s*([0-9a-zA-Z\.~\s-]+)\s*$/
}

const getLatestVersion = (root) => {
  const logPath = `${root}/CHANGELOG.md`
  let currentVersion = null

  try {
    if (fs.existsSync(logPath)) {
      const logs = fs.readFileSync(logPath, 'utf8').split('\n')

      for (let line of logs) {
        const versionMatch = REGEXPS.version.exec(line)
        if (versionMatch) {
          currentVersion = versionMatch[1].trim()
          break
        }
      }
    }
  } catch (error) {
    logger.error('Error reading log file:', error)
  }

  return currentVersion
}

const latestVersion = getLatestVersion(PluginPath)

const yunzaiVersion = packageJson.version
const isMiao = Boolean(packageJson.dependencies.sequelize)
const isTrss = Array.isArray(Bot.uin)

const Version = {
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
