module.exports = {
  env: {
    es2021: true,
    node: true
  },
  extends: ['standard'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  globals: {
    croe: true,
    Bot: true,
    redis: true,
    logger: true,
    plugin: true,
    Renderer: true,
    segment: true,
    memz: true
  },
  rules: {
  }
}
