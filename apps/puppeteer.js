import { exec } from 'child_process'
import { promisify } from 'util'
import { Config } from '#components'
import { normalizeCronExpression } from '#model'

const execPromise = promisify(exec)
const { kallChromeEnabled, kallChromeCron } = Config.getConfig('memz')
const { MusicSignGroupId } = Config.getConfig('icqq')

// 获取Chrome进程信息
async function getChromeProcessesInfo() {
  try {
    const { stdout: chromeProcessesInfo } = await execPromise('ps -eo pid,comm,rss | grep chrome | grep -v grep')
    return chromeProcessesInfo
  } catch (err) {
    logger.error(`获取Chrome进程信息失败: ${err.message}`)
    return null
  }
}

// 计算Chrome进程内存和数量
function calculateChromeProcessStats(chromeProcessesInfo) {
  const processLines = chromeProcessesInfo.trim().split('\n')
  const chromeProcesses = processLines.length
  const totalMemory = processLines.reduce((acc, line) => {
    const parts = line.trim().split(/\s+/)
    return acc + parseInt(parts[2], 10)
  }, 0)
  return { chromeProcesses, totalMemory }
}

// 杀死所有Chrome进程
async function killChromeProcesses(groupId) {
  try {
    const chromeProcessesInfo = await getChromeProcessesInfo()

    if (!chromeProcessesInfo) {
      logger.info('无法获取Chrome进程信息')
      return
    }

    const { chromeProcesses, totalMemory } = calculateChromeProcessStats(chromeProcessesInfo)

    logger.info(`当前Chrome进程数量: ${chromeProcesses}`)
    logger.info(`Chrome进程内存占用: ${totalMemory} KB`)

    Bot.pickGroup(groupId).sendMsg(`Chrome进程数量: ${chromeProcesses}\nChrome进程内存占用: ${totalMemory} KB`)

    if (chromeProcesses > 0) {
      await execPromise('pkill chrome')
      logger.info('成功杀死所有Chrome进程')

      const freedMemory = totalMemory
      logger.info(`释放内存: ${freedMemory} KB`)
      Bot.pickGroup(groupId).sendMsg(`已释放内存: ${freedMemory} KB`)
    } else {
      logger.info('没有找到Chrome进程')
    }
  } catch (err) {
    logger.error(`执行操作时出错: ${err.message}`)
  }
}

export class 浏览器消失术 extends plugin {
  constructor(e) {
    super({
      name: '浏览器消失术',
      priority: -1,
      event: 'message',
      rule: [
        {
          reg: /^#?结束(all|所有)?(chrome|浏览器|puppeteer)(进程)?/i,
          fnc: 'kallChrome',
          permission: 'master'
        }
      ]
    })

    // 配置定时任务
    if (kallChromeEnabled) {
      this.task = [{
        cron: normalizeCronExpression(kallChromeCron),
        name: '定时杀死chrome进程',
        fnc: () => this.kallChrome(e.group_id = Number(MusicSignGroupId))
      }]
    }
  }

  async kallChrome(e) {
    await killChromeProcesses(e.group_id)
    return false
  }
}
