import os from 'os'
import si from 'systeminformation'
import { Config } from '#components'

export class SystemStatus extends plugin {
  constructor () {
    super({
      name: '系统状态',
      dsc: '系统状态',
      event: 'message',
      priority: 6,
      rule: [
        {
          reg: /^#(?:memz)?(?:插件)?系统状态(?:pro(max)?)?$/i,
          fnc: 'getSystemStatus'
        }
      ]
    })
  }

  async getSystemStatus (e) {
    const { SystemStatusAll } = Config.getConfig('memz')

    if (!SystemStatusAll && !e.isMaster) {
      logger.warn('[memz-plugin] 系统状态当前仅主人可用')
      return false
    }

    const match = e.msg.match(/^#(?:memz)?(?:插件)?系统状态(pro)?(max)?/i)

    const mode = match?.[2] ? 'max' : match?.[1] ? 'extended' : 'basic'

    try {
      logger.info(`[memz-plugin] 系统状态模式: ${mode}`)
      const modeHandlers = {
        basic: () => this.getSystemInfo(e),
        extended: () => this.getExtendedSystemInfo(e),
        max: () => this.getMaxExtendedSystemInfo(e)
      }

      if (modeHandlers[mode]) {
        await modeHandlers[mode]()
      } else {
        logger.warn('未识别的系统状态模式')
      }
    } catch (error) {
      logger.error(`[memz-plugin] 获取系统状态信息时出错: ${error.message}`)
      await e.reply(`获取系统状态信息时出错: ${error.message}`)
    }
  }

  async getSystemInfo (e) {
    try {
      logger.debug('[memz-plugin] 正在获取基本系统信息...')
      const info = await this.basicInfo()
      if (info) await e.reply(info)
    } catch (error) {
      logger.error(`[memz-plugin] 获取系统信息时出错: ${error.message}`)
      await e.reply(`获取系统信息时出错: ${error.message}`)
    }
  }

  async getExtendedSystemInfo (e) {
    try {
      logger.debug('[memz-plugin] 正在获取扩展系统信息...')
      const responses = await Promise.all([
        // 基本信息
        this.basicInfo(),
        // 扩展信息
        this.getAdditionalSystemInfo(),
        // GPU 信息
        this.getGPUInfo(),
        // 电池信息
        this.getBatteryInfo(),
        // 进程信息
        this.getProcessInfo(),
        // 网络连接信息
        this.getNetworkConnections()
      ])
      const validResponses = responses.filter(info => info)
      if (validResponses.length > 0) await e.reply(validResponses.join('\n'))
    } catch (error) {
      logger.error(`[memz-plugin] 获取扩展系统信息时出错: ${error.message}`)
      await e.reply(`获取扩展系统信息时出错: ${error.message}`)
    }
  }

  async getMaxExtendedSystemInfo (e) {
    try {
      logger.debug('[memz-plugin] 正在获取最大扩展系统信息...')
      const responses = await Promise.all([
        // 基本信息
        this.basicInfo(),
        // 扩展信息
        this.getAdditionalSystemInfo(),
        // GPU 信息
        this.getGPUInfo(),
        // 电池信息
        this.getBatteryInfo(),
        // 进程信息
        this.getProcessInfo(),
        // 网络连接信息
        this.getNetworkConnections(),
        // 磁盘详细信息
        this.getDiskDetailedInfo(),
        // 服务详细信息
        this.getServiceDetails(),
        // 主板信息
        this.getMotherboardInfo(),
        // 内存条信息
        this.getRamInfo()
      ])
      const validResponses = responses.filter(info => info)
      if (validResponses.length > 0) await e.reply(validResponses.join('\n'))
    } catch (error) {
      logger.error(`[memz-plugin] 获取最大扩展系统信息时出错: ${error.message}`)
      await e.reply(`获取最大扩展系统信息时出错: ${error.message}`)
    }
  }

  // 获取基本系统信息
  async basicInfo () {
    try {
      logger.debug('[memz-plugin] 获取基本系统信息...')
      const [osInfo, cpuInfo, currentLoad, memoryInfo] = await Promise.all([
        si.osInfo(),
        si.cpu(),
        si.currentLoad(),
        si.mem()
      ])

      if (!osInfo || !cpuInfo || !currentLoad || !memoryInfo) return null

      const systemInfo = `📊 系统状态\n适配器: ${this.e?.adapter_name || this.e.bot?.version?.id || '我不知道'}\n操作系统: ${osInfo.distro}\n系统架构: ${osInfo.codename} ${osInfo.kernel} ${osInfo.arch}\n主机名: ${osInfo.hostname}\nNode.js 版本: ${process.version}\nCPU 信息: ${cpuInfo.physicalCores}核 ${cpuInfo.brand}\nCPU 使用率: ${currentLoad.currentLoad.toFixed(2)}%\n内存: ${(memoryInfo.active / 1024 ** 3).toFixed(2)} GiB / ${(memoryInfo.total / 1024 ** 3).toFixed(2)} GiB (${((memoryInfo.active / memoryInfo.total) * 100).toFixed(2)}%)\n系统运行时间: ${(os.uptime() / 86400).toFixed(2)} 天\nCPU 频率: ${cpuInfo.speed} GHz\n内存交换: ${(memoryInfo.swaptotal / 1024 ** 3).toFixed(2)} GiB`

      logger.debug(`[memz-plugin] 基本系统信息获取成功: ${systemInfo}`)
      return systemInfo
    } catch (error) {
      logger.error(`[memz-plugin] 获取基本系统信息时出错: ${error.message}`)
      return null
    }
  }

  // 获取进程信息
  async getAdditionalSystemInfo () {
    try {
      const diskInfo = await si.diskLayout()
      const netInfo = await si.networkInterfaces()

      if (!diskInfo.length && !netInfo.length) return null

      return `硬盘信息: ${diskInfo.map(disk => `${disk.name} (${disk.type}, ${disk.size / 1024 ** 3} GB)`).join(', ')}\n网络接口: ${netInfo.map(net => `${net.iface} (${net.ip4})`).join(', ')}`
    } catch (error) {
      logger.error(`[memz-plugin] 获取附加系统信息时出错: ${error.message}`)
      return null
    }
  }

  // 获取 GPU 信息
  async getGPUInfo () {
    try {
      const graphics = await si.graphics()
      if (!graphics.controllers.length) return null
      return `GPU 信息: ${graphics.controllers.map(controller => `${controller.model} (${controller.vram} MB)`).join(', ')}`
    } catch (error) {
      logger.error(`[memz-plugin] 获取 GPU 信息时出错: ${error.message}`)
      return null
    }
  }

  // 获取电池信息
  async getBatteryInfo () {
    try {
      const battery = await si.battery()
      if (!battery.hasBattery) return null
      return `电池信息: 状态 ${battery.isCharging ? '充电中' : '未充电'}, 电量 ${battery.percent}%`
    } catch (error) {
      logger.error(`[memz-plugin] 获取电池信息时出错: ${error.message}`)
      return null
    }
  }

  // 获取进程信息
  async getProcessInfo () {
    try {
      const processes = await si.processes()
      if (!processes.all) return null
      return `进程总数: ${processes.all}, 活跃进程: ${processes.running}`
    } catch (error) {
      logger.error(`[memz-plugin] 获取进程信息时出错: ${error.message}`)
      return null
    }
  }

  // 获取网络连接信息
  async getNetworkConnections () {
    try {
      const networkStats = await si.networkStats()
      if (!networkStats.length) return null
      return `网络状态: ${networkStats.map(stat => `接口 ${stat.iface}: 上行 ${stat.tx_bytes / 1024 ** 2} MB, 下行 ${stat.rx_bytes / 1024 ** 2} MB`).join(', ')}`
    } catch (error) {
      logger.error(`[memz-plugin] 获取网络连接信息时出错: ${error.message}`)
      return null
    }
  }

  // 获取磁盘详细信息
  async getDiskDetailedInfo () {
    try {
      const fsSize = await si.fsSize()
      if (!fsSize.length) return null
      return `📂 磁盘分区详情\n${fsSize.map(disk => `• ${disk.fs} - ${disk.type} - ${(disk.size / 1024 ** 3).toFixed(2)} GB - ${disk.used ? `${disk.used} 已用` : '无已用信息'}`).join('\n')}`
    } catch (error) {
      logger.error(`[memz-plugin] 获取磁盘详细信息时出错: ${error.message}`)
      return null
    }
  }

  // 获取服务详细信息
  async getServiceDetails () {
    try {
      const services = await si.services('*')
      if (!services.length) return null
      return `服务状态: ${services.map(service => `${service.name} (${service.running ? '运行中' : '已停止'})`).join(', ')}`
    } catch (error) {
      logger.error(`[memz-plugin] 获取服务信息时出错: ${error.message}`)
      return null
    }
  }

  // 获取主板信息
  async getMotherboardInfo () {
    try {
      const motherboard = await si.baseboard()
      if (!motherboard.manufacturer) return null
      return `🖥️ 主板信息\n• 生产商: ${motherboard.manufacturer}\n• 版本: ${motherboard.version}\n• 序列号: ${motherboard.serial}`
    } catch (error) {
      logger.error(`[memz-plugin] 获取主板信息时出错: ${error.message}`)
      return null
    }
  }

  // 获取内存条信息
  async getRamInfo () {
    try {
      const memLayout = await si.memLayout()
      if (!memLayout.length) return null
      return `💾 RAM 信息\n${memLayout.map((mem, idx) => `• 内存条 ${idx + 1}: ${mem.type}, ${(mem.size / 1024 ** 3).toFixed(2)} GB, ${mem.clockSpeed || '未知频率'}`).join('\n')}`
    } catch (error) {
      logger.error(`[memz-plugin] 获取内存信息时出错: ${error.message}`)
      return null
    }
  }
}
