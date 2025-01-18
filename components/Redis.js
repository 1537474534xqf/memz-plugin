let RedisConfig, RedisHost, RedisPort, RedisPassword;

let Cfg;
try {
  Cfg = await import('../../../lib/config/config.js');
} catch (error) {
  Cfg = null;
}

const config = Cfg ? (Cfg && Cfg.redis) : null

RedisConfig = config;
RedisHost = config.host;
RedisPort = config.port;
RedisUsername = config.username;
RedisPassword = config.password;

export {
  RedisConfig,
  RedisHost,
  RedisUsername,
  RedisPort,
  RedisPassword
};
