let RedisConfig = { host: 'localhost', port: 6379, username: '', password: '', db: 0 }
let RedisHost = RedisConfig.host
let RedisPort = RedisConfig.port
let RedisPassword = RedisConfig.password

if (typeof redis !== 'undefined') {
  const cfg = await import('../../../lib/config/config.js')
  if (cfg && cfg.default && cfg.default.config && cfg.default.config['config.redis']) {
    // 获取 redis 配置
    const RedisConfigFromCfg = cfg.default.config['config.redis']
    // 更新 Redis 配置
    RedisHost = RedisConfigFromCfg.host || RedisHost
    RedisPort = RedisConfigFromCfg.port || RedisPort
    RedisPassword = RedisConfigFromCfg.password || RedisPassword
    RedisConfig = { host: RedisHost, port: RedisPort, password: RedisPassword, db: RedisConfig.db }
  }
}

export {
  RedisConfig,
  RedisHost,
  RedisPort,
  RedisPassword
}
