import path from 'node:path'
import { exec } from 'child_process'
import { PluginPath } from '../components/Path.js'
import { Restart } from '../../other/restart.js'
import { Config } from '#components'
const { MEMZRestart } = Config.getConfig('memz')
if (MEMZRestart) {
  Restart.prototype.restart = async function () {
    if (process.platform !== 'win32') {
      this.e.reply('此功能只能在Windows系统中使用')
      return logger.error('此功能只能在Windows系统中使用')
    }

    const restartBatPath = path.join(PluginPath, 'restart.bat')

    if (process.argv[1].includes('pm2') || process.env.app_type === 'pm2') {
      const warnInfo = '当前云崽正在后台运行，重启后将尝试关闭云崽 pm2 进程，请关注控制台'
      logger.warn(warnInfo)
      await this.e.reply(warnInfo, true)
    } else {
      await this.e.reply('开始进行前台重启，请关注控制台')
    }

    const delayTime = 4

    try {
      exec(`start "" "${restartBatPath}" ${delayTime}`, (err, stdout, stderr) => {
        if (err) {
          logger.error(`启动 restart.bat 失败: ${stderr}`)
          this.e.reply(`重启失败！\n${stderr}`)
          return
        }

        logger.info(`restart.bat 执行成功：${stdout}`)
        this.e.reply('重启指令已发出，等待云崽重启...')
      })

      setTimeout(() => {
        process.exit()
      }, delayTime * 500)
    } catch (error) {
      this.e.reply(`操作失败！\n${error.stack}`)
      logger.error(`重启过程中发生错误: ${error.stack}`)
    }
  }

  global.劫持重启 = true
} else {
  global.劫持重启 = false
}
