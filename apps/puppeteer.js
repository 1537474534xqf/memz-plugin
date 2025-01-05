import { exec } from 'child_process'
import { promisify } from 'util'
const execPromise = promisify(exec)

async function getChromeProcessesInfo () {
  try {
    const { stdout: chromeProcessesInfo } = await execPromise('ps -eo pid,comm,rss | grep chrome | grep -v grep')
    return chromeProcessesInfo
  } catch (err) {
    logger.error(`获取Chrome进程信息时出错: ${err.message}`)
    return null
  }
}

async function killChromeProcesses (groupId) {
  try {
    const chromeProcessesInfo = await getChromeProcessesInfo()

    if (!chromeProcessesInfo) {
      logger.info('无法获取Chrome进程信息')
      return
    }

    const processLines = chromeProcessesInfo.trim().split('\n')
    const chromeProcesses = processLines.length
    const totalMemory = processLines.reduce((acc, line) => {
      const parts = line.trim().split(/\s+/)
      return acc + parseInt(parts[2], 10)
    }, 0)

    logger.info(`系统中的Chrome进程数量为: ${chromeProcesses}`)
    logger.info(`Chrome进程总内存使用量: ${totalMemory} KB`)
    Bot.pickGroup(groupId).sendMsg(`Chrome进程数量: ${chromeProcesses}\nChrome进程总内存使用: ${totalMemory} KB`)

    if (chromeProcesses > 0) {
      await execPromise('pkill chrome')
      logger.info('成功杀死所有Chrome进程')

      const freedMemory = totalMemory
      logger.info(`杀死Chrome进程后释放的内存: ${freedMemory} KB`)
      Bot.pickGroup(groupId).sendMsg(`杀死Chrome进程后释放的内存: ${freedMemory} KB`)
    } else {
      logger.info('系统中没有Chrome进程')
    }
  } catch (err) {
    logger.error(`操作时出错: ${err.message}`)
  }
}

export class 浏览器消失术 extends plugin {
  constructor (e) {
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
  }

  async kallChrome (e) {
    await killChromeProcesses(e.group_id)
    return false
  }
}
