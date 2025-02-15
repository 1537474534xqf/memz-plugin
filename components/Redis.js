let RedisConfig = { host: 'localhost', port: 6379, username: '', password: '', db: 0 }
let RedisHost = RedisConfig.host
let RedisPort = RedisConfig.port
let RedisPassword = RedisConfig.password

if (typeof redis !== 'undefined') {
  logger.debug('redis 变量存在，判断为云崽环境')

  const cfg = await import('../../../lib/config/config.js')
  if (cfg && cfg.default && cfg.default.config && cfg.default.config['config.redis']) {
    // 获取 redis 配置
    const RedisConfigFromCfg = cfg.default.config['config.redis']
    // 更新 Redis 配置
    RedisHost = RedisConfigFromCfg.host || RedisHost
    RedisPort = RedisConfigFromCfg.port || RedisPort
    RedisPassword = RedisConfigFromCfg.password || RedisPassword
    RedisConfig = { host: RedisHost, port: RedisPort, password: RedisPassword, db: RedisConfig.db }
  } else {
    logger.warn('cfg.redis 未定义，使用默认 Redis 配置')
  }
} else {
  logger.debug('redis 变量不存在，判断为单跑环境')
}

export {
  RedisConfig,
  RedisHost,
  RedisPort,
  RedisPassword
}
