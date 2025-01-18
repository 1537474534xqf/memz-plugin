import Cfg from '../../../lib/config/config.js'
const RedisConfig = Cfg.redis

const RedisHost = RedisConfig.host
const RedisPort = RedisConfig.port
const RedisPassword = RedisConfig.password

export {
  RedisConfig,
  RedisHost,
  RedisPort,
  RedisPassword
};
