import YAML from 'yaml'
import chokidar from 'chokidar'
import fs from 'node:fs'
import YamlReader from './YamlReader.js'
import _ from 'lodash'
import { PluginPath } from './Path.js'

// 初始化全局命名空间
if (!global.memz) {
  global.memz = {}
}

class Config {
  constructor () {
    this.config = {}
    this.oldConfig = {}
    /** 监听文件 */
    this.watcher = { config: {}, defSet: {} }

    this.initCfg()
  }

  initCfg () {
    const path = `${PluginPath}/config/config/`
    if (!fs.existsSync(path)) fs.mkdirSync(path)
    const pathDef = `${PluginPath}/config/default_config/`
    const files = fs
      .readdirSync(pathDef)
      .filter((file) => file.endsWith('.yaml'))

    for (const file of files) {
      const configName = file.replace('.yaml', '')

      // 初始化对应的全局配置对象
      if (!global.memz[configName]) {
        global.memz[configName] = {}
      }

      if (!fs.existsSync(`${path}${file}`)) {
        fs.copyFileSync(`${pathDef}${file}`, `${path}${file}`)
        // 加载默认配置到全局
        const defConfig = YAML.parse(fs.readFileSync(`${pathDef}${file}`, 'utf8'))
        global.memz[configName] = defConfig
      } else {
        const config = YAML.parse(fs.readFileSync(`${path}${file}`, 'utf8'))
        const defConfig = YAML.parse(fs.readFileSync(`${pathDef}${file}`, 'utf8'))
        const { differences, result } = this.mergeObjectsWithPriority(config, defConfig)

        if (differences) {
          fs.copyFileSync(`${pathDef}${file}`, `${path}${file}`)
          for (const key in result) {
            this.modify(configName, key, result[key])
          }
        }

        // 将合并后的配置加载到全局
        global.memz[configName] = result
      }
    }
  }

  /**
   * 获取配置yaml
   * @param type 默认跑配置-defSet，用户配置-config
   * @param name 名称
   */
  getYaml (type, name) {
    const file = `${PluginPath}/config/${type}/${name}.yaml`
    const key = `${type}.${name}`

    if (this.config[key]) return this.config[key]

    const config = YAML.parse(fs.readFileSync(file, 'utf8'))
    this.config[key] = config

    // 更新全局配置
    if (type === 'config') {
      global.memz[name] = { ...global.memz[name], ...config }
    }

    this.watch(file, name, type)

    return this.config[key]
  }

  /**
   * 获取默认配置和用户配置，并将它们合并为一个新的对象返回。
   * @param {string} name - 配置名称
   * @returns {object} - 合并后的配置对象
   */
  getDefOrConfig (name) {
    const def = this.getdefSet(name)
    const config = this.getConfig(name)
    return { ...def, ...config }
  }

  /**
   * 根据配置名称获取默认配置。
   * @param {string} name - 配置名称
   * @returns {object} - 默认配置对象
   */
  getdefSet (name) {
    return this.getYaml('default_config', name)
  }

  /**
   * 根据配置名称获取用户配置。
   * @param {string} name - 配置名称
   * @returns {object} - 用户配置对象
   */
  getConfig (name) {
    return this.getYaml('config', name)
  }

  /** 监听配置文件 */
  watch (file, name, type = 'default_config') {
    const key = `${type}.${name}`
    if (!this.oldConfig[key]) { this.oldConfig[key] = _.cloneDeep(this.config[key]) }
    if (this.watcher[key]) return

    const watcher = chokidar.watch(file)
    watcher.on('change', async (path) => {
      delete this.config[key]
      if (typeof Bot === 'undefined') return
      logger.mark(`[memz-plugin][修改配置文件][${type}][${name}]`)

      // 重新加载配置到全局
      const newConfig = YAML.parse(fs.readFileSync(file, 'utf8'))
      if (type === 'config') {
        global.memz[name] = { ...global.memz[name], ...newConfig }
      }

      if (name === 'config') {
        const oldConfig = this.oldConfig[key]
        delete this.oldConfig[key]
        const newConfig = this.getYaml(type, name)
        const object = this.findDifference(oldConfig, newConfig)
        // console.log(object);
        for (const key in object) {
          if (Object.hasOwnProperty.call(object, key)) {
            const value = object[key]
            const arr = key.split('.')
            if (arr[0] !== 'servers') continue
            let data = newConfig.servers[arr[1]]
            if (typeof data === 'undefined') data = oldConfig.servers[arr[1]]
            const target = {
              type: null,
              data
            }
            if (
              typeof value.newValue === 'object' &&
              typeof value.oldValue === 'undefined'
            ) {
              target.type = 'add'
            } else if (
              typeof value.newValue === 'undefined' &&
              typeof value.oldValue === 'object'
            ) {
              target.type = 'del'
            } else if (
              value.newValue === true &&
              (value.oldValue === false ||
                typeof value.oldValue === 'undefined')
            ) {
              target.type = 'close'
            } else if (
              value.newValue === false &&
              (value.oldValue === true || typeof value.oldValue === 'undefined')
            ) {
              target.type = 'open'
            }
          }
        }
      }
    })

    this.watcher[key] = watcher
  }

