import fs from 'fs'
import Redis from 'ioredis'
import { Config, PluginPath } from '#components'
import { generateScreenshot } from '#model'

export class RedisStatus extends plugin {
  constructor () {
    super({
      name: 'Redis状态',
      dsc: 'Redis状态',
      event: 'message',
      priority: 6,
      rule: [
        {
          reg: /^#?redis(状态|统计|狀態|統計)(\s*pro)?/i,
          fnc: 'getRedisInfo'
        }
      ]
    })
  }

  async getRedisInfo (e) {
    const { RedisStatusAll } = Config.getConfig('memz')
    if (!RedisStatusAll && !e.isMaster) { return logger.warn('[memz-plugin]Redis状态当前为仅主人可用') }

    let qw = e.msg.match(
      /^#?redis(状态|统计|狀態|統計)(\s*pro)?(\s*文本)?(\s*;?\s*([^;]*);\s*([^;]*);\s*([^;]*))?/i
    )

    const isPro = !!qw[2]
    const textMode = !!qw[3]

    let redisConfig
    if (qw && qw[5]) {
      redisConfig = {
        host: qw[5],
        port: parseInt(qw[6], 10),
        password: qw[7] || ''
      }
    } else {
      redisConfig = '本体'
    }

    const redisInstance =
      redisConfig === '本体' ? redis : new Redis(redisConfig)

    try {
      const info = await redisInstance.info()
      const stats = this.parseRedisInfo(info)

      const hitRate = this.calculateHitRate(stats)
      const dbStats = this.getDbStats(stats, textMode)

      if (textMode) {
        const textResponse = isPro
          ? this.generateProTextResponse(stats, hitRate, dbStats)
          : this.generateBasicTextResponse(stats, hitRate, dbStats)
        await e.reply(textResponse, true)
      } else {
        const html = isPro
          ? this.generateProHtml(stats, hitRate, dbStats)
          : this.generateBasicHtml(stats, hitRate, dbStats)
        const screenshotBuffer = await generateScreenshot(html)
        await e.reply(segment.image(`base64://${screenshotBuffer}`), true)
      }
    } catch (error) {
      await e.reply(`Error fetching Redis info: ${error.message}`)
    } finally {
      if (redisConfig !== '本体') {
        redisInstance.disconnect()
      }
    }
  }

  parseRedisInfo (info) {
    const lines = info.split('\r\n')
    const stats = {}
    for (let line of lines) {
      if (line && line.includes(':')) {
        const [key, value] = line.split(':')
        stats[key] = value
      }
    }
    return stats
  }

  calculateHitRate (stats) {
    const keyspaceHits = parseInt(stats.keyspace_hits, 10)
    const keyspaceMisses = parseInt(stats.keyspace_misses, 10)
    return ((keyspaceHits / (keyspaceHits + keyspaceMisses)) * 100).toFixed(2)
  }

  getDbStats (stats, textMode) {
    const categories = {
      databaseStats: [],
      generalStats: [],
      networkStats: [],
      replicationStats: [],
      aofRdbStats: []
    }

    Object.entries(stats).forEach(([key, value]) => {
      if (key.startsWith('db')) {
        categories.databaseStats.push({ key, value })
      } else if (
        key.startsWith('total_') ||
        key.startsWith('instantaneous_') ||
        key.startsWith('keyspace_')
      ) {
        categories.generalStats.push({ key, value })
      } else if (key.startsWith('total_net_')) {
        categories.networkStats.push({ key, value })
      } else if (key.startsWith('connected_slaves') || key.startsWith('role')) {
        categories.replicationStats.push({ key, value })
      } else if (
        key.startsWith('rdb') ||
        key.startsWith('aof') ||
        key.startsWith('sync')
      ) {
        categories.aofRdbStats.push({ key, value })
      }
    })

    return this.formatDbStats(categories, textMode)
  }

