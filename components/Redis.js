let RedisConfig, RedisHost, RedisPort, RedisPassword;

let Cfg;
try {
  Cfg = await import('../../../lib/config/config.js');
} catch (error) {
  Cfg = null;
}

const config = (Cfg && Cfg.redis) || { host: 'localhost', port: 6379, password: '' };

RedisConfig = config;
RedisHost = config.host;
RedisPort = config.port;
RedisPassword = config.password;

export {
  RedisConfig,
  RedisHost,
  RedisPort,
  RedisPassword
};
