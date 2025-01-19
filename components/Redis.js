import logger from '../server/lib/logger.js';

let RedisConfig = { host, port, username, password, db, };
let RedisHost = null;
let RedisPort = null;
let RedisPassword = null;

if (typeof redis !== 'undefined') {
  logger.debug('redis 变量存在，判断为云崽环境');
  const Cfg = await import('../../../lib/config/config.js');
  if (Cfg && Cfg.redis) {
    RedisConfig = Cfg.redis;
    RedisHost = RedisConfig.host || RedisHost;
    RedisPort = RedisConfig.port || RedisPort;
    RedisPassword = RedisConfig.password || RedisPassword;
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