  /**
   * @description: 修改设置
   * @param {String} name 文件名
   * @param {String} key 修改的key值
   * @param {String|Number} value 修改的value值
   * @param {'config'|'default_config'} type 配置文件或默认
   */
  modify (name, key, value, type = 'config') {
    const path = `${PluginPath}/config/${type}/${name}.yaml`
    new YamlReader(path).set(key, value)
    this.oldConfig[key] = _.cloneDeep(this.config[key])
    delete this.config[`${type}.${name}`]

    // 更新全局配置
    if (!global.memz[name]) {
      global.memz[name] = {}
    }
    _.set(global.memz[name], key, value)
  }

  /**
   * @description: 修改配置数组
   * @param {String} name 文件名
   * @param {String|Number} key key值
   * @param {String|Number} value value
   * @param {'add'|'del'} category 类别 add or del
   * @param {'config'|'default_config'} type 配置文件或默认
   */
  modifyarr (name, key, value, category = 'add', type = 'config') {
    const path = `${PluginPath}/config/${type}/${name}.yaml`
    const yaml = new YamlReader(path)

    if (category === 'add') {
      yaml.addIn(key, value)
      // 更新 global 数组
      if (!global.memz[name][key]) {
        global.memz[name][key] = []
      }
      global.memz[name][key].push(value)
    } else {
      const index = yaml.jsonData[key].indexOf(value)
      yaml.delete(`${key}.${index}`)
      // 更新 global 数组
      if (global.memz[name][key]) {
        global.memz[name][key] = global.memz[name][key].filter(item => item !== value)
      }
    }
  }

  setArr (name, key, item, value, type = 'config') {
    const path = `${PluginPath}/config/${type}/${name}.yaml`
    const yaml = new YamlReader(path)
    const arr = yaml.get(key).slice()
    arr[item] = value
    yaml.set(key, arr)

    // 更新 global 配置
    if (!global.memz[name][key]) {
      global.memz[name][key] = []
    }
    global.memz[name][key][item] = value
  }

  /**
   * @description 对比两个对象不同的值
   * @param {*} oldObj
   * @param {*} newObj
   * @param {*} parentKey
   * @returns
   */
  findDifference (obj1, obj2, parentKey = '') {
    const result = {}
    for (const key in obj1) {
      const fullKey = parentKey ? `${parentKey}.${key}` : key
      if (_.isObject(obj1[key]) && _.isObject(obj2[key])) {
        const diff = this.findDifference(obj1[key], obj2[key], fullKey)
        if (!_.isEmpty(diff)) {
          Object.assign(result, diff)
        }
      } else if (!_.isEqual(obj1[key], obj2[key])) {
        result[fullKey] = { oldValue: obj1[key], newValue: obj2[key] }
      }
    }
    for (const key in obj2) {
      if (!Object.prototype.hasOwnProperty.call(obj1, key)) {
        const fullKey = parentKey ? `${parentKey}.${key}` : key
        result[fullKey] = { oldValue: undefined, newValue: obj2[key] }
      }
    }
    return result
  }

  mergeObjectsWithPriority (objA, objB) {
    let differences = false

    function customizer (objValue, srcValue, key, object, source, stack) {
      if (_.isArray(objValue) && _.isArray(srcValue)) {
        return objValue
      } else if (_.isPlainObject(objValue) && _.isPlainObject(srcValue)) {
        if (!_.isEqual(objValue, srcValue)) {
          return _.mergeWith({}, objValue, srcValue, customizer)
        }
      } else if (!_.isEqual(objValue, srcValue)) {
        differences = true
        return objValue !== undefined ? objValue : srcValue
      }
      return objValue !== undefined ? objValue : srcValue
    }

    const result = _.mergeWith({}, objA, objB, customizer)

    return {
      differences,
      result
    }
  }
}
export default new Config()