  formatDbStats (categories, textMode) {
    const formatCategory = (category) => {
      return category
        .map(({ key, value }) =>
          textMode
            ? `${key}: ${value}`
            : `<div><span>${key}:</span> ${value}</div>`
        )
        .join(textMode ? '\n' : '')
    }

    return {
      databaseStats: formatCategory(categories.databaseStats),
      generalStats: formatCategory(categories.generalStats),
      networkStats: formatCategory(categories.networkStats),
      replicationStats: formatCategory(categories.replicationStats),
      aofRdbStats: formatCategory(categories.aofRdbStats)
    }
  }

  generateBasicTextResponse (stats, hitRate, dbStats, redisConfig) {
    return `Redis 状态
已运行天数: ${stats.uptime_in_days} days
当前监听端口: ${stats.tcp_port}
连接的客户端数量: ${stats.connected_clients}
向操作系统申请的内存大小: ${(stats.used_memory_rss / 1024 / 1024).toFixed(2)} MB
当前 Redis 使用的内存大小: ${(stats.used_memory / 1024 / 1024).toFixed(2)} MB
Redis 的内存消耗峰值: ${(stats.used_memory_peak / 1024 / 1024).toFixed(2)} MB
Redis 实例的内存碎片化情况: ${stats.mem_fragmentation_ratio}
查找数据库键命中率: ${hitRate}%
数据库统计信息:
${dbStats.databaseStats}`
  }

  generateProTextResponse (stats, hitRate, dbStats, redisConfig) {
    return `Redis 状态PRO
已运行天数: ${stats.uptime_in_days} days
当前监听端口: ${stats.tcp_port}
连接的客户端数量: ${stats.connected_clients}
向操作系统申请的内存大小: ${(stats.used_memory_rss / 1024 / 1024).toFixed(2)} MB
当前 Redis 使用的内存大小: ${(stats.used_memory / 1024 / 1024).toFixed(2)} MB
Redis 的内存消耗峰值: ${(stats.used_memory_peak / 1024 / 1024).toFixed(2)} MB
Redis 实例的内存碎片化情况: ${stats.mem_fragmentation_ratio}
运行以来连接过的客户端的总数量: ${stats.total_connections_received}
运行以来执行过的命令的总数量: ${stats.total_commands_processed}
服务器每秒钟执行的命令数量: ${stats.instantaneous_ops_per_sec}
查找数据库键成功的次数: ${stats.keyspace_hits}
查找数据库键失败的次数: ${stats.keyspace_misses}
查找数据库键命中率: ${hitRate}%
最近一次 fork() 操作耗费的微秒数: ${stats.latest_fork_usec}
连接的从节点数量: ${stats.connected_slaves || 'N/A'}
当前实例的角色: ${stats.role || 'N/A'}
输入网络流量: ${(stats.total_net_input_bytes / 1024 / 1024).toFixed(2)} MB
输出网络流量: ${(stats.total_net_output_bytes / 1024 / 1024).toFixed(2)} MB
被拒绝的连接数量: ${stats.rejected_connections}
过期的键数量: ${stats.expired_keys}
被逐出的键数量: ${stats.evicted_keys}
Pub/Sub 频道数量: ${stats.pubsub_channels}
Pub/Sub 模式数量: ${stats.pubsub_patterns}
被阻塞的客户端数量: ${stats.blocked_clients}
正在加载数据集: ${stats.loading}
最后一次 RDB 保存状态: ${stats.rdb_last_bgsave_status}
最后一次 AOF 写入状态: ${stats.aof_last_write_status}
同步全量传输次数: ${stats.sync_full}
同步部分传输成功次数: ${stats.sync_partial_ok}
同步部分传输失败次数: ${stats.sync_partial_err}

数据库统计信息:
${dbStats.databaseStats}`
  }

