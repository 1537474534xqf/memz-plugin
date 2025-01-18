import Cfg from '../../../lib/config/config.js'
const RedisConfig = Cfg.redis

const RedisHost = RedisConfig.host
const RedisPort = RedisConfig.port
const RedisUsername = RedisConfig.username
const RedisPassword = RedisConfig.password

export {
  RedisConfig,
  RedisHost,
  RedisUsername,
  RedisPort,
  RedisPassword
};
