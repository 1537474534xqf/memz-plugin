import logger from '../server/lib/logger.js';

let RedisConfig = { host: 'localhost', port: 6379, username: '', password: '', db: 0 };
let RedisHost = RedisConfig.host;
let RedisPort = RedisConfig.port;
let RedisPassword = RedisConfig.password;

if (typeof redis !== 'undefined') {
  logger.debug('redis 变量存在，判断为云崽环境');

  const Cfg = await import('../../../lib/config/config.js');
  if (Cfg && Cfg.redis) {
    RedisConfig = Cfg.redis;
    RedisHost = RedisConfig.host || RedisHost;
    RedisPort = RedisConfig.port || RedisPort;
    RedisPassword = RedisConfig.password || RedisPassword;
  } else {
    logger.warn('Cfg.redis 未定义，使用默认 Redis 配置');
  }
} else {
  logger.debug('redis 变量不存在，判断为单跑环境');
}

export {
  RedisConfig,
  RedisHost,
  RedisPort,
  RedisPassword,
};