  generateBasicHtml (stats, hitRate, dbStats) {
    let htmlTemplate = fs.readFileSync(
      `${PluginPath}/resources/html/redis/redis-basic.html`,
      'utf-8'
    )
    htmlTemplate = htmlTemplate
      .replace('{{uptime_in_days}}', stats.uptime_in_days)
      .replace('{{tcp_port}}', stats.tcp_port)
      .replace('{{connected_clients}}', stats.connected_clients)
      .replace(
        '{{used_memory_rss}}',
        (stats.used_memory_rss / 1024 / 1024).toFixed(2)
      )
      .replace('{{used_memory}}', (stats.used_memory / 1024 / 1024).toFixed(2))
      .replace(
        '{{used_memory_peak}}',
        (stats.used_memory_peak / 1024 / 1024).toFixed(2)
      )
      .replace('{{mem_fragmentation_ratio}}', stats.mem_fragmentation_ratio)
      .replace('{{keyspace_hits}}', stats.keyspace_hits)
      .replace('{{keyspace_misses}}', stats.keyspace_misses)
      .replace('{{hit_rate}}', hitRate)
      .replace('{{db_stats}}', dbStats.databaseStats)
    return htmlTemplate
  }

  generateProHtml (stats, hitRate, dbStats) {
    let htmlTemplate = fs.readFileSync(
      `${PluginPath}/resources/html/redis/redis-pro.html`,
      'utf-8'
    )
    htmlTemplate = htmlTemplate
      .replace('{{uptime_in_days}}', stats.uptime_in_days)
      .replace('{{tcp_port}}', stats.tcp_port)
      .replace('{{connected_clients}}', stats.connected_clients)
      .replace(
        '{{used_memory_rss}}',
        (stats.used_memory_rss / 1024 / 1024).toFixed(2)
      )
      .replace('{{used_memory}}', (stats.used_memory / 1024 / 1024).toFixed(2))
      .replace(
        '{{used_memory_peak}}',
        (stats.used_memory_peak / 1024 / 1024).toFixed(2)
      )
      .replace('{{mem_fragmentation_ratio}}', stats.mem_fragmentation_ratio)
      .replace(
        '{{total_connections_received}}',
        stats.total_connections_received
      )
      .replace('{{total_commands_processed}}', stats.total_commands_processed)
      .replace('{{instantaneous_ops_per_sec}}', stats.instantaneous_ops_per_sec)
      .replace('{{keyspace_hits}}', stats.keyspace_hits)
      .replace('{{keyspace_misses}}', stats.keyspace_misses)
      .replace('{{hit_rate}}', hitRate)
      .replace('{{latest_fork_usec}}', stats.latest_fork_usec)
      .replace('{{connected_slaves}}', stats.connected_slaves || 'N/A')
      .replace('{{role}}', stats.role || 'N/A')
      .replace(
        '{{total_net_input_bytes}}',
        (stats.total_net_input_bytes / 1024 / 1024).toFixed(2)
      )
      .replace(
        '{{total_net_output_bytes}}',
        (stats.total_net_output_bytes / 1024 / 1024).toFixed(2)
      )
      .replace('{{rejected_connections}}', stats.rejected_connections)
      .replace('{{expired_keys}}', stats.expired_keys)
      .replace('{{evicted_keys}}', stats.evicted_keys)
      .replace('{{pubsub_channels}}', stats.pubsub_channels)
      .replace('{{pubsub_patterns}}', stats.pubsub_patterns)
      .replace('{{blocked_clients}}', stats.blocked_clients)
      .replace('{{loading}}', stats.loading)
      .replace('{{rdb_last_bgsave_status}}', stats.rdb_last_bgsave_status)
      .replace('{{aof_last_write_status}}', stats.aof_last_write_status)
      .replace('{{sync_full}}', stats.sync_full)
      .replace('{{sync_partial_ok}}', stats.sync_partial_ok)
      .replace('{{sync_partial_err}}', stats.sync_partial_err)
      .replace('{{db_stats}}', dbStats.databaseStats)
    return htmlTemplate
  }
}
