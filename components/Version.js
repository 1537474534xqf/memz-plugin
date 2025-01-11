import fs from 'fs'
import { PluginPath } from './Path.js'
import path from 'path'
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))

const getPackageJsonVersion = (root) => {
  try {
    const packageJsonPath = path.join(root, 'package.json')
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
      return packageJson.version || null
    }
  } catch (error) {
    logger.error('Error reading package.json:', error)
  }
  return null
}

const latestVersion = getPackageJsonVersion(PluginPath)
const yunzaiVersion = packageJson.version

const isMiao = Boolean(packageJson.dependencies?.sequelize)
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
